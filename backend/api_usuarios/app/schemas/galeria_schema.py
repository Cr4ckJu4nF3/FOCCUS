from datetime import date
from typing import Optional

from pydantic import BaseModel, field_validator


TIPOS_GALERIA = {"objeto", "personaje", "lugar"}


class GaleriaUpdateSchema(BaseModel):
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    id_personaje: Optional[str] = None
    id_escenario: Optional[str] = None
    id_escena: Optional[str] = None
    id_guion: Optional[int] = None
    personaje_sinopsis: Optional[str] = None
    interprete_nombre: Optional[str] = None
    interprete_descripcion: Optional[str] = None
    lugar_detalle_ubicacion: Optional[str] = None
    lugar_apariencia: Optional[str] = None
    lugar_objetos: Optional[str] = None
    lugar_personajes: Optional[str] = None
    ultimo_uso: Optional[date] = None
    estado: Optional[str] = None

    @field_validator("tipo")
    @classmethod
    def validate_tipo(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in TIPOS_GALERIA:
            raise ValueError("Tipo de galería no válido")
        return value

    @field_validator("nombre", "descripcion", "estado")
    @classmethod
    def validate_required_text(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.strip():
            raise ValueError("Este campo no puede estar vacío")
        return value.strip() if value is not None else value


class GaleriaVersionCreateSchema(BaseModel):
    detalles_uso: str
    id_guion: Optional[int] = None
    id_escena: Optional[str] = None

    @field_validator("detalles_uso")
    @classmethod
    def validate_details(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Describe cómo quedó o se usó el elemento")
        return value.strip()
