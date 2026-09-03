from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from fastapi import UploadFile
from app.models.escena_model import Escena
from app.models.escena_version_model import EscenaVersion
from app.models.continuidad_foto_model import ContinuidadFoto
from app.utils.response import api_response
from app.utils.file_storage import guardar_archivo, EXTENSIONES_FOTO

TIPOS_VALIDOS = {"vestuario", "objeto", "espacio"}


# CREAR NUEVA VERSION DE CONTINUIDAD PARA UNA ESCENA

def crear_version_escena(id_escena: str, comentario_cambio: Optional[str], id_user: int, db: Session):
    escena = db.query(Escena).filter(Escena.id_escena == id_escena).first()
    if not escena:
        return api_response(False, "Escena no encontrada")

    ultima_version = (
        db.query(sqlfunc.max(EscenaVersion.numero_version))
        .filter(EscenaVersion.id_escena == id_escena)
        .scalar()
    ) or 0

    version = EscenaVersion(
        id_escena=id_escena,
        numero_version=ultima_version + 1,
        comentario_cambio=comentario_cambio,
        creado_por=id_user
    )

    db.add(version)
    db.commit()
    db.refresh(version)

    return api_response(True, "Nueva version de continuidad creada", {
        "id_escena_version": version.id_escena_version,
        "id_escena": version.id_escena,
        "numero_version": version.numero_version
    })


# LISTAR VERSIONES DE CONTINUIDAD DE UNA ESCENA

def get_versiones_escena(id_escena: str, db: Session):
    versiones = (
        db.query(EscenaVersion)
        .filter(EscenaVersion.id_escena == id_escena)
        .order_by(EscenaVersion.numero_version.desc())
        .all()
    )

    versiones_list = [
        {
            "id_escena_version": v.id_escena_version,
            "numero_version": v.numero_version,
            "comentario_cambio": v.comentario_cambio,
            "creado_por": v.creado_por,
            "fecha_creacion": str(v.fecha_creacion)
        }
        for v in versiones
    ]
    return api_response(True, "Versiones de continuidad", versiones_list)


# SUBIR FOTOS DE CONTINUIDAD A UNA VERSION (vestuario / objeto / espacio)

def subir_fotos(
    id_escena_version: int,
    tipo: str,
    etiqueta: Optional[str],
    id_personaje: Optional[str],
    notas: Optional[str],
    archivos: List[UploadFile],
    db: Session
):
    version = db.query(EscenaVersion).filter(EscenaVersion.id_escena_version == id_escena_version).first()
    if not version:
        return api_response(False, "Version de escena no encontrada")

    if tipo not in TIPOS_VALIDOS:
        return api_response(False, "Tipo invalido. Usa: vestuario, objeto o espacio", error="INVALID_TIPO")

    fotos_creadas = []
    for archivo in archivos:
        try:
            ruta = guardar_archivo(
                archivo,
                subcarpeta=f"escenas/{version.id_escena}/continuidad",
                extensiones_permitidas=EXTENSIONES_FOTO
            )
        except ValueError as e:
            return api_response(False, str(e), error="INVALID_FILE")

        foto = ContinuidadFoto(
            id_escena_version=id_escena_version,
            tipo=tipo,
            etiqueta=etiqueta,
            id_personaje=id_personaje,
            archivo_path=ruta,
            notas=notas
        )
        db.add(foto)
        fotos_creadas.append(foto)

    db.commit()

    fotos_list = [
        {
            "id_foto": f.id_foto,
            "tipo": f.tipo,
            "etiqueta": f.etiqueta,
            "archivo_path": f.archivo_path
        }
        for f in fotos_creadas
    ]
    return api_response(True, "Fotos de continuidad subidas", fotos_list)


# LISTAR FOTOS DE UNA VERSION (opcionalmente filtrado por ?tipo=)

def get_fotos_version(id_escena_version: int, tipo: Optional[str], db: Session):
    query = db.query(ContinuidadFoto).filter(ContinuidadFoto.id_escena_version == id_escena_version)
    if tipo:
        query = query.filter(ContinuidadFoto.tipo == tipo)

    fotos = query.order_by(ContinuidadFoto.fecha_creacion.desc()).all()

    fotos_list = [
        {
            "id_foto": f.id_foto,
            "tipo": f.tipo,
            "etiqueta": f.etiqueta,
            "id_personaje": f.id_personaje,
            "archivo_path": f.archivo_path,
            "notas": f.notas,
            "fecha_creacion": str(f.fecha_creacion)
        }
        for f in fotos
    ]
    return api_response(True, "Fotos de continuidad", fotos_list)
