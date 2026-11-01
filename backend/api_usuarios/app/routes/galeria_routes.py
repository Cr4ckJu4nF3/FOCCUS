from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.controllers.galeria_controller import (
    create_item,
    create_item_version,
    delete_item,
    get_items,
    get_item_versions,
    record_item_use_without_changes,
    replace_photo,
    upload_item_version_photo,
    update_item,
)
from app.schemas.galeria_schema import GaleriaUpdateSchema, GaleriaVersionCreateSchema
from app.utils.auth import require_project_admin, require_project_member

router = APIRouter()


@router.get("/projects/{id_project}/galeria")
def gallery_items(
    id_project: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_member),
):
    return get_items(id_project, db)


@router.get("/projects/{id_project}/galeria/{id_galeria}/versiones")
def gallery_item_versions(
    id_project: str,
    id_galeria: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_member),
):
    return get_item_versions(id_project, id_galeria, db)


@router.post("/projects/{id_project}/galeria/{id_galeria}/versiones")
def store_gallery_item_version(
    id_project: str,
    id_galeria: int,
    data: GaleriaVersionCreateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_member),
):
    return create_item_version(id_project, id_galeria, data.model_dump(), db)


@router.post("/projects/{id_project}/galeria/{id_galeria}/uso")
def store_gallery_item_use_without_changes(
    id_project: str,
    id_galeria: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_member),
):
    return record_item_use_without_changes(id_project, id_galeria, db)


@router.post("/projects/{id_project}/galeria/{id_galeria}/versiones/{id_version}/foto")
def store_gallery_version_photo(
    id_project: str,
    id_galeria: int,
    id_version: int,
    foto: UploadFile | None = File(None),
    actualizar_imagen_principal: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_member),
):
    if actualizar_imagen_principal and current_user["id_rol"] != 1001:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador del proyecto puede actualizar la imagen principal",
        )
    return upload_item_version_photo(
        id_project,
        id_galeria,
        id_version,
        foto,
        actualizar_imagen_principal,
        db,
    )


@router.post("/projects/{id_project}/galeria")
def store_gallery_item(
    id_project: str,
    tipo: str = Form(...),
    nombre: str = Form(...),
    descripcion: str = Form(...),
    foto: UploadFile = File(...),
    categoria: str | None = Form(None),
    id_personaje: str | None = Form(None),
    id_escenario: str | None = Form(None),
    id_escena: str | None = Form(None),
    id_guion: int | None = Form(None),
    personaje_sinopsis: str | None = Form(None),
    interprete_nombre: str | None = Form(None),
    interprete_descripcion: str | None = Form(None),
    lugar_detalle_ubicacion: str | None = Form(None),
    lugar_apariencia: str | None = Form(None),
    lugar_objetos: str | None = Form(None),
    lugar_personajes: str | None = Form(None),
    personajes_vinculados: list[int] = Form([]),
    ultimo_uso: date | None = Form(None),
    estado: str = Form("Disponible"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin),
):
    values = {
        "tipo": tipo,
        "categoria": categoria,
        "nombre": nombre.strip(),
        "descripcion": descripcion.strip(),
        "id_personaje": id_personaje or None,
        "id_escenario": id_escenario or None,
        "id_escena": id_escena or None,
        "id_guion": id_guion,
        "personaje_sinopsis": personaje_sinopsis,
        "interprete_nombre": interprete_nombre,
        "interprete_descripcion": interprete_descripcion,
        "lugar_detalle_ubicacion": lugar_detalle_ubicacion,
        "lugar_apariencia": lugar_apariencia,
        "lugar_objetos": lugar_objetos,
        "lugar_personajes": lugar_personajes,
        "personajes_vinculados": personajes_vinculados,
        "ultimo_uso": ultimo_uso,
        "estado": estado.strip() or "Disponible",
    }
    return create_item(id_project, values, foto, db)


@router.patch("/projects/{id_project}/galeria/{id_galeria}")
def edit_gallery_item(
    id_project: str,
    id_galeria: int,
    data: GaleriaUpdateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin),
):
    return update_item(id_project, id_galeria, data, db)


@router.post("/projects/{id_project}/galeria/{id_galeria}/foto")
def edit_gallery_photo(
    id_project: str,
    id_galeria: int,
    foto: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin),
):
    return replace_photo(id_project, id_galeria, foto, db)


@router.delete("/projects/{id_project}/galeria/{id_galeria}")
def remove_gallery_item(
    id_project: str,
    id_galeria: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin),
):
    return delete_item(id_project, id_galeria, db)
