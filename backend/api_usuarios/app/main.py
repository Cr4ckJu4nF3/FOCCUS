from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.user_routes import router as user_router
from app.routes.client_routes import router as client_router
from app.routes.project_routes import router as project_router
from app.routes.role_routes import router as role_router
from app.routes.contact_routes import router as contact_router
from app.routes.guion_routes import router as guion_router
from app.routes.escena_routes import router as escena_router
from app.routes.rodaje_routes import router as rodaje_router
from app.routes.continuidad_routes import router as continuidad_router
from app.config.database import Base, engine
from app.models.user_project_model import UserProject
from app.models.rodaje_model import Rodaje
from app.models.proceso_rodaje_model import ProcesoRodaje
from app.models.desglose_model import Desglose
from app.models.personajes_model import Personaje
 
# CREATE TABLES
Base.metadata.create_all(bind=engine)
 
# FASTAPI
 
app = FastAPI(
    title="API´S RACCORD",
    version="1.0"
)
 
 
# CORS -  esto habilita a que react pueda hacer peticiones a traves de las apis dispuesta en el backend
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# ROUTES
 
app.include_router(user_router)
app.include_router(client_router)
app.include_router(project_router)
app.include_router(role_router)
app.include_router(contact_router)
app.include_router(guion_router)
app.include_router(escena_router)
app.include_router(rodaje_router)
app.include_router(continuidad_router)
 
 
# HOME
 
@app.get("/")
def home():
    return {
        "success": True,
        "message": "API funcionando correctamente"
    }
 