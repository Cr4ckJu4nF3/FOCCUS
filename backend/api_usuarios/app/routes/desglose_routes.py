from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session
import tempfile
import os
from app.config.database import get_db
from app.utils.auth import get_current_user, require_project_admin, require_project_member
from app.controllers.galeria_controller import create_item_for_scene
from app.controllers.desglose_controller import (
    get_desglose_by_guion,
    get_desglose_by_escena,
    create_requerimiento,
    update_requerimiento,
    delete_requerimiento,
    add_gallery_item_to_scene,
    remove_gallery_item_from_scene,
    importar_desglose_pdf,
)
from app.schemas.desglose_schema import (
    DesgloseRequerimientoSchema,
    DesgloseRequerimientoUpdateSchema,
    EscenaGaleriaItemSchema,
)

router = APIRouter()


# Vista resumen: todas las escenas de un guion + conteo de requerimientos
# por departamento (para la lista principal de Desglose)
@router.get("/guiones/{id_guion}/desglose")
def desglose_del_guion(id_guion: int, db: Session = Depends(get_db), current_user: dict = Depends(require_project_member)):
    return get_desglose_by_guion(id_guion, db, current_user["id_project"])


# Detalle de UNA escena: sus requerimientos completos por departamento
@router.get("/escenas/{id_escena}/desglose")
def desglose_de_escena(id_escena: str, db: Session = Depends(get_db), current_user: dict = Depends(require_project_member)):
    return get_desglose_by_escena(id_escena, db, current_user["id_project"])

@router.post("/escenas/{id_escena}/desglose/galeria")
def vincular_elemento_galeria(
    id_escena: str,
    data: EscenaGaleriaItemSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin),
):
    return add_gallery_item_to_scene(id_escena, current_user["id_project"], data, db)


@router.delete("/escenas/{id_escena}/desglose/galeria/{id_galeria}")
def desvincular_elemento_galeria(
    id_escena: str,
    id_galeria: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin),
):
    return remove_gallery_item_from_scene(
        id_escena,
        id_galeria,
        current_user["id_project"],
        db,
    )


@router.post("/escenas/{id_escena}/desglose/galeria/nuevo")
def crear_elemento_galeria_vinculado(
    id_escena: str,
    tipo: str = Form(...),
    nombre: str = Form(...),
    descripcion: str = Form(...),
    categoria: str | None = Form(None),
    etiquetas: str | None = Form(None),
    notas: str | None = Form(None),
    personajes_vinculados: list[int] = Form([]),
    foto: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin),
):
    values = {
        "tipo": tipo,
        "categoria": categoria,
        "nombre": nombre.strip(),
        "descripcion": descripcion.strip(),
        "id_personaje": None,
        "id_escenario": None,
        "personaje_sinopsis": descripcion.strip() if tipo == "personaje" else None,
        "lugar_apariencia": descripcion.strip() if tipo == "lugar" else None,
        "personajes_vinculados": personajes_vinculados,
        "estado": "Disponible",
    }
    return create_item_for_scene(
        current_user["id_project"],
        id_escena,
        values,
        foto,
        etiquetas.strip() or None if etiquetas else None,
        notas.strip() or None if notas else None,
        db,
    )


@router.post("/escenas/{id_escena}/desglose/requerimientos")
def store_requerimiento(
    id_escena: str,
    data: DesgloseRequerimientoSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin)
):
    return create_requerimiento(id_escena, data, db)


@router.patch("/desglose/requerimientos/{id_requerimiento}")
def patch_requerimiento(
    id_requerimiento: str,
    data: DesgloseRequerimientoUpdateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin)
):
    return update_requerimiento(id_requerimiento, data, db)


@router.delete("/desglose/requerimientos/{id_requerimiento}")
def destroy_requerimiento(
    id_requerimiento: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin)
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
    current_user: dict = Depends(require_project_admin)
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
