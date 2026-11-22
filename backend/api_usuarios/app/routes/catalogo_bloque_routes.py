from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.controllers.catalogo_bloque_controller import guardar, listar
from app.schemas.catalogo_bloque_schema import CatalogoBloqueCrear, TipoBloque
from app.utils.auth import require_project_admin, require_project_member

router = APIRouter()


@router.get("/proyectos/{id_project}/catalogo-bloques")
def listar_catalogo(id_project: str, tipo: TipoBloque | None = None,
                    q: str | None = Query(default=None, max_length=200),
                    db: Session = Depends(get_db), usuario: dict = Depends(require_project_member)):
    return listar(db, usuario["id_project"], tipo, q.strip() if q else None)


@router.post("/proyectos/{id_project}/catalogo-bloques")
def guardar_catalogo(id_project: str, data: CatalogoBloqueCrear,
                     db: Session = Depends(get_db), usuario: dict = Depends(require_project_admin)):
    return guardar(db, usuario["id_project"], data)
