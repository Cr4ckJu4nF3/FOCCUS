from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.utils.auth import get_current_user, require_admin
from app.controllers.personaje_controller import (
    get_personajes_by_project,
    create_personaje,
    update_personaje,
    delete_personaje,
)
from app.schemas.personaje_schema import PersonajeSchema, PersonajeUpdateSchema

router = APIRouter()


@router.get("/projects/{id_project}/personajes")
def personajes_del_proyecto(id_project: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_personajes_by_project(id_project, db)


@router.post("/personajes")
def store_personaje(data: PersonajeSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return create_personaje(data, db)


@router.patch("/personajes/{id_personaje}")
def patch_personaje(id_personaje: str, data: PersonajeUpdateSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return update_personaje(id_personaje, data, db)


@router.delete("/personajes/{id_personaje}")
def destroy_personaje(id_personaje: str, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return delete_personaje(id_personaje, db)
