import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException, status

load_dotenv()

# ==========================================
# CONFIG
# ==========================================
# En desarrollo, si no hay JWT_SECRET_KEY en el .env, se usa un valor por
# defecto para que el proyecto arranque sin configuración extra. Para
# producción SIEMPRE se debe definir JWT_SECRET_KEY en el .env.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "foccus-dev-secret-cambiar-en-produccion")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

# ==========================================
# CREAR TOKEN
# ==========================================
def create_access_token(data: dict) -> str:
    """
    Genera un JWT firmado a partir de un diccionario (normalmente
    {"id_user": ..., "id_rol": ...}) con fecha de expiración incluida.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ==========================================
# DECODIFICAR TOKEN
# ==========================================
def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada, vuelve a iniciar sesión",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

# ==========================================
# DEPENDENCIA: REQUIERE ESTAR AUTENTICADO
# ==========================================
def get_current_user(authorization: str = Header(None)) -> dict:
    """
    Dependencia de FastAPI para proteger endpoints. Uso:

        @router.get("/algo")
        def algo(current_user: dict = Depends(get_current_user)):
            ...

    Lee el header "Authorization: Bearer <token>", valida el JWT y
    devuelve su contenido: {"id_user": ..., "id_rol": ..., "exp": ...}
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Falta el token de acceso.",
        )

    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)

    if "id_user" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    return payload

# ==========================================
# DEPENDENCIA: REQUIERE ROL ADMINISTRADOR
# ==========================================
def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Igual que get_current_user, pero además exige id_rol == 1001
    (Administrador). Uso:

        @router.delete("/algo/{id}")
        def algo(id: int, current_user: dict = Depends(require_admin)):
            ...
    """
    if current_user.get("id_rol") != 1001:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador para esta acción",
        )
    return current_user