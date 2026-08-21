from pydantic import BaseModel
from typing import Optional

class ClientSchema(BaseModel):
    document: str
    razon_social: str
    representante_legal: str
    email: str
    address: Optional[str] = None
    telephone: Optional[str] = None
    number_cellphone: Optional[str] = None
    id_document: str

class ClientUpdateSchema(BaseModel):
    document: Optional[str] = None
    razon_social: Optional[str] = None
    representante_legal: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    telephone: Optional[str] = None
    number_cellphone: Optional[str] = None
    id_document: Optional[str] = None