from pydantic import BaseModel
from typing import Optional

class EscenaVersionSchema(BaseModel):
    comentario_cambio: Optional[str] = None

class ContinuidadFotoMetaSchema(BaseModel):
    # Los archivos llegan aparte como UploadFile[] (multipart/form-data),
    # este schema cubre los demas campos del formulario.
    tipo: str  # vestuario | objeto | espacio
    etiqueta: Optional[str] = None
    id_personaje: Optional[str] = None
    notas: Optional[str] = None
