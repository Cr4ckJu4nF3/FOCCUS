from app.schemas.contact_schema import ContactSchema
from app.utils.mail import send_contact_email
from app.utils.response import api_response


# SEND CONTACT

def send_contact(data: ContactSchema):
    enviado = send_contact_email(
        nombre=data.nombre,
        email=data.email,
        celular=data.celular,
        empresa=data.empresa,
        tipo=data.tipo,
        mensaje=data.mensaje
    )

    if not enviado:
        return api_response(False, "Error al enviar el mensaje", error="MAIL_ERROR")

    return api_response(True, "Mensaje enviado exitosamente")