"""Pruebas de borrado en SQLite en memoria; sin .env ni archivos subidos."""
import os
import sys
import tempfile
import unittest
from datetime import date
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()):
    from app.config.database import Base
    from app.controllers.guion_controller import delete_guion
    from app.controllers.escena_controller import delete_escena
    from app.models.project_model import Project
    from app.models.user_model import User
    from app.models.rodaje_model import Rodaje
    from app.models.personajes_model import Personaje
    from app.models.escenario_model import Escenario
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
    from app.models.galeria_version_foto_model import GaleriaVersionFoto
    from app.utils.codigos import codigos_entidad, codigos_metadata
    from app.utils.auth import _validate_child_resources_project
    from app.utils import file_storage
    from fastapi import HTTPException, Request

from sqlalchemy import create_engine, event
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker


@compiles(LONGTEXT, "sqlite")
def _longtext_sqlite(_type, _compiler, **_kwargs):
    return "TEXT"


class GuionBorradoRelacionesTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")

        @event.listens_for(self.engine, "connect")
        def _fk(connection, _record):
            connection.execute("PRAGMA foreign_keys=ON")

        tables = [
            Project.__table__, User.__table__, Rodaje.__table__, Personaje.__table__,
            Escenario.__table__,
            Guion.__table__, GuionVersion.__table__, GuionNota.__table__,
            Desglose.__table__, DesgloseRequerimiento.__table__, Escena.__table__,
            EscenaVersion.__table__, ContinuidadFoto.__table__, GaleriaItem.__table__,
            EscenaGaleriaItem.__table__, GaleriaVersion.__table__,
            GaleriaVersionFoto.__table__,
        ]
        Base.metadata.create_all(self.engine, tables=tables)
        codigos_metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        # La limpieza física no se ejecuta en estas pruebas.
        is_dir = patch("app.controllers.guion_controller.Path.is_dir", return_value=False)
        is_file = patch("app.controllers.guion_controller.Path.is_file", return_value=False)
        upload_root = patch.object(
            file_storage, "BASE_UPLOAD_DIR",
            os.path.join(tempfile.gettempdir(), "foccus-prueba-sin-archivos"),
        )
        self.is_dir = is_dir.start()
        is_file.start()
        upload_root.start()
        self.addCleanup(is_dir.stop)
        self.addCleanup(is_file.stop)
        self.addCleanup(upload_root.stop)
        self._crear_datos()

    def _crear_datos(self):
        db = self.db
        db.add_all([
            Project(id_project=x, project_name=x, formato_de_produccion="film",
                    genero="drama", id_client=1)
            for x in ("propio", "ajeno")
        ])
        db.flush()
        db.add_all([
            Guion(id_guion=1, nombre="Eliminar", id_project="propio"),
            Guion(id_guion=2, nombre="Conservar", id_project="ajeno"),
            Guion(id_guion=3, nombre="Otro guion", id_project="propio"),
        ])
        db.flush()
        db.add(GuionVersion(id_guion_version=11, id_guion=1,
                            numero_de_version=1, fecha_de_emision=date(2026, 1, 1),
                            contenido='<p class="gb gb-escena" data-escena-id="e1">Uno</p>'))
        db.add_all([Desglose(id_desglose=x) for x in ("exclusivo", "compartido", "ajeno")])
        db.flush()
        db.query(Guion).filter_by(id_guion=1).update({"id_guion_version_actual": 11})
        db.add_all([
            DesgloseRequerimiento(id_requerimiento="r-" + x, id_desglose=x,
                                   departamento="Arte")
            for x in ("exclusivo", "compartido", "ajeno")
        ])
        db.add_all([
            Escena(id_escena="e1", numero_de_escena="1", encabezado="Uno",
                   id_guion=1, id_desglose="exclusivo"),
            Escena(id_escena="e2", numero_de_escena="2", encabezado="Dos",
                   id_guion=1, id_desglose="compartido"),
            Escena(id_escena="e3", numero_de_escena="3", encabezado="Tres",
                   id_guion=2, id_desglose="compartido"),
            Escena(id_escena="e4", numero_de_escena="4", encabezado="Cuatro",
                   id_guion=2, id_desglose="ajeno"),
            Escena(id_escena="e5", numero_de_escena="5", encabezado="Cinco",
                   id_guion=3, id_desglose="compartido"),
        ])
        db.flush()
        db.add(EscenaVersion(id_escena_version=21, id_escena="e1", numero_version=1))
        db.add_all([
            GaleriaItem(id_galeria=31, id_project="propio", tipo="objeto",
                        nombre="Compartido", descripcion="x", archivo_path="no-tocar",
                        id_guion=1, id_escena="e1"),
            GaleriaItem(id_galeria=32, id_project="ajeno", tipo="objeto",
                        nombre="Ajeno", descripcion="x", archivo_path="no-tocar",
                        id_guion=2, id_escena="e3"),
            GaleriaItem(id_galeria=33, id_project="propio", tipo="objeto",
                        nombre="Referencias cruzadas", descripcion="x",
                        archivo_path="no-tocar", id_guion=3, id_escena="e2"),
        ])
        db.flush()
        db.add_all([
            ContinuidadFoto(id_foto=22, id_escena_version=21, tipo="objeto",
                            archivo_path="no-tocar"),
            EscenaGaleriaItem(id_escena="e1", id_galeria=31),
            EscenaGaleriaItem(id_escena="e3", id_galeria=31),
            EscenaGaleriaItem(id_escena="e3", id_galeria=32),
            GaleriaVersion(id_version=41, id_galeria=31, id_project="propio",
                           numero_version=1, nombre_elemento="x", detalles_uso="x",
                           id_guion=1, id_escena="e1"),
            GaleriaVersion(id_version=42, id_galeria=32, id_project="ajeno",
                           numero_version=1, nombre_elemento="x", detalles_uso="x",
                           id_guion=2, id_escena="e3"),
            GaleriaVersion(id_version=43, id_galeria=33, id_project="propio",
                           numero_version=1, nombre_elemento="x", detalles_uso="x",
                           id_guion=1, id_escena="e5"),
        ])
        db.flush()
        db.add(GaleriaVersionFoto(id_foto=51, id_version=41, id_project="propio",
                                  archivo_path="no-tocar"))
        db.execute(codigos_entidad.insert(), [
            {"ambito": project, "id_project": project, "tipo": tipo,
             "entidad_id": entidad, "codigo": codigo}
            for project, tipo, entidad, codigo in (
                ("propio", "GUI", "1", "GUI-001"),
                ("propio", "VGU", "11", "VGU-001"),
                ("propio", "ESC", "e1", "ESC-001"),
                ("ajeno", "GUI", "2", "GUI-002"),
            )
        ])
        db.commit()

    def test_limpia_solo_desgloses_sin_referencias_y_desvincula_galeria(self):
        self.assertTrue(delete_guion(1, self.db)["success"])
        self.db.expire_all()
        self.assertIsNone(self.db.get(Guion, 1))
        self.assertIsNone(self.db.get(GuionVersion, 11))
        self.assertIsNone(self.db.get(EscenaVersion, 21))
        self.assertIsNone(self.db.get(ContinuidadFoto, 22))
        self.assertIsNone(self.db.get(Desglose, "exclusivo"))
        self.assertIsNone(self.db.get(DesgloseRequerimiento, "r-exclusivo"))
        for key in ("compartido", "ajeno"):
            self.assertIsNotNone(self.db.get(Desglose, key))
            self.assertIsNotNone(self.db.get(DesgloseRequerimiento, "r-" + key))
        self.assertIsNone(self.db.get(EscenaGaleriaItem, ("e1", 31)))
        self.assertIsNotNone(self.db.get(EscenaGaleriaItem, ("e3", 31)))
        self.assertIsNotNone(self.db.get(GaleriaVersionFoto, 51))
        for model, key in ((GaleriaItem, 31), (GaleriaVersion, 41)):
            item = self.db.get(model, key)
            self.assertIsNotNone(item)
            self.assertIsNone(item.id_guion)
            self.assertIsNone(item.id_escena)
        for model, key in ((GaleriaItem, 32), (GaleriaVersion, 42)):
            item = self.db.get(model, key)
            self.assertEqual((item.id_guion, item.id_escena), (2, "e3"))
        item = self.db.get(GaleriaItem, 33)
        self.assertEqual((item.id_guion, item.id_escena), (3, None))
        version = self.db.get(GaleriaVersion, 43)
        self.assertEqual((version.id_guion, version.id_escena), (None, "e5"))
        self.assertIsNotNone(self.db.get(Guion, 2))
        self.assertIsNotNone(self.db.get(Guion, 3))
        self.assertEqual(self.db.query(codigos_entidad).count(), 1)

    def test_fallo_limpieza_codigos_revierte_todo(self):
        @event.listens_for(self.engine, "before_cursor_execute")
        def _fallar(_conn, _cursor, statement, _params, _context, _many):
            if statement.lower().startswith("delete from codigos_entidad"):
                raise OperationalError(statement, {}, Exception("fallo simulado"))

        with self.assertRaises(OperationalError):
            delete_guion(1, self.db)
        self.is_dir.assert_not_called()
        self.db.expire_all()
        self.assertIsNotNone(self.db.get(Guion, 1))
        self.assertEqual(self.db.get(Guion, 1).id_guion_version_actual, 11)
        self.assertIsNotNone(self.db.get(Escena, "e1"))
        self.assertIsNotNone(self.db.get(GuionVersion, 11))
        self.assertIsNotNone(self.db.get(EscenaVersion, 21))
        self.assertIsNotNone(self.db.get(ContinuidadFoto, 22))
        self.assertIsNotNone(self.db.get(DesgloseRequerimiento, "r-exclusivo"))
        self.assertIsNotNone(self.db.get(EscenaGaleriaItem, ("e1", 31)))
        self.assertEqual(self.db.get(GaleriaVersion, 41).id_guion, 1)
        self.assertEqual(self.db.query(codigos_entidad).count(), 4)

    def test_eliminar_ficha_y_relaciones_conserva_texto_historico_y_recursos_compartidos(self):
        resultado = delete_escena("e1", "propio", self.db)

        self.assertTrue(resultado["success"])
        self.db.expire_all()
        self.assertIsNone(self.db.get(Escena, "e1"))
        self.assertIsNone(self.db.get(EscenaVersion, 21))
        self.assertIsNone(self.db.get(ContinuidadFoto, 22))
        self.assertIsNone(self.db.get(EscenaGaleriaItem, ("e1", 31)))
        self.assertIsNotNone(self.db.get(Guion, 1))
        self.assertEqual(
            self.db.get(GuionVersion, 11).contenido,
            '<p class="gb gb-escena" data-escena-id="e1">Uno</p>',
        )
        self.assertIsNone(self.db.get(Desglose, "exclusivo"))
        self.assertIsNotNone(self.db.get(Desglose, "compartido"))
        self.assertIsNotNone(self.db.get(GaleriaItem, 31))
        self.assertIsNone(self.db.get(GaleriaItem, 31).id_escena)
        self.assertIsNotNone(self.db.get(GaleriaVersion, 41))
        self.assertIsNone(self.db.get(GaleriaVersion, 41).id_escena)
        self.assertIsNotNone(self.db.get(GaleriaVersionFoto, 51))
        self.assertIsNotNone(self.db.get(Escena, "e3"))
        self.assertEqual(
            self.db.query(codigos_entidad).filter_by(tipo="ESC", entidad_id="e1").count(),
            0,
        )

    def test_error_al_limpiar_codigo_revierte_el_borrado_global_de_escena(self):
        error = OperationalError("inspección", {}, Exception("fallo simulado"))
        with patch("app.controllers.escena_controller.inspect", side_effect=error):
            with self.assertRaises(OperationalError):
                delete_escena("e1", "propio", self.db)
        self.db.expire_all()
        self.assertIsNotNone(self.db.get(Escena, "e1"))
        self.assertIsNotNone(self.db.get(EscenaVersion, 21))
        self.assertIsNotNone(self.db.get(ContinuidadFoto, 22))
        self.assertIsNotNone(self.db.get(EscenaGaleriaItem, ("e1", 31)))
        self.assertEqual(
            self.db.query(codigos_entidad).filter_by(tipo="ESC", entidad_id="e1").count(),
            1,
        )

    def test_error_al_comprobar_tabla_revierte_todo(self):
        error = OperationalError("inspección", {}, Exception("fallo simulado"))
        with patch("app.controllers.guion_controller.inspect", side_effect=error):
            with self.assertRaises(OperationalError):
                delete_guion(1, self.db)
        self.is_dir.assert_not_called()
        self.db.expire_all()
        self.assertIsNotNone(self.db.get(Escena, "e1"))
        self.assertIsNotNone(self.db.get(DesgloseRequerimiento, "r-exclusivo"))
        self.assertIsNotNone(self.db.get(EscenaGaleriaItem, ("e1", 31)))
        self.assertEqual(self.db.get(GaleriaItem, 31).id_guion, 1)

    def test_tabla_codigos_ausente_no_impide_borrar(self):
        codigos_entidad.drop(self.engine)
        self.assertTrue(delete_guion(1, self.db)["success"])
        self.assertIsNone(self.db.get(Guion, 1))
        self.assertIsNotNone(self.db.get(Guion, 2))

    def test_autorizacion_rechaza_guion_de_otro_proyecto(self):
        request = Request({
            "type": "http", "method": "DELETE", "path": "/guiones/2",
            "headers": [], "path_params": {"id_guion": 2},
        })
        with self.assertRaises(HTTPException) as error:
            _validate_child_resources_project(request, "propio", self.db)
        self.assertEqual(error.exception.status_code, 404)
        self.assertIsNotNone(self.db.get(Guion, 2))


if __name__ == "__main__":
    unittest.main()
