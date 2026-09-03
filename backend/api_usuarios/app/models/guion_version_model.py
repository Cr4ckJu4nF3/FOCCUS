from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.config.database import Base

# GUION VERSION MODEL
# Cada edicion del guion (texto o archivo nuevo) crea una fila aca.

class GuionVersion(Base):
    __tablename__ = "guion_version"

    id_guion_version = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    id_guion = Column(  ## llave foranea
        Integer,
        ForeignKey("guion.id_guion", ondelete="CASCADE"),
        nullable=False
    )

    numero_de_version = Column(
        Integer,
        nullable=False
    )

    archivo = Column(
        Text,
        nullable=False
    )

    fecha_de_emision = Column(
        Date,
        nullable=False
    )

    estado = Column(
        String(20),
        nullable=False,
        default="Borrador"
    )  # Borrador | Revision | Aprobado | En Rodaje | Archivado

    comentario_cambio = Column(
        Text
    )

    creado_por = Column(  ## llave foranea
        Integer,
        ForeignKey("users.id_user", ondelete="SET NULL")
    )

    fecha_creacion = Column(
        DateTime,
        server_default=func.now()
    )
