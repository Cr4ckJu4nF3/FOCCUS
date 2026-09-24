from sqlalchemy import case
from sqlalchemy.orm import Session
from app.models.desglose_model import Desglose
from app.models.desglose_requerimiento_model import DesgloseRequerimiento
from app.models.escena_model import Escena
from app.models.rodaje_model import Rodaje
from app.schemas.desglose_schema import DesgloseRequerimientoSchema, DesgloseRequerimientoUpdateSchema
from app.utils.response import api_response
from app.utils.desglose_parser import parse_desglose_pdf, extraer_texto_pdf


# ---------- Generadores de ID (mismo patron usado en el resto del proyecto) ----------

def _generar_id_desglose(db: Session) -> str:
    last = db.query(Desglose).order_by(Desglose.id_desglose.desc()).first()
    if last and last.id_desglose.startswith("dsg"):
        try:
            new_num = int(last.id_desglose.replace("dsg", "")) + 1
        except ValueError:
            new_num = 1
    else:
        new_num = 1
    return f"dsg{new_num:04d}"


def _generar_id_requerimiento(db: Session) -> str:
    last = db.query(DesgloseRequerimiento).order_by(DesgloseRequerimiento.id_requerimiento.desc()).first()
    if last and last.id_requerimiento.startswith("req"):
        try:
            new_num = int(last.id_requerimiento.replace("req", "")) + 1
        except ValueError:
            new_num = 1
    else:
        new_num = 1
    return f"req{new_num:04d}"


def _serializar_requerimiento(r: DesgloseRequerimiento):
    return {
        "id_requerimiento": r.id_requerimiento,
        "id_desglose": r.id_desglose,
        "departamento": r.departamento,
        "etiqueta": r.etiqueta,
        "cantidad": r.cantidad or 1,
        "notas": r.notas,
    }


def _serializar_rodaje_breve(r: Rodaje):
    if not r:
        return None
    return {
        "id_rodaje": r.id_rodaje,
        "nombre": r.nombre,
        "fecha_inicio": str(r.fecha_inicio) if r.fecha_inicio else None,
        "llamado": r.llamado,
        "estado": r.estado,
    }


def _obtener_o_crear_desglose(escena: Escena, db: Session) -> Desglose:
    if escena.id_desglose:
        desglose = db.query(Desglose).filter(Desglose.id_desglose == escena.id_desglose).first()
        if desglose:
            return desglose

    nuevo = Desglose(id_desglose=_generar_id_desglose(db))
    db.add(nuevo)
    db.flush()

    escena.id_desglose = nuevo.id_desglose
    db.add(escena)

    return nuevo


# ---------- Consultas ----------

# Desglose de UNA escena puntual (para el panel de detalle)

def get_desglose_by_escena(id_escena: str, db: Session):
    escena = db.query(Escena).filter(Escena.id_escena == id_escena).first()
    if not escena:
        return api_response(False, "Escena no encontrada")

    requerimientos = []
    if escena.id_desglose:
        requerimientos = (
            db.query(DesgloseRequerimiento)
            .filter(DesgloseRequerimiento.id_desglose == escena.id_desglose)
            .order_by(DesgloseRequerimiento.departamento.asc())
            .all()
        )

    rodaje = db.query(Rodaje).filter(Rodaje.id_rodaje == escena.id_rodaje).first() if escena.id_rodaje else None

    return api_response(True, "Desglose de la escena", {
        "id_escena": escena.id_escena,
        "id_desglose": escena.id_desglose,
        "rodaje": _serializar_rodaje_breve(rodaje),
        "requerimientos": [_serializar_requerimiento(r) for r in requerimientos]
    })


# Desglose de TODAS las escenas de un guion, agrupado por escena, con un
# resumen de conteos por departamento (para las etiquetas de la lista
# principal, ej. "Props (3) SFX (1)")

