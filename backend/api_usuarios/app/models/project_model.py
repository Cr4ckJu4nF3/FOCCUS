from sqlalchemy import Column, Integer, String, Text
from app.config.database import Base

class Project(Base):
    __tablename__ = "projects"

    id_project = Column(
        String(20),
        primary_key=True,
        index=True
    )

    project_name = Column(
        String(45),
        nullable=False
    )

    formato_de_produccion = Column(
        String(50),
        nullable=False
    )

    genero = Column(
        String(50),
        nullable=False
    )

    sinopsis = Column(
        Text
    )

    director = Column(
        String(255)
    )

    id_client = Column(
        Integer,
        nullable=False
    )