"""Códigos públicos legibles (PRO-001, ESC-014, ...) solo para el admin del proyecto.

Diseño (ver docs/agentes/investigacion/2026-11-01-codigos-y-buscador.md):

- Los códigos NO viven en las tablas existentes. Se guardan en dos tablas
  nuevas y aditivas (`codigos_entidad` y `codigos_contador`), definidas en un
  MetaData aparte (`codigos_metadata`) para que `Base.metadata.create_all`
  del arranque NO las cree sola: se crean con `scripts/migrar_codigos.py --apply`.
- Si las tablas todavía no existen (migración sin aplicar) o algo falla, todas
  las funciones públicas degradan en silencio: no se asigna código y los
  endpoints existentes siguen funcionando igual.
- El contador es transaccional (UPDATE que bloquea la fila en InnoDB) y los
  números nunca se reutilizan, aunque se borre el registro.
- Solo el admin del proyecto (id_rol 1001) recibe el campo `codigo`: los
  controladores llaman a `adjuntar_codigos(..., incluir=es_admin(current_user))`.
"""

import logging
import re
from typing import Iterable, Optional

from sqlalchemy import (
    Column,
    DateTime,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    UniqueConstraint,
    delete,
    func,
    insert,
    select,
    update,
)
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

ROL_ADMIN = 1001
AMBITO_GLOBAL = "*"  # el código de proyecto (PRO) es único en todo el sistema

# prefijo -> nombre legible del tipo
TIPOS = {
    "PRO": "proyecto",
    "GUI": "guion",
    "VGU": "version_guion",
    "ESC": "escena",
    "PER": "personaje",
    "LOC": "lugar",
    "OBJ": "utileria",
    "VES": "vestuario",
    "DRO": "jornada_rodaje",
}

CODIGO_RE = re.compile(r"^[A-Z]{2,3}-[0-9]{3,}$")
CONSULTA_RE = re.compile(r"^[A-Z0-9-]{2,40}$")
MAX_REINTENTOS = 3

# ---------------------------------------------------------------------------
# Tablas (MetaData propio: NO se crean con Base.metadata.create_all)
# ---------------------------------------------------------------------------
codigos_metadata = MetaData()

codigos_contador = Table(
    "codigos_contador",
    codigos_metadata,
    Column("ambito", String(20), primary_key=True),  # id_project o '*'
    Column("tipo", String(3), primary_key=True),     # prefijo
    Column("ultimo", Integer, nullable=False, default=0),
)

codigos_entidad = Table(
    "codigos_entidad",
    codigos_metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("ambito", String(20), nullable=False),
    Column("tipo", String(3), nullable=False),
    Column("id_project", String(20), nullable=False),
    Column("entidad_id", String(40), nullable=False),
    Column("codigo", String(20), nullable=False),
    Column("creado_en", DateTime, server_default=func.now()),
    UniqueConstraint("ambito", "codigo", name="uq_codigos_ambito_codigo"),
    UniqueConstraint("tipo", "entidad_id", name="uq_codigos_tipo_entidad"),
    Index("ix_codigos_proyecto_codigo", "id_project", "codigo"),
)


# ---------------------------------------------------------------------------
# Funciones puras
# ---------------------------------------------------------------------------
def formatear_codigo(tipo: str, numero: int) -> str:
    """('ESC', 14) -> 'ESC-014'. Pasa de 999 sin truncar: ('ESC', 1000) -> 'ESC-1000'."""
    if tipo not in TIPOS:
        raise ValueError(f"Tipo de código desconocido: {tipo}")
    if numero < 1:
        raise ValueError("El consecutivo debe ser >= 1")
    return f"{tipo}-{numero:03d}"


def numero_de_codigo(codigo: str) -> Optional[int]:
    if not codigo or not CODIGO_RE.match(codigo):
        return None
    return int(codigo.split("-", 1)[1])


def ambito_de(tipo: str, id_project: str) -> str:
    return AMBITO_GLOBAL if tipo == "PRO" else id_project


def tipo_galeria(tipo_item: str, categoria: Optional[str]) -> Optional[str]:
    """Prefijo de un ítem de galería: objeto -> OBJ/VES; personaje/lugar usan PER/LOC propios."""
    if tipo_item != "objeto":
        return None
    return "VES" if (categoria or "").strip().lower().startswith("vestuario") else "OBJ"


def normalizar_consulta(q: Optional[str]) -> str:
    """Recorta, pasa a mayúsculas y valida. Lanza ValueError si no es válida."""
    texto = (q or "").strip().upper()
    if not CONSULTA_RE.match(texto):
        raise ValueError("Escribe entre 2 y 40 caracteres (letras, números o guion), por ejemplo ESC-01")
    return texto


