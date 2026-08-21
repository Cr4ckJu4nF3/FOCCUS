from sqlalchemy.orm import Session
from app.models.client_model import Client
from app.schemas.client_schema import ClientSchema
from app.utils.response import api_response


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
    existing = db.query(Client).filter(Client.email == client.email).first()

    if existing:
        return api_response(False, "Email ya registrado", error="DUPLICATE_EMAIL")

    new_client = Client(
        document=client.document,
        razon_social=client.razon_social,
        representante_legal=client.representante_legal,
        email=client.email,
        address=client.address,
        telephone=client.telephone,
        number_cellphone=client.number_cellphone,
        id_document=client.id_document
    )

    db.add(new_client)
    db.commit()
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

    client_db.document = client.document
    client_db.razon_social = client.razon_social
    client_db.representante_legal = client.representante_legal
    client_db.email = client.email
    client_db.address = client.address
    client_db.telephone = client.telephone
    client_db.number_cellphone = client.number_cellphone
    client_db.id_document = client.id_document

    db.commit()
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

    for key, value in update_data.items():
        setattr(client_db, key, value)

    db.commit()
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

    db.delete(client)
    db.commit()

    return api_response(True, "Cliente eliminado")