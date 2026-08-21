from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserSchema(BaseModel):
    nombre: str
    apellido: str
    identificacion: str
    id_identificacion: str
    mail: str
    msisdn: str
    direccion: str
    fecha_de_nacimiento: datetime
    estado: str
    contrasena: str
    id_departamento: str
    id_project: str
    id_rol: int

class LoginSchema(BaseModel):
    mail: str
    contrasena: str

class UserUpdateSchema(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    identificacion: Optional[str] = None
    id_identificacion: Optional[str] = None
    mail: Optional[str] = None
    msisdn: Optional[str] = None
    direccion: Optional[str] = None
    fecha_de_nacimiento: Optional[datetime] = None
    estado: Optional[str] = None
    contrasena: Optional[str] = None
    id_departamento: Optional[str] = None
    id_project: Optional[str] = None
    id_rol: Optional[int] = None

class RecoverSchema(BaseModel):
    mail: str

class ResetPasswordSchema(BaseModel):
    mail: str
    codigo: str
    nueva_contrasena: str
    
class RegisterSchema(BaseModel):
    # Datos empresa
    razon_social: str
    representante_legal: str
    email_empresa: str
    address: Optional[str] = None
    telephone: Optional[str] = None
    number_cellphone: Optional[str] = None
    document: str
    id_document: str

    # Datos usuario
    nombre: str
    apellido: str
    mail: str
    msisdn: str
    contrasena: str
    
class TwoFactorSendSchema(BaseModel):
    mail: str
    device_id: str

class TwoFactorVerifySchema(BaseModel):
    mail: str
    codigo: str
    device_id: str
    
class InviteSchema(BaseModel):
    correos: list[str]
    id_project: str
    id_client: int
    id_rol: int

class UserProjectSchema(BaseModel):
    id_user: int
    id_project: str
    id_rol: int = 1005