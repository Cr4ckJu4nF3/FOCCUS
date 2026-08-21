from pydantic import BaseModel
from typing import Optional

class ProjectSchema(BaseModel):
    id_project: str
    project_name: str
    formato_de_produccion: str
    genero: str
    sinopsis: Optional[str] = None
    director: Optional[str] = None
    id_client: int

class ProjectUpdateSchema(BaseModel):
    project_name: Optional[str] = None
    formato_de_produccion: Optional[str] = None
    genero: Optional[str] = None
    sinopsis: Optional[str] = None
    director: Optional[str] = None
    id_client: Optional[int] = None

class ProjectSchema(BaseModel):
    id_project: Optional[str] = None
    project_name: str
    formato_de_produccion: str
    genero: str
    sinopsis: Optional[str] = None
    director: Optional[str] = None
    id_client: int

class ProjectCreateSchema(BaseModel):
    project_name: str
    formato_de_produccion: str
    genero: str
    sinopsis: Optional[str] = None
    director: Optional[str] = None
    id_client: int
    id_user: int