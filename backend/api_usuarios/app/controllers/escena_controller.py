from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import and_, delete, inspect
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.escena_model import Escena
from app.models.escena_version_model import EscenaVersion
from app.models.continuidad_foto_model import ContinuidadFoto
from app.models.escena_galeria_item_model import EscenaGaleriaItem
from app.models.galeria_model import GaleriaItem
from app.models.galeria_version_model import GaleriaVersion
from app.models.desglose_model import Desglose
from app.models.desglose_requerimiento_model import DesgloseRequerimiento
from app.models.Guion import Guion
from app.models.rodaje_model import Rodaje
from app.schemas.escena_schema import EscenaSchema, EscenaUpdateSchema, SincronizarEscenasSchema
from app.utils.response import api_response
from app.utils.codigos import adjuntar_codigos, asignar_codigo, codigos_entidad
from app.utils import file_storage


# GENERAR ID DE ESCENA (esc0001, esc0002, ...) - mismo patron que
# project_controller.create_project para generar id_project

def _generar_id_escena(db: Session) -> str:
    last_escena = db.query(Escena).order_by(Escena.id_escena.desc()).first()

    if last_escena and last_escena.id_escena.startswith("esc"):
        try:
            last_num = int(last_escena.id_escena.replace("esc", ""))
            new_num = last_num + 1
        except ValueError:
            new_num = 1
    else:
        new_num = 1

    return f"esc{new_num:04d}"


def _serializar_escena(e: Escena):
    return {
        "id_escena": e.id_escena,
        "numero_de_escena": e.numero_de_escena,
        "encabezado": e.encabezado,
        "descripcion": e.descripcion,
        "id_guion": e.id_guion,
        "modo_vista": e.modo_vista,
        "momento_dia": e.momento_dia,
        "ciudad": e.ciudad,
        "pagina": e.pagina,
        "fecha_de_grabacion": str(e.fecha_de_grabacion) if e.fecha_de_grabacion else None,
        "dia_dramatico": e.dia_dramatico,
        "estado": e.estado or "Pendiente",
        "id_rodaje": e.id_rodaje,
        "id_desglose": e.id_desglose
    }


# LISTAR ESCENAS DE UN GUION

def get_escenas_by_guion(id_guion: int, id_project: str, db: Session, incluir_codigo: bool = False):
    escenas = (
        db.query(Escena)
        .join(Guion, Guion.id_guion == Escena.id_guion)
        .filter(Escena.id_guion == id_guion, Guion.id_project == id_project)
        .order_by(Escena.numero_de_escena.asc())
        .all()
    )

    data = [_serializar_escena(e) for e in escenas]
    # `codigo` solo para el admin del proyecto
    adjuntar_codigos(db, data, "ESC", "id_escena", incluir_codigo)
    return api_response(True, "Escenas del guion", data)


def get_escenas_by_project(id_project: str, db: Session, incluir_codigo: bool = False):
    escenas = (
        db.query(Escena, Guion.nombre)
        .join(Guion, Guion.id_guion == Escena.id_guion)
        .filter(Guion.id_project == id_project)
        .order_by(Guion.nombre.asc(), Escena.numero_de_escena.asc())
        .all()
    )
    data = []
    for escena, nombre_guion in escenas:
        ficha = _serializar_escena(escena)
        ficha["nombre_guion"] = nombre_guion
        data.append(ficha)
    adjuntar_codigos(db, data, "ESC", "id_escena", incluir_codigo)
    return api_response(True, "Escenas del proyecto", data)


# GET ESCENA BY ID

def get_escena(id_escena: str, id_project: str, db: Session, incluir_codigo: bool = False):
    escena = db.query(Escena).join(
        Guion, Guion.id_guion == Escena.id_guion
    ).filter(
        Escena.id_escena == id_escena,
        Guion.id_project == id_project,
    ).first()

    if not escena:
        return api_response(False, "Escena no encontrada")

    data = _serializar_escena(escena)
    adjuntar_codigos(db, [data], "ESC", "id_escena", incluir_codigo)
    return api_response(True, "Escena encontrada", data)


# CREAR ESCENA (subdividir un guion en escenas)

def _validate_scene_links(id_project: str, id_rodaje: str | None, id_desglose: str | None, db: Session):
    if id_rodaje and not db.query(Rodaje.id_rodaje).filter(
        Rodaje.id_rodaje == id_rodaje,
        Rodaje.id_project == id_project,
    ).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso no encontrado")

    if id_desglose and not db.query(Escena.id_escena).join(
        Guion, Guion.id_guion == Escena.id_guion
    ).filter(
        Escena.id_desglose == id_desglose,
        Guion.id_project == id_project,
    ).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso no encontrado")


