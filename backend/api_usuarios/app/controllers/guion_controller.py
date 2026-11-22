from datetime import date
from html.parser import HTMLParser
import re
import shutil
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy import and_, delete, func as sqlfunc, inspect, or_
from fastapi import HTTPException, UploadFile
from app.models.Guion import Guion
from app.models.guion_version_model import GuionVersion
from app.models.guion_nota_model import GuionNota
from app.models.escena_model import Escena
from app.models.escena_version_model import EscenaVersion
from app.models.continuidad_foto_model import ContinuidadFoto
from app.models.desglose_model import Desglose
from app.models.desglose_requerimiento_model import DesgloseRequerimiento
from app.models.escena_galeria_item_model import EscenaGaleriaItem
from app.models.galeria_model import GaleriaItem
from app.models.galeria_version_model import GaleriaVersion
from app.schemas.guion_schema import (
    AccionActualizarEscenaVersionSchema,
    AccionCrearEscenaVersionSchema,
    GuionSchema,
    GuionUpdateSchema,
    GuionVersionSchema,
    GuionVersionTextoSchema,
    GuionVersionEstadoSchema,
    GuionDesdeCeroSchema,
    GuionNotaSchema
)
from app.schemas.escena_schema import (
    AccionActualizarEscenaSchema,
    AccionCrearEscenaSchema,
    SincronizarEscenasSchema,
)
from app.utils.response import api_response
from app.utils.codigos import adjuntar_codigos, asignar_codigo
from app.utils.file_storage import guardar_archivo, EXTENSIONES_GUION
from app.utils import file_storage
from app.utils.codigos import codigos_entidad
from app.utils.guion_content import extraer_contenido_guion


