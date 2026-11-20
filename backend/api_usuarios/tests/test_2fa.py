"""Flujo 2FA con HTTP real local y dependencias simuladas, sin MySQL ni correo."""
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

# database.py conecta al importarse: sustituir el motor antes de cargar rutas.
# También se evita leer el .env local durante estas pruebas.
with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()), \
        patch.dict(os.environ, {"JWT_SECRET_KEY": "clave-de-prueba-sin-valor-real-123456789"}):
    from fastapi import FastAPI
    import uvicorn
    import jwt
    from app.config.database import get_db
    from app.controllers import user_controller as controller
    from app.routes.user_routes import router
    from app.utils.auth import create_access_token, decode_access_token


class FakeDB:
    def __init__(self):
        self.user = SimpleNamespace(
            id_user=1, nombre="Ana", apellido="Prueba", mail="ana@example.test",
            id_rol=1001, id_client=4, estado="activo", contrasena="hash",
            identificacion="CC", id_identificacion="123", msisdn="", direccion="",
            fecha_de_nacimiento=None, fecha_de_creacion=None, ultimo_acceso=None,
            id_departamento=None, id_project=None,
        )

    def query(self, model):
        self.model = model
        return self

    def filter(self, *conditions):
        self.conditions = conditions
        return self

    def first(self):
        if self.model is not controller.User:
            return None
        for condition in self.conditions:
            name = condition.left.name
            if name in ("mail", "id_user") and getattr(self.user, name) != condition.right.value:
                return None
        return self.user

    def commit(self):
        pass


class TwoFactorHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = FakeDB()
        cls.app = FastAPI()
        cls.app.include_router(router)
        cls.app.dependency_overrides[get_db] = lambda: cls.db
        cls.password = patch.object(controller.pwd_context, "verify", side_effect=lambda password, _: password == "correcta")
        cls.mail_patch = patch.object(controller, "send_2fa_email", return_value=True)
        cls.password.start()
        cls.mail = cls.mail_patch.start()
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
        cls.mail_patch.stop()
        cls.password.stop()

    def setUp(self):
        controller.pending_logins.clear()
        self.mail.reset_mock()
        self.mail.return_value = True

    def request(self, path, body=None, token=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = Request(self.base + path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def login(self, password="correcta"):
        return self.request("/users/login", {
            "mail": "ana@example.test", "contrasena": password,
            "device_id": "dispositivo-1", "remember_me": False,
        })

    def attempt(self):
        status, response = self.login()
        self.assertEqual(status, 200)
        self.assertTrue(response["success"])
        self.assertNotIn("access_token", response["data"])
        return {"mail": "ana@example.test", "device_id": "dispositivo-1",
                "pending_token": response["data"]["pending_token"]}

    def send(self, attempt):
        status, result = self.request("/users/2fa/send", attempt)
        self.assertEqual(status, 200)
        self.assertTrue(result["success"])
        return self.mail.call_args.args[1]

    def test_sin_credenciales_no_se_puede_crear_o_usar_intento(self):
        _, result = self.login("incorrecta")
        self.assertFalse(result["success"])
        self.assertIsNone(result["data"])
        for path in ("check", "send", "verify"):
            body = {"mail": "ana@example.test", "device_id": "dispositivo-1",
                    "pending_token": "falso", "codigo": "123456"}
            status, result = self.request("/users/2fa/" + path, body)
            self.assertEqual(status, 401)
            self.assertNotIn("access_token", result)
        self.assertFalse(self.mail.called)
        self.assertEqual(self.request("/users/2fa/send", {"mail": "ana@example.test", "device_id": "dispositivo-1"})[0], 422)

    def test_token_solo_tras_otp_y_no_reutilizable(self):
        attempt = self.attempt()
        self.assertEqual(self.request("/users/1", token=attempt["pending_token"])[0], 401)
        old_token = create_access_token({"id_user": 1, "id_rol": 1001})
        self.assertEqual(self.request("/users/1", token=old_token)[0], 401)
        forged = jwt.encode({"id_user": 1, "two_factor_verified": True},
                            "foccus-dev-secret-cambiar-en-produccion", algorithm="HS256")
        self.assertEqual(self.request("/users/1", token=forged)[0], 401)
        self.assertTrue(self.request("/users/2fa/check", attempt)[1]["data"]["requires_2fa"])
        code = self.send(attempt)
        status, result = self.request("/users/2fa/verify", {**attempt, "codigo": code})
        self.assertEqual(status, 200)
        token = result["data"]["access_token"]
        self.assertEqual(self.request("/users/1", token=token)[0], 200)
        self.assertEqual(self.request("/users/2fa/verify", {**attempt, "codigo": code})[0], 401)

    def test_codigo_incorrecto_o_expirado_no_entrega_token(self):
        attempt = self.attempt()
        code = self.send(attempt)
        wrong = "000000" if code != "000000" else "000001"
        _, result = self.request("/users/2fa/verify", {**attempt, "codigo": wrong})
        self.assertFalse(result["success"])
        self.assertIsNone(result["data"])
        controller.pending_logins[attempt["pending_token"]]["expira"] = datetime.now() - timedelta(seconds=1)
        status, result = self.request("/users/2fa/verify", {**attempt, "codigo": code})
        self.assertEqual(status, 401)
        self.assertNotIn("access_token", result)

    def test_intento_no_funciona_con_otro_correo_o_dispositivo(self):
        attempt = self.attempt()
        code = self.send(attempt)
        for changes in ({"mail": "otro@example.test"}, {"device_id": "otro"}):
            status, _ = self.request("/users/2fa/verify", {**attempt, **changes, "codigo": code})
            self.assertEqual(status, 401)
        self.assertEqual(self.request("/users/2fa/verify", {**attempt, "codigo": code})[0], 200)

    def test_cinco_errores_invalidan_intento_y_reenvio_no_reinicia_contador(self):
        attempt = self.attempt()
        code = self.send(attempt)
        wrong = "000000" if code != "000000" else "000001"
        for _ in range(4):
            self.assertFalse(self.request("/users/2fa/verify", {**attempt, "codigo": wrong})[1]["success"])
        code = self.send(attempt)
        wrong = "000000" if code != "000000" else "000001"
        self.assertFalse(self.request("/users/2fa/verify", {**attempt, "codigo": wrong})[1]["success"])
        self.assertEqual(self.request("/users/2fa/verify", {**attempt, "codigo": code})[0], 401)

    def test_fallo_correo_no_deja_codigo_anterior_valido(self):
        attempt = self.attempt()
        code = self.send(attempt)
        self.mail.return_value = False
        _, result = self.request("/users/2fa/send", attempt)
        self.assertFalse(result["success"])
        _, result = self.request("/users/2fa/verify", {**attempt, "codigo": code})
        self.assertFalse(result["success"])
        self.mail.return_value = True

    def test_codigos_aislados_por_intento_y_recordarme_fijado_en_login(self):
        primero = self.attempt()
        codigo_primero = self.send(primero)
        _, response = self.request("/users/login", {
            "mail": "ana@example.test", "contrasena": "correcta",
            "device_id": "dispositivo-1", "remember_me": False,
        })
        segundo = {**primero, "pending_token": response["data"]["pending_token"]}
        # Aún no se ha enviado código al segundo intento.
        _, result = self.request("/users/2fa/verify", {**segundo, "codigo": codigo_primero})
        self.assertFalse(result["success"])
        _, result = self.request("/users/2fa/verify", {
            **primero, "codigo": codigo_primero, "remember_me": True,
        })
        payload = decode_access_token(result["data"]["access_token"])
        self.assertLess(payload["exp"] - time.time(), 2 * 24 * 60 * 60)


if __name__ == "__main__":
    unittest.main()
