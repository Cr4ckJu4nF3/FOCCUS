from fastapi import APIRouter
from app.schemas.contact_schema import ContactSchema
from app.controllers.contact_controller import send_contact

router = APIRouter()

@router.post("/contact")
def contact(data: ContactSchema):
    return send_contact(data)