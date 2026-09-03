from datetime import date
from typing import Optional
from pydantic import BaseModel


class RodajeSchema(BaseModel):
    id_project: str
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date
    locacion: Optional[str] = None
    estado: Optional[str] = "Pendiente"
    archivo: Optional[str] = None


class RodajeUpdateSchema(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    locacion: Optional[str] = None
    estado: Optional[str] = None
    archivo: Optional[str] = None


class ProcesoRodajeSchema(BaseModel):
    nombre: str
    ubicacion: str
    fecha: date
    encargado: Optional[str] = None
    estado: Optional[str] = "Pendiente"
    descripcion: Optional[str] = None
    orden: Optional[int] = 1
    archivo: Optional[str] = None


class ProcesoRodajeUpdateSchema(BaseModel):
    nombre: Optional[str] = None
    ubicacion: Optional[str] = None
    fecha: Optional[date] = None
    encargado: Optional[str] = None
    estado: Optional[str] = None
    descripcion: Optional[str] = None
    orden: Optional[int] = None
    archivo: Optional[str] = None
