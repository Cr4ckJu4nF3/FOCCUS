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

class GuionNotaSchema(BaseModel):
    contenido: str
