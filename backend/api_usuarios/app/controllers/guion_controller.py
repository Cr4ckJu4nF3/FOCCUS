from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from fastapi import UploadFile
from app.models.Guion import Guion
from app.models.guion_version_model import GuionVersion
from app.models.guion_nota_model import GuionNota
from app.schemas.guion_schema import (
    GuionSchema,
    GuionUpdateSchema,
    GuionVersionSchema,
    GuionVersionTextoSchema,
    GuionDesdeCeroSchema,
    GuionNotaSchema
)
from app.utils.response import api_response
from app.utils.file_storage import guardar_archivo, EXTENSIONES_GUION


# GET ALL GUIONES (filtrable por proyecto con ?id_project=)

def _serializar_guion_con_version_actual(g: Guion, db: Session):
    version_actual = None
    if g.id_guion_version_actual:
        version_actual = (
            db.query(GuionVersion)
            .filter(GuionVersion.id_guion_version == g.id_guion_version_actual)
            .first()
        )

    return {
        "id_guion": g.id_guion,
        "nombre": g.nombre,
        "descripcion": g.descripcion,
        "id_project": g.id_project,
        "id_guion_version_actual": g.id_guion_version_actual,
        "estado_actual": version_actual.estado if version_actual else None,
        "numero_de_version_actual": version_actual.numero_de_version if version_actual else None,
        "origen_actual": "texto" if (version_actual and version_actual.contenido) else "archivo" if version_actual else None
    }


def get_guiones(db: Session, id_project: str = None):
    query = db.query(Guion)
    if id_project:
        query = query.filter(Guion.id_project == id_project)
    guiones = query.order_by(Guion.id_guion.desc()).all()

    guiones_list = [_serializar_guion_con_version_actual(g, db) for g in guiones]
    return api_response(True, "Lista de guiones", guiones_list)


# GET GUION BY ID

def get_guion(id_guion: int, db: Session):
    guion = db.query(Guion).filter(Guion.id_guion == id_guion).first()

    if not guion:
        return api_response(False, "Guion no encontrado")

    return api_response(True, "Guion encontrado", _serializar_guion_con_version_actual(guion, db))


# CREATE GUION (solo crea el registro maestro; la primera version se
# sube aparte con subir_version o crear_version_texto, segun si viene
# de un archivo o de texto escrito en el sistema)

def create_guion(guion: GuionSchema, db: Session):
    new_guion = Guion(
        nombre=guion.nombre,
        descripcion=guion.descripcion,
        id_project=guion.id_project
    )

    db.add(new_guion)
    db.commit()
    db.refresh(new_guion)

    return api_response(True, "Guion creado", {
        "id_guion": new_guion.id_guion,
        "nombre": new_guion.nombre,
        "id_project": new_guion.id_project
    })


# CREAR GUION DESDE CERO (crea el maestro + primera version escrita
# directo en el sistema, en un solo paso, sin necesidad de archivo)

def crear_guion_desde_cero(data: GuionDesdeCeroSchema, id_user: int, db: Session):
    new_guion = Guion(
        nombre=data.nombre,
        descripcion=data.descripcion,
        id_project=data.id_project
    )
    db.add(new_guion)
    db.flush()  # asigna id_guion antes del commit

    primera_version = GuionVersion(
        id_guion=new_guion.id_guion,
        numero_de_version=1,
        archivo=None,
        contenido=data.contenido,
        fecha_de_emision=data.fecha_de_emision,
        estado=data.estado,
        comentario_cambio="Version inicial creada desde el sistema",
        creado_por=id_user
    )
    db.add(primera_version)
    db.flush()

    new_guion.id_guion_version_actual = primera_version.id_guion_version
    db.commit()
    db.refresh(new_guion)
    db.refresh(primera_version)

    return api_response(True, "Guion creado desde cero", {
        "id_guion": new_guion.id_guion,
        "nombre": new_guion.nombre,
        "id_project": new_guion.id_project,
        "id_guion_version": primera_version.id_guion_version,
        "numero_de_version": primera_version.numero_de_version
    })


