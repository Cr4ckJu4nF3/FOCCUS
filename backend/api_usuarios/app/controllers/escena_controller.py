from sqlalchemy.orm import Session
from app.models.escena_model import Escena
from app.models.Guion import Guion
from app.schemas.escena_schema import EscenaSchema, EscenaUpdateSchema
from app.utils.response import api_response
from app.utils.codigos import adjuntar_codigos, asignar_codigo


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

def get_escenas_by_guion(id_guion: int, db: Session, incluir_codigo: bool = False):
    escenas = (
        db.query(Escena)
        .filter(Escena.id_guion == id_guion)
        .order_by(Escena.numero_de_escena.asc())
        .all()
    )

    data = [_serializar_escena(e) for e in escenas]
    # `codigo` solo para el admin del proyecto
    adjuntar_codigos(db, data, "ESC", "id_escena", incluir_codigo)
    return api_response(True, "Escenas del guion", data)


# GET ESCENA BY ID

def get_escena(id_escena: str, db: Session, incluir_codigo: bool = False):
    escena = db.query(Escena).filter(Escena.id_escena == id_escena).first()

    if not escena:
        return api_response(False, "Escena no encontrada")

    data = _serializar_escena(escena)
    adjuntar_codigos(db, [data], "ESC", "id_escena", incluir_codigo)
    return api_response(True, "Escena encontrada", data)


# CREAR ESCENA (subdividir un guion en escenas)

def create_escena(escena: EscenaSchema, db: Session):
    guion = db.query(Guion).filter(Guion.id_guion == escena.id_guion).first()
    if not guion:
        return api_response(False, "El guion indicado no existe", error="GUION_NOT_FOUND")

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

def update_escena(id_escena: str, escena: EscenaUpdateSchema, db: Session):
    escena_db = db.query(Escena).filter(Escena.id_escena == id_escena).first()

    if not escena_db:
        return api_response(False, "Escena no encontrada")

    update_data = escena.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(escena_db, key, value)

    db.commit()
    db.refresh(escena_db)

    data = _serializar_escena(escena_db)
    # la ruta PATCH es solo-admin; el código es inmutable y no viene en el schema
    adjuntar_codigos(db, [data], "ESC", "id_escena", True)
    return api_response(True, "Escena actualizada", data)


# DELETE ESCENA

def delete_escena(id_escena: str, db: Session):
    escena = db.query(Escena).filter(Escena.id_escena == id_escena).first()

    if not escena:
        return api_response(False, "Escena no encontrada")

    db.delete(escena)
    db.commit()

    return api_response(True, "Escena eliminada")
