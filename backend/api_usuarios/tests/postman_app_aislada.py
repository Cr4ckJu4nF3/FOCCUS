"""API parcial para Newman: rutas reales, sin .env, red externa ni MySQL."""
import os
from unittest.mock import MagicMock, patch

from fastapi import APIRouter, FastAPI

with patch("dotenv.load_dotenv"), patch("sqlalchemy.create_engine", return_value=MagicMock()), \
        patch.dict(os.environ, {
            "JWT_SECRET_KEY": "clave-solo-pruebas-ficticia-123456789",
            "JWT_EXPIRE_MINUTES": "1440", "DB_HOST": "127.0.0.1",
            "DB_PORT": "3306", "DB_USER": "ficticio", "DB_PASSWORD": "ficticia",
            "DB_NAME": "ficticia", "MAIL_USER": "", "MAIL_PASSWORD": "", "CONTACT_EMAIL": "",
        }):
    from app.config.database import get_db
    from app.routes.user_routes import router

app = FastAPI(title="FOCCUS pruebas aisladas")
# Solo rutas de consulta o validación que no envían correo ni escriben datos.
allowed = {
    ("/users/login", "POST"),
    ("/users/reset-password", "POST"),
    ("/users/2fa/check", "POST"),
    ("/users", "GET"),
}
isolated_router = APIRouter()
for route in router.routes:
    if any((route.path, method) in allowed for method in route.methods):
        isolated_router.routes.append(route)
app.include_router(isolated_router)


def fake_db():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    yield db


app.dependency_overrides[get_db] = fake_db
