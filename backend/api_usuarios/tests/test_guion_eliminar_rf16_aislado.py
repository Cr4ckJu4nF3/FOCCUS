"""Contrato RF-16 probado con SQLite temporal; nunca conecta con MySQL."""
import json
import os
import socket
import sys
import tempfile
import threading
import time
import unittest
from datetime import date, datetime
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importar la configuración no debe abrir una conexión real.
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
    from app.models.escena_model import Escena
    from app.models.escena_version_model import EscenaVersion
    from app.models.continuidad_foto_model import ContinuidadFoto
    from app.models.desglose_model import Desglose
    from app.models.desglose_requerimiento_model import DesgloseRequerimiento
    from app.models.escena_galeria_item_model import EscenaGaleriaItem
    from app.models.galeria_model import GaleriaItem
    from app.models.galeria_version_model import GaleriaVersion
    from app.routes.guion_routes import router
    from app.utils.auth import create_access_token
    from app.utils import codigos, file_storage

from sqlalchemy import Column, Integer, String, Table, create_engine, event
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(LONGTEXT, "sqlite")
def _longtext_sqlite(_type, _compiler, **_kwargs):
    return "TEXT"


# Las escenas tienen referencias a módulos que RF-16 no usa. Se registran
# tablas mínimas en el esquema de prueba, sin importar ni inicializar esos módulos.
for _table_name, _key_name, _key_type in (
    ("rodaje", "id_rodaje", String(20)),
    ("personajes", "id_personaje", String(15)),
    ("escenarios", "id_escenario", String(15)),
):
    if _table_name not in Base.metadata.tables:
        Table(_table_name, Base.metadata, Column(_key_name, _key_type, primary_key=True))


