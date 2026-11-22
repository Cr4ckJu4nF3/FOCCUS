from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Literal, Optional, Union
from datetime import date

class EscenaSinGuionSchema(BaseModel):
    numero_de_escena: str
    encabezado: str
    descripcion: Optional[str] = None
    modo_vista: Optional[str] = None
    momento_dia: Optional[str] = None
    ciudad: Optional[str] = None
    pagina: Optional[int] = None
    fecha_de_grabacion: Optional[date] = None
    dia_dramatico: Optional[int] = None
    estado: Optional[str] = "Pendiente"
    id_rodaje: Optional[str] = None
    id_desglose: Optional[str] = None

class EscenaSchema(EscenaSinGuionSchema):
    id_guion: int

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
    estado: Optional[str] = None


class EscenaCrearSincronizacionSchema(EscenaSinGuionSchema):
    model_config = ConfigDict(extra="forbid")


class EscenaActualizarSincronizacionSchema(EscenaUpdateSchema):
    model_config = ConfigDict(extra="forbid")


class AccionCrearEscenaSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: Literal["crear"]
    payload: EscenaCrearSincronizacionSchema


class AccionActualizarEscenaSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: Literal["actualizar"]
    id_escena: str
    payload: EscenaActualizarSincronizacionSchema


class SincronizarEscenasSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    acciones: list[Annotated[
        Union[AccionCrearEscenaSchema, AccionActualizarEscenaSchema],
        Field(discriminator="tipo"),
    ]]
