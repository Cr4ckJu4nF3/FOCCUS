from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.config.database import Base


class GaleriaVersion(Base):
    __tablename__ = "galeria_versiones"
    __table_args__ = (
        UniqueConstraint("id_galeria", "numero_version", name="uq_galeria_version_numero"),
    )

    id_version = Column(Integer, primary_key=True, autoincrement=True)
    id_galeria = Column(
        Integer,
        ForeignKey("galeria_items.id_galeria", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    id_project = Column(
        String(20),
        ForeignKey("projects.id_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    numero_version = Column(Integer, nullable=False)
    nombre_elemento = Column(String(150), nullable=False)
    categoria_elemento = Column(String(80))
    detalles_uso = Column(Text, nullable=False)
    id_guion = Column(
        Integer,
        ForeignKey("guion.id_guion", ondelete="SET NULL"),
    )
    id_escena = Column(
        String(15),
        ForeignKey("escenas.id_escena", ondelete="SET NULL"),
    )
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
