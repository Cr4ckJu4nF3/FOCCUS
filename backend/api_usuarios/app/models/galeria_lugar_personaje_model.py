from sqlalchemy import Column, ForeignKey, Integer, String

from app.config.database import Base


class GaleriaLugarPersonaje(Base):
    __tablename__ = "galeria_lugar_personajes"

    id_lugar_galeria = Column(
        Integer,
        ForeignKey("galeria_items.id_galeria", ondelete="CASCADE"),
        primary_key=True,
    )
    id_personaje_galeria = Column(
        Integer,
        ForeignKey("galeria_items.id_galeria", ondelete="CASCADE"),
        primary_key=True,
    )
