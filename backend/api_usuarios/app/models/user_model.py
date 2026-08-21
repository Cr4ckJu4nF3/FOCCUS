from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.config.database import Base

# USER MODEL

class User(Base):
    __tablename__ = "users"

    id_user = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    nombre = Column(
        String(255),
        nullable=False
    )
    
    apellido = Column(
        String(255),
        nullable=False
    )
    identificacion = Column(
        String(50),
        nullable=False
    )

    id_identificacion = Column(
        String(50),
        unique=True,
        nullable=False
    )

    mail = Column(
        String(150),
        unique=True,
        nullable=False
    )

    msisdn = Column(
        String(20),
        nullable=False
    )

    direccion = Column(
        String(150),
    )

    fecha_de_nacimiento = Column(
        DateTime,
        nullable=False
    )

    estado = Column(
        String(20),
        nullable=False
    )
    
    fecha_de_creacion = Column(
        DateTime,
        server_default=func.now()
    )
    
    ultimo_acceso = Column(
        DateTime,
        server_default=func.now()
    )

    contrasena = Column(
        String(255),
        nullable=False
    )

    id_departamento = Column( ## llave foranea
        String(20),
        nullable=False
    )

    id_project = Column( ## llave foranea
        String(20),
        nullable=False
    )

    id_rol = Column(
        Integer,
        nullable=False
    )
