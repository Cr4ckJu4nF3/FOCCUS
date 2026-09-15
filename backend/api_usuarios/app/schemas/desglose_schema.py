from pydantic import BaseModel
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
