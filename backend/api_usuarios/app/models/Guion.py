from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.config.database import Base

# GUION MODEL
# Registro maestro: nombre/descripcion/proyecto. El archivo, estado y
# fecha de emision viven en GuionVersion (una fila por cada edicion).

class Guion(Base):
    __tablename__ = "guion"

    id_guion = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    nombre = Column(
        String(100),
        nullable=False
    )

    descripcion = Column(
        Text
    )

    id_project = Column(  ## llave foranea
        String(20),
        ForeignKey("projects.id_project", ondelete="CASCADE"),
        nullable=False
    )

    id_guion_version_actual = Column(  ## llave foranea - puntero a la version vigente
        Integer,
        ForeignKey("guion_version.id_guion_version", ondelete="SET NULL")
    )
