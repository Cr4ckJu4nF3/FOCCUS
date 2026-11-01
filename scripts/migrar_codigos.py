"""Migración ADITIVA de códigos FOCCUS (PRO, GUI, VGU, ESC, PER, LOC, OBJ, VES, DRO).

Qué hace (solo con --apply):
  1. Crea las tablas nuevas `codigos_contador` y `codigos_entidad` (si no existen).
  2. Asigna código a las entidades que todavía no lo tienen (backfill), por
     proyecto y tipo, en orden de creación (clave primaria).
  3. Deja cada contador en el mayor consecutivo asignado.
  4. Verifica: sin duplicados y con formato válido.

Qué NO hace: no modifica ni borra tablas/datos existentes. Es idempotente:
se puede ejecutar varias veces; solo asigna a lo que falte.

Uso (desde backend\\api_usuarios, con su venv):
  ..\\..\\backend\\api_usuarios\\.venv\\Scripts\\python.exe ..\\..\\scripts\\migrar_codigos.py            # dry-run (default)
  ... migrar_codigos.py --apply                                                                           # aplica
"""
import argparse
import os
import sys
from collections import defaultdict

RAIZ_BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend", "api_usuarios")
sys.path.insert(0, os.path.abspath(RAIZ_BACKEND))

from sqlalchemy import func, insert, inspect, select  # noqa: E402

from app.config.database import SessionLocal, engine  # noqa: E402
from app.models.escena_model import Escena  # noqa: E402
from app.models.escenario_model import Escenario  # noqa: E402
from app.models.galeria_model import GaleriaItem  # noqa: E402
from app.models.Guion import Guion  # noqa: E402
from app.models.guion_version_model import GuionVersion  # noqa: E402
from app.models.personajes_model import Personaje  # noqa: E402
from app.models.project_model import Project  # noqa: E402
from app.models.rodaje_model import Rodaje  # noqa: E402
from app.utils.codigos import (  # noqa: E402
    CODIGO_RE,
    TIPOS,
    ambito_de,
    codigos_contador,
    codigos_entidad,
    codigos_metadata,
    formatear_codigo,
    numero_de_codigo,
    tipo_galeria,
)


