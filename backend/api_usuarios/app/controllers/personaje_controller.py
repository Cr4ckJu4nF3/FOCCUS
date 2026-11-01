from sqlalchemy.orm import Session
from app.models.personajes_model import Personaje
from app.schemas.personaje_schema import PersonajeSchema, PersonajeUpdateSchema
from app.utils.response import api_response
from app.utils.codigos import adjuntar_codigos, asignar_codigo


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

def get_personajes_by_project(id_project: str, db: Session, incluir_codigo: bool = False):
    personajes = (
        db.query(Personaje)
        .filter(Personaje.id_project == id_project)
        .order_by(Personaje.nombre.asc())
        .all()
    )
    data = [_serialize(p) for p in personajes]
    adjuntar_codigos(db, data, "PER", "id_personaje", incluir_codigo)  # solo admin
    return api_response(True, "Lista de personajes", data)


# CREAR PERSONAJE

def create_personaje(data: PersonajeSchema, db: Session):
    nuevo = Personaje(
        id_personaje=_generar_id_personaje(db),
        nombre=data.nombre,
        descripcion=data.descripcion,
        id_project=data.id_project,
    )
    db.add(nuevo)
    db.flush()
    codigo = asignar_codigo(db, "PER", nuevo.id_personaje, nuevo.id_project)
    db.commit()
    db.refresh(nuevo)
    respuesta = _serialize(nuevo)
    if codigo:  # la ruta de creación es solo-admin
        respuesta["codigo"] = codigo
    return api_response(True, "Personaje creado", respuesta)


# ACTUALIZAR PERSONAJE

def update_personaje(id_personaje: str, data: PersonajeUpdateSchema, db: Session):
    personaje = db.query(Personaje).filter(Personaje.id_personaje == id_personaje).first()
    if not personaje:
        return api_response(False, "Personaje no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    if "nombre" in cambios and not (cambios["nombre"] or "").strip():
        return api_response(False, "El nombre del personaje no puede estar vacío")

    for key, value in cambios.items():
        setattr(personaje, key, value.strip() if key == "nombre" else value)

    db.commit()
    db.refresh(personaje)
    respuesta = _serialize(personaje)
    adjuntar_codigos(db, [respuesta], "PER", "id_personaje", True)  # PATCH es solo-admin
    return api_response(True, "Personaje actualizado", respuesta)


# ELIMINAR PERSONAJE

def delete_personaje(id_personaje: str, db: Session):
    personaje = db.query(Personaje).filter(Personaje.id_personaje == id_personaje).first()
    if not personaje:
        return api_response(False, "Personaje no encontrado")

    db.delete(personaje)
    db.commit()
    return api_response(True, "Personaje eliminado")
