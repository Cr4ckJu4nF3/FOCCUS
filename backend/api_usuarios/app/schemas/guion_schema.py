from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Annotated, Literal, Optional, Union
from datetime import date
from app.schemas.escena_schema import (
    EscenaActualizarSincronizacionSchema,
    EscenaCrearSincronizacionSchema,
)


class AccionCrearEscenaVersionSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: Literal["crear"]
    client_key: str = Field(pattern=r"^[A-Za-z0-9_-]{1,80}$")
    payload: EscenaCrearSincronizacionSchema


class AccionActualizarEscenaVersionSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: Literal["actualizar"]
    id_escena: str
    payload: EscenaActualizarSincronizacionSchema


AccionEscenaVersionSchema = Annotated[
    Union[AccionCrearEscenaVersionSchema, AccionActualizarEscenaVersionSchema],
    Field(discriminator="tipo"),
]

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
    # Contrato opcional y aditivo: el editor web lo usa para guardar la
    # versión y sus fichas de escena en una sola transacción. Los clientes
    # anteriores pueden seguir omitiéndolo.
    acciones_escena: Optional[list[AccionEscenaVersionSchema]] = None

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
    acciones_escena: Optional[list[AccionEscenaVersionSchema]] = None

class GuionNotaSchema(BaseModel):
    contenido: str

    @field_validator("contenido")
    @classmethod
    def validar_contenido(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("La nota no puede estar vacía")
        return value
