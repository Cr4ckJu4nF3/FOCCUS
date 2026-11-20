"""Permisos de escritura de galería con SQLite aislado, sin conexión a MySQL."""
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
    from app.routes import galeria_routes
    from app.utils.auth import create_access_token

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


class GaleriaPermisosHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(cls.engine, tables=[
            Project.__table__, User.__table__, UserProject.__table__,
        ])
        cls.Session = sessionmaker(bind=cls.engine)
        with cls.Session() as db:
            db.add(Project(
                id_project="p1", project_name="Proyecto", formato_de_produccion="film",
                genero="drama", id_client=1,
            ))
            for user_id, role in ((1, 1005), (2, 1001), (3, 1002), (4, 1003), (5, 1004)):
                db.add(User(
                    id_user=user_id, nombre="Usuario", apellido="Prueba", identificacion="CC",
                    id_identificacion=str(user_id), mail=f"{user_id}@example.test",
                    msisdn="0", fecha_de_nacimiento=datetime(2000, 1, 1), estado="activo",
                    contrasena="hash", id_rol=role,
                ))
                db.add(UserProject(id_user=user_id, id_project="p1", id_rol=role))
            db.commit()
        cls.app = FastAPI()
        cls.app.include_router(galeria_routes.router)

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

    def request(self, path, user=1, method="GET", body=None):
        headers = {
            "Authorization": "Bearer " + create_access_token({
                "id_user": user, "two_factor_verified": True,
            }),
            "X-Project-Id": "p1",
        }
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        request = Request(f"{self.base}{path}", data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def test_miembros_consultan_galeria_y_no_pueden_escribir(self):
        with (
            patch.object(galeria_routes, "get_items", return_value={"data": []}),
            patch.object(galeria_routes, "get_item_versions", return_value={"data": []}),
            patch.object(galeria_routes, "create_item_version", return_value={"success": True}) as create_version,
            patch.object(galeria_routes, "record_item_use_without_changes", return_value={"success": True}) as record_use,
            patch.object(galeria_routes, "upload_item_version_photo", return_value={"success": True}) as upload_photo,
        ):
            for user in (1, 3, 4, 5):
                with self.subTest(user=user):
                    self.assertEqual(self.request("/projects/p1/galeria", user=user)[0], 200)
                    self.assertEqual(self.request("/projects/p1/galeria/1/versiones", user=user)[0], 200)
                    self.assertEqual(self.request(
                        "/projects/p1/galeria/1/versiones", user=user, method="POST",
                        body={"detalles_uso": "Se usó en escena"},
                    )[0], 403)
                    self.assertEqual(self.request(
                        "/projects/p1/galeria/1/uso", user=user, method="POST",
                    )[0], 403)
                    self.assertEqual(self.request(
                        "/projects/p1/galeria/1/versiones/1/foto", user=user, method="POST",
                    )[0], 403)
            create_version.assert_not_called()
            record_use.assert_not_called()
            upload_photo.assert_not_called()

    def test_administrador_puede_escribir_en_las_tres_operaciones(self):
        with (
            patch.object(galeria_routes, "create_item_version", return_value={"success": True}),
            patch.object(galeria_routes, "record_item_use_without_changes", return_value={"success": True}),
            patch.object(galeria_routes, "upload_item_version_photo", return_value={"success": True}),
        ):
            self.assertEqual(self.request(
                "/projects/p1/galeria/1/versiones", user=2, method="POST",
                body={"detalles_uso": "Se usó en escena"},
            )[0], 200)
            self.assertEqual(self.request(
                "/projects/p1/galeria/1/uso", user=2, method="POST",
            )[0], 200)
            self.assertEqual(self.request(
                "/projects/p1/galeria/1/versiones/1/foto", user=2, method="POST",
            )[0], 200)


if __name__ == "__main__":
    unittest.main()
