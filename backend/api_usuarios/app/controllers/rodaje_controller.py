from sqlalchemy.orm import Session
from app.models.rodaje_model import Rodaje
from app.models.proceso_rodaje_model import ProcesoRodaje
from app.models.project_model import Project
from app.models.escena_model import Escena
from app.models.Guion import Guion
from app.schemas.rodaje_schema import RodajeSchema, RodajeUpdateSchema, ProcesoRodajeSchema, ProcesoRodajeUpdateSchema
from app.utils.response import api_response
from app.utils.desglose_parser import parse_rodaje_pdf, extraer_texto_pdf


def _generar_id_rodaje(db: Session) -> str:
    last_rodaje = db.query(Rodaje).order_by(Rodaje.id_rodaje.desc()).first()

    if last_rodaje and last_rodaje.id_rodaje.startswith("rod"):
        try:
            last_num = int(last_rodaje.id_rodaje.replace("rod", ""))
            new_num = last_num + 1
        except ValueError:
            new_num = 1
    else:
        new_num = 1

    return f"rod{new_num:04d}"


def _serializar_escena_breve(e: Escena):
    return {
        "id_escena": e.id_escena,
        "id_guion": e.id_guion,
        "numero_de_escena": e.numero_de_escena,
        "encabezado": e.encabezado,
        "momento_dia": e.momento_dia,
        "modo_vista": e.modo_vista,
        "pagina": e.pagina,
        "estado": e.estado or "Pendiente",
    }


def _serializar_rodaje(r: Rodaje, db: Session):
    escenas = (
        db.query(Escena)
        .filter(Escena.id_rodaje == r.id_rodaje)
        .order_by(Escena.numero_de_escena.asc())
        .all()
    )
    return {
        "id_rodaje": r.id_rodaje,
        "id_project": r.id_project,
        "nombre": r.nombre,
        "descripcion": r.descripcion,
        "fecha_inicio": str(r.fecha_inicio) if r.fecha_inicio else None,
        "fecha_fin": str(r.fecha_fin) if r.fecha_fin else None,
        "dia_dramatico": r.dia_dramatico,
        "semana": r.semana,
        "llamado": r.llamado,
        "locacion": r.locacion,
        "estado": r.estado,
        "archivo": r.archivo,
        "escenas": [_serializar_escena_breve(e) for e in escenas],
    }


def get_rodajes_by_project(id_project: str, db: Session):
    rodajes = (
        db.query(Rodaje)
        .filter(Rodaje.id_project == id_project)
        .order_by(Rodaje.dia_dramatico.asc(), Rodaje.fecha_inicio.asc())
        .all()
    )
    return api_response(True, "Plan de rodaje del proyecto", [_serializar_rodaje(r, db) for r in rodajes])


def get_rodaje(id_rodaje: str, db: Session):
    rodaje = db.query(Rodaje).filter(Rodaje.id_rodaje == id_rodaje).first()
    if not rodaje:
        return api_response(False, "Plan de rodaje no encontrado")

    return api_response(True, "Plan de rodaje encontrado", _serializar_rodaje(rodaje, db))


def create_rodaje(data: RodajeSchema, db: Session):
    project = db.query(Project).filter(Project.id_project == data.id_project).first()
    if not project:
        return api_response(False, "El proyecto indicado no existe", error="PROJECT_NOT_FOUND")

    new_rodaje = Rodaje(
        id_rodaje=_generar_id_rodaje(db),
        id_project=data.id_project,
        nombre=data.nombre,
        descripcion=data.descripcion,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        dia_dramatico=data.dia_dramatico,
        semana=data.semana,
        llamado=data.llamado,
        locacion=data.locacion,
        estado=data.estado,
        archivo=data.archivo,
    )

    db.add(new_rodaje)
    db.commit()
    db.refresh(new_rodaje)

    return api_response(True, "Plan de rodaje creado", _serializar_rodaje(new_rodaje, db))