class GuionEliminarRF16AisladoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directorio = tempfile.TemporaryDirectory()
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        @event.listens_for(cls.engine, "connect")
        def _activar_foreign_keys(connection, _record):
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        Base.metadata.create_all(
            cls.engine,
            tables=[
                Project.__table__, User.__table__, UserProject.__table__,
                Guion.__table__, GuionVersion.__table__, GuionNota.__table__,
                Escena.__table__, EscenaVersion.__table__, ContinuidadFoto.__table__,
                Base.metadata.tables["rodaje"], Desglose.__table__,
                DesgloseRequerimiento.__table__, Base.metadata.tables["personajes"],
                Base.metadata.tables["escenarios"], GaleriaItem.__table__,
                EscenaGaleriaItem.__table__, GaleriaVersion.__table__,
            ],
        )
        codigos.codigos_metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)
        cls.upload_root = Path(cls.directorio.name) / "uploads"
        cls.upload_root.mkdir()

        with cls.Session() as db:
            db.add_all([
                Project(id_project=project_id, project_name=project_id,
                        formato_de_produccion="film", genero="drama", id_client=1)
                for project_id in ("rf16-a", "rf16-b")
            ])
            db.flush()
            for user_id in (1, 2):
                db.add(User(
                    id_user=user_id, nombre="Prueba", apellido="RF16",
                    identificacion="CC", id_identificacion=f"rf16-{user_id}",
                    mail=f"rf16-{user_id}@example.test", msisdn="0",
                    fecha_de_nacimiento=datetime(2000, 1, 1), estado="activo",
                    contrasena="hash", id_rol=1001,
                ))
            db.flush()
            db.add_all([
                UserProject(id_user=1, id_project="rf16-a", id_rol=1001),
                UserProject(id_user=2, id_project="rf16-b", id_rol=1001),
            ])
            db.flush()
            db.add_all([
                Guion(id_guion=1601, nombre="Desechable", id_project="rf16-a"),
                Guion(id_guion=1602, nombre="Otro guion", id_project="rf16-a"),
                Guion(id_guion=1603, nombre="Otro proyecto", id_project="rf16-b"),
                Guion(id_guion=1604, nombre="Intento ajeno", id_project="rf16-a"),
            ])
            db.flush()
            db.add_all([
                GuionVersion(id_guion_version=1611, id_guion=1601,
                             numero_de_version=1, archivo="uploads/guiones/1601/v1.pdf",
                             contenido="<p>Versión uno</p>", fecha_de_emision=date.today()),
                GuionVersion(id_guion_version=1612, id_guion=1601,
                             numero_de_version=2, archivo="uploads/guiones/1601/v2.pdf",
                             contenido="<p>Versión dos</p>", fecha_de_emision=date.today()),
                GuionVersion(id_guion_version=1621, id_guion=1602,
                             numero_de_version=1, archivo="uploads/guiones/1602/otro.pdf",
                             contenido="<p>Conservar</p>", fecha_de_emision=date.today()),
                GuionVersion(id_guion_version=1631, id_guion=1603,
                             numero_de_version=1, archivo="uploads/guiones/1603/otro-proyecto.pdf",
                             contenido="<p>Conservar también</p>", fecha_de_emision=date.today()),
            ])
            db.flush()
            db.query(Guion).filter(Guion.id_guion == 1601).update(
                {Guion.id_guion_version_actual: 1612}
            )
            db.add_all([
                GuionNota(id_guion_version=1611, id_user=1, contenido="Nota anterior"),
                GuionNota(id_guion_version=1612, id_user=1, contenido="Nota actual"),
                GuionNota(id_guion_version=1621, id_user=1, contenido="Nota ajena"),
            ])
            db.add_all([
                Escena(id_escena="RF16-01", numero_de_escena="1",
                       encabezado="INT. PRUEBA - DÍA", id_guion=1601),
                Escena(id_escena="RF16-02", numero_de_escena="1",
                       encabezado="INT. CONSERVAR - DÍA", id_guion=1602),
                Escena(id_escena="RF16-03", numero_de_escena="1",
                       encabezado="INT. OTRO PROYECTO - DÍA", id_guion=1603),
            ])
            db.flush()
            db.add(EscenaVersion(id_escena_version=1641, id_escena="RF16-01",
                                 numero_version=1, creado_por=1))
            db.flush()
            db.add(ContinuidadFoto(id_foto=1651, id_escena_version=1641,
                                   tipo="objeto", etiqueta="prueba", notas=None,
                                   archivo_path="uploads/escenas/RF16-01/continuidad/foto.jpg"))
            for type_name, entity_id, project_id, code in (
                ("GUI", "1601", "rf16-a", "GUI-101"),
                ("VGU", "1611", "rf16-a", "VGU-101"),
                ("VGU", "1612", "rf16-a", "VGU-102"),
                ("GUI", "1602", "rf16-a", "GUI-102"),
                ("VGU", "1621", "rf16-a", "VGU-103"),
                ("GUI", "1603", "rf16-b", "GUI-103"),
                ("VGU", "1631", "rf16-b", "VGU-104"),
                ("GUI", "1604", "rf16-a", "GUI-104"),
                ("ESC", "RF16-01", "rf16-a", "ESC-101"),
                ("ESC", "RF16-02", "rf16-a", "ESC-102"),
                ("ESC", "RF16-03", "rf16-b", "ESC-103"),
            ):
                db.execute(codigos.codigos_entidad.insert().values(
                    ambito=project_id, tipo=type_name, id_project=project_id,
                    entidad_id=entity_id, codigo=code,
                ))
            db.commit()

        for relative in (
            "guiones/1601/v1.pdf", "guiones/1601/v2.pdf",
            "guiones/1602/otro.pdf", "guiones/1603/otro-proyecto.pdf",
            "escenas/RF16-01/continuidad/foto.jpg",
        ):
            file_path = cls.upload_root / relative
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(b"solo archivo de prueba RF-16")

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
        cls.thread = threading.Thread(
            target=cls.server.run, kwargs={"sockets": [cls.sock]}, daemon=True
        )
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
        cls.directorio.cleanup()

    def setUp(self):
        self.upload_patch = patch.object(file_storage, "BASE_UPLOAD_DIR", str(self.upload_root))
        self.upload_patch.start()
        self.addCleanup(self.upload_patch.stop)

    def request_delete(self, guion_id=1601, user_id=1, project_id="rf16-a", token=True):
        headers = {}
        if project_id:
            headers["X-Project-Id"] = project_id
        if token:
            headers["Authorization"] = "Bearer " + create_access_token({
                "id_user": user_id, "two_factor_verified": True,
            })
        request = Request(f"{self.base}/guiones/{guion_id}", method="DELETE", headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def test_elimina_dependencias_archivos_y_codigos_del_guion_sin_tocar_otros(self):
        status, response = self.request_delete()
        self.assertEqual(status, 200, response)
        self.assertTrue(response["success"])

        with self.Session() as db:
            self.assertIsNone(db.query(Guion).filter_by(id_guion=1601).first())
            self.assertEqual(db.query(GuionVersion).filter_by(id_guion=1601).count(), 0)
            self.assertEqual(db.query(GuionNota).filter(
                GuionNota.id_guion_version.in_((1611, 1612))
            ).count(), 0)
            self.assertIsNone(db.query(Escena).filter_by(id_escena="RF16-01").first())
            self.assertIsNone(db.query(EscenaVersion).filter_by(id_escena_version=1641).first())
            self.assertIsNone(db.query(ContinuidadFoto).filter_by(id_foto=1651).first())
            self.assertEqual(db.query(codigos.codigos_entidad).filter(
                codigos.codigos_entidad.c.entidad_id.in_(
                    ("1601", "1611", "1612", "RF16-01")
                )
            ).count(), 0)

            self.assertIsNotNone(db.query(Guion).filter_by(id_guion=1602).first())
            self.assertIsNotNone(db.query(Guion).filter_by(id_guion=1603).first())
            self.assertIsNotNone(db.query(Project).filter_by(id_project="rf16-b").first())
            self.assertEqual(db.query(GuionVersion).filter(
                GuionVersion.id_guion.in_((1602, 1603))
            ).count(), 2)
            self.assertEqual(db.query(GuionNota).filter_by(id_guion_version=1621).count(), 1)
            self.assertIsNotNone(db.query(Escena).filter_by(id_escena="RF16-02").first())
            self.assertIsNotNone(db.query(Escena).filter_by(id_escena="RF16-03").first())
            self.assertEqual(db.query(codigos.codigos_entidad).filter(
                codigos.codigos_entidad.c.entidad_id.in_(
                    ("1602", "1621", "RF16-02", "1603", "1631", "RF16-03")
                )
            ).count(), 6)

        self.assertFalse((self.upload_root / "guiones/1601/v1.pdf").exists())
        self.assertFalse((self.upload_root / "guiones/1601/v2.pdf").exists())
        self.assertFalse((self.upload_root / "escenas/RF16-01/continuidad/foto.jpg").exists())
        self.assertTrue((self.upload_root / "guiones/1602/otro.pdf").exists())
        self.assertTrue((self.upload_root / "guiones/1603/otro-proyecto.pdf").exists())

    def test_informa_si_el_borrado_de_archivos_falla_despues_del_commit(self):
        relative_path = "uploads/guiones/1605/bloqueado.pdf"
        file_path = self.upload_root / "guiones/1605/bloqueado.pdf"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(b"archivo temporal de fallo")
        with self.Session() as db:
            db.add(Guion(id_guion=1605, nombre="Limpieza fallida", id_project="rf16-a"))
            db.flush()
            db.add(GuionVersion(
                id_guion_version=1655, id_guion=1605, numero_de_version=1,
                archivo=relative_path, fecha_de_emision=date.today(),
            ))
            db.commit()

        with patch(
            "app.controllers.guion_controller.shutil.rmtree",
            side_effect=PermissionError("sin permiso"),
        ), patch(
            "app.controllers.guion_controller.Path.unlink",
            side_effect=PermissionError("sin permiso"),
        ):
            status, response = self.request_delete(guion_id=1605)

        self.assertEqual(status, 200)
        self.assertFalse(response["success"])
        self.assertEqual(response["error"], "FILE_CLEANUP_FAILED")
        self.assertTrue(response["data"]["archivos_pendientes"])
        with self.Session() as db:
            self.assertIsNone(db.query(Guion).filter_by(id_guion=1605).first())
        self.assertTrue(file_path.exists())

    def test_admin_de_otro_proyecto_no_puede_borrar_el_guion_ajeno(self):
        status, _ = self.request_delete(
            guion_id=1604, user_id=2, project_id="rf16-b"
        )
        self.assertEqual(status, 404)
        with self.Session() as db:
            self.assertIsNotNone(db.query(Guion).filter_by(id_guion=1604).first())

    def test_sin_autenticacion_no_borra_y_guion_inexistente_tiene_error_explicito(self):
        self.assertEqual(self.request_delete(guion_id=1602, token=False)[0], 401)
        with self.Session() as db:
            self.assertIsNotNone(db.query(Guion).filter_by(id_guion=1602).first())
        status, response = self.request_delete(guion_id=1699)
        self.assertEqual(status, 404)
        self.assertEqual(response["detail"], "Recurso no encontrado")


if __name__ == "__main__":
    unittest.main()