# SUBIR GUION (crea el maestro + primera version en un solo paso, a
# partir de un archivo PDF/Word/FDX subido. Equivalente a
# crear_guion_desde_cero pero para el flujo "Subir guion" en vez de
# "Crear desde cero". La version siempre queda como numero 1 y el
# usuario nunca elige el numero de version manualmente.)

def crear_guion_desde_archivo(nombre: str, descripcion: str, id_project: str, archivo: UploadFile, id_user: int, db: Session):
    new_guion = Guion(
        nombre=nombre,
        descripcion=descripcion,
        id_project=id_project
    )
    db.add(new_guion)
    db.flush()  # asigna id_guion antes del commit

    try:
        ruta_archivo = guardar_archivo(
            archivo, subcarpeta=f"guiones/{new_guion.id_guion}", extensiones_permitidas=EXTENSIONES_GUION
        )
    except ValueError as e:
        db.rollback()
        return api_response(False, str(e), error="INVALID_FILE")

    primera_version = GuionVersion(
        id_guion=new_guion.id_guion,
        numero_de_version=1,
        archivo=ruta_archivo,
        contenido=None,
        fecha_de_emision=date.today(),
        estado="Borrador",
        comentario_cambio="Version inicial subida al sistema",
        creado_por=id_user
    )
    db.add(primera_version)
    db.flush()

    new_guion.id_guion_version_actual = primera_version.id_guion_version
    db.commit()
    db.refresh(new_guion)
    db.refresh(primera_version)

    return api_response(True, "Guion subido correctamente", {
        "id_guion": new_guion.id_guion,
        "nombre": new_guion.nombre,
        "id_project": new_guion.id_project,
        "id_guion_version": primera_version.id_guion_version,
        "numero_de_version": primera_version.numero_de_version,
        "archivo": primera_version.archivo
    })


# UPDATE GUION (PATCH)

def update_guion(id_guion: int, guion: GuionUpdateSchema, db: Session):
    guion_db = db.query(Guion).filter(Guion.id_guion == id_guion).first()

    if not guion_db:
        return api_response(False, "Guion no encontrado")

    update_data = guion.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(guion_db, key, value)

    db.commit()
    db.refresh(guion_db)

    return api_response(True, "Guion actualizado", {
        "id_guion": guion_db.id_guion,
        "nombre": guion_db.nombre
    })


# DELETE GUION

def delete_guion(id_guion: int, db: Session):
    guion = db.query(Guion).filter(Guion.id_guion == id_guion).first()

    if not guion:
        return api_response(False, "Guion no encontrado")

    db.delete(guion)
    db.commit()

    return api_response(True, "Guion eliminado")


# SUBIR NUEVA VERSION (cada llamada crea una fila nueva en guion_version
# y actualiza el puntero id_guion_version_actual del guion)

def subir_version(id_guion: int, data: GuionVersionSchema, archivo: UploadFile, id_user: int, db: Session):
    guion = db.query(Guion).filter(Guion.id_guion == id_guion).first()

    if not guion:
        return api_response(False, "Guion no encontrado")

    try:
        ruta_archivo = guardar_archivo(
            archivo, subcarpeta=f"guiones/{id_guion}", extensiones_permitidas=EXTENSIONES_GUION
        )
    except ValueError as e:
        return api_response(False, str(e), error="INVALID_FILE")

    ultima_version = (
        db.query(sqlfunc.max(GuionVersion.numero_de_version))
        .filter(GuionVersion.id_guion == id_guion)
        .scalar()
    ) or 0

    nueva_version = GuionVersion(
        id_guion=id_guion,
        numero_de_version=ultima_version + 1,
        archivo=ruta_archivo,
        fecha_de_emision=data.fecha_de_emision,
        estado=data.estado,
        comentario_cambio=data.comentario_cambio,
        creado_por=id_user
    )

    db.add(nueva_version)
    db.flush()  # asigna id_guion_version antes del commit

    guion.id_guion_version_actual = nueva_version.id_guion_version
    db.commit()
    db.refresh(nueva_version)

    return api_response(True, "Nueva version del guion subida", {
        "id_guion_version": nueva_version.id_guion_version,
        "numero_de_version": nueva_version.numero_de_version,
        "archivo": nueva_version.archivo,
        "estado": nueva_version.estado
    })


