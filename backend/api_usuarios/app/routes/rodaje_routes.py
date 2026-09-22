from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
import tempfile
import os
from app.config.database import get_db
from app.utils.auth import get_current_user, require_admin
from app.controllers.rodaje_controller import (
    get_rodajes_by_project,
    get_rodaje,
    create_rodaje,
    update_rodaje,
    delete_rodaje,
    asignar_escena,
    quitar_escena,
    get_escenas_disponibles,
    importar_rodaje_pdf,
    get_procesos_by_rodaje,
    create_proceso,
    update_proceso,
    delete_proceso,
)
from app.schemas.rodaje_schema import RodajeSchema, RodajeUpdateSchema, ProcesoRodajeSchema, ProcesoRodajeUpdateSchema

router = APIRouter()

@router.get("/projects/{id_project}/rodajes")
def rodajes_del_proyecto(id_project: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_rodajes_by_project(id_project, db)

@router.get("/projects/{id_project}/escenas-disponibles")
def escenas_disponibles_del_proyecto(id_project: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_escenas_disponibles(id_project, db)

@router.get("/rodajes/{id_rodaje}")
def rodaje(id_rodaje: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_rodaje(id_rodaje, db)

@router.post("/rodajes")
def store_rodaje(data: RodajeSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return create_rodaje(data, db)

@router.patch("/rodajes/{id_rodaje}")
def patch_rodaje(id_rodaje: str, data: RodajeUpdateSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return update_rodaje(id_rodaje, data, db)

@router.delete("/rodajes/{id_rodaje}")
def destroy_rodaje(id_rodaje: str, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return delete_rodaje(id_rodaje, db)

# Asignar / quitar escenas de un dia (para armar el cronograma a mano)
@router.post("/rodajes/{id_rodaje}/escenas/{id_escena}")
def store_escena_en_rodaje(id_rodaje: str, id_escena: str, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return asignar_escena(id_rodaje, id_escena, db)

@router.delete("/rodajes/{id_rodaje}/escenas/{id_escena}")
def destroy_escena_de_rodaje(id_rodaje: str, id_escena: str, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return quitar_escena(id_rodaje, id_escena, db)

# Importar un PDF de plan de rodaje (mismo formato Semana > Dia > Escena)
@router.post("/projects/{id_project}/rodajes/importar")
def importar_rodaje(
    id_project: str,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    suffix = os.path.splitext(archivo.filename or "")[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(archivo.file.read())
        ruta_temporal = tmp.name

    try:
        return importar_rodaje_pdf(id_project, ruta_temporal, db)
    finally:
        try:
            os.remove(ruta_temporal)
        except OSError:
            pass

@router.get("/rodajes/{id_rodaje}/procesos")
def procesos_del_rodaje(id_rodaje: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_procesos_by_rodaje(id_rodaje, db)

@router.post("/rodajes/{id_rodaje}/procesos")
def store_proceso(id_rodaje: str, data: ProcesoRodajeSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return create_proceso(id_rodaje, data, db)

@router.patch("/rodajes/procesos/{id_proceso}")
def patch_proceso(id_proceso: int, data: ProcesoRodajeUpdateSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return update_proceso(id_proceso, data, db)

@router.delete("/rodajes/procesos/{id_proceso}")
def destroy_proceso(id_proceso: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return delete_proceso(id_proceso, db)
