from pydantic import BaseModel
from typing import Optional
from datetime import date

class EscenaSchema(BaseModel):
    id_guion: int
    numero_de_escena: str
    encabezado: str
    descripcion: Optional[str] = None
    modo_vista: Optional[str] = None
    momento_dia: Optional[str] = None
    ciudad: Optional[str] = None
    pagina: Optional[int] = None
    fecha_de_grabacion: Optional[date] = None
    dia_dramatico: Optional[int] = None
    id_rodaje: Optional[str] = None
    id_desglose: Optional[str] = None

class EscenaUpdateSchema(BaseModel):
    numero_de_escena: Optional[str] = None
    encabezado: Optional[str] = None
    descripcion: Optional[str] = None
    modo_vista: Optional[str] = None
    momento_dia: Optional[str] = None
    ciudad: Optional[str] = None
    pagina: Optional[int] = None
    fecha_de_grabacion: Optional[date] = None
    dia_dramatico: Optional[int] = None
    id_rodaje: Optional[str] = None
    id_desglose: Optional[str] = None
