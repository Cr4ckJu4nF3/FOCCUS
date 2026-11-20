from pydantic import BaseModel, field_validator
from typing import Literal, Optional
from datetime import date

class GuionSchema(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    id_project: str

class GuionUpdateSchema(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

class GuionVersionSchema(BaseModel):
    # El archivo llega aparte como UploadFile (multipart/form-data),
    # este schema cubre los demas campos del formulario.
    fecha_de_emision: date
    estado: str = "Borrador"
    comentario_cambio: Optional[str] = None

class GuionVersionTextoSchema(BaseModel):
    # Version escrita/editada directo en el sistema, sin archivo.
    contenido: str
    fecha_de_emision: date
    estado: str = "Borrador"
    comentario_cambio: Optional[str] = None

class GuionVersionEstadoSchema(BaseModel):
    estado: Literal[
        "Borrador",
        "Pendiente",
        "Revision",
        "En revisión",
        "Aprobado",
        "En Rodaje",
        "Completado",
        "Finalizado",
        "Archivado",
    ]

class GuionDesdeCeroSchema(BaseModel):
    # Crea el guion maestro Y su primera version de una sola vez,
    # a partir de texto escrito en el sistema (no un archivo subido).
    nombre: str
    descripcion: Optional[str] = None
    id_project: str
    contenido: str
    fecha_de_emision: date
    estado: str = "Borrador"

class GuionNotaSchema(BaseModel):
    contenido: str

    @field_validator("contenido")
    @classmethod
    def validar_contenido(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("La nota no puede estar vacía")
        return value
