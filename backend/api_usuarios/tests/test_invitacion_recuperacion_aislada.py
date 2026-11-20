"""Invitación y recuperación por HTTP local, sin .env, SMTP ni base de datos."""
import json
import os
import socket
import sys
import threading
import time
import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()), \
        patch.dict(os.environ, {"JWT_SECRET_KEY": "clave-aislada-sin-valor-real-123456789"}):
    from fastapi import FastAPI
    import uvicorn
    from app.config.database import get_db
    from app.controllers import user_controller as controller
    from app.routes.user_routes import router
    from app.utils.auth import require_project_admin


class FakeQuery:
    def __init__(self, db, model):
        self.db, self.model, self.conditions = db, model, ()

    def filter(self, *conditions):
        self.conditions = conditions
        return self

    def first(self):
        for obj in self.db.rows.get(self.model, []):
            if all(c.operator(getattr(obj, c.left.name, None), c.right.value) for c in self.conditions):
                return obj
        return None


class FakeDB:
    def __init__(self):
        self.rows = {
            controller.Project: [SimpleNamespace(id_project="proyecto", id_client=4, project_name="Proyecto")],
            controller.User: [],
            controller.UserProject: [SimpleNamespace(id_user=1, id_project="proyecto", id_rol=1001)],
        }

    def query(self, model):
        return FakeQuery(self, model)

    def add(self, obj):
        if isinstance(obj, controller.User):
            obj.id_user = 2
        self.rows[type(obj)].append(obj)

    def flush(self):
        pass

    def commit(self):
        pass

    def refresh(self, obj):
        pass


class InvitacionRecuperacionHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = FastAPI()
        cls.app.include_router(router)
        cls.app.dependency_overrides[get_db] = lambda: cls.db
        cls.app.dependency_overrides[require_project_admin] = lambda: {"id_user": 1}
        cls.patches = [
            patch.object(controller, "send_invitation_email"),
            patch.object(controller, "send_recovery_email"),
            patch.object(controller, "send_2fa_email"),
            patch.object(controller.pwd_context, "hash", side_effect=lambda value: "hash:" + value),
            patch.object(controller.pwd_context, "verify", side_effect=lambda value, hashed: hashed == "hash:" + value),
        ]
        cls.invite_mail, cls.recovery_mail, cls.twofa_mail, _, _ = [p.start() for p in cls.patches]
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
        for p in reversed(cls.patches):
            p.stop()

    def setUp(self):
        type(self).db = FakeDB()
        controller.recovery_codes.clear()
        if hasattr(controller, "recovery_next_request"):
            controller.recovery_next_request.clear()
        controller.pending_logins.clear()
        for mock in (self.invite_mail, self.recovery_mail, self.twofa_mail):
            mock.reset_mock()
            mock.return_value = True

    def post(self, path, body, token=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        request = Request(self.base + path, data=json.dumps(body).encode(), headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def invite(self):
        return self.post("/users/invite", {
            "correos": ["persona@example.test"], "id_project": "proyecto",
            "id_client": 4, "id_rol": 1005,
            "nombres": {"persona@example.test": {"nombre": "Persona", "apellido": "Prueba"}},
        })[1]

    def test_fallo_de_invitacion_reintento_y_recuperacion(self):
        self.invite_mail.return_value = False
        result = self.invite()
        self.assertFalse(result["data"]["usuarios_creados"][0]["invitacion_enviada"])
        self.assertEqual(self.db.rows[controller.User][0].estado, "pendiente")
        self.assertEqual(len(self.db.rows[controller.UserProject]), 2)
        self.assertIn("ya está", self.invite()["data"]["errores"][0]["error"])
        mail = {"mail": "persona@example.test"}
        self.assertTrue(self.post("/users/recover-password", mail)[1]["success"])
        code = self.recovery_mail.call_args.args[1]
        self.assertTrue(self.post("/users/verify-recovery-code", {**mail, "codigo": code})[1]["success"])
        self.assertTrue(self.post("/users/reset-password", {
            **mail, "codigo": code, "nueva_contrasena": "PruebaAislada1!",
        })[1]["success"])
        self.assertFalse(self.post("/users/reset-password", {
            **mail, "codigo": code, "nueva_contrasena": "PruebaAislada2!",
        })[1]["success"])
        login = self.post("/users/login", {
            **mail, "contrasena": "PruebaAislada1!", "device_id": "test",
        })[1]
        attempt = {**mail, "device_id": "test", "pending_token": login["data"]["pending_token"]}
        self.assertTrue(self.post("/users/2fa/send", attempt)[1]["success"])
        otp = self.twofa_mail.call_args.args[1]
        verified = self.post("/users/2fa/verify", {**attempt, "codigo": otp})[1]
        self.assertEqual(verified["data"]["estado"], "pendiente")
        completed = self.post("/users/complete-invitation", {
            "nombre": "Persona", "apellido": "Prueba", "identificacion": "CC",
            "id_identificacion": "999", "msisdn": "3000000000", "direccion": "Prueba",
            "fecha_de_nacimiento": "2000-01-01", "contrasena": "PruebaAislada2!",
        }, token=verified["data"]["access_token"])[1]
        self.assertTrue(completed["success"])
        self.assertEqual(self.db.rows[controller.User][0].estado, "activo")

    def test_fallo_de_correo_no_deja_codigo_valido(self):
        self.invite()
        self.recovery_mail.return_value = False
        mail = {"mail": "persona@example.test"}
        result = self.post("/users/recover-password", mail)[1]
        self.assertEqual(result["error"], "MAIL_ERROR")
        code = self.recovery_mail.call_args.args[1]
        self.assertFalse(self.post("/users/verify-recovery-code", {**mail, "codigo": code})[1]["success"])

    def test_cinco_errores_compartidos_y_reenvio_limitado(self):
        self.invite()
        mail = {"mail": "persona@example.test"}
        self.assertTrue(self.post("/users/recover-password", mail)[1]["success"])
        code = self.recovery_mail.call_args.args[1]
        wrong = "000000" if code != "000000" else "000001"
        for index in range(5):
            path = "/users/verify-recovery-code" if index % 2 == 0 else "/users/reset-password"
            body = {**mail, "codigo": wrong, "nueva_contrasena": "PruebaAislada1!"}
            self.assertFalse(self.post(path, body)[1]["success"])
        self.assertFalse(self.post("/users/verify-recovery-code", {**mail, "codigo": code})[1]["success"])
        self.assertFalse(self.post("/users/recover-password", mail)[1]["success"])
        self.assertEqual(self.recovery_mail.call_count, 1)

    def test_expiracion_y_reenvio_fallido_invalidan_codigos(self):
        self.invite()
        mail = {"mail": "persona@example.test"}
        self.assertTrue(self.post("/users/recover-password", mail)[1]["success"])
        old_code = self.recovery_mail.call_args.args[1]
        controller.recovery_next_request[mail["mail"]] = datetime.now() - timedelta(seconds=1)
        self.recovery_mail.side_effect = RuntimeError("error simulado")
        self.assertEqual(self.post("/users/recover-password", mail)[1]["error"], "MAIL_ERROR")
        self.assertFalse(self.post("/users/verify-recovery-code", {**mail, "codigo": old_code})[1]["success"])
        self.recovery_mail.side_effect = None
        self.assertTrue(self.post("/users/recover-password", mail)[1]["success"])
        code = self.recovery_mail.call_args.args[1]
        controller.recovery_codes[mail["mail"]]["expira"] = datetime.now() - timedelta(seconds=1)
        self.assertEqual(self.post("/users/verify-recovery-code", {**mail, "codigo": code})[1]["error"], "CODE_EXPIRED")

    def test_codigo_no_es_usable_mientras_correo_esta_en_curso(self):
        self.invite()
        mail = {"mail": "persona@example.test"}
        started = threading.Event()
        release = threading.Event()
        captured = []
        results = []

        def fake_send(_mail, code):
            captured.append(code)
            started.set()
            return release.wait(timeout=5)

        self.recovery_mail.side_effect = fake_send
        worker = threading.Thread(target=lambda: results.append(self.post("/users/recover-password", mail)[1]))
        worker.start()
        try:
            self.assertTrue(started.wait(timeout=5))
            self.assertEqual(self.post("/users/verify-recovery-code", {
                **mail, "codigo": captured[0],
            })[1]["error"], "NO_CODE")
            self.assertEqual(self.post("/users/recover-password", mail)[1]["error"], "RATE_LIMITED")
        finally:
            release.set()
            worker.join(timeout=5)
        self.assertTrue(results[0]["success"])
        self.assertTrue(self.post("/users/verify-recovery-code", {
            **mail, "codigo": captured[0],
        })[1]["success"])

    def test_duplicado_no_cambia_contrasena_ni_envia_correo(self):
        self.invite()
        original_hash = self.db.rows[controller.User][0].contrasena
        result = self.invite()
        self.assertTrue(result["data"]["errores"])
        self.assertEqual(self.db.rows[controller.User][0].contrasena, original_hash)
        self.assertEqual(self.invite_mail.call_count, 1)


if __name__ == "__main__":
    unittest.main()
