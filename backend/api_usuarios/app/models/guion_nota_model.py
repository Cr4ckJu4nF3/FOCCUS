from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.config.database import Base

# GUION NOTA MODEL
# Notas/comentarios sobre una version especifica del guion.

class GuionNota(Base):
    __tablename__ = "guion_nota"

    id_nota = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    id_guion_version = Column(  ## llave foranea
        Integer,
        ForeignKey("guion_version.id_guion_version", ondelete="CASCADE"),
        nullable=False
    )

    id_user = Column(  ## llave foranea
        Integer,
        ForeignKey("users.id_user", ondelete="CASCADE"),
        nullable=False
    )

    contenido = Column(
        Text,
        nullable=False
    )

    fecha_creacion = Column(
        DateTime,
        server_default=func.now()
    )