def _escapar_like(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def es_admin(current_user: Optional[dict]) -> bool:
    """True si el usuario validado por require_project_* es admin del proyecto."""
    return bool(current_user) and current_user.get("id_rol") == ROL_ADMIN


# ---------------------------------------------------------------------------
# Asignación (generación en backend, inmutable)
# ---------------------------------------------------------------------------
def _siguiente_numero(db: Session, ambito: str, tipo: str) -> int:
    """Incrementa el contador de forma atómica. El UPDATE bloquea la fila (InnoDB)."""
    c = codigos_contador.c
    actualizado = db.execute(
        update(codigos_contador)
        .where(c.ambito == ambito, c.tipo == tipo)
        .values(ultimo=c.ultimo + 1)
    )
    if actualizado.rowcount == 0:
        db.execute(insert(codigos_contador).values(ambito=ambito, tipo=tipo, ultimo=1))
        return 1
    return db.execute(
        select(c.ultimo).where(c.ambito == ambito, c.tipo == tipo)
    ).scalar_one()


def asignar_codigo(db: Session, tipo: str, entidad_id, id_project: str) -> Optional[str]:
    """Asigna el siguiente código a una entidad RECIÉN creada (ya con flush).

    Devuelve el código, o None si la migración aún no está aplicada o falla algo
    (nunca rompe la creación de la entidad). Debe llamarse antes del commit
    para que el código se confirme junto con el registro.
    """
    if tipo not in TIPOS or entidad_id is None or not id_project:
        return None
    entidad_id = str(entidad_id)
    ambito = ambito_de(tipo, id_project)
    for _ in range(MAX_REINTENTOS):
        try:
            with db.begin_nested():
                # Una fila previa con el mismo id solo puede ser de un registro
                # borrado cuyo id se reutilizó: el código viejo no se recicla.
                db.execute(
                    delete(codigos_entidad).where(
                        codigos_entidad.c.tipo == tipo,
                        codigos_entidad.c.entidad_id == entidad_id,
                    )
                )
                codigo = formatear_codigo(tipo, _siguiente_numero(db, ambito, tipo))
                db.execute(
                    insert(codigos_entidad).values(
                        ambito=ambito,
                        tipo=tipo,
                        id_project=id_project,
                        entidad_id=entidad_id,
                        codigo=codigo,
                    )
                )
            return codigo
        except IntegrityError:
            continue  # colisión concurrente: reintento acotado
        except SQLAlchemyError as error:
            logger.warning("Códigos no disponibles (¿migración sin aplicar?): %s", error.__class__.__name__)
            return None
    logger.warning("No se pudo asignar código %s a %s tras %s intentos", tipo, entidad_id, MAX_REINTENTOS)
    return None


# ---------------------------------------------------------------------------
# Lectura (solo admin)
# ---------------------------------------------------------------------------
def codigos_de(db: Session, tipo, ids: Iterable) -> dict:
    """{entidad_id(str): codigo}. `tipo` puede ser un prefijo o una tupla de prefijos.
    Vacío si no hay tabla o no hay ids."""
    ids = [str(i) for i in ids if i is not None]
    if not ids:
        return {}
    tipos = [tipo] if isinstance(tipo, str) else list(tipo)
    c = codigos_entidad.c
    try:
        filas = db.execute(
            select(c.entidad_id, c.codigo).where(c.tipo.in_(tipos), c.entidad_id.in_(ids))
        ).all()
    except SQLAlchemyError:
        return {}
    return {fila[0]: fila[1] for fila in filas}


def adjuntar_codigos(db: Session, items: list, tipo, clave_id: str, incluir: bool, tipo_por_item=None) -> list:
    """Agrega `codigo` a cada dict SOLO si `incluir` (admin). Si no, no toca nada.

    `tipo` es un prefijo fijo; para ítems con tipo variable (galería) pasa
    `tipo_por_item=lambda dict -> prefijo|None` y `tipo=None`.
    """
    if not incluir or not items:
        return items
    if tipo_por_item is None:
        mapa = {tipo: codigos_de(db, tipo, (i.get(clave_id) for i in items))}
    else:
        agrupados = {}
        for item in items:
            prefijo = tipo_por_item(item)
            if prefijo:
                agrupados.setdefault(prefijo, []).append(item.get(clave_id))
        mapa = {prefijo: codigos_de(db, prefijo, ids) for prefijo, ids in agrupados.items()}
    for item in items:
        prefijo = tipo if tipo_por_item is None else tipo_por_item(item)
        if prefijo:
            item["codigo"] = mapa.get(prefijo, {}).get(str(item.get(clave_id)))
    return items


def adjuntar_codigos_galeria(db: Session, items: list, incluir: bool) -> list:
    """Solo para ítems de galería tipo 'objeto' (OBJ o VES, según su categoría
    al crearse; el código no cambia aunque luego cambie la categoría).
    Personajes y lugares usan el código PER/LOC de su propia ficha, no uno de galería."""
    if not incluir or not items:
        return items
    objetos = [i for i in items if i.get("tipo") == "objeto"]
    mapa = codigos_de(db, ("OBJ", "VES"), (i.get("id_galeria") for i in objetos))
    for item in objetos:
        item["codigo"] = mapa.get(str(item.get("id_galeria")))
    return items


def buscar_en_proyecto(db: Session, id_project: str, consulta: str, limite: int = 25) -> list:
    """Filas (tipo, entidad_id, codigo) del proyecto: exacto, luego prefijo, luego subcadena."""
    c = codigos_entidad.c
    patron = _escapar_like(consulta)
    prefijo = c.codigo.like(f"{patron}%", escape="\\")
    contiene = c.codigo.like(f"%{patron}%", escape="\\")
    orden_exacto = (c.codigo == consulta)
    consulta_sql = (
        select(c.tipo, c.entidad_id, c.codigo)
        .where(c.id_project == id_project, contiene)
        .order_by(orden_exacto.desc(), prefijo.desc(), c.codigo.asc())
        .limit(limite)
    )
    return [tuple(fila) for fila in db.execute(consulta_sql).all()]
