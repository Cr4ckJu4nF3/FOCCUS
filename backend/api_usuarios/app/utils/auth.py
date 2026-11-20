import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.Guion import Guion
from app.models.desglose_requerimiento_model import DesgloseRequerimiento
from app.models.escenario_model import Escenario
from app.models.escena_model import Escena
from app.models.escena_version_model import EscenaVersion
from app.models.guion_version_model import GuionVersion
from app.models.personajes_model import Personaje
from app.models.proceso_rodaje_model import ProcesoRodaje
from app.models.rodaje_model import Rodaje
from app.models.user_model import User
from app.models.user_project_model import UserProject

load_dotenv()

# ==========================================
# CONFIG
# ==========================================
# Sin clave configurada se usa una clave temporal impredecible; las sesiones
# se invalidan al reiniciar. En producción debe configurarse una clave común.
SECRET_KEY = os.getenv("JWT_SECRET_KEY") or secrets.token_urlsafe(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
REMEMBER_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60


def _validate_child_resources_project(request: Request, project_id: str, db: Session) -> None:
    """Evita que un ID hijo de otro proyecto se use con un X-Project-Id válido."""
    params = request.path_params
    queries = []

    if params.get("id_guion") is not None:
        queries.append(
            db.query(Guion.id_project).filter(Guion.id_guion == params["id_guion"])
        )
    if params.get("id_escena") is not None:
        queries.append(
            db.query(Guion.id_project)
            .join(Escena, Escena.id_guion == Guion.id_guion)
            .filter(Escena.id_escena == params["id_escena"])
        )
    if params.get("id_guion_version") is not None:
        queries.append(
            db.query(Guion.id_project)
            .join(GuionVersion, GuionVersion.id_guion == Guion.id_guion)
            .filter(GuionVersion.id_guion_version == params["id_guion_version"])
        )
    if params.get("id_escena_version") is not None:
        queries.append(
            db.query(Guion.id_project)
            .join(Escena, Escena.id_guion == Guion.id_guion)
            .join(EscenaVersion, EscenaVersion.id_escena == Escena.id_escena)
            .filter(EscenaVersion.id_escena_version == params["id_escena_version"])
        )
    if params.get("id_rodaje") is not None:
        queries.append(
            db.query(Rodaje.id_project).filter(Rodaje.id_rodaje == params["id_rodaje"])
        )
    if params.get("id_proceso") is not None:
        queries.append(
            db.query(Rodaje.id_project)
            .join(ProcesoRodaje, ProcesoRodaje.id_rodaje == Rodaje.id_rodaje)
            .filter(ProcesoRodaje.id_proceso == params["id_proceso"])
        )
    if params.get("id_personaje") is not None:
        queries.append(
            db.query(Personaje.id_project).filter(
                Personaje.id_personaje == params["id_personaje"]
            )
        )
    if params.get("id_escenario") is not None:
        queries.append(
            db.query(Escenario.id_project).filter(
                Escenario.id_escenario == params["id_escenario"]
            )
        )

    if params.get("id_requerimiento") is not None or params.get("id_desglose") is not None:
        query = db.query(Guion.id_project).join(
            Escena, Escena.id_guion == Guion.id_guion
        )
        if params.get("id_requerimiento") is not None:
            query = query.join(
                DesgloseRequerimiento,
                DesgloseRequerimiento.id_desglose == Escena.id_desglose,
            ).filter(
                DesgloseRequerimiento.id_requerimiento == params["id_requerimiento"]
            )
        else:
            query = query.filter(Escena.id_desglose == params["id_desglose"])
        queries.append(query)

    for query in queries:
        projects = [row[0] for row in query.all()]
        if not projects or any(resource_project_id != project_id for resource_project_id in projects):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recurso no encontrado",
            )


def ensure_project_id_matches(requested_project_id: str, authorized_project_id: str) -> None:
    """Rechaza un project ID de cuerpo/formulario distinto del autorizado."""
    if requested_project_id != authorized_project_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El proyecto solicitado no coincide con el proyecto autorizado",
        )

# ==========================================
# CREAR TOKEN
# ==========================================
def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    """
    Genera un JWT firmado a partir de un diccionario (normalmente
    {"id_user": ..., "id_rol": ...}) con fecha de expiración incluida.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
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

    if "id_user" not in payload or payload.get("two_factor_verified") is not True:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    return payload

# ==========================================
# DEPENDENCIA: REQUIERE ROL ADMINISTRADOR
# ==========================================
def require_admin(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Comprueba el rol vigente en la base de datos para que un token emitido
    antes de un cambio de permisos no conserve privilegios de administrador.
    Uso:

        @router.delete("/algo/{id}")
        def algo(id: int, current_user: dict = Depends(require_admin)):
            ...
    """
    user = db.query(User).filter(User.id_user == current_user["id_user"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta asociada a esta sesión ya no existe",
        )

    if user.id_rol != 1001:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador para esta acción",
        )

    return {**current_user, "id_rol": user.id_rol}


def require_project_admin(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user = db.query(User).filter(User.id_user == current_user["id_user"]).first()
    if user and (user.estado or "").lower() == "pendiente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Completa los datos de tu cuenta para acceder al proyecto",
        )

    path_project_id = request.path_params.get("id_project") or request.path_params.get("id")
    header_project_id = request.headers.get("X-Project-Id")

    if path_project_id and header_project_id and path_project_id != header_project_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El proyecto solicitado no coincide con el proyecto activo",
        )

    project_id = path_project_id or header_project_id
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Falta indicar el proyecto activo",
        )

    membership = db.query(UserProject).filter(
        UserProject.id_user == current_user["id_user"],
        UserProject.id_project == project_id,
    ).first()
    if not membership or membership.id_rol != 1001:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador en este proyecto",
        )

    _validate_child_resources_project(request, project_id, db)
    return {**current_user, "id_rol": membership.id_rol, "id_project": project_id}


def require_project_member(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user = db.query(User).filter(User.id_user == current_user["id_user"]).first()
    if user and (user.estado or "").lower() == "pendiente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Completa los datos de tu cuenta para acceder al proyecto",
        )

    path_project_id = request.path_params.get("id_project") or request.path_params.get("id")
    query_project_id = request.query_params.get("id_project")
    header_project_id = request.headers.get("X-Project-Id")
    requested_project_id = path_project_id or query_project_id or header_project_id

    if not requested_project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Falta indicar el proyecto activo",
        )
    if any(
        project_id and project_id != requested_project_id
        for project_id in (query_project_id, header_project_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El proyecto solicitado no coincide con el proyecto activo",
        )

    membership = db.query(UserProject).filter(
        UserProject.id_user == current_user["id_user"],
        UserProject.id_project == requested_project_id,
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No perteneces a este proyecto",
        )

    _validate_child_resources_project(request, requested_project_id, db)
    return {**current_user, "id_rol": membership.id_rol, "id_project": requested_project_id}