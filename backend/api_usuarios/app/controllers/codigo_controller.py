from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.escena_model import Escena
from app.models.escenario_model import Escenario
from app.models.galeria_model import GaleriaItem
from app.models.Guion import Guion
from app.models.guion_version_model import GuionVersion
from app.models.personajes_model import Personaje
from app.models.project_model import Project
from app.models.rodaje_model import Rodaje
from app.utils.codigos import TIPOS, buscar_en_proyecto, normalizar_consulta
from app.utils.response import api_response


def _resolver(db: Session, id_project: str, tipo: str, entidad_id: str):
    """Devuelve (nombre, destino) de la entidad SOLO si pertenece al proyecto; si no, None.

    El destino se arma aquí con IDs leídos de la BD, nunca con texto del usuario.
    """
    if tipo == "PRO":
        p = db.query(Project).filter(Project.id_project == entidad_id).first()
        if p and p.id_project == id_project:
            return p.project_name, "/admin-dashboard"
    elif tipo == "GUI":
        g = db.query(Guion).filter(Guion.id_guion == int(entidad_id), Guion.id_project == id_project).first()
        if g:
            return g.nombre, f"/guion?guion={g.id_guion}"
    elif tipo == "VGU":
        fila = (
            db.query(GuionVersion, Guion)
            .join(Guion, GuionVersion.id_guion == Guion.id_guion)
            .filter(GuionVersion.id_guion_version == int(entidad_id), Guion.id_project == id_project)
            .first()
        )
        if fila:
            v, g = fila
            return f"{g.nombre} · versión {v.numero_de_version}", f"/guion?guion={g.id_guion}&version={v.id_guion_version}"
    elif tipo == "ESC":
        fila = (
            db.query(Escena, Guion)
            .join(Guion, Escena.id_guion == Guion.id_guion)
            .filter(Escena.id_escena == entidad_id, Guion.id_project == id_project)
            .first()
        )
        if fila:
            e, g = fila
            return f"Esc. {e.numero_de_escena} · {(e.encabezado or '').strip()[:80]}", f"/escenas?guion={g.id_guion}&escena={e.id_escena}"
    elif tipo == "PER":
        p = db.query(Personaje).filter(Personaje.id_personaje == entidad_id, Personaje.id_project == id_project).first()
        if p:
            ficha = db.query(GaleriaItem).filter(
                GaleriaItem.id_project == id_project, GaleriaItem.id_personaje == p.id_personaje
            ).first()
            return p.nombre, (f"/galeria?item={ficha.id_galeria}" if ficha else "/galeria?tipo=personaje")
    elif tipo == "LOC":
        s = db.query(Escenario).filter(Escenario.id_escenario == entidad_id, Escenario.id_project == id_project).first()
        if s:
            ficha = db.query(GaleriaItem).filter(
                GaleriaItem.id_project == id_project, GaleriaItem.id_escenario == s.id_escenario
            ).first()
            return s.nombre, (f"/galeria?item={ficha.id_galeria}" if ficha else "/galeria?tipo=lugar")
    elif tipo in ("OBJ", "VES"):
        i = db.query(GaleriaItem).filter(GaleriaItem.id_galeria == int(entidad_id), GaleriaItem.id_project == id_project).first()
        if i:
            return i.nombre, f"/galeria?item={i.id_galeria}"
    elif tipo == "DRO":
        r = db.query(Rodaje).filter(Rodaje.id_rodaje == entidad_id, Rodaje.id_project == id_project).first()
        if r:
            return r.nombre, f"/rodaje?rodaje={r.id_rodaje}"
    return None


def buscar_codigo(id_project: str, q: str, db: Session):
    """Buscador del admin: coincidencias de código DENTRO del proyecto indicado."""
    try:
        consulta = normalizar_consulta(q)
    except ValueError as error:
        return api_response(False, str(error), error="INVALID_QUERY")

    try:
        filas = buscar_en_proyecto(db, id_project, consulta)
    except SQLAlchemyError:
        return api_response(
            False,
            "Los códigos todavía no están disponibles (falta aplicar la migración).",
            error="CODES_NOT_READY",
        )

    resultados = []
    for tipo, entidad_id, codigo in filas:
        try:
            resuelto = _resolver(db, id_project, tipo, entidad_id)
        except (ValueError, SQLAlchemyError):
            resuelto = None
        if not resuelto:
            continue  # registro borrado o de otro proyecto: no se revela
        nombre, destino = resuelto
        resultados.append({
            "tipo": TIPOS.get(tipo, tipo),
            "codigo": codigo,
            "nombre": nombre,
            "id_interno": entidad_id,
            "destino": destino,
        })
    return api_response(True, "Resultados de la búsqueda", resultados)