def update_rodaje(id_rodaje: str, data: RodajeUpdateSchema, db: Session):
    rodaje = db.query(Rodaje).filter(Rodaje.id_rodaje == id_rodaje).first()
    if not rodaje:
        return api_response(False, "Plan de rodaje no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rodaje, key, value)

    db.commit()
    db.refresh(rodaje)

    return api_response(True, "Plan de rodaje actualizado", _serializar_rodaje(rodaje, db))


def delete_rodaje(id_rodaje: str, db: Session):
    rodaje = db.query(Rodaje).filter(Rodaje.id_rodaje == id_rodaje).first()
    if not rodaje:
        return api_response(False, "Plan de rodaje no encontrado")

    db.delete(rodaje)
    db.commit()
    return api_response(True, "Plan de rodaje eliminado")


# ---------- Asignar / quitar escenas de un dia de rodaje ----------
# (el campo Escena.id_rodaje ya existia en el modelo pero nunca se
# usaba desde el frontend; esto es lo que permite construir el
# cronograma "a mano" en la opcion Crear desde cero)

def asignar_escena(id_rodaje: str, id_escena: str, db: Session):
    rodaje = db.query(Rodaje).filter(Rodaje.id_rodaje == id_rodaje).first()
    if not rodaje:
        return api_response(False, "Plan de rodaje no encontrado")

    escena = db.query(Escena).filter(Escena.id_escena == id_escena).first()
    if not escena:
        return api_response(False, "Escena no encontrada")

    escena.id_rodaje = id_rodaje
    if rodaje.dia_dramatico and not escena.dia_dramatico:
        escena.dia_dramatico = rodaje.dia_dramatico
    if rodaje.fecha_inicio and not escena.fecha_de_grabacion:
        escena.fecha_de_grabacion = rodaje.fecha_inicio

    db.commit()
    return api_response(True, "Escena asignada al dia de rodaje", _serializar_rodaje(rodaje, db))


def quitar_escena(id_rodaje: str, id_escena: str, db: Session):
    escena = db.query(Escena).filter(Escena.id_escena == id_escena, Escena.id_rodaje == id_rodaje).first()
    if not escena:
        return api_response(False, "La escena no esta asignada a este dia de rodaje")

    escena.id_rodaje = None
    db.commit()
    return api_response(True, "Escena removida del dia de rodaje")


# Escenas del proyecto que aun no tienen dia de rodaje asignado, para
# poblar el selector de "agregar escena" en Crear desde cero

def get_escenas_disponibles(id_project: str, db: Session):
    escenas = (
        db.query(Escena)
        .join(Guion, Escena.id_guion == Guion.id_guion)
        .filter(Guion.id_project == id_project, Escena.id_rodaje.is_(None))
        .order_by(Escena.numero_de_escena.asc())
        .all()
    )
    return api_response(True, "Escenas del proyecto", [_serializar_escena_breve(e) for e in escenas])


# ---------- Importar un PDF de plan de rodaje ----------
# Reutiliza el mismo parser que Desglose (mismo formato de origen
# Semana > Dia > Escena), tomando de ahi la metadata de cada dia
# (llamado, semana, fecha, locacion) y asignando las escenas que ya
# existan en el proyecto que coincidan por numero de escena.

def importar_rodaje_pdf(id_project: str, ruta_temporal: str, db: Session):
    try:
        texto = extraer_texto_pdf(ruta_temporal)
    except Exception as e:
        return api_response(False, f"No se pudo leer el PDF: {e}", error="PDF_READ_ERROR")

    dias_parseados, escenas_parseadas = parse_rodaje_pdf(texto)
    if not dias_parseados:
        return api_response(
            False,
            "No se pudo reconocer ningun dia de rodaje en este PDF. Revisa que siga el formato esperado.",
            error="NO_DAYS_FOUND"
        )

    escenas_disponibles = (
        db.query(Escena)
        .join(Guion, Escena.id_guion == Guion.id_guion)
        .filter(Guion.id_project == id_project)
        .all()
    )
    escenas_por_numero = {e.numero_de_escena: e for e in escenas_disponibles}

    dias_creados = 0
    dias_actualizados = 0
    escenas_asignadas = 0

    for dia_data in dias_parseados:
        rodaje = (
            db.query(Rodaje)
            .filter(Rodaje.id_project == id_project, Rodaje.dia_dramatico == dia_data["dia_dramatico"])
            .first()
        )

        if not rodaje:
            rodaje = Rodaje(
                id_rodaje=_generar_id_rodaje(db),
                id_project=id_project,
                nombre=f"Día {dia_data['dia_dramatico']}",
                fecha_inicio=dia_data["fecha"],
                dia_dramatico=dia_data["dia_dramatico"],
                semana=dia_data["semana"],
                llamado=dia_data["llamado"],
                locacion=dia_data["locacion_general"],
                estado="Pendiente",
            )
            db.add(rodaje)
            db.flush()
            dias_creados += 1
        else:
            rodaje.fecha_inicio = dia_data["fecha"] or rodaje.fecha_inicio
            rodaje.semana = dia_data["semana"] or rodaje.semana
            rodaje.llamado = dia_data["llamado"] or rodaje.llamado
            rodaje.locacion = dia_data["locacion_general"] or rodaje.locacion
            dias_actualizados += 1

    # Asignar escenas a su dia segun el numero de escena detectado en el PDF
    for escena_data in escenas_parseadas:
        escena = escenas_por_numero.get(escena_data["numero_de_escena"])
        if not escena or not escena_data["dia_dramatico"]:
            continue

        if escena_data.get("descripcion") and not escena.descripcion:
            escena.descripcion = escena_data["descripcion"]

        rodaje_del_dia = (
            db.query(Rodaje)
            .filter(Rodaje.id_project == id_project, Rodaje.dia_dramatico == escena_data["dia_dramatico"])
            .first()
        )
        if rodaje_del_dia:
            escena.id_rodaje = rodaje_del_dia.id_rodaje
            escenas_asignadas += 1

    db.commit()

    return api_response(True, "Plan de rodaje importado correctamente", {
        "dias_creados": dias_creados,
        "dias_actualizados": dias_actualizados,
        "escenas_asignadas": escenas_asignadas,
        "total_dias_en_pdf": len(dias_parseados),
    })


# ---------- Procesos del rodaje (checklist de tareas de un dia) ----------

def get_procesos_by_rodaje(id_rodaje: str, db: Session):
    procesos = (
        db.query(ProcesoRodaje)
        .filter(ProcesoRodaje.id_rodaje == id_rodaje)
        .order_by(ProcesoRodaje.orden.asc(), ProcesoRodaje.fecha.asc())
        .all()
    )

    procesos_list = [
        {
            "id_proceso": p.id_proceso,
            "id_rodaje": p.id_rodaje,
            "nombre": p.nombre,
            "ubicacion": p.ubicacion,
            "fecha": str(p.fecha),
            "encargado": p.encargado,
            "estado": p.estado,
            "descripcion": p.descripcion,
            "orden": p.orden,
            "archivo": p.archivo,
        }
        for p in procesos
    ]
    return api_response(True, "Procesos del plan de rodaje", procesos_list)


def create_proceso(id_rodaje: str, data: ProcesoRodajeSchema, db: Session):
    rodaje = db.query(Rodaje).filter(Rodaje.id_rodaje == id_rodaje).first()
    if not rodaje:
        return api_response(False, "El plan de rodaje indicado no existe", error="RODAJE_NOT_FOUND")

    proceso = ProcesoRodaje(
        id_rodaje=id_rodaje,
        nombre=data.nombre,
        ubicacion=data.ubicacion,
        fecha=data.fecha,
        encargado=data.encargado,
        estado=data.estado,
        descripcion=data.descripcion,
        orden=data.orden,
        archivo=data.archivo,
    )

    db.add(proceso)
    db.commit()
    db.refresh(proceso)

    return api_response(True, "Proceso agregado al plan de rodaje", {
        "id_proceso": proceso.id_proceso,
        "nombre": proceso.nombre,
        "ubicacion": proceso.ubicacion,
        "fecha": str(proceso.fecha),
        "estado": proceso.estado,
    })


def update_proceso(id_proceso: int, data: ProcesoRodajeUpdateSchema, db: Session):
    proceso = db.query(ProcesoRodaje).filter(ProcesoRodaje.id_proceso == id_proceso).first()
    if not proceso:
        return api_response(False, "Proceso no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(proceso, key, value)

    db.commit()
    db.refresh(proceso)

    return api_response(True, "Proceso actualizado", {
        "id_proceso": proceso.id_proceso,
        "nombre": proceso.nombre,
    })


def delete_proceso(id_proceso: int, db: Session):
    proceso = db.query(ProcesoRodaje).filter(ProcesoRodaje.id_proceso == id_proceso).first()
    if not proceso:
        return api_response(False, "Proceso no encontrado")

    db.delete(proceso)
    db.commit()
    return api_response(True, "Proceso eliminado")
