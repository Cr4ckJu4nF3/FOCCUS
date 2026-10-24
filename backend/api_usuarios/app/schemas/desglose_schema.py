from pydantic import BaseModel, Field, field_validator
from typing import Optional

DEPARTAMENTOS_DESGLOSE = [
    "Elenco",
    "Extras / BG",
    "Bits",
    "Props",
    "Vestuario",
    "Maquillaje y Pelo",
    "Maquillaje FX",
    "Arte",
    "Cámara",
    "Sonido",
    "SFX",
    "VFX",
    "Stunts",
    "Vehículos",
    "Animales",
    "Armas",
    "Crew Adicional",
    "Notas",
]


class DesgloseRequerimientoSchema(BaseModel):
    departamento: str
    etiqueta: Optional[str] = None
    cantidad: Optional[int] = 1
    notas: Optional[str] = None


class DesgloseRequerimientoUpdateSchema(BaseModel):
    departamento: Optional[str] = None
    etiqueta: Optional[str] = None
    cantidad: Optional[int] = None
    notas: Optional[str] = None


class EscenaGaleriaItemSchema(BaseModel):
    id_galeria: int
    etiquetas: Optional[str] = Field(default=None, max_length=255)
    notas: Optional[str] = None

    @field_validator("etiquetas", "notas")
    @classmethod
    def normalize_text(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() or None if value is not None else None
