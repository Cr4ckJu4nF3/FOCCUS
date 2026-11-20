"""Pruebas HTTP aisladas de GET proyectos por cliente, usando SQLite."""
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
    from app.routes.project_routes import router
    from app.utils.auth import create_access_token

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


class ProjectsByClientPermissionsHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(cls.engine, tables=[
            Project.__table__, User.__table__, UserProject.__table__,
        ])
        cls.Session = sessionmaker(bind=cls.engine)
        with cls.Session() as db:
            db.add_all([
                Project(
                    id_project="p1", project_name="Proyecto Uno", formato_de_produccion="film",
                    genero="drama", sinopsis="Sinopsis uno", director="Directora uno", id_client=10,
                ),
                Project(
                    id_project="p2", project_name="Proyecto Dos", formato_de_produccion="series",
                    genero="comedia", sinopsis="Sinopsis dos", director="Director dos", id_client=10,
                ),
                Project(
                    id_project="p3", project_name="Proyecto Tres", formato_de_produccion="film",
                    genero="acción", sinopsis="Sinopsis tres", director="Director tres", id_client=20,
                ),
            ])
            for user_id, global_role in ((1, 1005), (2, 1005), (3, 1001)):
                db.add(User(
                    id_user=user_id, nombre="Usuario", apellido="Prueba", identificacion="CC",
                    id_identificacion=str(user_id), mail=f"{user_id}@example.test",
                    msisdn="0", fecha_de_nacimiento=datetime(2000, 1, 1), estado="activo",
                    contrasena="hash", id_rol=global_role,
                ))
            db.add_all([
                UserProject(id_user=1, id_project="p1", id_rol=1005),
                UserProject(id_user=2, id_project="p2", id_rol=1005),
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

    def request(self, id_client, user_id, token_role=None):
        role = token_role if token_role is not None else (1001 if user_id == 3 else 1005)
        headers = {
            "Authorization": "Bearer " + create_access_token({
                "id_user": user_id, "id_rol": role, "two_factor_verified": True,
            }),
        }
        request = Request(f"{self.base}/projects/client/{id_client}", headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def test_usuario_solo_recibe_proyectos_a_los_que_pertenece(self):
        status, response = self.request(10, user_id=1)
        self.assertEqual(status, 200)
        self.assertEqual(
            [project["id_project"] for project in response["data"]],
            ["p1"],
        )
        self.assertEqual(response["data"][0]["sinopsis"], "Sinopsis uno")
        self.assertEqual(response["data"][0]["director"], "Directora uno")

    def test_admin_global_vigente_ve_todo_y_claim_obsoleto_no_eleva_permisos(self):
        status, response = self.request(10, user_id=3)
        self.assertEqual(status, 200)
        self.assertEqual(
            {project["id_project"] for project in response["data"]},
            {"p1", "p2"},
        )

        # El usuario 1 no es admin en la BD: un claim antiguo de admin no le
        # permite enumerar el proyecto asignado únicamente al usuario 2.
        status, response = self.request(10, user_id=1, token_role=1001)
        self.assertEqual(status, 200)
        self.assertEqual(
            [project["id_project"] for project in response["data"]],
            ["p1"],
        )


if __name__ == "__main__":
    unittest.main()