def get_desglose_by_guion(id_guion: int, db: Session):
    escenas = (
        db.query(Escena)
        .filter(Escena.id_guion == id_guion)
        .order_by(
            case((Escena.dia_dramatico.is_(None), 1), else_=0),
            Escena.dia_dramatico.asc(),
            Escena.numero_de_escena.asc()
        )
        .all()
    )

    # Traer de una sola vez todos los dias de rodaje referenciados por
    # estas escenas, para no hacer una consulta por escena
    ids_rodaje = {e.id_rodaje for e in escenas if e.id_rodaje}
    rodajes_por_id = {}
    if ids_rodaje:
        for r in db.query(Rodaje).filter(Rodaje.id_rodaje.in_(ids_rodaje)).all():
            rodajes_por_id[r.id_rodaje] = r

    resultado = []
    for escena in escenas:
        requerimientos = []
        if escena.id_desglose:
            requerimientos = (
                db.query(DesgloseRequerimiento)
                .filter(DesgloseRequerimiento.id_desglose == escena.id_desglose)
                .all()
            )

        resumen = {}
        for r in requerimientos:
            resumen[r.departamento] = resumen.get(r.departamento, 0) + (r.cantidad or 1)

        resultado.append({
            "id_escena": escena.id_escena,
            "numero_de_escena": escena.numero_de_escena,
            "encabezado": escena.encabezado,
            "dia_dramatico": escena.dia_dramatico,
            "fecha_de_grabacion": str(escena.fecha_de_grabacion) if escena.fecha_de_grabacion else None,
            "momento_dia": escena.momento_dia,
            "estado": escena.estado or "Pendiente",
            "rodaje": _serializar_rodaje_breve(rodajes_por_id.get(escena.id_rodaje)),
            "total_requerimientos": len(requerimientos),
            "resumen_departamentos": [
                {"departamento": dep, "cantidad": cant} for dep, cant in resumen.items()
            ]
        })

    return api_response(True, "Desglose del guion", resultado)


# ---------- Mutaciones sobre requerimientos ----------

