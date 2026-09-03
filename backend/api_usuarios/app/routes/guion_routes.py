from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.utils.auth import get_current_user, require_admin
from app.controllers.guion_controller import (
    get_guiones,
    get_guion,
    create_guion,
    update_guion,
    delete_guion,
    subir_version,
    get_versiones,
    agregar_nota,
    get_notas
)
from app.schemas.guion_schema import GuionSchema, GuionUpdateSchema, GuionVersionSchema, GuionNotaSchema

router = APIRouter()

# LISTAR GUIONES (opcional ?id_project=)
@router.get("/guiones")
def guiones(
    id_project: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_guiones(db, id_project)

@router.get("/guiones/{id_guion}")
def guion(id_guion: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_guion(id_guion, db)

# CREAR GUION (solo administradores)
@router.post("/guiones")
def store_guion(
    data: GuionSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return create_guion(data, db)

@router.patch("/guiones/{id_guion}")
def patch_guion(
    id_guion: int,
    data: GuionUpdateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return update_guion(id_guion, data, db)

@router.delete("/guiones/{id_guion}")
def destroy_guion(id_guion: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return delete_guion(id_guion, db)

# SUBIR NUEVA VERSION DEL GUION (solo administradores)
@router.post("/guiones/{id_guion}/versiones")
def store_version(
    id_guion: int,
    fecha_de_emision: date = Form(...),
    estado: str = Form("Borrador"),
    comentario_cambio: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    data = GuionVersionSchema(
        fecha_de_emision=fecha_de_emision,
        estado=estado,
        comentario_cambio=comentario_cambio
    )
    return subir_version(id_guion, data, archivo, current_user["id_user"], db)

@router.get("/guiones/{id_guion}/versiones")
def versiones(id_guion: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_versiones(id_guion, db)

@router.post("/guiones/versiones/{id_guion_version}/notas")
def store_nota(
    id_guion_version: int,
    data: GuionNotaSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return agregar_nota(id_guion_version, data, current_user["id_user"], db)

@router.get("/guiones/versiones/{id_guion_version}/notas")
def notas(id_guion_version: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_notas(id_guion_version, db)