def aplicar_lote_escenas(id_guion: int, solicitud: SincronizarEscenasSchema, id_project: str, db: Session):
    """Aplica acciones dentro de la transacción abierta por el llamador."""
    # Todos los lotes de un guion toman primero el mismo bloqueo de escritura.
    guion = db.query(Guion).filter(
        Guion.id_guion == id_guion, Guion.id_project == id_project,
    ).with_for_update().first()
    if not guion:
        raise HTTPException(status_code=404, detail="Guion no encontrado")

    escenas = db.query(Escena).filter(
        Escena.id_guion == id_guion,
    ).with_for_update().all()
    por_id = {escena.id_escena: escena for escena in escenas}
    cambios = {}
    nuevos = []
    for accion in solicitud.acciones:
        datos = accion.payload.model_dump(exclude_unset=True)
        for campo, longitud in (("numero_de_escena", 45), ("encabezado", 250)):
            if campo in datos and (
                datos[campo] is None or not datos[campo].strip() or len(datos[campo]) > longitud
            ):
                raise HTTPException(status_code=422, detail=f"{campo} debe tener entre 1 y {longitud} caracteres")
        if accion.tipo == "actualizar":
            if accion.id_escena not in por_id:
                raise HTTPException(status_code=404, detail="Escena no encontrada en el guion")
            if accion.id_escena in cambios:
                raise HTTPException(status_code=409, detail="La escena aparece más de una vez en el lote")
            cambios[accion.id_escena] = datos
        else:
            nuevos.append(datos)
        _validate_scene_links(id_project, datos.get("id_rodaje"), datos.get("id_desglose"), db)

    # Compara el estado final, permitiendo intercambiar números en el lote.
    numeros = {}
    for escena in escenas:
        numero = cambios.get(escena.id_escena, {}).get("numero_de_escena", escena.numero_de_escena)
        clave = numero.strip().casefold()
        numeros.setdefault(clave, []).append(escena.id_escena)
    for datos in nuevos:
        clave = datos["numero_de_escena"].strip().casefold()
        numeros.setdefault(clave, []).append(None)
    if any(len(ids) > 1 for ids in numeros.values()):
        raise HTTPException(status_code=409, detail="Número de escena duplicado en el guion")

    resultado = []
    for accion in solicitud.acciones:
        if accion.tipo == "actualizar":
            escena = por_id[accion.id_escena]
            for clave, valor in cambios[accion.id_escena].items():
                setattr(escena, clave, valor)
            resultado.append(escena)
        else:
            datos = accion.payload.model_dump()
            escena = Escena(id_escena=_generar_id_escena(db), id_guion=id_guion, **datos)
            if not escena.estado:
                escena.estado = "Pendiente"
            db.add(escena)
            db.flush()
            asignar_codigo(db, "ESC", escena.id_escena, id_project)
            resultado.append(escena)

    db.flush()
    return resultado


def sincronizar_escenas(id_guion: int, solicitud: SincronizarEscenasSchema, id_project: str, db: Session):
    try:
        resultado = aplicar_lote_escenas(id_guion, solicitud, id_project, db)
        data = [_serializar_escena(escena) for escena in resultado]
        adjuntar_codigos(db, data, "ESC", "id_escena", True)
        db.commit()
        return api_response(True, "Escenas sincronizadas", data)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto al guardar escenas; intenta de nuevo") from error
    except Exception:
        db.rollback()
        raise


def create_escena(escena: EscenaSchema, id_project: str, db: Session):
    guion = db.query(Guion).filter(
        Guion.id_guion == escena.id_guion,
        Guion.id_project == id_project,
    ).first()
    if not guion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guion no encontrado")
    _validate_scene_links(id_project, escena.id_rodaje, escena.id_desglose, db)

    id_escena = _generar_id_escena(db)

    new_escena = Escena(
        id_escena=id_escena,
        numero_de_escena=escena.numero_de_escena,
        encabezado=escena.encabezado,
        descripcion=escena.descripcion,
        id_guion=escena.id_guion,
        modo_vista=escena.modo_vista,
        momento_dia=escena.momento_dia,
        ciudad=escena.ciudad,
        pagina=escena.pagina,
        fecha_de_grabacion=escena.fecha_de_grabacion,
        dia_dramatico=escena.dia_dramatico,
        estado=escena.estado or "Pendiente",
        id_rodaje=escena.id_rodaje,
        id_desglose=escena.id_desglose
    )

    db.add(new_escena)
    db.flush()
    # Código FOCCUS (ESC-001...): se asigna en la misma transacción. La ruta de
    # creación es solo-admin, así que se puede devolver.
    codigo = asignar_codigo(db, "ESC", new_escena.id_escena, guion.id_project)
    db.commit()
    db.refresh(new_escena)

    data = _serializar_escena(new_escena)
    if codigo:
        data["codigo"] = codigo
    return api_response(True, "Escena creada", data)


# UPDATE ESCENA (PATCH)

