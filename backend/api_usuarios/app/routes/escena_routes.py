from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.utils.auth import ensure_project_id_matches, require_project_admin, require_project_member
from app.utils.codigos import es_admin
from app.controllers.escena_controller import (
    get_escenas_by_guion,
    get_escena,
    create_escena,
    update_escena,
    delete_escena,
    sincronizar_escenas,
    get_escenas_by_project,
)
from app.schemas.escena_schema import EscenaSchema, EscenaUpdateSchema, SincronizarEscenasSchema

router = APIRouter()

@router.get("/guiones/{id_guion}/escenas")
def escenas_del_guion(id_guion: int, db: Session = Depends(get_db), current_user: dict = Depends(require_project_member)):
    return get_escenas_by_guion(id_guion, current_user["id_project"], db, incluir_codigo=es_admin(current_user))

@router.get("/projects/{id_project}/escenas")
def escenas_del_proyecto(
    id_project: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_member),
):
    ensure_project_id_matches(id_project, current_user["id_project"])
    return get_escenas_by_project(id_project, db, incluir_codigo=es_admin(current_user))

@router.post("/guiones/{id_guion}/escenas/sincronizar")
def sincronizar_escenas_del_guion(
    id_guion: int,
    data: SincronizarEscenasSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin),
):
    """Aplica un lote atómico de creación y actualización al guion activo.

    Requiere JWT de administrador y X-Project-Id. Devuelve las fichas en el
    orden de las acciones dentro de data. Los enlaces omitidos se conservan
    al actualizar y quedan vacíos al crear. Un conflicto devuelve 409; una
    escena o guion ajeno devuelve 404. No se eliminan fichas.

    El bloqueo del guion serializa los lotes de esta ruta en MySQL/InnoDB;
    las rutas anteriores no participan en ese bloqueo de aplicación.
    """
    return sincronizar_escenas(id_guion, data, current_user["id_project"], db)

@router.get("/escenas/{id_escena}")
def escena(id_escena: str, db: Session = Depends(get_db), current_user: dict = Depends(require_project_member)):
    return get_escena(id_escena, current_user["id_project"], db, incluir_codigo=es_admin(current_user))

# CREAR ESCENA (subdividir el guion en escenas) - solo administradores
@router.post("/escenas")
def store_escena(data: EscenaSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_project_admin)):
    return create_escena(data, current_user["id_project"], db)

@router.patch("/escenas/{id_escena}")
def patch_escena(
    id_escena: str,
    data: EscenaUpdateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin)
):
    return update_escena(id_escena, data, current_user["id_project"], db)

@router.delete("/escenas/{id_escena}")
def destroy_escena(id_escena: str, db: Session = Depends(get_db), current_user: dict = Depends(require_project_admin)):
    return delete_escena(id_escena, current_user["id_project"], db)
