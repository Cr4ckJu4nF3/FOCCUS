from pydantic import BaseModel
from typing import Optional

class RoleSchema(BaseModel):
    nombre: str
    nivel_jerarquia: str
    descripcion: Optional[str] = None
    activo: Optional[bool] = True

class RoleUpdateSchema(BaseModel):
    nombre: Optional[str] = None
    nivel_jerarquia: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None