def update_escena(id_escena: str, escena: EscenaUpdateSchema, id_project: str, db: Session):
    escena_db = db.query(Escena).join(
        Guion, Guion.id_guion == Escena.id_guion
    ).filter(
        Escena.id_escena == id_escena,
        Guion.id_project == id_project,
    ).first()

    if not escena_db:
        return api_response(False, "Escena no encontrada")

    update_data = escena.model_dump(exclude_unset=True)
    _validate_scene_links(
        id_project,
        update_data.get("id_rodaje", escena_db.id_rodaje),
        update_data.get("id_desglose", escena_db.id_desglose),
        db,
    )
    for key, value in update_data.items():
        setattr(escena_db, key, value)

    db.commit()
    db.refresh(escena_db)

    data = _serializar_escena(escena_db)
    # la ruta PATCH es solo-admin; el código es inmutable y no viene en el schema
    adjuntar_codigos(db, [data], "ESC", "id_escena", True)
    return api_response(True, "Escena actualizada", data)


# DELETE ESCENA

def delete_escena(id_escena: str, id_project: str, db: Session):
    escena = db.query(Escena).join(
        Guion, Guion.id_guion == Escena.id_guion
    ).filter(
        Escena.id_escena == id_escena,
        Guion.id_project == id_project,
    ).first()

    if not escena:
        return api_response(False, "Escena no encontrada")

    desglose_id = escena.id_desglose
    versiones = db.query(EscenaVersion.id_escena_version).filter(
        EscenaVersion.id_escena == id_escena,
    ).all()
    version_ids = [version_id for (version_id,) in versiones]
    rutas_fotos = {
        ruta for (ruta,) in db.query(ContinuidadFoto.archivo_path).filter(
            ContinuidadFoto.id_escena_version.in_(version_ids),
            ContinuidadFoto.archivo_path.is_not(None),
        ).all()
    } if version_ids else set()
    if rutas_fotos and version_ids:
        rutas_compartidas = {
            ruta for (ruta,) in db.query(ContinuidadFoto.archivo_path).filter(
                ContinuidadFoto.archivo_path.in_(rutas_fotos),
                ~ContinuidadFoto.id_escena_version.in_(version_ids),
            ).all()
        }
        rutas_fotos.difference_update(rutas_compartidas)

    try:
        if desglose_id:
            db.query(Desglose.id_desglose).filter(
                Desglose.id_desglose == desglose_id,
            ).with_for_update().all()

        # La galería se conserva como recurso del proyecto; solo se suelta
        # la referencia a esta ficha, igual que con una FK SET NULL.
        db.query(EscenaGaleriaItem).filter(
            EscenaGaleriaItem.id_escena == id_escena,
        ).delete(synchronize_session=False)
        for modelo in (GaleriaItem, GaleriaVersion):
            db.query(modelo).filter(modelo.id_escena == id_escena).update(
                {modelo.id_escena: None},
                synchronize_session=False,
            )

        if version_ids:
            db.query(ContinuidadFoto).filter(
                ContinuidadFoto.id_escena_version.in_(version_ids),
            ).delete(synchronize_session=False)
            db.query(EscenaVersion).filter(
                EscenaVersion.id_escena_version.in_(version_ids),
            ).delete(synchronize_session=False)

        db.query(Escena).filter(Escena.id_escena == id_escena).delete(
            synchronize_session=False,
        )

        # El desglose solo se elimina si ninguna ficha lo sigue usando.
        if desglose_id and not db.query(Escena.id_escena).filter(
            Escena.id_desglose == desglose_id,
        ).with_for_update().first():
            db.query(DesgloseRequerimiento).filter(
                DesgloseRequerimiento.id_desglose == desglose_id,
            ).delete(synchronize_session=False)
            db.query(Desglose).filter(
                Desglose.id_desglose == desglose_id,
            ).delete(synchronize_session=False)

        # Las versiones del guion permanecen intactas; solo se limpia el
        # código de la ficha borrada si el catálogo opcional está disponible.
        if inspect(db.connection()).has_table(codigos_entidad.name):
            db.execute(delete(codigos_entidad).where(
                and_(
                    codigos_entidad.c.id_project == id_project,
                    codigos_entidad.c.tipo == "ESC",
                    codigos_entidad.c.entidad_id == str(id_escena),
                ),
            ))
        db.commit()
    except Exception:
        db.rollback()
        raise

    upload_root = Path(file_storage.BASE_UPLOAD_DIR).resolve()
    relative_directory = f"escenas/{id_escena}/continuidad"
    directory = (upload_root / relative_directory).resolve()
    errores_archivos = []
    for ruta in rutas_fotos:
        if not ruta:
            continue
        ruta_normalizada = (upload_root.parent / ruta).resolve()
        if ruta_normalizada.is_relative_to(upload_root) and ruta_normalizada.is_file():
            try:
                ruta_normalizada.unlink()
            except OSError as error:
                errores_archivos.append(f"{ruta}: {error}")
    if directory.is_relative_to(upload_root) and directory.is_dir():
        try:
            # Solo elimina la carpeta si quedó vacía; no borra archivos ajenos
            # o compartidos que no estén representados en las filas borradas.
            directory.rmdir()
        except OSError:
            pass

    if errores_archivos:
        return api_response(
            False,
            "La ficha se eliminó, pero algunos archivos de continuidad no pudieron borrarse.",
            {"archivos_pendientes": errores_archivos},
            error="FILE_CLEANUP_FAILED",
        )

    return api_response(True, "Escena eliminada")
