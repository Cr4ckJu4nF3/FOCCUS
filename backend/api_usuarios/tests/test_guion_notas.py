"""Notas por versión mediante uvicorn y SQLite en memoria, sin MySQL."""
import json
import os
import socket
import sys
import threading
import time
import unittest
from datetime import date, datetime
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# El módulo de configuración conecta al importarse; nunca usar el motor real.
with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()):
    from fastapi import FastAPI
    import uvicorn
    from app.config.database import Base, get_db
    from app.models.project_model import Project
    from app.models.user_model import User
    from app.models.user_project_model import UserProject
    from app.models.Guion import Guion
    from app.models.guion_version_model import GuionVersion
    from app.models.guion_nota_model import GuionNota
    from app.routes.guion_routes import router
    from app.schemas.user_schema import InviteSchema, UserProjectSchema, UserProjectUpdateSchema
    from app.utils.auth import create_access_token

from sqlalchemy import create_engine
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(LONGTEXT, "sqlite")
def _longtext_sqlite(_type, _compiler, **_kwargs):
    return "TEXT"


class GuionNotasHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(cls.engine, tables=[
            Project.__table__, User.__table__, UserProject.__table__,
            Guion.__table__, GuionVersion.__table__, GuionNota.__table__,
        ])
        cls.Session = sessionmaker(bind=cls.engine)
        with cls.Session() as db:
            db.add_all([
                Project(id_project=p, project_name=p, formato_de_produccion="film", genero="drama", id_client=1)
                for p in ("p1", "p2")
            ])
            for uid in range(1, 7):
                db.add(User(id_user=uid, nombre="Usuario", apellido="Prueba", identificacion="CC",
                            id_identificacion=str(uid), mail=f"{uid}@example.test", msisdn="0",
                            fecha_de_nacimiento=datetime(2000, 1, 1), estado="activo",
                            contrasena="hash", id_rol={3: 1002, 4: 1003, 5: 1004}.get(uid, 1005)))
            db.add_all([
                UserProject(id_user=1, id_project="p1", id_rol=1005),
                UserProject(id_user=1, id_project="p2", id_rol=1005),
                UserProject(id_user=2, id_project="p1", id_rol=1001),
                UserProject(id_user=3, id_project="p1", id_rol=1002),
                UserProject(id_user=4, id_project="p1", id_rol=1003),
                UserProject(id_user=5, id_project="p1", id_rol=1004),
            ])
            db.add_all([Guion(id_guion=1, nombre="Uno", id_project="p1"),
                        Guion(id_guion=2, nombre="Dos", id_project="p2")])
            db.add_all([
                GuionVersion(id_guion_version=1, id_guion=1, numero_de_version=1, fecha_de_emision=date.today()),
                GuionVersion(id_guion_version=2, id_guion=1, numero_de_version=2, fecha_de_emision=date.today()),
                GuionVersion(id_guion_version=3, id_guion=2, numero_de_version=1, fecha_de_emision=date.today()),
            ])
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
            db.query(GuionNota).delete()
            db.commit()

    def request(self, version, user=1, project="p1", body=None, token=True):
        headers = {"Content-Type": "application/json"}
        if project is not None:
            headers["X-Project-Id"] = project
        if token:
            headers["Authorization"] = "Bearer " + create_access_token({"id_user": user, "two_factor_verified": True})
        request = Request(f"{self.base}/guiones/versiones/{version}/notas",
                          data=json.dumps(body).encode() if body is not None else None, headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def test_solo_admin_crea_nota_y_miembro_puede_consultarla(self):
        self.assertEqual(self.request(1)[1]["data"], [])
        self.assertEqual(self.request(1, body={"contenido": "Miembro no puede escribir"})[0], 403)
        status, result = self.request(1, user=2, body={"contenido": "  Revisión de escena  "})
        self.assertEqual(status, 200)
        self.assertEqual(result["data"]["contenido"], "Revisión de escena")
        self.assertEqual(result["data"]["id_user"], 2)
        self.assertEqual(len(self.request(1)[1]["data"]), 1)
        self.assertEqual(self.request(2)[1]["data"], [])

    def test_roles_legados_solo_consultan_y_no_escriben(self):
        for user, role in ((3, 1002), (4, 1003), (5, 1004)):
            with self.subTest(role=role):
                self.assertEqual(self.request(1, user=user)[0], 200)
                self.assertEqual(self.request(1, user=user, body={"contenido": "No autorizado"})[0], 403)
                with self.Session() as db:
                    self.assertEqual(db.query(UserProject).filter_by(id_user=user, id_project="p1").one().id_rol, role)

    def test_version_ajena_inexistente_y_permisos(self):
        for version in (3, 999):
            self.assertEqual(self.request(version)[0], 404)
            self.assertEqual(self.request(version, user=2, body={"contenido": "No guardar"})[0], 404)
        self.assertEqual(self.request(3, user=1, project="p2")[0], 200)
        self.assertEqual(self.request(3, user=2, project="p2", body={"contenido": "Sí"})[0], 403)
        self.assertEqual(self.request(3, user=1, project="p2")[1]["data"], [])
        self.assertEqual(self.request(1, user=6)[0], 403)
        self.assertEqual(self.request(1, user=6, body={"contenido": "No"})[0], 403)
        self.assertEqual(self.request(1, token=False)[0], 401)
        self.assertEqual(self.request(1, token=False, body={"contenido": "No"})[0], 401)
        self.assertEqual(self.request(1, project=None)[0], 400)
        with self.Session() as db:
            self.assertEqual(db.query(GuionNota).count(), 0)

    def test_schemas_solo_aceptan_administrador_y_usuario(self):
        invite = {
            "correos": ["persona@example.test"], "id_project": "p1",
            "id_client": 1, "id_rol": 1005,
        }
        for role in (1002, 1003, 1004):
            with self.subTest(role=role):
                with self.assertRaises(ValidationError):
                    InviteSchema.model_validate({**invite, "id_rol": role})
                with self.assertRaises(ValidationError):
                    UserProjectSchema.model_validate({"id_user": 1, "id_project": "p1", "id_rol": role})
                with self.assertRaises(ValidationError):
                    UserProjectUpdateSchema.model_validate({"id_rol": role})

    def test_rechaza_nota_vacia(self):
        for contenido in ("", "  \n "):
            self.assertEqual(self.request(1, user=2, body={"contenido": contenido})[0], 422)
        self.assertEqual(self.request(1)[1]["data"], [])


if __name__ == "__main__":
    unittest.main()
