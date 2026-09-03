from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.config.database import Base

# ESCENA VERSION MODEL
# Cada vez que se suben fotos nuevas de continuidad para una escena
# (vestuario/objeto/espacio) se crea una fila aca que las agrupa.

class EscenaVersion(Base):
    __tablename__ = "escena_version"

    id_escena_version = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    id_escena = Column(  ## llave foranea
        String(15),
        ForeignKey("escenas.id_escena", ondelete="CASCADE"),
        nullable=False
    )

    numero_version = Column(
        Integer,
        nullable=False
    )

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