def entidades(db):
    """Devuelve {tipo: [(entidad_id, id_project), ...]} ordenado por clave primaria."""
    r = {}
    r["PRO"] = [(p.id_project, p.id_project) for p in db.query(Project).order_by(Project.id_project)]
    r["GUI"] = [(str(g.id_guion), g.id_project) for g in db.query(Guion).order_by(Guion.id_guion)]
    r["VGU"] = [
        (str(v.id_guion_version), pid)
        for v, pid in db.query(GuionVersion, Guion.id_project)
        .join(Guion, GuionVersion.id_guion == Guion.id_guion)
        .order_by(GuionVersion.id_guion_version)
    ]
    r["ESC"] = [
        (e.id_escena, pid)
        for e, pid in db.query(Escena, Guion.id_project)
        .join(Guion, Escena.id_guion == Guion.id_guion)
        .order_by(Escena.id_escena)
    ]
    r["PER"] = [(p.id_personaje, p.id_project) for p in db.query(Personaje).order_by(Personaje.id_personaje)]
    r["LOC"] = [(s.id_escenario, s.id_project) for s in db.query(Escenario).order_by(Escenario.id_escenario)]
    r["OBJ"], r["VES"] = [], []
    for i in db.query(GaleriaItem).filter(GaleriaItem.tipo == "objeto").order_by(GaleriaItem.id_galeria):
        t = tipo_galeria(i.tipo, i.categoria)
        if t:
            r[t].append((str(i.id_galeria), i.id_project))
    r["DRO"] = [(x.id_rodaje, x.id_project) for x in db.query(Rodaje).order_by(Rodaje.id_rodaje)]
    return r


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="Escribe en la BD (por defecto solo simula)")
    ap.add_argument("--dry-run", action="store_true", help="Solo simula (es el comportamiento por defecto)")
    args = ap.parse_args()
    aplicar = args.apply and not args.dry_run

    print(f"Modo: {'APPLY (escribe)' if aplicar else 'DRY-RUN (no escribe nada)'}")
    insp = inspect(engine)
    existen = insp.has_table("codigos_entidad") and insp.has_table("codigos_contador")
    print(f"Tablas de códigos ya existen: {existen}")

    if aplicar:
        codigos_metadata.create_all(bind=engine, checkfirst=True)
        existen = True

    db = SessionLocal()
    try:
        ya = defaultdict(dict)  # tipo -> {entidad_id: codigo}
        maximos = defaultdict(int)  # (ambito, tipo) -> mayor consecutivo
        if existen:
            for tipo, eid, cod, amb in db.execute(
                select(codigos_entidad.c.tipo, codigos_entidad.c.entidad_id, codigos_entidad.c.codigo, codigos_entidad.c.ambito)
            ):
                ya[tipo][eid] = cod
                maximos[(amb, tipo)] = max(maximos[(amb, tipo)], numero_de_codigo(cod) or 0)
            for amb, tipo, ultimo in db.execute(
                select(codigos_contador.c.ambito, codigos_contador.c.tipo, codigos_contador.c.ultimo)
            ):
                maximos[(amb, tipo)] = max(maximos[(amb, tipo)], ultimo)

        total = 0
        nuevos = []
        for tipo, lista in entidades(db).items():
            pendientes = [(e, p) for e, p in lista if e not in ya[tipo] and p]
            por_ambito = defaultdict(int)
            for eid, pid in pendientes:
                amb = ambito_de(tipo, pid)
                maximos[(amb, tipo)] += 1
                nuevos.append((amb, tipo, pid, eid, formatear_codigo(tipo, maximos[(amb, tipo)])))
                por_ambito[amb] += 1
            print(f"  {tipo} ({TIPOS[tipo]}): {len(lista)} entidades, {len(ya[tipo])} con código, {len(pendientes)} por asignar")
            total += len(pendientes)

        print(f"Total de códigos por asignar: {total}")
        for amb, tipo, pid, eid, cod in nuevos[:10]:
            print(f"    ejemplo: {tipo} {eid} (proyecto {pid}) -> {cod}")

        if not aplicar:
            print("DRY-RUN terminado: no se escribió nada. Usa --apply para aplicar.")
            return

        with db.begin():
            for amb, tipo, pid, eid, cod in nuevos:
                db.execute(insert(codigos_entidad).values(ambito=amb, tipo=tipo, id_project=pid, entidad_id=eid, codigo=cod))
            for (amb, tipo), ultimo in maximos.items():
                if ultimo <= 0:
                    continue
                fila = db.execute(
                    select(codigos_contador.c.ultimo).where(codigos_contador.c.ambito == amb, codigos_contador.c.tipo == tipo)
                ).first()
                if fila is None:
                    db.execute(insert(codigos_contador).values(ambito=amb, tipo=tipo, ultimo=ultimo))
                elif fila[0] < ultimo:
                    db.execute(
                        codigos_contador.update()
                        .where(codigos_contador.c.ambito == amb, codigos_contador.c.tipo == tipo)
                        .values(ultimo=ultimo)
                    )

        # Verificación
        duplicados = db.execute(
            select(codigos_entidad.c.ambito, codigos_entidad.c.codigo, func.count())
            .group_by(codigos_entidad.c.ambito, codigos_entidad.c.codigo)
            .having(func.count() > 1)
        ).all()
        malos = [c for (c,) in db.execute(select(codigos_entidad.c.codigo)) if not CODIGO_RE.match(c)]
        print(f"Verificación: duplicados={len(duplicados)}, formato inválido={len(malos)}")
        if duplicados or malos:
            sys.exit(1)
        print("APPLY terminado correctamente.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
