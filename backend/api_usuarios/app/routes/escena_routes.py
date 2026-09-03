from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.utils.auth import get_current_user, require_admin
from app.controllers.escena_controller import (
    get_escenas_by_guion,
    get_escena,
    create_escena,
    update_escena,
    delete_escena
)
from app.schemas.escena_schema import EscenaSchema, EscenaUpdateSchema

router = APIRouter()

@router.get("/guiones/{id_guion}/escenas")
def escenas_del_guion(id_guion: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_escenas_by_guion(id_guion, db)

@router.get("/escenas/{id_escena}")
def escena(id_escena: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_escena(id_escena, db)

# CREAR ESCENA (subdividir el guion en escenas) - solo administradores
@router.post("/escenas")
def store_escena(data: EscenaSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return create_escena(data, db)

@router.patch("/escenas/{id_escena}")
def patch_escena(
    id_escena: str,
    data: EscenaUpdateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return update_escena(id_escena, data, db)

@router.delete("/escenas/{id_escena}")
def destroy_escena(id_escena: str, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return delete_escena(id_escena, db)
