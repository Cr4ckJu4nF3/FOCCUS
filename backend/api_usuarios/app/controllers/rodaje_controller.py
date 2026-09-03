from sqlalchemy.orm import Session
from app.models.rodaje_model import Rodaje
from app.models.proceso_rodaje_model import ProcesoRodaje
from app.models.project_model import Project
from app.schemas.rodaje_schema import RodajeSchema, RodajeUpdateSchema, ProcesoRodajeSchema, ProcesoRodajeUpdateSchema
from app.utils.response import api_response


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


def get_rodajes_by_project(id_project: str, db: Session):
    rodajes = (
        db.query(Rodaje)
        .filter(Rodaje.id_project == id_project)
        .order_by(Rodaje.fecha_inicio.desc())
        .all()
    )

    rodajes_list = [
        {
            "id_rodaje": r.id_rodaje,
            "id_project": r.id_project,
            "nombre": r.nombre,
            "descripcion": r.descripcion,
            "fecha_inicio": str(r.fecha_inicio),
            "fecha_fin": str(r.fecha_fin),
            "locacion": r.locacion,
            "estado": r.estado,
            "archivo": r.archivo,
        }
        for r in rodajes
    ]
    return api_response(True, "Plan de rodaje del proyecto", rodajes_list)


def get_rodaje(id_rodaje: str, db: Session):
    rodaje = db.query(Rodaje).filter(Rodaje.id_rodaje == id_rodaje).first()
    if not rodaje:
        return api_response(False, "Plan de rodaje no encontrado")

    return api_response(True, "Plan de rodaje encontrado", {
        "id_rodaje": rodaje.id_rodaje,
        "id_project": rodaje.id_project,
        "nombre": rodaje.nombre,
        "descripcion": rodaje.descripcion,
        "fecha_inicio": str(rodaje.fecha_inicio),
        "fecha_fin": str(rodaje.fecha_fin),
        "locacion": rodaje.locacion,
        "estado": rodaje.estado,
        "archivo": rodaje.archivo,
    })


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
        locacion=data.locacion,
        estado=data.estado,
        archivo=data.archivo,
    )

    db.add(new_rodaje)
    db.commit()
    db.refresh(new_rodaje)

    return api_response(True, "Plan de rodaje creado", {
        "id_rodaje": new_rodaje.id_rodaje,
        "id_project": new_rodaje.id_project,
        "nombre": new_rodaje.nombre,
        "estado": new_rodaje.estado,
    })


def update_rodaje(id_rodaje: str, data: RodajeUpdateSchema, db: Session):
    rodaje = db.query(Rodaje).filter(Rodaje.id_rodaje == id_rodaje).first()
    if not rodaje:
        return api_response(False, "Plan de rodaje no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rodaje, key, value)

    db.commit()
    db.refresh(rodaje)

    return api_response(True, "Plan de rodaje actualizado", {
        "id_rodaje": rodaje.id_rodaje,
        "nombre": rodaje.nombre,
    })


def delete_rodaje(id_rodaje: str, db: Session):
    rodaje = db.query(Rodaje).filter(Rodaje.id_rodaje == id_rodaje).first()
    if not rodaje:
        return api_response(False, "Plan de rodaje no encontrado")

    db.delete(rodaje)
    db.commit()
    return api_response(True, "Plan de rodaje eliminado")


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
