from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models.client_model import Client
from app.models.project_model import Project
from app.schemas.client_schema import ClientSchema
from app.utils.response import api_response


def _email_duplicado(db: Session, email: str, excluir_id: int | None = None) -> bool:
    query = db.query(Client).filter(func.lower(Client.email) == email)
    if excluir_id is not None:
        query = query.filter(Client.id_cliente != excluir_id)
    return query.first() is not None


# GET ALL CLIENTS

def get_clients(db: Session):
    clients = db.query(Client).all()
    clients_list = [
        {
            "id_cliente": c.id_cliente,
            "document": c.document,
            "razon_social": c.razon_social,
            "representante_legal": c.representante_legal,
            "email": c.email,
            "address": c.address,
            "telephone": c.telephone,
            "number_cellphone": c.number_cellphone,
            "id_document": c.id_document
        }
        for c in clients
    ]
    return api_response(True, "Lista de clientes", clients_list)


# GET CLIENT BY ID

def get_client(id: int, db: Session):
    client = db.query(Client).filter(Client.id_cliente == id).first()

    if not client:
        return api_response(False, "Cliente no encontrado")

    return api_response(True, "Cliente encontrado", {
        "id_cliente": client.id_cliente,
        "document": client.document,
        "razon_social": client.razon_social,
        "representante_legal": client.representante_legal,
        "email": client.email,
        "address": client.address,
        "telephone": client.telephone,
        "number_cellphone": client.number_cellphone,
        "id_document": client.id_document
    })


# CREATE CLIENT

def create_client(client: ClientSchema, db: Session):
    email = client.email.strip().lower()
    if not email:
        return api_response(False, "El correo de la empresa es obligatorio", error="INVALID_EMAIL")
    if _email_duplicado(db, email):
        return api_response(False, "Email ya registrado", error="DUPLICATE_EMAIL")

    new_client = Client(
        document=client.document,
        razon_social=client.razon_social,
        representante_legal=client.representante_legal,
        email=email,
        address=client.address,
        telephone=client.telephone,
        number_cellphone=client.number_cellphone,
        id_document=client.id_document
    )

    db.add(new_client)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if _email_duplicado(db, email):
            return api_response(False, "Email ya registrado", error="DUPLICATE_EMAIL")
        raise
    db.refresh(new_client)

    return api_response(True, "Cliente creado", {
        "id_cliente": new_client.id_cliente,
        "razon_social": new_client.razon_social,
        "email": new_client.email
    })


# UPDATE CLIENT (PUT)

def update_client_full(id: int, client: ClientSchema, db: Session):
    client_db = db.query(Client).filter(Client.id_cliente == id).first()

    if not client_db:
        return api_response(False, "Cliente no encontrado")

    email = client.email.strip().lower()
    if not email:
        return api_response(False, "El correo de la empresa es obligatorio", error="INVALID_EMAIL")
    if _email_duplicado(db, email, excluir_id=id):
        return api_response(False, "Email ya registrado", error="DUPLICATE_EMAIL")

    client_db.document = client.document
    client_db.razon_social = client.razon_social
    client_db.representante_legal = client.representante_legal
    client_db.email = email
    client_db.address = client.address
    client_db.telephone = client.telephone
    client_db.number_cellphone = client.number_cellphone
    client_db.id_document = client.id_document

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if _email_duplicado(db, email, excluir_id=id):
            return api_response(False, "Email ya registrado", error="DUPLICATE_EMAIL")
        raise
    db.refresh(client_db)

    return api_response(True, "Cliente actualizado", {
        "id_cliente": client_db.id_cliente,
        "razon_social": client_db.razon_social,
        "email": client_db.email
    })


# UPDATE CLIENT (PATCH)

def update_client(id: int, client, db: Session):
    client_db = db.query(Client).filter(Client.id_cliente == id).first()

    if not client_db:
        return api_response(False, "Cliente no encontrado")

    update_data = client.model_dump(exclude_unset=True)
    email = update_data.get("email", client_db.email)
    if "email" in update_data:
        email = update_data["email"]
        if not isinstance(email, str) or not email.strip():
            return api_response(False, "El correo de la empresa es obligatorio", error="INVALID_EMAIL")
        email = email.strip().lower()
        if _email_duplicado(db, email, excluir_id=id):
            return api_response(False, "Email ya registrado", error="DUPLICATE_EMAIL")
        update_data["email"] = email
    else:
        email = email.strip().lower()

    for key, value in update_data.items():
        setattr(client_db, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if _email_duplicado(db, email, excluir_id=id):
            return api_response(False, "Email ya registrado", error="DUPLICATE_EMAIL")
        raise
    db.refresh(client_db)

    return api_response(True, "Cliente actualizado", {
        "id_cliente": client_db.id_cliente,
        "razon_social": client_db.razon_social,
        "email": client_db.email
    })


# DELETE CLIENT

def delete_client(id: int, db: Session):
    client = db.query(Client).filter(Client.id_cliente == id).first()

    if not client:
        return api_response(False, "Cliente no encontrado")

    if db.query(Project).filter(Project.id_client == id).first():
        return api_response(
            False,
            "No se puede eliminar la empresa mientras tenga proyectos asociados",
            error="CLIENT_HAS_PROJECTS",
        )

    db.delete(client)
    db.commit()

    return api_response(True, "Cliente eliminado")