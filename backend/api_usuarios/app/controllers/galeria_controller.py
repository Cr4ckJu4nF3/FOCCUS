import os
import unicodedata
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.Guion import Guion
from app.models.escena_model import Escena
from app.models.escenario_model import Escenario
from app.models.galeria_model import GaleriaItem
from app.models.galeria_version_model import GaleriaVersion
from app.models.galeria_version_foto_model import GaleriaVersionFoto
from app.models.personajes_model import Personaje
from app.controllers.personaje_controller import _generar_id_personaje
from app.controllers.escenario_controller import _generar_id_escenario
from app.schemas.galeria_schema import TIPOS_GALERIA, GaleriaUpdateSchema
from app.utils.file_storage import BASE_UPLOAD_DIR, EXTENSIONES_FOTO, guardar_archivo
from app.utils.response import api_response

MAX_FOTO_BYTES = 10 * 1024 * 1024


def _serialize(
    item: GaleriaItem,
    version_count: int = 0,
    pending_photo_count: int = 0,
) -> dict:
    return {
        "id_galeria": item.id_galeria,
        "id_project": item.id_project,
        "tipo": item.tipo,
        "categoria": item.categoria,
        "nombre": item.nombre,
        "descripcion": item.descripcion,
        "archivo_path": item.archivo_path,
        "id_personaje": item.id_personaje,
        "id_escenario": item.id_escenario,
        "id_escena": item.id_escena,
        "id_guion": item.id_guion,
        "personaje_sinopsis": item.personaje_sinopsis,
        "interprete_nombre": item.interprete_nombre,
        "interprete_descripcion": item.interprete_descripcion,
        "lugar_detalle_ubicacion": item.lugar_detalle_ubicacion,
        "lugar_apariencia": item.lugar_apariencia,
        "lugar_objetos": item.lugar_objetos,
        "lugar_personajes": item.lugar_personajes,
        "ultimo_uso": item.ultimo_uso.isoformat() if item.ultimo_uso else None,
        "estado": item.estado,
        "total_versiones": version_count,
        "versiones_sin_foto": pending_photo_count,
        "fecha_creacion": item.fecha_creacion.isoformat() if item.fecha_creacion else None,
        "fecha_actualizacion": item.fecha_actualizacion.isoformat() if item.fecha_actualizacion else None,
    }


def _get_item(id_project: str, id_galeria: int, db: Session) -> Optional[GaleriaItem]:
    return db.query(GaleriaItem).filter(
        GaleriaItem.id_project == id_project,
        GaleriaItem.id_galeria == id_galeria,
    ).first()


def _serialize_version(
    version: GaleriaVersion,
    guion_nombre: Optional[str] = None,
    photo: Optional[GaleriaVersionFoto] = None,
) -> dict:
    return {
        "id_version": version.id_version,
        "id_galeria": version.id_galeria,
        "id_project": version.id_project,
        "numero_version": version.numero_version,
        "nombre_elemento": version.nombre_elemento,
        "categoria_elemento": version.categoria_elemento,
        "detalles_uso": version.detalles_uso,
        "id_guion": version.id_guion,
        "guion_nombre": guion_nombre,
        "id_escena": version.id_escena,
        "archivo_path": photo.archivo_path if photo else None,
        "foto_pendiente": photo is None,
        "actualiza_imagen_principal": photo.actualiza_imagen_principal if photo else False,
        "fecha_creacion": version.fecha_creacion.isoformat() if version.fecha_creacion else None,
    }


def _validate_references(id_project: str, values: dict, db: Session) -> Optional[str]:
    if values.get("id_personaje"):
        exists = db.query(Personaje.id_personaje).filter(
            Personaje.id_personaje == values["id_personaje"],
            Personaje.id_project == id_project,
        ).first()
        if not exists:
            return "El personaje seleccionado no pertenece a este proyecto"

    if values.get("id_escenario"):
        exists = db.query(Escenario.id_escenario).filter(
            Escenario.id_escenario == values["id_escenario"],
            Escenario.id_project == id_project,
        ).first()
        if not exists:
            return "El lugar seleccionado no pertenece a este proyecto"

    if values.get("id_guion"):
        exists = db.query(Guion.id_guion).filter(
            Guion.id_guion == values["id_guion"],
            Guion.id_project == id_project,
        ).first()
        if not exists:
            return "El guion seleccionado no pertenece a este proyecto"

    if values.get("id_escena"):
        scene = db.query(Escena).join(
            Guion, Escena.id_guion == Guion.id_guion
        ).filter(
            Escena.id_escena == values["id_escena"],
            Guion.id_project == id_project,
        ).first()
        if not scene:
            return "La escena seleccionada no pertenece a este proyecto"
        if values.get("id_guion") and scene.id_guion != values["id_guion"]:
            return "La escena seleccionada no corresponde al guion indicado"

    return None


