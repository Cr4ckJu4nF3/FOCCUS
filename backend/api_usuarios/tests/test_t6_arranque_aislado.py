"""Arranque completo de app.main sin .env ni infraestructura real."""
import json
import os
import socket
import tempfile
import threading
import time
import unittest
from unittest.mock import MagicMock, patch
from urllib.request import urlopen

import uvicorn
from fastapi import HTTPException


class ArranqueT6Tests(unittest.TestCase):
    def test_arranque_documentacion_y_jwt(self):
        variables = {
            "JWT_SECRET_KEY": "clave-solo-pruebas-ficticia-123456789",
            "JWT_EXPIRE_MINUTES": "1440",
            "DB_HOST": "127.0.0.1",
            "DB_PORT": "3306",
            "DB_USER": "ficticio",
            "DB_PASSWORD": "ficticia",
            "DB_NAME": "ficticia",
            "MAIL_USER": "",
            "MAIL_PASSWORD": "",
            "CONTACT_EMAIL": "",
        }
        cwd = os.getcwd()
        with tempfile.TemporaryDirectory() as carpeta:
            try:
                os.chdir(carpeta)
                with patch.dict(os.environ, variables, clear=True), \
                        patch("dotenv.load_dotenv"), \
                        patch("sqlalchemy.create_engine", return_value=MagicMock()):
                    from app.config.database import Base, get_db

                    with patch.object(Base.metadata, "create_all"):
                        from app.main import app
                    from app.utils.auth import create_access_token, get_current_user

                    def sin_bd():
                        raise HTTPException(503, "BD deshabilitada en prueba")
                        yield

                    app.dependency_overrides[get_db] = sin_bd
                    token = create_access_token({"id_user": 1, "two_factor_verified": True})
                    self.assertEqual(get_current_user("Bearer " + token)["id_user"], 1)

                    sock = socket.socket()
                    sock.bind(("127.0.0.1", 0))
                    sock.listen(128)
                    port = sock.getsockname()[1]
                    server = uvicorn.Server(uvicorn.Config(app, log_level="error", lifespan="off"))
                    thread = threading.Thread(target=server.run, kwargs={"sockets": [sock]}, daemon=True)
                    thread.start()
                    try:
                        for _ in range(100):
                            if server.started:
                                break
                            if not thread.is_alive():
                                self.fail("Uvicorn terminó antes de iniciar")
                            time.sleep(0.05)
                        else:
                            self.fail("Uvicorn no inició en cinco segundos")
                        for ruta in ("/", "/docs", "/openapi.json"):
                            with urlopen(f"http://127.0.0.1:{port}{ruta}", timeout=5) as respuesta:
                                self.assertEqual(respuesta.status, 200)
                                if ruta == "/openapi.json":
                                    self.assertIn("/users/login", json.load(respuesta)["paths"])
                    finally:
                        server.should_exit = True
                        thread.join(timeout=10)
                        sock.close()
                        self.assertFalse(thread.is_alive(), "El servidor de prueba no terminó")
                        app.dependency_overrides.pop(get_db, None)
            finally:
                os.chdir(cwd)


if __name__ == "__main__":
    unittest.main()