def create_requerimiento(id_escena: str, data: DesgloseRequerimientoSchema, db: Session):
    escena = db.query(Escena).filter(Escena.id_escena == id_escena).first()
    if not escena:
        return api_response(False, "Escena no encontrada")

    desglose = _obtener_o_crear_desglose(escena, db)

    nuevo = DesgloseRequerimiento(
        id_requerimiento=_generar_id_requerimiento(db),
        id_desglose=desglose.id_desglose,
        departamento=data.departamento,
        etiqueta=data.etiqueta,
        cantidad=data.cantidad or 1,
        notas=data.notas,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return api_response(True, "Requerimiento agregado", _serializar_requerimiento(nuevo))


def update_requerimiento(id_requerimiento: str, data: DesgloseRequerimientoUpdateSchema, db: Session):
    req = db.query(DesgloseRequerimiento).filter(DesgloseRequerimiento.id_requerimiento == id_requerimiento).first()
    if not req:
        return api_response(False, "Requerimiento no encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(req, key, value)

    db.commit()
    db.refresh(req)
    return api_response(True, "Requerimiento actualizado", _serializar_requerimiento(req))


def delete_requerimiento(id_requerimiento: str, db: Session):
    req = db.query(DesgloseRequerimiento).filter(DesgloseRequerimiento.id_requerimiento == id_requerimiento).first()
    if not req:
        return api_response(False, "Requerimiento no encontrado")

    db.delete(req)
    db.commit()
    return api_response(True, "Requerimiento eliminado")


# ---------- Importar un PDF de desglose (formato "Raccord") ----------

def _generar_id_escena_local(db: Session) -> str:
    last = db.query(Escena).order_by(Escena.id_escena.desc()).first()
    if last and last.id_escena.startswith("esc"):
        try:
            new_num = int(last.id_escena.replace("esc", "")) + 1
        except ValueError:
            new_num = 1
    else:
        new_num = 1
    return f"esc{new_num:04d}"


def importar_desglose_pdf(id_guion: int, ruta_temporal: str, db: Session):
    try:
        texto = extraer_texto_pdf(ruta_temporal)
    except Exception as e:
        return api_response(False, f"No se pudo leer el PDF: {e}", error="PDF_READ_ERROR")

    escenas_parseadas, _dias = parse_desglose_pdf(texto)
    if not escenas_parseadas:
        return api_response(
            False,
            "No se pudo reconocer ninguna escena en este PDF. Revisa que siga el formato de desglose esperado.",
            error="NO_SCENES_FOUND"
        )

    escenas_creadas = 0
    escenas_actualizadas = 0
    requerimientos_creados = 0

    # Calculamos el siguiente numero de requerimiento UNA sola vez, antes
    # del bucle. Antes se llamaba a _generar_id_requerimiento(db) (que
    # consulta la base) por cada item del PDF, con un db.flush() despues
    # de cada uno para que la siguiente consulta viera el anterior - con
    # un PDF de muchas escenas eso eran decenas de viajes de red a
    # Railway uno detras de otro, lento como para que el navegador diera
    # la conexion por perdida aunque el backend terminara bien igual.
    # Ahora se calcula el numero de partida una vez y se incrementa en
    # memoria, sin volver a tocar la base hasta el commit final.
    ultimo_req = db.query(DesgloseRequerimiento).order_by(DesgloseRequerimiento.id_requerimiento.desc()).first()
    if ultimo_req and ultimo_req.id_requerimiento.startswith("req"):
        try:
            siguiente_num_req = int(ultimo_req.id_requerimiento.replace("req", "")) + 1
        except ValueError:
            siguiente_num_req = 1
    else:
        siguiente_num_req = 1

    for data in escenas_parseadas:
        escena = (
            db.query(Escena)
            .filter(Escena.id_guion == id_guion, Escena.numero_de_escena == data["numero_de_escena"])
            .first()
        )

        if not escena:
            escena = Escena(
                id_escena=_generar_id_escena_local(db),
                numero_de_escena=data["numero_de_escena"],
                id_guion=id_guion,
                estado="Pendiente",
                encabezado=data["encabezado"] or f"Escena {data['numero_de_escena']}",
                modo_vista=data["modo_vista"],
                momento_dia=data["momento_dia"],
                dia_dramatico=data["dia_dramatico"],
                fecha_de_grabacion=data["fecha_de_grabacion"],
                ciudad=data["ciudad"],
            )
            db.add(escena)
            db.flush()
            escenas_creadas += 1
        else:
            escenas_actualizadas += 1
            escena.encabezado = data["encabezado"] or escena.encabezado
            escena.modo_vista = data["modo_vista"] or escena.modo_vista
            escena.momento_dia = data["momento_dia"] or escena.momento_dia
            escena.dia_dramatico = data["dia_dramatico"] or escena.dia_dramatico
            escena.fecha_de_grabacion = data["fecha_de_grabacion"] or escena.fecha_de_grabacion
            escena.ciudad = data["ciudad"] or escena.ciudad

        desglose = _obtener_o_crear_desglose(escena, db)
        db.flush()

        # Reemplazar los requerimientos existentes de esta escena por los
        # que trae el PDF, para que re-importar el mismo archivo no
        # duplique filas.
        db.query(DesgloseRequerimiento).filter(DesgloseRequerimiento.id_desglose == desglose.id_desglose).delete()

        for req in data["requerimientos"]:
            nuevo_req = DesgloseRequerimiento(
                id_requerimiento=f"req{siguiente_num_req:04d}",
                id_desglose=desglose.id_desglose,
                departamento=req["departamento"],
                etiqueta=req["etiqueta"],
                cantidad=req["cantidad"],
            )
            db.add(nuevo_req)
            siguiente_num_req += 1
            requerimientos_creados += 1

    db.commit()

    return api_response(True, "Desglose importado correctamente", {
        "escenas_creadas": escenas_creadas,
        "escenas_actualizadas": escenas_actualizadas,
        "requerimientos_creados": requerimientos_creados,
        "total_escenas_en_pdf": len(escenas_parseadas)
    })