def _normalizar_nombre(nombre: str) -> str:
    normalized = unicodedata.normalize("NFD", " ".join(nombre.split()).casefold())
    return "".join(character for character in normalized if unicodedata.category(character) != "Mn")


def _get_or_create_project_character(id_project: str, values: dict, db: Session) -> tuple[Personaje, bool]:
    nombre = " ".join(values["nombre"].split())
    existing = db.query(Personaje).filter(Personaje.id_project == id_project).all()
    character = next((item for item in existing if _normalizar_nombre(item.nombre) == _normalizar_nombre(nombre)), None)
    if character:
        return character, False

    character = Personaje(
        id_personaje=_generar_id_personaje(db),
        nombre=nombre,
        descripcion=values.get("personaje_sinopsis") or values.get("descripcion"),
        id_project=id_project,
    )
    db.add(character)
    db.flush()
    return character, True


def _get_or_create_project_location(id_project: str, values: dict, db: Session) -> tuple[Escenario, bool]:
    nombre = " ".join(values["nombre"].split())
    existing = db.query(Escenario).filter(Escenario.id_project == id_project).all()
    location = next((item for item in existing if _normalizar_nombre(item.nombre) == _normalizar_nombre(nombre)), None)
    if location:
        return location, False

    category = _normalizar_nombre(values.get("categoria") or "")
    location_type = {
        "interior": "Int",
        "exterior": "Ext",
        "interior / exterior": "Int/Ext",
        "interior/exterior": "Int/Ext",
    }.get(category)
    location = Escenario(
        id_escenario=_generar_id_escenario(db),
        nombre=nombre,
        descripcion=values.get("lugar_apariencia") or values.get("descripcion"),
        tipo=location_type,
        id_project=id_project,
    )
    db.add(location)
    db.flush()
    return location, True


def _validate_photo(photo: UploadFile) -> Optional[str]:
    extension = os.path.splitext(photo.filename or "")[1].lower()
    if extension not in EXTENSIONES_FOTO:
        return f"Formato de imagen no permitido. Usa: {', '.join(sorted(EXTENSIONES_FOTO))}"

    photo.file.seek(0, os.SEEK_END)
    size = photo.file.tell()
    photo.file.seek(0)
    if size == 0:
        return "La fotografía está vacía"
    if size > MAX_FOTO_BYTES:
        return "La fotografía no puede superar los 10 MB"
    return None


def _remove_uploaded_file(relative_path: str) -> None:
    upload_root = Path(BASE_UPLOAD_DIR).resolve()
    file_path = (upload_root.parent / relative_path).resolve()
    if file_path.is_relative_to(upload_root) and file_path.is_file():
        file_path.unlink()


def _remove_uploaded_file_if_unused(relative_path: Optional[str], db: Session) -> None:
    if not relative_path:
        return
    gallery_reference = db.query(GaleriaItem.id_galeria).filter(
        GaleriaItem.archivo_path == relative_path
    ).first()
    version_reference = db.query(GaleriaVersionFoto.id_foto).filter(
        GaleriaVersionFoto.archivo_path == relative_path
    ).first()
    if not gallery_reference and not version_reference:
        _remove_uploaded_file(relative_path)


def get_items(id_project: str, db: Session):
    items = db.query(GaleriaItem).filter(
        GaleriaItem.id_project == id_project
    ).order_by(GaleriaItem.fecha_actualizacion.desc(), GaleriaItem.id_galeria.desc()).all()
    version_counts = dict(
        db.query(GaleriaVersion.id_galeria, func.count(GaleriaVersion.id_version))
        .filter(GaleriaVersion.id_project == id_project)
        .group_by(GaleriaVersion.id_galeria)
        .all()
    )
    pending_photo_counts = dict(
        db.query(GaleriaVersion.id_galeria, func.count(GaleriaVersion.id_version))
        .outerjoin(
            GaleriaVersionFoto,
            GaleriaVersionFoto.id_version == GaleriaVersion.id_version,
        )
        .filter(
            GaleriaVersion.id_project == id_project,
            GaleriaVersionFoto.id_foto.is_(None),
        )
        .group_by(GaleriaVersion.id_galeria)
        .all()
    )
    return api_response(
        True,
        "Galería del proyecto",
        [
            _serialize(
                item,
                version_counts.get(item.id_galeria, 0),
                pending_photo_counts.get(item.id_galeria, 0),
            )
            for item in items
        ],
    )


