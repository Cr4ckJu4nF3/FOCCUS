from pydantic import BaseModel
from typing import Optional
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
