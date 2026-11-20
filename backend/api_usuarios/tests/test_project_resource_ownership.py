"""HTTP tests for resource-to-project ownership, isolated on in-memory SQLite."""
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

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()):
    from fastapi import FastAPI
    import uvicorn
    from app.config.database import Base, get_db
    from app.models.Guion import Guion
    from app.models.continuidad_foto_model import ContinuidadFoto
    from app.models.desglose_model import Desglose
    from app.models.desglose_requerimiento_model import DesgloseRequerimiento
    from app.models.escena_model import Escena
    from app.models.escena_version_model import EscenaVersion
    from app.models.guion_version_model import GuionVersion
    from app.models.escenario_model import Escenario
    from app.models.personajes_model import Personaje
    from app.models.proceso_rodaje_model import ProcesoRodaje
    from app.models.project_model import Project
    from app.models.rodaje_model import Rodaje
    from app.models.user_model import User
    from app.models.user_project_model import UserProject
    from app.routes.continuidad_routes import router as continuidad_router
    from app.routes.desglose_routes import router as desglose_router
    from app.routes.escena_routes import router as escena_router
    from app.routes.guion_routes import router as guion_router
    from app.routes.personaje_routes import router as personaje_router
    from app.routes.project_routes import router as project_router
    from app.routes.escenario_routes import router as escenario_router
    from app.routes.rodaje_routes import router as rodaje_router
    from app.utils.auth import create_access_token

from sqlalchemy import create_engine
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(LONGTEXT, "sqlite")
def _longtext_sqlite(_type, _compiler, **_kwargs):
    return "TEXT"


class ProjectResourceOwnershipHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(cls.engine, tables=[
            Project.__table__, User.__table__, UserProject.__table__,
            Guion.__table__, GuionVersion.__table__, Escena.__table__,
            EscenaVersion.__table__, Rodaje.__table__, ProcesoRodaje.__table__,
            Desglose.__table__, DesgloseRequerimiento.__table__,
            Personaje.__table__, Escenario.__table__, ContinuidadFoto.__table__,
        ])
        cls.Session = sessionmaker(bind=cls.engine)
        with cls.Session() as db:
            db.add_all([
                Project(id_project=pid, project_name=pid, formato_de_produccion="film",
                        genero="drama", id_client=1)
                for pid in ("p1", "p2")
            ])
            for user_id in (1, 2, 3):
                db.add(User(
                    id_user=user_id, nombre="Usuario", apellido="Prueba", identificacion="CC",
                    id_identificacion=str(user_id), mail=f"{user_id}@example.test",
                    msisdn="0", fecha_de_nacimiento=datetime(2000, 1, 1),
                    estado="activo", contrasena="hash", id_rol=1005,
                ))
            db.add_all([
                UserProject(id_user=1, id_project="p1", id_rol=1001),
                UserProject(id_user=2, id_project="p2", id_rol=1001),
                UserProject(id_user=3, id_project="p1", id_rol=1005),
                Guion(id_guion=1, nombre="Guion p1", descripcion="Privado p1", id_project="p1"),
                Guion(id_guion=2, nombre="Guion p2", descripcion="Privado p2", id_project="p2"),
                GuionVersion(
                    id_guion_version=1, id_guion=1, numero_de_version=1,
                    contenido="Contenido p1", fecha_de_emision=date(2026, 1, 1), estado="Borrador",
                ),
                GuionVersion(
                    id_guion_version=2, id_guion=2, numero_de_version=1,
                    contenido="Contenido p2", fecha_de_emision=date(2026, 1, 1), estado="Borrador",
                ),
                Rodaje(
                    id_rodaje="rod1", id_project="p1", nombre="Rodaje p1",
                    fecha_inicio=date(2026, 1, 1), estado="Pendiente",
                ),
                Rodaje(
                    id_rodaje="rod2", id_project="p2", nombre="Rodaje p2",
                    fecha_inicio=date(2026, 1, 2), estado="Pendiente",
                ),
                Desglose(id_desglose="dsg1"),
                Desglose(id_desglose="dsg2"),
                Personaje(id_personaje="psj0001", nombre="Personaje p1", id_project="p1"),
                Personaje(id_personaje="psj0002", nombre="Personaje p2", id_project="p2"),
                Escenario(id_escenario="loc0001", nombre="Escenario p1", id_project="p1"),
                Escenario(id_escenario="loc0002", nombre="Escenario p2", id_project="p2"),
            ])
            db.flush()
            db.add_all([
                Escena(
                    id_escena="esc1", numero_de_escena="1", encabezado="Escena p1",
                    id_guion=1, id_rodaje="rod1", id_desglose="dsg1",
                ),
                Escena(
                    id_escena="esc2", numero_de_escena="2", encabezado="Escena p2",
                    id_guion=2, id_rodaje="rod2", id_desglose="dsg2",
                ),
                ProcesoRodaje(
                    id_proceso=1, id_rodaje="rod1", nombre="Proceso p1",
                    ubicacion="Set p1", fecha=date(2026, 1, 1), estado="Pendiente",
                ),
                ProcesoRodaje(
                    id_proceso=2, id_rodaje="rod2", nombre="Proceso p2",
                    ubicacion="Set p2", fecha=date(2026, 1, 2), estado="Pendiente",
                ),
            ])
            db.flush()
            db.add_all([
                EscenaVersion(id_escena_version=1, id_escena="esc1", numero_version=1),
                EscenaVersion(id_escena_version=2, id_escena="esc2", numero_version=1),
                DesgloseRequerimiento(
                    id_requerimiento="req1", id_desglose="dsg1",
                    departamento="Props", etiqueta="Elemento p1",
                ),
                DesgloseRequerimiento(
                    id_requerimiento="req2", id_desglose="dsg2",
                    departamento="Props", etiqueta="Elemento p2",
                ),
            ])
            db.commit()

        cls.app = FastAPI()
        for router in (
            escena_router, guion_router, continuidad_router, rodaje_router,
            desglose_router, personaje_router, escenario_router, project_router,
        ):
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

    def request(self, path, method="GET", body=None, raw_body=None, content_type=None, user_id=1, project_id="p1"):
        headers = {
            "Authorization": "Bearer " + create_access_token({
                "id_user": user_id, "two_factor_verified": True,
            }),
            "X-Project-Id": project_id,
        }
        data = raw_body
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        elif content_type:
            headers["Content-Type"] = content_type
        request = Request(f"{self.base}{path}", data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    @staticmethod
    def multipart(fields, files=()):
        boundary = "foccus-test-boundary"
        chunks = []
        for name, value in fields.items():
            chunks.extend([
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                str(value).encode(),
                b"\r\n",
            ])
        for name, filename, content_type, content in files:
            chunks.extend([
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode(),
                f"Content-Type: {content_type}\r\n\r\n".encode(),
                content,
                b"\r\n",
            ])
        chunks.append(f"--{boundary}--\r\n".encode())
        return b"".join(chunks), f"multipart/form-data; boundary={boundary}"

    def test_reads_cannot_cross_projects_or_list_all_scripts(self):
        status, response = self.request("/guiones")
        self.assertEqual(status, 200)
        self.assertEqual([item["id_guion"] for item in response["data"]], [1])

        paths = (
            "/guiones/2",
            "/guiones/2/versiones",
            "/guiones/2/escenas",
            "/guiones/versiones/2/notas",
            "/escenas/esc2",
            "/escenas/esc2/versiones",
            "/escenas/versiones/2/fotos",
            "/rodajes/rod2",
            "/rodajes/rod2/procesos",
            "/guiones/2/desglose",
            "/escenas/esc2/desglose",
        )
        for path in paths:
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)

    def test_cross_project_mutations_are_denied_and_leave_rows_unchanged(self):
        photo_body, photo_type = self.multipart(
            {"tipo": "vestuario"},
            [("archivos", "foto.jpg", "image/jpeg", b"no se debe guardar")],
        )
        pdf_body, pdf_type = self.multipart(
            {}, [("archivo", "desglose.pdf", "application/pdf", b"no se debe importar")],
        )
        mutations = (
            ("/guiones/2", "PATCH", {"nombre": "alterado"}),
            ("/guiones/2", "DELETE", None),
            ("/guiones/2/versiones/2/estado", "PATCH", {"estado": "Aprobado"}),
            ("/escenas/esc2", "PATCH", {"encabezado": "alterado"}),
            ("/escenas/esc2", "DELETE", None),
            ("/escenas/esc2/versiones", "POST", None),
            ("/escenas/versiones/2/fotos", "POST", None),
            ("/rodajes/rod2", "PATCH", {"nombre": "alterado"}),
            ("/rodajes/rod2", "DELETE", None),
            ("/rodajes/rod2/procesos", "POST", {
                "nombre": "No agregar", "ubicacion": "Set", "fecha": "2026-01-03",
            }),
            ("/rodajes/procesos/2", "PATCH", {"nombre": "alterado"}),
            ("/rodajes/procesos/2", "DELETE", None),
            ("/rodajes/rod1/escenas/esc2", "POST", None),
            ("/rodajes/rod1/escenas/esc2", "DELETE", None),
            ("/escenas/esc2/desglose/requerimientos", "POST", {"departamento": "Props"}),
            ("/desglose/requerimientos/req2", "PATCH", {"etiqueta": "alterado"}),
            ("/desglose/requerimientos/req2", "DELETE", None),
        )
        for path, method, body in mutations:
            with self.subTest(path=path, method=method):
                raw_body = None
                content_type = None
                if path == "/escenas/versiones/2/fotos":
                    raw_body, content_type = photo_body, photo_type
                status, _response = self.request(
                    path, method=method, body=body, raw_body=raw_body, content_type=content_type,
                )
                self.assertEqual(status, 404)

        status, _response = self.request(
            "/guiones/2/desglose/importar", method="POST",
            raw_body=pdf_body, content_type=pdf_type,
        )
        self.assertEqual(status, 404)

        with self.Session() as db:
            self.assertEqual(db.get(Guion, 2).nombre, "Guion p2")
            self.assertEqual(db.get(Escena, "esc2").encabezado, "Escena p2")
            self.assertEqual(db.get(Rodaje, "rod2").nombre, "Rodaje p2")
            self.assertEqual(db.get(ProcesoRodaje, 2).nombre, "Proceso p2")
            self.assertEqual(db.get(DesgloseRequerimiento, "req2").etiqueta, "Elemento p2")
            self.assertEqual(db.query(EscenaVersion).filter_by(id_escena="esc2").count(), 1)

    def test_project_ids_and_linked_resource_ids_in_bodies_are_scoped(self):
        self.assertEqual(self.request(
            "/guiones", method="POST",
            body={"nombre": "No crear", "id_project": "p2"},
        )[0], 403)
        self.assertEqual(self.request(
            "/guiones/texto", method="POST",
            body={
                "nombre": "No crear", "id_project": "p2", "contenido": "Texto",
                "fecha_de_emision": "2026-01-01",
            },
        )[0], 403)
        self.assertEqual(self.request(
            "/rodajes", method="POST",
            body={"id_project": "p2", "nombre": "No crear", "fecha_inicio": "2026-01-01"},
        )[0], 403)

        archive_body, archive_type = self.multipart(
            {"id_project": "p2", "nombre": "No crear"},
            [("archivo", "guion.pdf", "application/pdf", b"no crear")],
        )
        self.assertEqual(self.request(
            "/guiones/archivo", method="POST",
            raw_body=archive_body, content_type=archive_type,
        )[0], 403)

        self.assertEqual(self.request(
            "/escenas", method="POST",
            body={"id_guion": 2, "numero_de_escena": "9", "encabezado": "No crear"},
        )[0], 404)
        self.assertEqual(self.request(
            "/escenas/esc1", method="PATCH", body={"id_rodaje": "rod2"},
        )[0], 404)
        self.assertEqual(self.request(
            "/escenas/esc1", method="PATCH", body={"id_desglose": "dsg2"},
        )[0], 404)

        with self.Session() as db:
            self.assertEqual(db.query(Guion).count(), 2)
            self.assertEqual(db.query(Rodaje).count(), 2)
            self.assertEqual(db.query(Escena).count(), 2)
            self.assertEqual(db.get(Escena, "esc1").id_rodaje, "rod1")
            self.assertEqual(db.get(Escena, "esc1").id_desglose, "dsg1")

    def test_same_project_read_and_write_still_work_for_continuity_and_processes(self):
        status, response = self.request("/escenas/esc1/versiones")
        self.assertEqual(status, 200)
        self.assertEqual(len(response["data"]), 1)

        status, _response = self.request("/escenas/esc1/versiones", method="POST")
        self.assertEqual(status, 200)

        status, response = self.request(
            "/rodajes/procesos/1",
            method="PATCH",
            body={"nombre": "Proceso actualizado", "orden": 2},
        )
        self.assertEqual(status, 200)
        self.assertTrue(response["success"])
        with self.Session() as db:
            proceso = db.get(ProcesoRodaje, 1)
            self.assertEqual(proceso.nombre, "Proceso actualizado")
            self.assertEqual(proceso.orden, 2)

        status, response = self.request("/rodajes/rod1/procesos")
        self.assertEqual(status, 200)
        self.assertEqual([item["nombre"] for item in response["data"]], ["Proceso actualizado"])

    def test_personajes_y_escenarios_no_cruzan_proyectos(self):
        for path, key in (
            ("/projects/p1/personajes", "id_personaje"),
            ("/projects/p1/escenarios", "id_escenario"),
        ):
            status, response = self.request(path)
            self.assertEqual(status, 200)
            self.assertEqual(len(response["data"]), 1)
            self.assertEqual(response["data"][0]["id_project"], "p1")

        cross_project_mutations = (
            ("/personajes/psj0002", "PATCH", {"nombre": "No alterar"}),
            ("/personajes/psj0002", "DELETE", None),
            ("/escenarios/loc0002", "PATCH", {"nombre": "No alterar"}),
            ("/escenarios/loc0002", "DELETE", None),
        )
        for path, method, body in cross_project_mutations:
            with self.subTest(path=path, method=method):
                status, _response = self.request(path, method=method, body=body)
                self.assertEqual(status, 404)

        for path, body in (
            ("/personajes", {"nombre": "No crear", "id_project": "p2"}),
            ("/escenarios", {"nombre": "No crear", "id_project": "p2"}),
        ):
            with self.subTest(path=path):
                self.assertEqual(self.request(path, method="POST", body=body)[0], 403)

        with self.Session() as db:
            self.assertEqual(db.get(Personaje, "psj0002").nombre, "Personaje p2")
            self.assertEqual(db.get(Escenario, "loc0002").nombre, "Escenario p2")
            self.assertEqual(db.query(Personaje).count(), 2)
            self.assertEqual(db.query(Escenario).count(), 2)

    def test_admin_sube_foto_continuidad_y_miembro_del_proyecto_puede_consultarla(self):
        body, content_type = self.multipart(
            {"tipo": "vestuario", "etiqueta": "Abrigo escena 1", "id_personaje": "psj0001"},
            [("archivos", "continuidad.jpg", "image/jpeg", b"contenido de prueba")],
        )
        with patch(
            "app.controllers.continuidad_controller.guardar_archivo",
            return_value="mocked/esc1/continuidad/continuidad.jpg",
        ) as guardar_archivo:
            status, response = self.request(
                "/escenas/versiones/1/fotos",
                method="POST",
                raw_body=body,
                content_type=content_type,
                user_id=1,
            )

        self.assertEqual(status, 200)
        self.assertTrue(response["success"])
        self.assertEqual(len(response["data"]), 1)
        self.assertEqual(response["data"][0]["archivo_path"], "mocked/esc1/continuidad/continuidad.jpg")
        guardar_archivo.assert_called_once()

        status, response = self.request(
            "/escenas/versiones/1/fotos?tipo=vestuario",
            user_id=3,
        )
        self.assertEqual(status, 200)
        self.assertTrue(response["success"])
        self.assertEqual(len(response["data"]), 1)
        self.assertEqual(response["data"][0]["etiqueta"], "Abrigo escena 1")
        self.assertEqual(response["data"][0]["id_personaje"], "psj0001")

        with self.Session() as db:
            foto = db.query(ContinuidadFoto).filter_by(id_escena_version=1).one()
            self.assertEqual(foto.archivo_path, "mocked/esc1/continuidad/continuidad.jpg")

    def test_patch_project_admin_puede_editar_su_proyecto_pero_no_otro(self):
        cambios_propios = {
            "project_name": "Proyecto p1 actualizado",
            "formato_de_produccion": "serie",
            "genero": "comedia",
            "sinopsis": "Sinopsis actualizada de p1",
            "director": "Directora p1",
        }
        status, response = self.request(
            "/projects/p1", method="PATCH", body=cambios_propios, project_id="p1",
        )
        self.assertEqual(status, 200)
        self.assertTrue(response["success"])

        with self.Session() as db:
            proyecto = db.get(Project, "p1")
            self.assertEqual(proyecto.project_name, cambios_propios["project_name"])
            self.assertEqual(proyecto.formato_de_produccion, cambios_propios["formato_de_produccion"])
            self.assertEqual(proyecto.genero, cambios_propios["genero"])
            self.assertEqual(proyecto.sinopsis, cambios_propios["sinopsis"])
            self.assertEqual(proyecto.director, cambios_propios["director"])

        cambios_ajenos = {
            "project_name": "No modificar p2",
            "formato_de_produccion": "documental",
            "genero": "terror",
            "sinopsis": "No debe persistir",
            "director": "No autorizado",
        }
        status, _response = self.request(
            "/projects/p2", method="PATCH", body=cambios_ajenos, project_id="p2",
        )
        self.assertEqual(status, 403)

        with self.Session() as db:
            proyecto_ajeno = db.get(Project, "p2")
            self.assertEqual(proyecto_ajeno.project_name, "p2")
            self.assertEqual(proyecto_ajeno.formato_de_produccion, "film")
            self.assertEqual(proyecto_ajeno.genero, "drama")
            self.assertIsNone(proyecto_ajeno.sinopsis)
            self.assertIsNone(proyecto_ajeno.director)


if __name__ == "__main__":
    unittest.main()
