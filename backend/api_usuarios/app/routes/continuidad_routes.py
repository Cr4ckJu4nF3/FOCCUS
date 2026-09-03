from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.utils.auth import get_current_user, require_admin
from app.controllers.continuidad_controller import (
    crear_version_escena,
    get_versiones_escena,
    subir_fotos,
    get_fotos_version
)

router = APIRouter()

# CREAR NUEVA VERSION DE CONTINUIDAD (solo administradores)
@router.post("/escenas/{id_escena}/versiones")
def store_version_escena(
    id_escena: str,
    comentario_cambio: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return crear_version_escena(id_escena, comentario_cambio, current_user["id_user"], db)

@router.get("/escenas/{id_escena}/versiones")
def versiones_escena(id_escena: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_versiones_escena(id_escena, db)

# SUBIR FOTOS DE CONTINUIDAD - vestuario / objeto / espacio (solo administradores)
@router.post("/escenas/versiones/{id_escena_version}/fotos")
def store_fotos(
    id_escena_version: int,
    tipo: str = Form(...),
    etiqueta: Optional[str] = Form(None),
    id_personaje: Optional[str] = Form(None),
    notas: Optional[str] = Form(None),
    archivos: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return subir_fotos(id_escena_version, tipo, etiqueta, id_personaje, notas, archivos, db)

@router.get("/escenas/versiones/{id_escena_version}/fotos")
def fotos_version(
    id_escena_version: int,
    tipo: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return get_fotos_version(id_escena_version, tipo, db)
