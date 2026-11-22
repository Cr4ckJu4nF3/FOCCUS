"""Prueba HTTP con uvicorn y SQLite aislado; nunca abre .env ni MySQL."""
import json
import os
import socket
import sys
import threading
import time
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()):
    from fastapi import FastAPI
    import uvicorn
    from app.config.database import Base, get_db
    from app.models.project_model import Project
    from app.models.user_model import User
    from app.models.user_project_model import UserProject
    from app.models.catalogo_bloque_model import CatalogoBloque
    from app.routes.catalogo_bloque_routes import router
    from app.utils.auth import create_access_token

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


class CatalogoHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(cls.engine, tables=[
            Project.__table__, User.__table__, UserProject.__table__, CatalogoBloque.__table__,
        ])
        cls.Session = sessionmaker(bind=cls.engine)
        with cls.Session() as db:
            db.add_all([Project(id_project=p, project_name=p, formato_de_produccion="film",
                                genero="drama", id_client=1) for p in ("p1", "p2")])
            for uid in (1, 2, 3):
                db.add(User(id_user=uid, nombre="Usuario", apellido="Prueba", identificacion="CC",
                            id_identificacion=str(uid), mail=f"{uid}@example.test", msisdn="0",
                            fecha_de_nacimiento=datetime(2000, 1, 1), estado="activo",
                            contrasena="hash", id_rol=1005))
            db.add_all([UserProject(id_user=1, id_project="p1", id_rol=1001),
                        UserProject(id_user=1, id_project="p2", id_rol=1001),
                        UserProject(id_user=2, id_project="p1", id_rol=1005)])
            db.commit()
        cls.app = FastAPI()
        cls.app.include_router(router)

        def db_override():
            with cls.Session() as db:
                yield db
        cls.app.dependency_overrides[get_db] = db_override
        cls.sock = socket.socket()
        cls.sock.bind(("127.0.0.1", 0))
        cls.sock.listen(128)
        cls.base = f"http://127.0.0.1:{cls.sock.getsockname()[1]}"
        cls.server = uvicorn.Server(uvicorn.Config(cls.app, log_level="error", lifespan="off"))
        cls.thread = threading.Thread(target=cls.server.run, kwargs={"sockets": [cls.sock]}, daemon=True)
        cls.thread.start()
        for _ in range(100):
            if cls.server.started:
                break
            time.sleep(0.05)
        if not cls.server.started:
            raise RuntimeError("No arrancó uvicorn aislado")

    @classmethod
    def tearDownClass(cls):
        cls.server.should_exit = True
        cls.thread.join(timeout=5)
        cls.sock.close()
        cls.engine.dispose()

    def setUp(self):
        with self.Session() as db:
            db.query(CatalogoBloque).delete()
            db.commit()

    def request(self, project="p1", user=1, body=None, query="", header=None, token=True):
        headers = {"Content-Type": "application/json", "X-Project-Id": header or project}
        if token:
            headers["Authorization"] = "Bearer " + create_access_token({"id_user": user, "two_factor_verified": True})
        request = Request(f"{self.base}/proyectos/{project}/catalogo-bloques{query}",
                          data=json.dumps(body).encode() if body is not None else None, headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def test_guardar_retirar_recargar_reutilizar_en_otro_guion(self):
        # El catálogo no depende de la vida ni de la versión de un guion.
        for tipo in ("accion", "dialogo", "parentesis", "transicion"):
            html = f'<p class="gb gb-{tipo}"><strong>Texto {tipo}</strong></p>'
            status, guardado = self.request(body={"tipo": tipo, "html": html})
            self.assertEqual(status, 200)
            self.assertEqual(self.request(body={"tipo": tipo, "html": html})[1], guardado)
            status, resultados = self.request(query=f"?tipo={tipo}&q=Texto")
            self.assertEqual(status, 200)
            self.assertEqual(resultados, [guardado])
            self.assertEqual(resultados[0]["html"], html)
        self.assertEqual(len(self.request()[1]), 4)
        self.assertEqual(self.request(project="p2")[1], [])

    def test_permisos_y_aislamiento(self):
        dato = {"tipo": "accion", "html": '<p class="gb gb-accion">Secreto</p>'}
        self.assertEqual(self.request(user=2, body=dato)[0], 403)
        self.assertEqual(self.request(user=2)[0], 200)
        self.assertEqual(self.request(user=3)[0], 403)
        self.assertEqual(self.request(user=2, project="p2")[0], 403)
        self.assertEqual(self.request(header="p2")[0], 403)
        self.assertEqual(self.request(token=False)[0], 401)

    def test_busqueda_texto_dividido_por_formato_y_escapes(self):
        body = {"tipo": "dialogo", "html": '<p class="gb gb-dialogo" style="text-align: center;">Hola <strong>mundo</strong></p>'}
        self.assertEqual(self.request(body=body)[0], 200)
        self.assertEqual(self.request(query="?q=hola%20mundo")[1][0]["html"], body["html"])
        self.assertEqual(self.request(query="?q=strong")[1], [])

    def test_validacion_y_fallo_persistencia(self):
        for html in ('<p class="gb gb-accion"><img src=x onerror=alert(1)>X</p>',
                     '<p class="gb gb-dialogo">X</p>', '<p class="gb gb-accion"> </p>',
                     '<p class="gb gb-accion">X</p><p class="gb gb-accion">Y</p>'):
            self.assertEqual(self.request(body={"tipo": "accion", "html": html})[0], 422)
        self.assertEqual(self.request(body={"tipo": "escena", "html": "x"})[0], 422)
        # La prueba de fallo real de SQL usa una tabla ausente, no la BD de producción.
        with self.engine.begin() as conn:
            CatalogoBloque.__table__.drop(conn)
        try:
            self.assertEqual(self.request()[0], 503)
            self.assertEqual(self.request(body={"tipo": "accion", "html": '<p class="gb gb-accion">X</p>'})[0], 503)
        finally:
            CatalogoBloque.__table__.create(self.engine)


if __name__ == "__main__":
    unittest.main()
