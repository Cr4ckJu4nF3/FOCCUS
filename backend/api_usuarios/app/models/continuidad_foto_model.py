from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.config.database import Base

# CONTINUIDAD FOTO MODEL
# Fotos de continuidad (vestuario, objetos, espacios) asociadas a
# una version especifica de una escena.

class ContinuidadFoto(Base):
    __tablename__ = "continuidad_foto"

    id_foto = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    id_escena_version = Column(  ## llave foranea
        Integer,
        ForeignKey("escena_version.id_escena_version", ondelete="CASCADE"),
        nullable=False
    )

    tipo = Column(
        String(20),
        nullable=False
    )  # vestuario | objeto | espacio

    etiqueta = Column(
        String(150)
    )  # ej: "Vestuario - Personaje Juan"

    id_personaje = Column(  ## llave foranea (opcional)
        String(15),
        ForeignKey("personajes.id_personaje", ondelete="SET NULL")
    )

    archivo_path = Column(
        Text,
        nullable=False
    )

    notas = Column(
        Text
    )

    fecha_creacion = Column(
        DateTime,
        server_default=func.now()
    )
