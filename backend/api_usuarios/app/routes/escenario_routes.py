from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.utils.auth import get_current_user, require_admin
from app.controllers.escenario_controller import (
    get_escenarios_by_project,
    create_escenario,
    update_escenario,
    delete_escenario,
)
from app.schemas.escenario_schema import EscenarioSchema, EscenarioUpdateSchema

router = APIRouter()


@router.get("/projects/{id_project}/escenarios")
def escenarios_del_proyecto(id_project: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_escenarios_by_project(id_project, db)


@router.post("/escenarios")
def store_escenario(data: EscenarioSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return create_escenario(data, db)


@router.patch("/escenarios/{id_escenario}")
def patch_escenario(id_escenario: str, data: EscenarioUpdateSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return update_escenario(id_escenario, data, db)


@router.delete("/escenarios/{id_escenario}")
def destroy_escenario(id_escenario: str, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return delete_escenario(id_escenario, db)