def get_item_versions(id_project: str, id_galeria: int, db: Session):
    item = _get_item(id_project, id_galeria, db)
    if not item:
        return api_response(False, "Elemento de galería no encontrado", error="NOT_FOUND")

    versions = db.query(GaleriaVersion, Guion.nombre, GaleriaVersionFoto).outerjoin(
        Guion, GaleriaVersion.id_guion == Guion.id_guion
    ).outerjoin(
        GaleriaVersionFoto, GaleriaVersionFoto.id_version == GaleriaVersion.id_version
    ).filter(
        GaleriaVersion.id_project == id_project,
        GaleriaVersion.id_galeria == id_galeria,
    ).order_by(GaleriaVersion.numero_version.desc()).all()
    return api_response(
        True,
        "Historial de usos del elemento",
        [
            _serialize_version(version, guion_nombre, photo)
            for version, guion_nombre, photo in versions
        ],
    )


def record_item_use_without_changes(id_project: str, id_galeria: int, db: Session):
    item = _get_item(id_project, id_galeria, db)
    if not item:
        return api_response(False, "Elemento de galería no encontrado", error="NOT_FOUND")

    item.ultimo_uso = date.today()
    db.commit()
    db.refresh(item)
    return api_response(True, "Uso registrado sin crear una versión", _serialize(item))


def create_item_version(id_project: str, id_galeria: int, values: dict, db: Session):
    item = db.query(GaleriaItem).filter(
        GaleriaItem.id_project == id_project,
        GaleriaItem.id_galeria == id_galeria,
    ).with_for_update().first()
    if not item:
        return api_response(False, "Elemento de galería no encontrado", error="NOT_FOUND")

    reference_error = _validate_references(id_project, values, db)
    if reference_error:
        return api_response(False, reference_error, error="INVALID_REFERENCE")

    latest_version = db.query(func.max(GaleriaVersion.numero_version)).filter(
        GaleriaVersion.id_project == id_project,
        GaleriaVersion.id_galeria == id_galeria,
    ).scalar() or 0
    version = GaleriaVersion(
        id_galeria=item.id_galeria,
        id_project=id_project,
        numero_version=latest_version + 1,
        nombre_elemento=item.nombre,
        categoria_elemento=item.categoria,
        detalles_uso=values["detalles_uso"],
        id_guion=values.get("id_guion"),
        id_escena=values.get("id_escena"),
    )
    try:
        item.ultimo_uso = date.today()
        db.add(version)
        db.commit()
        db.refresh(version)
    except Exception:
        db.rollback()
        raise
    return api_response(True, "Versión de uso registrada", _serialize_version(version))


def upload_item_version_photo(
    id_project: str,
    id_galeria: int,
    id_version: int,
    photo: UploadFile,
    update_gallery_photo: bool,
    db: Session,
):
    item = _get_item(id_project, id_galeria, db)
    if not item:
        return api_response(False, "Elemento de galería no encontrado", error="NOT_FOUND")

    version = db.query(GaleriaVersion).filter(
        GaleriaVersion.id_project == id_project,
        GaleriaVersion.id_galeria == id_galeria,
        GaleriaVersion.id_version == id_version,
    ).first()
    if not version:
        return api_response(False, "Versión de galería no encontrada", error="NOT_FOUND")

    photo_error = _validate_photo(photo)
    if photo_error:
        return api_response(False, photo_error, error="INVALID_PHOTO")

    relative_path = guardar_archivo(
        photo,
        subcarpeta=f"galeria/{id_project}/versiones",
        extensiones_permitidas=EXTENSIONES_FOTO,
    )
    old_version_photo = db.query(GaleriaVersionFoto).filter(
        GaleriaVersionFoto.id_version == id_version,
        GaleriaVersionFoto.id_project == id_project,
    ).first()
    old_version_path = old_version_photo.archivo_path if old_version_photo else None
    old_item_path = item.archivo_path if update_gallery_photo else None
    try:
        if old_version_photo:
            old_version_photo.archivo_path = relative_path
            old_version_photo.actualiza_imagen_principal = update_gallery_photo
        else:
            db.add(GaleriaVersionFoto(
                id_version=id_version,
                id_project=id_project,
                archivo_path=relative_path,
                actualiza_imagen_principal=update_gallery_photo,
            ))
        if update_gallery_photo:
            item.archivo_path = relative_path
        db.commit()
        db.refresh(version)
    except Exception:
        db.rollback()
        _remove_uploaded_file(relative_path)
        raise

    for previous_path in {old_version_path, old_item_path} - {None, relative_path}:
        _remove_uploaded_file_if_unused(previous_path, db)

    image = db.query(GaleriaVersionFoto).filter(
        GaleriaVersionFoto.id_version == id_version,
        GaleriaVersionFoto.id_project == id_project,
    ).first()
    return api_response(
        True,
        "Imagen de versión guardada",
        _serialize_version(version, photo=image),
    )