# CREAR NUEVA VERSION ESCRITA DIRECTO EN EL SISTEMA (sin archivo)

def crear_version_texto(id_guion: int, data: GuionVersionTextoSchema, id_user: int, db: Session):
    guion = db.query(Guion).filter(Guion.id_guion == id_guion).first()

    if not guion:
        return api_response(False, "Guion no encontrado")

    ultima_version = (
        db.query(sqlfunc.max(GuionVersion.numero_de_version))
        .filter(GuionVersion.id_guion == id_guion)
        .scalar()
    ) or 0

    nueva_version = GuionVersion(
        id_guion=id_guion,
        numero_de_version=ultima_version + 1,
        archivo=None,
        contenido=data.contenido,
        fecha_de_emision=data.fecha_de_emision,
        estado=data.estado,
        comentario_cambio=data.comentario_cambio,
        creado_por=id_user
    )

    db.add(nueva_version)
    db.flush()  # asigna id_guion_version antes del commit

    guion.id_guion_version_actual = nueva_version.id_guion_version
    db.commit()
    db.refresh(nueva_version)

    return api_response(True, "Nueva version del guion guardada", {
        "id_guion_version": nueva_version.id_guion_version,
        "numero_de_version": nueva_version.numero_de_version,
        "contenido": nueva_version.contenido,
        "estado": nueva_version.estado
    })


# LISTAR VERSIONES DE UN GUION

def get_versiones(id_guion: int, db: Session):
    versiones = (
        db.query(GuionVersion)
        .filter(GuionVersion.id_guion == id_guion)
        .order_by(GuionVersion.numero_de_version.desc())
        .all()
    )

    versiones_list = [
        {
            "id_guion_version": v.id_guion_version,
            "numero_de_version": v.numero_de_version,
            "archivo": v.archivo,
            "contenido": v.contenido,
            "fecha_de_emision": str(v.fecha_de_emision),
            "estado": v.estado,
            "comentario_cambio": v.comentario_cambio,
            "creado_por": v.creado_por,
            "fecha_creacion": str(v.fecha_creacion)
        }
        for v in versiones
    ]
    return api_response(True, "Versiones del guion", versiones_list)


# AGREGAR NOTA A UNA VERSION

def agregar_nota(id_guion_version: int, data: GuionNotaSchema, id_user: int, db: Session):
    version = db.query(GuionVersion).filter(GuionVersion.id_guion_version == id_guion_version).first()

    if not version:
        return api_response(False, "Version de guion no encontrada")

    nota = GuionNota(
        id_guion_version=id_guion_version,
        id_user=id_user,
        contenido=data.contenido
    )

    db.add(nota)
    db.commit()
    db.refresh(nota)

    return api_response(True, "Nota agregada", {
        "id_nota": nota.id_nota,
        "contenido": nota.contenido,
        "id_user": nota.id_user
    })


# LISTAR NOTAS DE UNA VERSION

def get_notas(id_guion_version: int, db: Session):
    notas = (
        db.query(GuionNota)
        .filter(GuionNota.id_guion_version == id_guion_version)
        .order_by(GuionNota.fecha_creacion.desc())
        .all()
    )

    notas_list = [
        {
            "id_nota": n.id_nota,
            "id_user": n.id_user,
            "contenido": n.contenido,
            "fecha_creacion": str(n.fecha_creacion)
        }
        for n in notas
    ]
    return api_response(True, "Notas de la version", notas_list)
