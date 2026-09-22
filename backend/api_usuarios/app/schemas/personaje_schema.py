from pydantic import BaseModel
from typing import Optional


class PersonajeSchema(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    id_project: str


class PersonajeUpdateSchema(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