def create_item(
    id_project: str,
    values: dict,
    photo: UploadFile,
    db: Session,
):
    if values.get("tipo") not in TIPOS_GALERIA:
        return api_response(False, "Tipo de galería no válido", error="INVALID_TYPE")
    if not (values.get("nombre") or "").strip() or not (values.get("descripcion") or "").strip():
        return api_response(False, "El nombre y la descripción son obligatorios", error="INVALID_DATA")
    if values["tipo"] in {"personaje", "lugar"} and len(values["nombre"].strip()) > 100:
        return api_response(False, "El nombre no puede superar los 100 caracteres para vincularlo al proyecto", error="INVALID_DATA")

    photo_error = _validate_photo(photo)
    if photo_error:
        return api_response(False, photo_error, error="INVALID_PHOTO")
    linked_entity = None
    entity_created = False
    try:
        if values["tipo"] == "personaje":
            character, entity_created = _get_or_create_project_character(id_project, values, db)
            values["id_personaje"] = character.id_personaje
            values["id_escenario"] = None
            linked_entity = "personaje"
        elif values["tipo"] == "lugar":
            location, entity_created = _get_or_create_project_location(id_project, values, db)
            values["id_escenario"] = location.id_escenario
            values["id_personaje"] = None
            linked_entity = "lugar"
    except Exception:
        db.rollback()
        raise

    reference_error = _validate_references(id_project, values, db)
    if reference_error:
        db.rollback()
        return api_response(False, reference_error, error="INVALID_REFERENCE")

    relative_path = guardar_archivo(
        photo,
        subcarpeta=f"galeria/{id_project}",
        extensiones_permitidas=EXTENSIONES_FOTO,
    )
    item = GaleriaItem(
        id_project=id_project,
        archivo_path=relative_path,
        **values,
    )
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        _remove_uploaded_file(relative_path)
        raise

    response_data = _serialize(item)
    response_data.update({
        "entidad_vinculada": linked_entity,
        "entidad_creada": entity_created,
    })
    return api_response(True, "Elemento agregado a la galería", response_data)


def update_item(id_project: str, id_galeria: int, data: GaleriaUpdateSchema, db: Session):
    item = _get_item(id_project, id_galeria, db)
    if not item:
        return api_response(False, "Elemento de galería no encontrado", error="NOT_FOUND")

    updates = data.model_dump(exclude_unset=True)
    reference_values = {
        key: getattr(item, key)
        for key in ("id_personaje", "id_escenario", "id_escena", "id_guion")
    }
    reference_values.update(updates)
    reference_error = _validate_references(id_project, reference_values, db)
    if reference_error:
        return api_response(False, reference_error, error="INVALID_REFERENCE")

    for key, value in updates.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return api_response(True, "Elemento actualizado", _serialize(item))


def replace_photo(id_project: str, id_galeria: int, photo: UploadFile, db: Session):
    item = _get_item(id_project, id_galeria, db)
    if not item:
        return api_response(False, "Elemento de galería no encontrado", error="NOT_FOUND")

    photo_error = _validate_photo(photo)
    if photo_error:
        return api_response(False, photo_error, error="INVALID_PHOTO")

    old_path = item.archivo_path
    new_path = guardar_archivo(
        photo,
        subcarpeta=f"galeria/{id_project}",
        extensiones_permitidas=EXTENSIONES_FOTO,
    )
    try:
        item.archivo_path = new_path
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        _remove_uploaded_file(new_path)
        raise

    _remove_uploaded_file_if_unused(old_path, db)
    return api_response(True, "Fotografía actualizada", _serialize(item))


def delete_item(id_project: str, id_galeria: int, db: Session):
    item = _get_item(id_project, id_galeria, db)
    if not item:
        return api_response(False, "Elemento de galería no encontrado", error="NOT_FOUND")

    photo_paths = {item.archivo_path}
    photo_paths.update(
        path for (path,) in db.query(GaleriaVersionFoto.archivo_path).join(
            GaleriaVersion, GaleriaVersion.id_version == GaleriaVersionFoto.id_version
        ).filter(GaleriaVersion.id_galeria == id_galeria).all()
    )
    db.delete(item)
    db.commit()
    for photo_path in photo_paths:
        _remove_uploaded_file(photo_path)
    return api_response(True, "Elemento eliminado de la galería")
