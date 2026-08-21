from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
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

@router.get("/clients")
def clients(db: Session = Depends(get_db)):
    return get_clients(db)

@router.get("/clients/{id}")
def client(id: int, db: Session = Depends(get_db)):
    return get_client(id, db)

@router.post("/clients")
def store_client(client: ClientSchema, db: Session = Depends(get_db)):
    return create_client(client, db)

@router.put("/clients/{id}")
def edit_client(id: int, client: ClientSchema, db: Session = Depends(get_db)):
    return update_client_full(id, client, db)

@router.patch("/clients/{id}")
def patch_client(id: int, client: ClientUpdateSchema, db: Session = Depends(get_db)):
    return update_client(id, client, db)

@router.delete("/clients/{id}")
def destroy_client(id: int, db: Session = Depends(get_db)):
    return delete_client(id, db)