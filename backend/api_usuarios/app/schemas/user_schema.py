from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime

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
    remember_me: bool = False

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

    @field_validator("fecha_de_nacimiento", mode="before")
    @classmethod
    def parse_birth_date(cls, value: str | datetime | None) -> str | datetime | None:
        if isinstance(value, str) and len(value) == 10:
            return datetime.strptime(value, "%Y-%m-%d")
        return value

class RecoverSchema(BaseModel):
    mail: str

class VerifyRecoveryCodeSchema(BaseModel):
    mail: str
    codigo: str

class ResetPasswordSchema(BaseModel):
    mail: str
    codigo: str
    nueva_contrasena: str

    @field_validator("nueva_contrasena")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("La contraseña no puede superar los 72 bytes")
        return value
    
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
    fecha_de_nacimiento: date
    contrasena: str

    @field_validator("contrasena")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("La contraseña no puede superar los 72 bytes")
        return value
    
class TwoFactorSendSchema(BaseModel):
    mail: str
    device_id: str

class TwoFactorVerifySchema(BaseModel):
    mail: str
    codigo: str
    device_id: str
    remember_me: bool = False
    
class InviteeNameSchema(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)
    apellido: str = Field(min_length=1, max_length=255)

class InviteSchema(BaseModel):
    correos: list[str]
    id_project: str
    id_client: int
    id_rol: int
    departamento: Optional[str] = None
    nombres: dict[str, InviteeNameSchema] = Field(default_factory=dict)

    @field_validator("id_rol")
    @classmethod
    def validate_project_role(cls, value: int) -> int:
        if value not in {1001, 1002, 1003, 1004, 1005}:
            raise ValueError("Rol de proyecto no válido")
        return value

class CompleteInvitationSchema(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)
    apellido: str = Field(min_length=1, max_length=255)
    identificacion: str = Field(min_length=1, max_length=50)
    id_identificacion: str = Field(min_length=1, max_length=50)
    msisdn: str = Field(min_length=1, max_length=20)
    direccion: str = Field(min_length=1, max_length=150)
    fecha_de_nacimiento: date
    contrasena: str

    @field_validator("nombre", "apellido", "identificacion", "id_identificacion", "msisdn", "direccion", mode="before")
    @classmethod
    def strip_profile_fields(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("fecha_de_nacimiento")
    @classmethod
    def validate_birth_date(cls, value: date) -> date:
        if value >= date.today():
            raise ValueError("La fecha de nacimiento debe ser anterior al día de hoy")
        return value

    @field_validator("contrasena")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not any(char.islower() for char in value):
            raise ValueError("La contraseña debe incluir una letra minúscula")
        if not any(char.isupper() for char in value):
            raise ValueError("La contraseña debe incluir una letra mayúscula")
        if not any(char.isdigit() for char in value):
            raise ValueError("La contraseña debe incluir un número")
        if not any(not char.isalnum() and not char.isspace() for char in value):
            raise ValueError("La contraseña debe incluir un carácter especial")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("La contraseña no puede superar los 72 bytes")
        return value

class UserProjectSchema(BaseModel):
    id_user: int
    id_project: str
    id_rol: int = 1005

class UserProjectUpdateSchema(BaseModel):
    departamento: Optional[str] = None
    cargo: Optional[str] = None
    id_rol: Optional[int] = None

    @field_validator("id_rol")
    @classmethod
    def validate_project_role(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and value not in {1001, 1002, 1003, 1004, 1005}:
            raise ValueError("Rol de proyecto no válido")
        return value