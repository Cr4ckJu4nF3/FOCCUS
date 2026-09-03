from sqlalchemy import Column, String
from app.config.database import Base


class Personaje(Base):
    __tablename__ = "personajes"

    id_personaje = Column(
        String(15),
        primary_key=True,
        index=True,
        nullable=False
    )
