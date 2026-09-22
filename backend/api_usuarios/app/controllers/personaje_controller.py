from sqlalchemy.orm import Session
from app.models.personajes_model import Personaje
from app.schemas.personaje_schema import PersonajeSchema, PersonajeUpdateSchema
from app.utils.response import api_response


# GENERAR ID DE PERSONAJE (psj0001, psj0002, ...) - mismo patron que
# escena_controller._generar_id_escena

def _generar_id_personaje(db: Session) -> str:
    last = db.query(Personaje).order_by(Personaje.id_personaje.desc()).first()

    if last and last.id_personaje.startswith("psj"):
        try:
            new_num = int(last.id_personaje.replace("psj", "")) + 1
        except ValueError:
            new_num = 1
    else:
        new_num = 1

    return f"psj{new_num:04d}"


def _serialize(p: Personaje):
    return {
        "id_personaje": p.id_personaje,
        "nombre": p.nombre,
        "descripcion": p.descripcion,
        "id_project": p.id_project,
    }


# LISTAR PERSONAJES DE UN PROYECTO

def get_personajes_by_project(id_project: str, db: Session):
    personajes = (
        db.query(Personaje)
        .filter(Personaje.id_project == id_project)
        .order_by(Personaje.nombre.asc())
        .all()
    )
    return api_response(True, "Lista de personajes", [_serialize(p) for p in personajes])


# CREAR PERSONAJE

def create_personaje(data: PersonajeSchema, db: Session):
    nuevo = Personaje(
        id_personaje=_generar_id_personaje(db),
        nombre=data.nombre,
        descripcion=data.descripcion,
        id_project=data.id_project,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return api_response(True, "Personaje creado", _serialize(nuevo))


# ACTUALIZAR PERSONAJE

def update_personaje(id_personaje: str, data: PersonajeUpdateSchema, db: Session):
    personaje = db.query(Personaje).filter(Personaje.id_personaje == id_personaje).first()
    if not personaje:
        return api_response(False, "Personaje no encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(personaje, key, value)

    db.commit()
    db.refresh(personaje)
    return api_response(True, "Personaje actualizado", _serialize(personaje))


# ELIMINAR PERSONAJE

def delete_personaje(id_personaje: str, db: Session):
    personaje = db.query(Personaje).filter(Personaje.id_personaje == id_personaje).first()
    if not personaje:
        return api_response(False, "Personaje no encontrado")

    db.delete(personaje)
    db.commit()
    return api_response(True, "Personaje eliminado")
