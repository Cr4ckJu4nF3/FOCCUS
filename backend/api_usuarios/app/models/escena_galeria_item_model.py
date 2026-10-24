from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.config.database import Base


class EscenaGaleriaItem(Base):
    __tablename__ = "escena_galeria_items"

    id_escena = Column(
        String(15),
        ForeignKey("escenas.id_escena", ondelete="CASCADE"),
        primary_key=True,
    )
    id_galeria = Column(
        Integer,
        ForeignKey("galeria_items.id_galeria", ondelete="CASCADE"),
        primary_key=True,
    )
    etiquetas = Column(String(255))
    notas = Column(Text)
    fecha_vinculacion = Column(DateTime, server_default=func.now(), nullable=False)
