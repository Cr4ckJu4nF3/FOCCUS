from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.config.database import Base


class GaleriaVersionFoto(Base):
    __tablename__ = "galeria_version_fotos"
    __table_args__ = (
        UniqueConstraint("id_version", name="uq_galeria_version_foto"),
    )

    id_foto = Column(Integer, primary_key=True, autoincrement=True)
    id_version = Column(
        Integer,
        ForeignKey("galeria_versiones.id_version", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    id_project = Column(
        String(20),
        ForeignKey("projects.id_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    archivo_path = Column(Text, nullable=False)
    actualiza_imagen_principal = Column(Boolean, nullable=False, default=False)
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
