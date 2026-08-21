from sqlalchemy import Column, Integer, String, Boolean
from app.config.database import Base

class Role(Base):
    __tablename__ = "roles"

    id_rol = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    nombre = Column(
        String(50),
        nullable=False
    )

    nivel_jerarquia = Column(
        String(50),
        nullable=False
    )

    descripcion = Column(
        String(255)
    )

    activo = Column(
        Boolean,
        default=True
    )