from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.controllers.codigo_controller import buscar_codigo
from app.utils.auth import require_project_admin

router = APIRouter()


# BUSCADOR DE CÓDIGOS - solo admin del proyecto (id_rol 1001).
# require_project_admin valida en BD la membresía y el rol en ESTE proyecto
# (y que X-Project-Id, si viene, coincida con la ruta).
@router.get("/projects/{id_project}/buscar-codigo")
def buscar_codigo_del_proyecto(
    id_project: str,
    q: str = "",
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_project_admin),
):
    return buscar_codigo(id_project, q, db)
