from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
import tempfile
import os
from app.config.database import get_db
from app.utils.auth import get_current_user, require_admin
from app.controllers.desglose_controller import (
    get_desglose_by_guion,
    get_desglose_by_escena,
    create_requerimiento,
    update_requerimiento,
    delete_requerimiento,
    importar_desglose_pdf,
)
from app.schemas.desglose_schema import DesgloseRequerimientoSchema, DesgloseRequerimientoUpdateSchema

router = APIRouter()


# Vista resumen: todas las escenas de un guion + conteo de requerimientos
# por departamento (para la lista principal de Desglose)
@router.get("/guiones/{id_guion}/desglose")
def desglose_del_guion(id_guion: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_desglose_by_guion(id_guion, db)


# Detalle de UNA escena: sus requerimientos completos por departamento
@router.get("/escenas/{id_escena}/desglose")
def desglose_de_escena(id_escena: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_desglose_by_escena(id_escena, db)


@router.post("/escenas/{id_escena}/desglose/requerimientos")
def store_requerimiento(
    id_escena: str,
    data: DesgloseRequerimientoSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return create_requerimiento(id_escena, data, db)


@router.patch("/desglose/requerimientos/{id_requerimiento}")
def patch_requerimiento(
    id_requerimiento: str,
    data: DesgloseRequerimientoUpdateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return update_requerimiento(id_requerimiento, data, db)


@router.delete("/desglose/requerimientos/{id_requerimiento}")
def destroy_requerimiento(
    id_requerimiento: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    return delete_requerimiento(id_requerimiento, db)


# Importar un PDF de desglose (formato de exportacion estandar) y crear/
# actualizar automaticamente las escenas y sus requerimientos por
# departamento a partir de el.
@router.post("/guiones/{id_guion}/desglose/importar")
def importar_desglose(
    id_guion: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    suffix = os.path.splitext(archivo.filename or "")[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(archivo.file.read())
        ruta_temporal = tmp.name

    try:
        return importar_desglose_pdf(id_guion, ruta_temporal, db)
    finally:
        try:
            os.remove(ruta_temporal)
        except OSError:
            pass
