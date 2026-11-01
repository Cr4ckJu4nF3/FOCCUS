"""Genera un token JWT de admin para pruebas. La clave se lee de JWT_SECRET_KEY
(variable de entorno o backend/api_usuarios/.env); nunca se escribe aquí."""
import datetime
import os
from pathlib import Path

import jwt
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / "backend" / "api_usuarios" / ".env")
secret = os.getenv("JWT_SECRET_KEY")
if not secret:
    raise SystemExit("Falta JWT_SECRET_KEY en el entorno o en backend/api_usuarios/.env")

payload = {
    "id_user": 1,
    "id_rol": 1001,
    "exp": int((datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).timestamp()),
}
print(jwt.encode(payload, secret, algorithm="HS256"))
