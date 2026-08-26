from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.utils.auth import get_current_user, require_admin
from app.controllers.client_controller import (
    get_clients,
    get_client,
    create_client,
    update_client_full,
    update_client,
    delete_client
)
from app.schemas.client_schema import ClientSchema, ClientUpdateSchema

router = APIRouter()

# Lectura: cualquier usuario autenticado
@router.get("/clients")
def clients(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_clients(db)

@router.get("/clients/{id}")
def client(id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_client(id, db)

# Escritura: solo administradores
@router.post("/clients")
def store_client(client: ClientSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return create_client(client, db)

@router.put("/clients/{id}")
def edit_client(id: int, client: ClientSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return update_client_full(id, client, db)

@router.patch("/clients/{id}")
def patch_client(id: int, client: ClientUpdateSchema, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return update_client(id, client, db)

@router.delete("/clients/{id}")
def destroy_client(id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return delete_client(id, db)
