"""Eliminación de proyectos y códigos, exclusivamente con SQLite en memoria."""
import json
import os
import socket
import sys
import threading
import time
import unittest
from datetime import date
from unittest.mock import MagicMock, patch
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# database.py intenta leer .env y conectar al importarse: impedir ambas cosas.
with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()), \
        patch("builtins.print"):
    from app.config.database import Base
    from app.controllers import project_controller
    from app.models.client_model import Client  # noqa: F401
    from app.models.role_model import Role  # noqa: F401
    from app.routes.project_routes import router
    from app.utils.auth import require_project_admin

from fastapi import FastAPI
import uvicorn
from sqlalchemy import create_engine, event, select
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.utils import codigos


@compiles(LONGTEXT, "sqlite")
def _longtext_sqlite(_type, _compiler, **_kwargs):
    return "TEXT"


class ProjectCodigosAisladoTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)

        @event.listens_for(self.engine, "connect")
        def conectar(conn, _):
            conn.isolation_level = None
            conn.execute("PRAGMA foreign_keys=ON")

        @event.listens_for(self.engine, "begin")
        def comenzar(conn):
            conn.exec_driver_sql("BEGIN")

        Base.metadata.create_all(self.engine)
        codigos.codigos_metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        # Ninguna prueba examina ni borra archivos cargados.
        for metodo in ("is_dir", "is_file"):
            sustitucion = patch.object(project_controller.Path, metodo, return_value=False)
            sustitucion.start()
            self.addCleanup(sustitucion.stop)
        sustitucion = patch.object(project_controller, "BASE_UPLOAD_DIR", "ruta-inexistente-aislada")
        sustitucion.start()
        self.addCleanup(sustitucion.stop)
        self._sembrar()

    def _sembrar(self):
        pc = project_controller
        for n in (1, 2):
            pid = f"p{n}"
            self.db.add(pc.Project(id_project=pid, project_name=pid,
                                   formato_de_produccion="film", genero="drama", id_client=1))
        self.db.flush()
        for n in (1, 2):
            pid = f"p{n}"
            self.db.add(pc.Guion(id_guion=n, id_project=pid, nombre="Guion"))
            self.db.add(pc.Personaje(id_personaje=f"per{n}", id_project=pid, nombre="Personaje"))
            self.db.add(pc.Escenario(id_escenario=f"loc{n}", id_project=pid, nombre="Lugar"))
            self.db.add(pc.Rodaje(id_rodaje=f"rod{n}", id_project=pid, nombre="Rodaje",
                                  fecha_inicio=date(2026, 1, 1)))
        self.db.flush()
        for n in (1, 2):
            self.db.add(pc.GuionVersion(id_guion_version=n, id_guion=n, numero_de_version=1,
                                        fecha_de_emision=date(2026, 1, 1), estado="Borrador"))
            self.db.add(pc.Escena(id_escena=f"esc{n}", id_guion=n,
                                  numero_de_escena="12A", encabezado="Escena"))
            for offset, categoria in ((0, "utileria"), (2, "vestuario")):
                self.db.add(pc.GaleriaItem(id_galeria=n + offset, id_project=f"p{n}",
                                           tipo="objeto", categoria=categoria, nombre="Objeto",
                                           descripcion="", archivo_path=""))
        self.db.flush()
        for n in (1, 2):
            pid = f"p{n}"
            for tipo, entidad in (
                ("PRO", pid), ("GUI", n), ("VGU", n), ("ESC", f"esc{n}"),
                ("PER", f"per{n}"), ("LOC", f"loc{n}"),
                ("OBJ", n), ("VES", n + 2), ("DRO", f"rod{n}"),
            ):
                self.assertIsNotNone(codigos.asignar_codigo(self.db, tipo, entidad, pid))
        self.db.commit()

    def _filas(self, tabla):
        return [tuple(fila) for fila in self.db.execute(select(tabla)).all()]

    def test_elimina_codigos_de_todas_las_entidades_y_preserva_otro_proyecto(self):
        antes = self._filas(codigos.codigos_entidad)
        contadores = self._filas(codigos.codigos_contador)
        modelos_y_ids = ((project_controller.Project, "p2"),
                         (project_controller.Guion, 2),
                         (project_controller.GuionVersion, 2),
                         (project_controller.Escena, "esc2"),
                         (project_controller.Personaje, "per2"),
                         (project_controller.Escenario, "loc2"),
                         (project_controller.GaleriaItem, 2),
                         (project_controller.GaleriaItem, 4),
                         (project_controller.Rodaje, "rod2"))
        resultado = project_controller.delete_project("p1", self.db)

        self.assertTrue(resultado["success"])
        self.assertEqual(self._filas(codigos.codigos_entidad),
                         [fila for fila in antes if fila[3] == "p2"])
        self.assertEqual(self._filas(codigos.codigos_contador), contadores)
        for modelo, clave in modelos_y_ids:
            self.assertIsNotNone(self.db.get(modelo, clave), modelo.__name__)
        for modelo, clave in ((project_controller.Project, "p1"),
                              (project_controller.Guion, 1),
                              (project_controller.GuionVersion, 1),
                              (project_controller.Escena, "esc1"),
                              (project_controller.Personaje, "per1"),
                              (project_controller.Escenario, "loc1"),
                              (project_controller.GaleriaItem, 1),
                              (project_controller.GaleriaItem, 3),
                              (project_controller.Rodaje, "rod1")):
            self.assertIsNone(self.db.get(modelo, clave), modelo.__name__)
        self.assertEqual(self.db.get(project_controller.Escena, "esc2").numero_de_escena, "12A")

        # Recrear el mismo ámbito no reinicia sus contadores; PRO es global.
        self.assertEqual(codigos.asignar_codigo(self.db, "PRO", "p1", "p1"), "PRO-003")
        for tipo, entidad in (("GUI", 1), ("VGU", 1), ("ESC", "esc1"),
                              ("PER", "per1"), ("LOC", "loc1"), ("OBJ", 1),
                              ("VES", 3), ("DRO", "rod1")):
            self.assertEqual(codigos.asignar_codigo(self.db, tipo, entidad, "p1"), f"{tipo}-002")
        self.assertEqual(codigos.asignar_codigo(self.db, "ESC", "esc3", "p2"), "ESC-002")

    def test_fallo_limpieza_revierte_codigos_y_entidades(self):
        codigos_antes = self._filas(codigos.codigos_entidad)
        contadores_antes = self._filas(codigos.codigos_contador)

        @event.listens_for(self.engine, "before_cursor_execute")
        def fallar(_conn, _cursor, statement, _parameters, _context, _many):
            if statement.lower().startswith("delete from codigos_entidad"):
                raise OperationalError(statement, None, Exception("fallo simulado al borrar códigos"))

        with self.assertRaisesRegex(OperationalError, "fallo simulado"):
            project_controller.delete_project("p1", self.db)
        event.remove(self.engine, "before_cursor_execute", fallar)
        self.assertEqual(self._filas(codigos.codigos_entidad), codigos_antes)
        self.assertEqual(self._filas(codigos.codigos_contador), contadores_antes)
        for modelo, clave in ((project_controller.Project, "p1"),
                              (project_controller.Guion, 1),
                              (project_controller.GuionVersion, 1),
                              (project_controller.Escena, "esc1")):
            self.assertIsNotNone(self.db.get(modelo, clave))

    def test_fallo_posterior_a_limpieza_revierte_todo(self):
        codigos_antes = self._filas(codigos.codigos_entidad)
        contadores_antes = self._filas(codigos.codigos_contador)

        @event.listens_for(self.engine, "before_cursor_execute")
        def fallar(_conn, _cursor, statement, _parameters, _context, _many):
            if statement.lower().startswith("delete from projects"):
                raise RuntimeError("fallo simulado después de limpiar")

        with self.assertRaisesRegex(RuntimeError, "después de limpiar"):
            project_controller.delete_project("p1", self.db)
        event.remove(self.engine, "before_cursor_execute", fallar)
        self.assertEqual(self._filas(codigos.codigos_entidad), codigos_antes)
        self.assertEqual(self._filas(codigos.codigos_contador), contadores_antes)
        for modelo, clave in ((project_controller.Project, "p1"),
                              (project_controller.Guion, 1),
                              (project_controller.GuionVersion, 1),
                              (project_controller.Escena, "esc1")):
            self.assertIsNotNone(self.db.get(modelo, clave))

    def test_sin_tablas_de_codigos_sigue_permitiendo_eliminar(self):
        self.db.close()
        codigos.codigos_metadata.drop_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.addCleanup(self.db.close)
        self.assertTrue(project_controller.delete_project("p1", self.db)["success"])
        self.assertIsNotNone(self.db.get(project_controller.Project, "p2"))

    def test_endpoint_delete_con_uvicorn_y_bd_aislada(self):
        from app.config.database import get_db

        app = FastAPI()
        app.include_router(router)
        fabrica = sessionmaker(bind=self.engine)

        def db_aislada():
            with fabrica() as db:
                yield db

        app.dependency_overrides[get_db] = db_aislada
        app.dependency_overrides[require_project_admin] = lambda: {"id_rol": 1001}
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        sock.listen(16)
        servidor = uvicorn.Server(uvicorn.Config(app, log_level="error", lifespan="off"))
        hilo = threading.Thread(target=servidor.run, kwargs={"sockets": [sock]}, daemon=True)
        hilo.start()
        try:
            for _ in range(100):
                if servidor.started:
                    break
                time.sleep(0.05)
            self.assertTrue(servidor.started, "uvicorn aislado no arrancó")
            url = f"http://127.0.0.1:{sock.getsockname()[1]}/projects/p1"
            with urlopen(Request(url, method="DELETE"), timeout=5) as respuesta:
                self.assertEqual(respuesta.status, 200)
                self.assertTrue(json.load(respuesta)["success"])
            self.assertEqual(len([f for f in self._filas(codigos.codigos_entidad)
                                  if f[3] == "p1"]), 0)
            self.assertIsNotNone(self.db.get(project_controller.Project, "p2"))
        finally:
            servidor.should_exit = True
            hilo.join(timeout=5)
            sock.close()


if __name__ == "__main__":
    unittest.main()
