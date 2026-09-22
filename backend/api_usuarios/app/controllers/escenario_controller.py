from sqlalchemy.orm import Session
from app.models.escenario_model import Escenario
from app.schemas.escenario_schema import EscenarioSchema, EscenarioUpdateSchema
from app.utils.response import api_response


# GENERAR ID DE ESCENARIO (loc0001, loc0002, ...)

def _generar_id_escenario(db: Session) -> str:
    last = db.query(Escenario).order_by(Escenario.id_escenario.desc()).first()

    if last and last.id_escenario.startswith("loc"):
        try:
            new_num = int(last.id_escenario.replace("loc", "")) + 1
        except ValueError:
            new_num = 1
    else:
        new_num = 1

    return f"loc{new_num:04d}"


def _serialize(e: Escenario):
    return {
        "id_escenario": e.id_escenario,
        "nombre": e.nombre,
        "descripcion": e.descripcion,
        "tipo": e.tipo,
        "id_project": e.id_project,
    }


# LISTAR ESCENARIOS DE UN PROYECTO

def get_escenarios_by_project(id_project: str, db: Session):
    escenarios = (
        db.query(Escenario)
        .filter(Escenario.id_project == id_project)
        .order_by(Escenario.nombre.asc())
        .all()
    )
    return api_response(True, "Lista de escenarios", [_serialize(e) for e in escenarios])


# CREAR ESCENARIO

def create_escenario(data: EscenarioSchema, db: Session):
    nuevo = Escenario(
        id_escenario=_generar_id_escenario(db),
        nombre=data.nombre,
        descripcion=data.descripcion,
        tipo=data.tipo,
        id_project=data.id_project,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return api_response(True, "Escenario creado", _serialize(nuevo))


# ACTUALIZAR ESCENARIO

def update_escenario(id_escenario: str, data: EscenarioUpdateSchema, db: Session):
    escenario = db.query(Escenario).filter(Escenario.id_escenario == id_escenario).first()
    if not escenario:
        return api_response(False, "Escenario no encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(escenario, key, value)

    db.commit()
    db.refresh(escenario)
    return api_response(True, "Escenario actualizado", _serialize(escenario))


# ELIMINAR ESCENARIO

def delete_escenario(id_escenario: str, db: Session):
    escenario = db.query(Escenario).filter(Escenario.id_escenario == id_escenario).first()
    if not escenario:
        return api_response(False, "Escenario no encontrado")

    db.delete(escenario)
    db.commit()
    return api_response(True, "Escenario eliminado")
