"""Pruebas simples de la generación de códigos (sin MySQL, con SQLite en memoria).

Ejecutar desde backend/api_usuarios:
    .\\.venv\\Scripts\\python.exe -m unittest discover -s tests -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.utils import codigos  # noqa: E402


def _sesion():
    engine = create_engine("sqlite://")

    # SAVEPOINT en pysqlite necesita este ajuste para funcionar bien
    @event.listens_for(engine, "connect")
    def _connect(dbapi_connection, _):
        dbapi_connection.isolation_level = None

    @event.listens_for(engine, "begin")
    def _begin(conn):
        conn.exec_driver_sql("BEGIN")

    codigos.codigos_metadata.create_all(engine)
    return sessionmaker(bind=engine)()


class FormatoTests(unittest.TestCase):
    def test_formatear(self):
        self.assertEqual(codigos.formatear_codigo("ESC", 14), "ESC-014")
        self.assertEqual(codigos.formatear_codigo("GUI", 1), "GUI-001")
        self.assertEqual(codigos.formatear_codigo("ESC", 1000), "ESC-1000")

    def test_formato_valido(self):
        for tipo in codigos.TIPOS:
            self.assertRegex(codigos.formatear_codigo(tipo, 7), codigos.CODIGO_RE)

    def test_tipo_desconocido_y_numero_invalido(self):
        with self.assertRaises(ValueError):
            codigos.formatear_codigo("XXX", 1)
        with self.assertRaises(ValueError):
            codigos.formatear_codigo("ESC", 0)

    def test_numero_de_codigo(self):
        self.assertEqual(codigos.numero_de_codigo("ESC-014"), 14)
        self.assertIsNone(codigos.numero_de_codigo("esc-014"))
        self.assertIsNone(codigos.numero_de_codigo("12A"))

    def test_tipo_galeria(self):
        self.assertEqual(codigos.tipo_galeria("objeto", "Vestuario"), "VES")
        self.assertEqual(codigos.tipo_galeria("objeto", "Utilería"), "OBJ")
        self.assertEqual(codigos.tipo_galeria("objeto", None), "OBJ")
        self.assertIsNone(codigos.tipo_galeria("personaje", None))

    def test_normalizar_consulta(self):
        self.assertEqual(codigos.normalizar_consulta("  esc-01 "), "ESC-01")
        for mala in ("", "a", "ES%", "ESC_01", "x" * 41, "ESC 01", None):
            with self.assertRaises(ValueError):
                codigos.normalizar_consulta(mala)

    def test_es_admin(self):
        self.assertTrue(codigos.es_admin({"id_rol": 1001}))
        self.assertFalse(codigos.es_admin({"id_rol": 1002}))
        self.assertFalse(codigos.es_admin(None))


class AsignacionTests(unittest.TestCase):
    def setUp(self):
        self.db = _sesion()

    def tearDown(self):
        self.db.close()

    def test_consecutivo_por_proyecto_y_tipo(self):
        a = codigos.asignar_codigo(self.db, "ESC", "esc0001", "proj0001")
        b = codigos.asignar_codigo(self.db, "ESC", "esc0002", "proj0001")
        otro = codigos.asignar_codigo(self.db, "ESC", "esc0003", "proj0002")
        per = codigos.asignar_codigo(self.db, "PER", "psj0001", "proj0001")
        self.db.commit()
        self.assertEqual((a, b, otro, per), ("ESC-001", "ESC-002", "ESC-001", "PER-001"))

    def test_proyecto_es_global(self):
        self.assertEqual(codigos.asignar_codigo(self.db, "PRO", "proj0001", "proj0001"), "PRO-001")
        self.assertEqual(codigos.asignar_codigo(self.db, "PRO", "proj0002", "proj0002"), "PRO-002")

    def test_no_reutiliza_numeros_tras_borrar(self):
        codigos.asignar_codigo(self.db, "LOC", "loc0001", "p1")
        codigos.asignar_codigo(self.db, "LOC", "loc0002", "p1")
        tabla = codigos.codigos_entidad
        self.db.execute(tabla.delete().where(tabla.c.entidad_id == "loc0002"))
        self.assertEqual(codigos.asignar_codigo(self.db, "LOC", "loc0003", "p1"), "LOC-003")

    def test_id_reutilizado_recibe_codigo_nuevo(self):
        self.assertEqual(codigos.asignar_codigo(self.db, "PER", "psj0001", "p1"), "PER-001")
        # el registro se borró y su id se reutilizó: el código viejo no se recicla
        self.assertEqual(codigos.asignar_codigo(self.db, "PER", "psj0001", "p1"), "PER-002")

    def test_pasa_de_999(self):
        contador = codigos.codigos_contador
        self.db.execute(contador.insert().values(ambito="p1", tipo="ESC", ultimo=999))
        self.assertEqual(codigos.asignar_codigo(self.db, "ESC", "esc9999", "p1"), "ESC-1000")

    def test_sin_tablas_no_rompe(self):
        engine = create_engine("sqlite://")  # sin crear las tablas de códigos
        db = sessionmaker(bind=engine)()
        self.assertIsNone(codigos.asignar_codigo(db, "ESC", "esc0001", "p1"))
        self.assertEqual(codigos.codigos_de(db, "ESC", ["esc0001"]), {})
        db.close()

    def test_entradas_invalidas(self):
        self.assertIsNone(codigos.asignar_codigo(self.db, "ZZZ", "x", "p1"))
        self.assertIsNone(codigos.asignar_codigo(self.db, "ESC", None, "p1"))
        self.assertIsNone(codigos.asignar_codigo(self.db, "ESC", "x", ""))


class VisibilidadTests(unittest.TestCase):
    def setUp(self):
        self.db = _sesion()
        codigos.asignar_codigo(self.db, "ESC", "esc0001", "p1")

    def tearDown(self):
        self.db.close()

    def test_no_admin_no_recibe_el_campo(self):
        items = [{"id_escena": "esc0001"}]
        codigos.adjuntar_codigos(self.db, items, "ESC", "id_escena", incluir=False)
        self.assertNotIn("codigo", items[0])

    def test_admin_recibe_el_campo(self):
        items = [{"id_escena": "esc0001"}, {"id_escena": "esc0099"}]
        codigos.adjuntar_codigos(self.db, items, "ESC", "id_escena", incluir=True)
        self.assertEqual(items[0]["codigo"], "ESC-001")
        self.assertIsNone(items[1]["codigo"])  # sin backfill todavía

    def test_galeria_solo_objetos(self):
        codigos.asignar_codigo(self.db, "VES", 5, "p1")
        items = [{"id_galeria": 5, "tipo": "objeto"}, {"id_galeria": 5, "tipo": "personaje"}]
        codigos.adjuntar_codigos_galeria(self.db, items, incluir=True)
        self.assertEqual(items[0]["codigo"], "VES-001")
        self.assertNotIn("codigo", items[1])
        sin = [{"id_galeria": 5, "tipo": "objeto"}]
        codigos.adjuntar_codigos_galeria(self.db, sin, incluir=False)
        self.assertNotIn("codigo", sin[0])


class BusquedaTests(unittest.TestCase):
    def setUp(self):
        self.db = _sesion()
        for i in range(1, 13):
            codigos.asignar_codigo(self.db, "ESC", f"esc{i:04d}", "p1")
        codigos.asignar_codigo(self.db, "ESC", "esc0100", "p2")
        codigos.asignar_codigo(self.db, "PER", "psj0001", "p1")

    def tearDown(self):
        self.db.close()

    def test_exacto_primero_y_solo_del_proyecto(self):
        filas = codigos.buscar_en_proyecto(self.db, "p1", "ESC-012")
        self.assertEqual(filas[0][2], "ESC-012")
        # el ESC-001 del proyecto p2 no aparece al buscar en p1
        ids = {f[1] for f in codigos.buscar_en_proyecto(self.db, "p1", "ESC")}
        self.assertNotIn("esc0100", ids)
        self.assertEqual(len(ids), 12)

    def test_comodines_son_literales(self):
        self.assertEqual(codigos.buscar_en_proyecto(self.db, "p1", "ES%"), [])


if __name__ == "__main__":
    unittest.main()