class _MarcadoresEscenaParser(HTMLParser):
    """Lee únicamente la identidad explícita de los bloques de escena."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.escenas = []
        self.error = None

    def handle_starttag(self, tag, attrs):
        atributos = {}
        for nombre, valor in attrs:
            if nombre in atributos:
                self.error = "El HTML repite un atributo de identidad de escena."
            atributos[nombre] = valor
        es_escena = tag == "p" and "gb-escena" in (atributos.get("class") or "").split()
        tiene_id = "data-escena-id" in atributos
        tiene_clave = "data-escena-key" in atributos
        if (tiene_id or tiene_clave) and not es_escena:
            self.error = "La identidad de escena solo puede estar en un encabezado de escena."
        if not es_escena:
            return
        if tiene_id == tiene_clave:
            self.error = "Cada encabezado debe tener una sola asociación segura con una ficha."
            return
        clave = atributos.get("data-escena-key") if tiene_clave else None
        id_escena = atributos.get("data-escena-id") if tiene_id else None
        if clave and not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", clave):
            self.error = "La clave temporal de escena no es válida."
        if id_escena and not re.fullmatch(r"[A-Za-z0-9_-]{1,15}", id_escena):
            self.error = "El identificador de escena no es válido."
        self.escenas.append({"id_escena": id_escena, "client_key": clave})

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)


def _preparar_contenido_y_escenas(contenido, acciones, id_guion, id_project, db):
    """Valida asociaciones explícitas y aplica las fichas sin confirmar aún."""
    parser = _MarcadoresEscenaParser()
    parser.feed(contenido or "")
    parser.close()
    if parser.error:
        raise HTTPException(status_code=422, detail=parser.error)

    ids_html = [fila["id_escena"] for fila in parser.escenas if fila["id_escena"]]
    claves_html = [fila["client_key"] for fila in parser.escenas if fila["client_key"]]
    if len(ids_html) != len(set(ids_html)) or len(claves_html) != len(set(claves_html)):
        raise HTTPException(status_code=409, detail="Una ficha o clave temporal aparece más de una vez en el documento.")

    ids_acciones = [
        accion.id_escena for accion in acciones
        if isinstance(accion, AccionActualizarEscenaVersionSchema)
    ]
    claves_acciones = [
        accion.client_key for accion in acciones
        if isinstance(accion, AccionCrearEscenaVersionSchema)
    ]
    if len(ids_acciones) != len(set(ids_acciones)) or len(claves_acciones) != len(set(claves_acciones)):
        raise HTTPException(status_code=409, detail="Una ficha aparece más de una vez en las acciones de guardado.")
    if set(claves_html) != set(claves_acciones):
        raise HTTPException(status_code=422, detail="Cada escena nueva debe estar asociada a una única acción de creación.")
    if not set(ids_acciones).issubset(set(ids_html)):
        raise HTTPException(status_code=422, detail="Hay cambios de ficha que no corresponden a una escena del documento.")

    filas = {
        fila.id_escena: fila
        for fila in db.query(Escena).filter(
            Escena.id_guion == id_guion,
            Escena.id_escena.in_(ids_html or [""]),
        ).all()
    }
    if set(ids_html) != set(filas):
        raise HTTPException(status_code=404, detail="Una escena del documento ya no pertenece al guion. No se guardó la versión.")

    acciones_sync = []
    for accion in acciones:
        if isinstance(accion, AccionCrearEscenaVersionSchema):
            acciones_sync.append(AccionCrearEscenaSchema(tipo="crear", payload=accion.payload))
        else:
            acciones_sync.append(AccionActualizarEscenaSchema(
                tipo="actualizar",
                id_escena=accion.id_escena,
                payload=accion.payload,
            ))

    if acciones_sync:
        # Import local para conservar la separación routes → controllers y
        # permitir que el guardado de versión comparta esta transacción.
        from app.controllers.escena_controller import aplicar_lote_escenas

        resultado = aplicar_lote_escenas(
            id_guion,
            SincronizarEscenasSchema(acciones=acciones_sync),
            id_project,
            db,
        )
    else:
        resultado = []

    ids_nuevos = {
        accion.client_key: escena.id_escena
        for accion, escena in zip(acciones, resultado)
        if isinstance(accion, AccionCrearEscenaVersionSchema)
    }
    if ids_nuevos:
        patron = re.compile(r'(data-escena-key=")([A-Za-z0-9_-]{1,80})(")')

        def reemplazar_clave(coincidencia):
            id_escena = ids_nuevos.get(coincidencia.group(2))
            if not id_escena:
                return coincidencia.group(0)
            return f'{coincidencia.group(1).replace("data-escena-key", "data-escena-id")}{id_escena}{coincidencia.group(3)}'

        contenido = patron.sub(reemplazar_clave, contenido)
    return contenido, resultado

# GET ALL GUIONES (filtrable por proyecto con ?id_project=)

def _serializar_guion_con_version_actual(g: Guion, db: Session):
    version_actual = None
    if g.id_guion_version_actual:
        version_actual = (
            db.query(GuionVersion)
            .filter(
                GuionVersion.id_guion_version == g.id_guion_version_actual,
                GuionVersion.id_guion == g.id_guion,
            )
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


def get_guiones(db: Session, id_project: str = None, incluir_codigo: bool = False):
    query = db.query(Guion)
    if id_project:
        query = query.filter(Guion.id_project == id_project)
    guiones = query.order_by(Guion.id_guion.desc()).all()

    guiones_list = [_serializar_guion_con_version_actual(g, db) for g in guiones]
    adjuntar_codigos(db, guiones_list, "GUI", "id_guion", incluir_codigo)  # solo admin
    return api_response(True, "Lista de guiones", guiones_list)


# GET GUION BY ID

def get_guion(id_guion: int, db: Session, incluir_codigo: bool = False):
    guion = db.query(Guion).filter(Guion.id_guion == id_guion).first()

    if not guion:
        return api_response(False, "Guion no encontrado")

    data = _serializar_guion_con_version_actual(guion, db)
    adjuntar_codigos(db, [data], "GUI", "id_guion", incluir_codigo)
    return api_response(True, "Guion encontrado", data)


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
    db.flush()
    codigo_guion = asignar_codigo(db, "GUI", new_guion.id_guion, new_guion.id_project)
    db.commit()
    db.refresh(new_guion)

    respuesta = {
        "id_guion": new_guion.id_guion,
        "nombre": new_guion.nombre,
        "id_project": new_guion.id_project
    }
    if codigo_guion:  # creación solo-admin
        respuesta["codigo"] = codigo_guion
    return api_response(True, "Guion creado", respuesta)


# CREAR GUION DESDE CERO (crea el maestro + primera version escrita
# directo en el sistema, en un solo paso, sin necesidad de archivo)

def crear_guion_desde_cero(data: GuionDesdeCeroSchema, id_user: int, db: Session):
    try:
        new_guion = Guion(
            nombre=data.nombre,
            descripcion=data.descripcion,
            id_project=data.id_project
        )
        db.add(new_guion)
        db.flush()  # asigna id_guion antes de insertar la primera versión

        contenido = data.contenido
        if data.acciones_escena is not None:
            contenido, _ = _preparar_contenido_y_escenas(
                contenido, data.acciones_escena, new_guion.id_guion, new_guion.id_project, db,
            )

        primera_version = GuionVersion(
            id_guion=new_guion.id_guion,
            numero_de_version=1,
            archivo=None,
            contenido=contenido,
            fecha_de_emision=data.fecha_de_emision,
            estado=data.estado,
            comentario_cambio="Version inicial creada desde el sistema",
            creado_por=id_user
        )
        db.add(primera_version)
        db.flush()
        codigo_guion = asignar_codigo(db, "GUI", new_guion.id_guion, new_guion.id_project)
        codigo_version = asignar_codigo(db, "VGU", primera_version.id_guion_version, new_guion.id_project)

        new_guion.id_guion_version_actual = primera_version.id_guion_version
        db.commit()
        db.refresh(new_guion)
        db.refresh(primera_version)
    except Exception:
        db.rollback()
        raise

    respuesta = {
        "id_guion": new_guion.id_guion,
        "nombre": new_guion.nombre,
        "id_project": new_guion.id_project,
        "id_guion_version": primera_version.id_guion_version,
        "numero_de_version": primera_version.numero_de_version,
        "contenido": primera_version.contenido,
    }
    if codigo_guion:  # creación solo-admin
        respuesta["codigo"] = codigo_guion
    if codigo_version:
        respuesta["codigo_version"] = codigo_version
    return api_response(True, "Guion creado desde cero", respuesta)


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

    contenido, mensaje_extraccion = extraer_contenido_guion(ruta_archivo)
    primera_version = GuionVersion(
        id_guion=new_guion.id_guion,
        numero_de_version=1,
        archivo=ruta_archivo,
        contenido=contenido,
        fecha_de_emision=date.today(),
        estado="Borrador",
        comentario_cambio="Version inicial subida al sistema",
        creado_por=id_user
    )
    db.add(primera_version)
    db.flush()
    codigo_guion = asignar_codigo(db, "GUI", new_guion.id_guion, new_guion.id_project)
    codigo_version = asignar_codigo(db, "VGU", primera_version.id_guion_version, new_guion.id_project)

    new_guion.id_guion_version_actual = primera_version.id_guion_version
    db.commit()
    db.refresh(new_guion)
    db.refresh(primera_version)

    respuesta = {
        "id_guion": new_guion.id_guion,
        "nombre": new_guion.nombre,
        "id_project": new_guion.id_project,
        "id_guion_version": primera_version.id_guion_version,
        "numero_de_version": primera_version.numero_de_version,
        "archivo": primera_version.archivo,
        "mensaje_extraccion": mensaje_extraccion
    }
    if codigo_guion:  # creación solo-admin
        respuesta["codigo"] = codigo_guion
    if codigo_version:
        respuesta["codigo_version"] = codigo_version
    return api_response(True, "Guion subido correctamente", respuesta)


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

    version_ids = [
        version_id
        for (version_id,) in db.query(GuionVersion.id_guion_version)
        .filter(GuionVersion.id_guion == id_guion)
        .all()
    ]
    scene_ids = [
        scene_id
        for (scene_id,) in db.query(Escena.id_escena)
        .filter(Escena.id_guion == id_guion)
        .all()
    ]
    desglose_ids = [
        desglose_id
        for (desglose_id,) in db.query(Escena.id_desglose).filter(
            Escena.id_escena.in_(scene_ids),
            Escena.id_desglose.is_not(None),
        ).distinct().all()
    ] if scene_ids else []
    scene_version_ids = [
        version_id
        for (version_id,) in db.query(EscenaVersion.id_escena_version)
        .filter(EscenaVersion.id_escena.in_(scene_ids))
        .all()
    ] if scene_ids else []

    upload_paths = {
        path for (path,) in db.query(GuionVersion.archivo).filter(
            GuionVersion.id_guion == id_guion,
            GuionVersion.archivo.is_not(None),
        ).all()
    }
    if scene_version_ids:
        upload_paths.update(
            path for (path,) in db.query(ContinuidadFoto.archivo_path).filter(
                ContinuidadFoto.id_escena_version.in_(scene_version_ids),
                ContinuidadFoto.archivo_path.is_not(None),
            ).all()
        )

    code_filters = []
    for code_type, entity_ids in (
        ("GUI", [id_guion]),
        ("VGU", version_ids),
        ("ESC", scene_ids),
    ):
        if entity_ids:
            code_filters.append(and_(
                codigos_entidad.c.tipo == code_type,
                codigos_entidad.c.entidad_id.in_([str(entity_id) for entity_id in entity_ids]),
            ))

    try:
        # Bloquear los desgloses candidatos antes de comprobar otras escenas.
        # En MySQL también impide nuevas referencias FK durante el borrado.
        if desglose_ids:
            db.query(Desglose.id_desglose).filter(
                Desglose.id_desglose.in_(desglose_ids)
            ).with_for_update().all()

        # La FK inversa de la versión actual apunta al guion. Se libera
        # primero para permitir eliminar versiones sin depender del motor.
        guion.id_guion_version_actual = None
        db.flush()

        if scene_ids:
            db.query(EscenaGaleriaItem).filter(
                EscenaGaleriaItem.id_escena.in_(scene_ids)
            ).delete(synchronize_session=False)
        # Los recursos y versiones de galería sobreviven; sus referencias
        # opcionales se liberan de forma independiente, como sus FK SET NULL.
        for model in (GaleriaItem, GaleriaVersion):
            if scene_ids:
                db.query(model).filter(model.id_escena.in_(scene_ids)).update(
                    {model.id_escena: None}, synchronize_session=False
                )
            db.query(model).filter(model.id_guion == id_guion).update(
                {model.id_guion: None}, synchronize_session=False
            )

        if version_ids:
            db.query(GuionNota).filter(
                GuionNota.id_guion_version.in_(version_ids)
            ).delete(synchronize_session=False)
        if scene_version_ids:
            db.query(ContinuidadFoto).filter(
                ContinuidadFoto.id_escena_version.in_(scene_version_ids)
            ).delete(synchronize_session=False)
            db.query(EscenaVersion).filter(
                EscenaVersion.id_escena_version.in_(scene_version_ids)
            ).delete(synchronize_session=False)
        if scene_ids:
            db.query(Escena).filter(
                Escena.id_escena.in_(scene_ids)
            ).delete(synchronize_session=False)
        if desglose_ids:
            # La FK apunta de escena a desglose: solo se pueden borrar los
            # que no siguen asociados a ninguna escena de cualquier proyecto.
            remaining = {
                desglose_id for (desglose_id,) in db.query(Escena.id_desglose).filter(
                    Escena.id_desglose.in_(desglose_ids)
                ).with_for_update().all()
            }
            unused_ids = set(desglose_ids) - remaining
            if unused_ids:
                db.query(DesgloseRequerimiento).filter(
                    DesgloseRequerimiento.id_desglose.in_(unused_ids)
                ).delete(synchronize_session=False)
                db.query(Desglose).filter(
                    Desglose.id_desglose.in_(unused_ids)
                ).delete(synchronize_session=False)
        if version_ids:
            db.query(GuionVersion).filter(
                GuionVersion.id_guion_version.in_(version_ids)
            ).delete(synchronize_session=False)

        if code_filters and inspect(db.connection()).has_table(codigos_entidad.name):
            # Los códigos viven en metadata aparte y las filas hijas no se
            # borran como objetos ORM; su limpieza debe ser explícita.
            db.execute(delete(codigos_entidad).where(
                codigos_entidad.c.id_project == guion.id_project,
                or_(*code_filters),
            ))

        # Bulk delete evita el listener genérico que silencia errores de
        # códigos: ya se limpió explícitamente dentro de esta transacción.
        db.query(Guion).filter(Guion.id_guion == id_guion).delete(
            synchronize_session=False
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    upload_root = Path(file_storage.BASE_UPLOAD_DIR).resolve()
    upload_directories = [f"guiones/{id_guion}"]
    upload_directories.extend(
        f"escenas/{scene_id}/continuidad" for scene_id in scene_ids
    )
    cleanup_failures = []
    for relative_directory in upload_directories:
        directory = (upload_root / relative_directory).resolve()
        if directory.is_relative_to(upload_root) and directory.is_dir():
            try:
                shutil.rmtree(directory)
            except OSError as error:
                cleanup_failures.append(f"{relative_directory}: {error}")

    for relative_path in upload_paths:
        if not relative_path:
            continue
        file_path = (upload_root.parent / relative_path).resolve()
        if file_path.is_relative_to(upload_root) and file_path.is_file():
            try:
                file_path.unlink()
            except OSError as error:
                cleanup_failures.append(f"{relative_path}: {error}")

    if cleanup_failures:
        return api_response(
            False,
            "El guion fue eliminado, pero algunos archivos no pudieron borrarse.",
            {"archivos_pendientes": cleanup_failures},
            error="FILE_CLEANUP_FAILED",
        )

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

    contenido, mensaje_extraccion = extraer_contenido_guion(ruta_archivo)
    ultima_version = (
        db.query(sqlfunc.max(GuionVersion.numero_de_version))
        .filter(GuionVersion.id_guion == id_guion)
        .scalar()
    ) or 0

    nueva_version = GuionVersion(
        id_guion=id_guion,
        numero_de_version=ultima_version + 1,
        archivo=ruta_archivo,
        contenido=contenido,
        fecha_de_emision=data.fecha_de_emision,
        estado=data.estado,
        comentario_cambio=data.comentario_cambio,
        creado_por=id_user
    )

    db.add(nueva_version)
    db.flush()  # asigna id_guion_version antes del commit
    codigo_version = asignar_codigo(db, "VGU", nueva_version.id_guion_version, guion.id_project)

    guion.id_guion_version_actual = nueva_version.id_guion_version
    db.commit()
    db.refresh(nueva_version)

    respuesta = {
        "id_guion_version": nueva_version.id_guion_version,
        "numero_de_version": nueva_version.numero_de_version,
        "archivo": nueva_version.archivo,
        "estado": nueva_version.estado,
        "mensaje_extraccion": mensaje_extraccion
    }
    if codigo_version:  # creación solo-admin
        respuesta["codigo"] = codigo_version
    return api_response(True, "Nueva version del guion subida", respuesta)


# CREAR NUEVA VERSION ESCRITA DIRECTO EN EL SISTEMA (sin archivo)

def crear_version_texto(id_guion: int, data: GuionVersionTextoSchema, id_user: int, db: Session):
    guion = db.query(Guion).filter(Guion.id_guion == id_guion).with_for_update().first()

    if not guion:
        return api_response(False, "Guion no encontrado")

    try:
        contenido = data.contenido
        if data.acciones_escena is not None:
            contenido, _ = _preparar_contenido_y_escenas(
                contenido, data.acciones_escena, id_guion, guion.id_project, db,
            )

        ultima_version = (
            db.query(sqlfunc.max(GuionVersion.numero_de_version))
            .filter(GuionVersion.id_guion == id_guion)
            .scalar()
        ) or 0

        nueva_version = GuionVersion(
            id_guion=id_guion,
            numero_de_version=ultima_version + 1,
            archivo=None,
            contenido=contenido,
            fecha_de_emision=data.fecha_de_emision,
            estado=data.estado,
            comentario_cambio=data.comentario_cambio,
            creado_por=id_user
        )

        db.add(nueva_version)
        db.flush()  # asigna id_guion_version antes del commit
        codigo_version = asignar_codigo(db, "VGU", nueva_version.id_guion_version, guion.id_project)

        guion.id_guion_version_actual = nueva_version.id_guion_version
        db.commit()
        db.refresh(nueva_version)
    except Exception:
        db.rollback()
        raise

    respuesta = {
        "id_guion_version": nueva_version.id_guion_version,
        "numero_de_version": nueva_version.numero_de_version,
        "contenido": nueva_version.contenido,
        "estado": nueva_version.estado
    }
    if codigo_version:  # creación solo-admin
        respuesta["codigo"] = codigo_version
    return api_response(True, "Nueva version del guion guardada", respuesta)


# LISTAR VERSIONES DE UN GUION

def get_versiones(id_guion: int, db: Session, incluir_codigo: bool = False):
    versiones = (
        db.query(GuionVersion)
        .filter(GuionVersion.id_guion == id_guion)
        .order_by(GuionVersion.numero_de_version.desc())
        .all()
    )

    versiones_list = []
    for v in versiones:
        contenido = v.contenido
        mensaje_extraccion = None
        if v.archivo and not contenido:
            contenido, mensaje_extraccion = extraer_contenido_guion(v.archivo)
        versiones_list.append({
            "id_guion_version": v.id_guion_version,
            "numero_de_version": v.numero_de_version,
            "archivo": v.archivo,
            "contenido": contenido,
            "fecha_de_emision": str(v.fecha_de_emision),
            "estado": v.estado,
            "comentario_cambio": v.comentario_cambio,
            "creado_por": v.creado_por,
            "fecha_creacion": str(v.fecha_creacion),
            "mensaje_extraccion": mensaje_extraccion
        })
    adjuntar_codigos(db, versiones_list, "VGU", "id_guion_version", incluir_codigo)  # solo admin
    return api_response(True, "Versiones del guion", versiones_list)


def actualizar_estado_version(
    id_guion: int,
    id_guion_version: int,
    id_project: str,
    data: GuionVersionEstadoSchema,
    db: Session,
):
    version = (
        db.query(GuionVersion)
        .join(Guion, Guion.id_guion == GuionVersion.id_guion)
        .filter(
            GuionVersion.id_guion_version == id_guion_version,
            GuionVersion.id_guion == id_guion,
            Guion.id_project == id_project,
        )
        .first()
    )
    if not version:
        return api_response(False, "Versión del guion no encontrada")

    version.estado = data.estado
    db.commit()
    db.refresh(version)
    return api_response(True, "Estado de versión actualizado", {
        "id_guion": id_guion,
        "id_guion_version": version.id_guion_version,
        "numero_de_version": version.numero_de_version,
        "estado": version.estado,
    })


# AGREGAR NOTA A UNA VERSION

def _verificar_version_proyecto(id_guion_version: int, id_project: str, db: Session):
    version = (
        db.query(GuionVersion)
        .join(Guion, Guion.id_guion == GuionVersion.id_guion)
        .filter(GuionVersion.id_guion_version == id_guion_version, Guion.id_project == id_project)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Versión de guion no encontrada")


def agregar_nota(id_guion_version: int, data: GuionNotaSchema, id_user: int, id_project: str, db: Session):
    _verificar_version_proyecto(id_guion_version, id_project, db)

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

def get_notas(id_guion_version: int, id_project: str, db: Session):
    _verificar_version_proyecto(id_guion_version, id_project, db)
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
