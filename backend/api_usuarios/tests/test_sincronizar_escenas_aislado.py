"""Sincronización HTTP y transacciones en SQLite, sin acceder a MySQL."""
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
    from app.models.desglose_model import Desglose
    from app.models.escena_model import Escena
    from app.models.guion_version_model import GuionVersion
    from app.models.project_model import Project
    from app.models.rodaje_model import Rodaje
    from app.models.user_model import User
    from app.models.user_project_model import UserProject
    from app.routes.escena_routes import router
    from app.routes.guion_routes import router as guion_router
    from app.utils.auth import create_access_token
    from app.utils.codigos import codigos_entidad, codigos_metadata
    from app.controllers.escena_controller import asignar_codigo

from sqlalchemy import create_engine, event, select
from sqlalchemy.dialects.mysql import LONGTEXT, dialect as mysql_dialect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(LONGTEXT, "sqlite")
def _longtext_sqlite(_type, _compiler, **_kwargs):
    return "TEXT"


def crear(numero, **datos):
    return {"tipo": "crear", "payload": {"numero_de_escena": numero, "encabezado": "Nueva", **datos}}


def actualizar(id_escena, **datos):
    return {"tipo": "actualizar", "id_escena": id_escena, "payload": datos}


class SincronizarEscenasTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(cls.engine, tables=[
            Project.__table__, User.__table__, UserProject.__table__,
            Guion.__table__, GuionVersion.__table__, Rodaje.__table__,
            Desglose.__table__, Escena.__table__,
        ])
        codigos_metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)
        cls.app = FastAPI()
        cls.app.include_router(router)
        cls.app.include_router(guion_router)

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
            for table in reversed(codigos_metadata.sorted_tables):
                db.execute(table.delete())
            db.query(Escena).delete()
            db.query(GuionVersion).delete()
            db.query(Guion).delete()
            db.query(Rodaje).delete()
            db.query(Desglose).delete()
            db.query(UserProject).delete()
            db.query(User).delete()
            db.query(Project).delete()
            db.add_all([
                Project(id_project=p, project_name=p, formato_de_produccion="film", genero="drama", id_client=1)
                for p in ("p1", "p2")
            ])
            for uid in (1, 2):
                db.add(User(id_user=uid, nombre="Usuario", apellido="Prueba", identificacion="CC",
                            id_identificacion=str(uid), mail=f"{uid}@example.test", msisdn="0",
                            fecha_de_nacimiento=datetime(2000, 1, 1), estado="activo",
                            contrasena="hash", id_rol=1005))
            db.add_all([
                UserProject(id_user=1, id_project="p1", id_rol=1001),
                UserProject(id_user=2, id_project="p1", id_rol=1005),
                Guion(id_guion=1, nombre="Uno", id_project="p1"),
                Guion(id_guion=2, nombre="Dos", id_project="p2"),
                Guion(id_guion=3, nombre="Tres", id_project="p1"),
                Rodaje(id_rodaje="rod1", id_project="p1", nombre="Uno",
                       fecha_inicio=date(2026, 1, 1), estado="Pendiente"),
                Rodaje(id_rodaje="rod2", id_project="p2", nombre="Dos",
                       fecha_inicio=date(2026, 1, 1), estado="Pendiente"),
                Desglose(id_desglose="dsg1"),
                Desglose(id_desglose="dsg2"),
                Escena(id_escena="esc0001", id_guion=1, numero_de_escena="1",
                       encabezado="Original", id_rodaje="rod1", id_desglose="dsg1"),
                Escena(id_escena="esc0002", id_guion=2, numero_de_escena="2",
                       encabezado="Ajena", id_desglose="dsg2"),
                Escena(id_escena="esc0003", id_guion=3, numero_de_escena="3", encabezado="Otro guion"),
            ])
            db.commit()

    def request(self, acciones, guion=1, user=1, token=True, project="p1"):
        headers = {"Content-Type": "application/json", "X-Project-Id": project}
        if token:
            headers["Authorization"] = "Bearer " + create_access_token(
                {"id_user": user, "two_factor_verified": True}
            )
        req = Request(f"{self.base}/guiones/{guion}/escenas/sincronizar",
                      data=json.dumps({"acciones": acciones}).encode(), headers=headers)
        try:
            with urlopen(req, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            if error.code == 500:
                return error.code, None
            return error.code, json.load(error)

    def get(self, path, user=1, token=True, project="p1"):
        headers = {"X-Project-Id": project}
        if token:
            headers["Authorization"] = "Bearer " + create_access_token(
                {"id_user": user, "two_factor_verified": True}
            )
        req = Request(f"{self.base}{path}", headers=headers)
        try:
            with urlopen(req, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def delete(self, path, user=1, token=True, project="p1"):
        headers = {"X-Project-Id": project}
        if token:
            headers["Authorization"] = "Bearer " + create_access_token(
                {"id_user": user, "two_factor_verified": True}
            )
        req = Request(f"{self.base}{path}", headers=headers, method="DELETE")
        try:
            with urlopen(req, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def post(self, path, payload, user=1, token=True, project="p1"):
        headers = {"Content-Type": "application/json", "X-Project-Id": project}
        if token:
            headers["Authorization"] = "Bearer " + create_access_token(
                {"id_user": user, "two_factor_verified": True}
            )
        req = Request(
            f"{self.base}{path}",
            data=json.dumps(payload).encode(),
            headers=headers,
            method="POST",
        )
        try:
            with urlopen(req, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def test_catalogo_y_detalle_aislados_por_proyecto(self):
        status, result = self.get("/projects/p1/escenas")
        self.assertEqual(status, 200)
        self.assertEqual(
            {escena["id_escena"] for escena in result["data"]},
            {"esc0001", "esc0003"},
        )
        self.assertEqual(
            {escena["nombre_guion"] for escena in result["data"]},
            {"Uno", "Tres"},
        )

        status, result = self.get("/projects/p2/escenas")
        self.assertEqual(status, 403)
        status, result = self.get("/escenas/esc0002")
        self.assertEqual(status, 404)
        self.assertNotIn("Ajena", json.dumps(result))
        status, result = self.get("/guiones/2/escenas")
        self.assertEqual(status, 404)
        status, result = self.delete("/escenas/esc0002")
        self.assertEqual(status, 404)
        with self.Session() as db:
            self.assertIsNotNone(db.get(Escena, "esc0002"))
        status, _ = self.delete("/escenas/esc0001", user=2)
        self.assertEqual(status, 403)
        with self.Session() as db:
            self.assertIsNotNone(db.get(Escena, "esc0001"))
        status, result = self.get("/projects/p1/escenas", user=2)
        self.assertEqual(status, 200)
        self.assertEqual(
            {escena["id_escena"] for escena in result["data"]},
            {"esc0001", "esc0003"},
        )

    def test_crea_y_actualiza_en_orden_sin_copiar_vinculos(self):
        status, result = self.request([
            actualizar("esc0001", descripcion="Editada"), crear("2"), crear("3", ciudad="Cali"),
        ])
        self.assertEqual(status, 200)
        self.assertTrue(result["success"])
        editada, primera, segunda = result["data"]
        self.assertEqual(editada["id_rodaje"], "rod1")
        self.assertEqual(editada["id_desglose"], "dsg1")
        self.assertIsNone(primera["id_rodaje"])
        self.assertIsNone(primera["id_desglose"])
        self.assertNotEqual(primera["id_escena"], segunda["id_escena"])
        self.assertEqual(segunda["ciudad"], "Cali")
        self.assertTrue(primera["codigo"])
        with self.Session() as db:
            self.assertEqual(db.get(Escena, "esc0001").descripcion, "Editada")
            self.assertEqual(db.query(Escena).filter_by(id_guion=1).count(), 3)

    def test_permisos_y_aislamiento(self):
        self.assertEqual(self.request([crear("9")], token=False)[0], 401)
        self.assertEqual(self.request([crear("9")], user=2)[0], 403)
        self.assertEqual(self.request([crear("9")], guion=2)[0], 404)
        self.assertEqual(self.request([crear("9")], guion=999)[0], 404)
        for id_escena in ("esc0002", "esc0003", "no-existe"):
            self.assertEqual(self.request([crear("9"), actualizar(id_escena, encabezado="No")])[0], 404)
        with self.Session() as db:
            self.assertEqual(db.query(Escena).count(), 3)

    def test_conflictos_y_validacion_no_guardan_cambios(self):
        lotes = [
            [actualizar("esc0001", descripcion="No"), crear(" 1 ")],
            [crear("4"), crear(" 4 ")],
            [actualizar("esc0001", descripcion="No"), actualizar("esc0001", ciudad="No")],
        ]
        for lote in lotes:
            self.assertEqual(self.request(lote)[0], 409)
        self.assertEqual(self.request([actualizar("esc0001", numero_de_escena=None)])[0], 422)
        self.assertEqual(self.request([crear("  ")])[0], 422)
        self.assertEqual(self.request([crear("4", encabezado=" ")])[0], 422)
        self.assertEqual(self.request([crear("x" * 46)])[0], 422)
        self.assertEqual(self.request([actualizar("esc0001", encabezado="x" * 251)])[0], 422)
        self.assertEqual(self.request([crear("4", id_guion=2)])[0], 422)
        self.assertEqual(self.request([crear("4", id_rodaje="ajeno")])[0], 404)
        self.assertEqual(self.request([crear("4", id_desglose="dsg2")])[0], 404)
        self.assertEqual(self.request([actualizar("esc0001", id_rodaje="rod2")])[0], 404)
        with self.Session() as db:
            self.assertIsNone(db.get(Escena, "esc0001").descripcion)
            self.assertEqual(db.query(Escena).count(), 3)

    def test_enlaces_explicitos_del_proyecto(self):
        status, result = self.request([
            actualizar("esc0001", id_rodaje=None),
            crear("4", id_rodaje="rod1", id_desglose="dsg1"),
        ])
        self.assertEqual(status, 200)
        self.assertIsNone(result["data"][0]["id_rodaje"])
        self.assertEqual(result["data"][0]["id_desglose"], "dsg1")
        self.assertEqual(result["data"][1]["id_rodaje"], "rod1")
        self.assertEqual(result["data"][1]["id_desglose"], "dsg1")

    def test_intercambio_de_numeros(self):
        self.assertEqual(self.request([crear("2")])[0], 200)
        with self.Session() as db:
            otra = db.query(Escena).filter_by(id_guion=1, numero_de_escena="2").one().id_escena
        status, result = self.request([
            actualizar("esc0001", numero_de_escena="2"),
            actualizar(otra, numero_de_escena="1"),
        ])
        self.assertEqual(status, 200)
        self.assertEqual([e["numero_de_escena"] for e in result["data"]], ["2", "1"])

    def test_error_despues_de_flush_revierte_todo(self):
        llamadas = 0

        def fallar_en_segunda(*args):
            nonlocal llamadas
            llamadas += 1
            if llamadas == 2:
                raise IntegrityError("insert", {}, Exception("colisión simulada"))
            return asignar_codigo(*args)

        with patch("app.controllers.escena_controller.asignar_codigo", side_effect=fallar_en_segunda):
            self.assertEqual(self.request([actualizar("esc0001", descripcion="No"), crear("4"), crear("5")])[0], 409)
        with self.Session() as db:
            self.assertIsNone(db.get(Escena, "esc0001").descripcion)
            self.assertEqual(db.query(Escena).count(), 3)
            self.assertEqual(db.execute(select(codigos_entidad)).all(), [])

    def test_bloqueo_mysql_y_segundo_lote_con_numero_ya_ocupado(self):
        consultas = []

        def capturar(_conn, clause, _multiparams, _params, _options):
            if getattr(clause, "_for_update_arg", None) is not None:
                consultas.append(str(clause.compile(dialect=mysql_dialect())))

        event.listen(self.engine, "before_execute", capturar)
        try:
            self.assertEqual(self.request([crear("4")])[0], 200)
            self.assertEqual(self.request([crear("4")])[0], 409)
        finally:
            event.remove(self.engine, "before_execute", capturar)
        self.assertTrue(any("guion" in sql and "FOR UPDATE" in sql for sql in consultas))
        self.assertTrue(any("escenas" in sql and "FOR UPDATE" in sql for sql in consultas))
        with self.Session() as db:
            self.assertEqual(db.query(Escena).filter_by(id_guion=1, numero_de_escena="4").count(), 1)

    def test_crea_version_y_ficha_copiada_en_una_sola_transaccion(self):
        contenido = (
            '<p class="gb gb-escena" data-escena-id="esc0001">INT. CASA</p>'
            '<p class="gb gb-accion"><strong>Acción con formato</strong></p>'
            '<p class="gb gb-escena" data-escena-key="copiada-1">INT. CASA</p>'
            '<p class="gb gb-dialogo"><em>Diálogo copiado.</em></p>'
        )
        status, result = self.post("/guiones/1/versiones/texto", {
            "contenido": contenido,
            "fecha_de_emision": date.today().isoformat(),
            "estado": "Borrador",
            "comentario_cambio": "Copia independiente",
            "acciones_escena": [
                {
                    "tipo": "actualizar",
                    "id_escena": "esc0001",
                    "payload": {"descripcion": "Acción con formato"},
                },
                {
                    "tipo": "crear",
                    "client_key": "copiada-1",
                    "payload": {
                        "numero_de_escena": "2",
                        "encabezado": "INT. CASA",
                        "descripcion": "Diálogo copiado.",
                        "modo_vista": "Int",
                        "ciudad": "Bogotá",
                    },
                },
            ],
        })

        self.assertEqual(status, 200)
        self.assertTrue(result["success"])
        self.assertIn('data-escena-id="esc0004"', result["data"]["contenido"])
        self.assertIn("<strong>Acción con formato</strong>", result["data"]["contenido"])
        self.assertIn("<em>Diálogo copiado.</em>", result["data"]["contenido"])
        self.assertNotIn("data-escena-key", result["data"]["contenido"])
        with self.Session() as db:
            copia = db.get(Escena, "esc0004")
            self.assertEqual(copia.id_guion, 1)
            self.assertEqual(copia.ciudad, "Bogotá")
            self.assertIsNone(copia.id_rodaje)
            self.assertIsNone(copia.id_desglose)
            self.assertEqual(db.get(Escena, "esc0001").descripcion, "Acción con formato")

    def test_crea_guion_desde_cero_con_ficha_en_la_misma_transaccion(self):
        status, result = self.post("/guiones/texto", {
            "nombre": "Guion nuevo",
            "descripcion": "Prueba aislada",
            "id_project": "p1",
            "contenido": (
                '<p class="gb gb-escena" data-escena-key="primera-escena">INT. CASA</p>'
                '<p class="gb gb-accion">Texto inicial.</p>'
            ),
            "fecha_de_emision": date.today().isoformat(),
            "estado": "Borrador",
            "acciones_escena": [{
                "tipo": "crear",
                "client_key": "primera-escena",
                "payload": {
                    "numero_de_escena": "1",
                    "encabezado": "INT. CASA",
                    "descripcion": "Texto inicial.",
                },
            }],
        })

        self.assertEqual(status, 200)
        self.assertTrue(result["success"])
        id_guion = result["data"]["id_guion"]
        self.assertIn('data-escena-id="esc0004"', result["data"]["contenido"])
        with self.Session() as db:
            self.assertEqual(db.query(Escena).filter_by(id_guion=id_guion).count(), 1)
            version = db.query(GuionVersion).filter_by(id_guion=id_guion).one()
            self.assertIn('data-escena-id="esc0004"', version.contenido)

    def test_retiro_local_conserva_ficha_y_versiones_historicas(self):
        contenido_historico = (
            '<p class="gb gb-escena" data-escena-id="esc0001">INT. CASA</p>'
            '<p class="gb gb-accion">Texto histórico.</p>'
            '<p class="gb gb-escena" data-escena-id="esc0004">EXT. CALLE</p>'
            '<p class="gb gb-accion">Otra escena.</p>'
        )
        with self.Session() as db:
            db.add(Escena(
                id_escena="esc0004", id_guion=1, numero_de_escena="2",
                encabezado="EXT. CALLE",
            ))
            db.add(GuionVersion(
                id_guion=1, numero_de_version=1, contenido=contenido_historico,
                fecha_de_emision=date.today(), estado="Borrador",
            ))
            db.commit()

        contenido_nuevo = (
            '<p class="gb gb-escena" data-escena-id="esc0004">EXT. CALLE</p>'
            '<p class="gb gb-accion">Otra escena.</p>'
        )
        status, result = self.post("/guiones/1/versiones/texto", {
            "contenido": contenido_nuevo,
            "fecha_de_emision": date.today().isoformat(),
            "estado": "Borrador",
            "acciones_escena": [],
        })

        self.assertEqual(status, 200)
        self.assertTrue(result["success"])
        with self.Session() as db:
            self.assertIsNotNone(db.get(Escena, "esc0001"))
            self.assertIsNotNone(db.get(Escena, "esc0004"))
            historica = db.query(GuionVersion).filter_by(numero_de_version=1).one()
            actual = db.query(GuionVersion).filter_by(numero_de_version=2).one()
            self.assertIn("Texto histórico.", historica.contenido)
            self.assertNotIn("esc0001", actual.contenido)

    def test_asociacion_ausente_o_ajena_da_error_y_no_crea_version(self):
        casos = [
            ('<p class="gb gb-escena">INT. CASA</p>', [], 422),
            ('<p class="gb gb-escena" data-escena-id="esc0002">EXT. AJENA</p>', [], 404),
            ('<p class="gb gb-escena" data-escena-key="sin-accion">INT. NUEVA</p>', [], 422),
        ]
        for contenido, acciones, esperado in casos:
            status, _ = self.post("/guiones/1/versiones/texto", {
                "contenido": contenido,
                "fecha_de_emision": date.today().isoformat(),
                "acciones_escena": acciones,
            })
            self.assertEqual(status, esperado)
        with self.Session() as db:
            self.assertEqual(db.query(GuionVersion).filter_by(id_guion=1).count(), 0)
            self.assertEqual(db.query(Escena).count(), 3)


if __name__ == "__main__":
    unittest.main()
