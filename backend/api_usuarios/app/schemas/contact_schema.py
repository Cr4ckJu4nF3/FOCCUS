from pydantic import BaseModel

class ContactSchema(BaseModel):
    nombre: str
    email: str
    celular:str
    empresa: str = ""
    tipo: str = "demo"
    mensaje: str