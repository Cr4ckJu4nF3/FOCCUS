from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.config.database import Base


class GaleriaItem(Base):
    __tablename__ = "galeria_items"

    id_galeria = Column(Integer, primary_key=True, autoincrement=True)
    id_project = Column(
        String(20),
        ForeignKey("projects.id_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo = Column(String(20), nullable=False, index=True)
    categoria = Column(String(80))
    nombre = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=False)
    archivo_path = Column(Text, nullable=False)
    id_personaje = Column(
        String(15),
        ForeignKey("personajes.id_personaje", ondelete="SET NULL"),
    )
    id_escenario = Column(
        String(15),
        ForeignKey("escenarios.id_escenario", ondelete="SET NULL"),
    )
    id_escena = Column(
        String(15),
        ForeignKey("escenas.id_escena", ondelete="SET NULL"),
    )
    id_guion = Column(
        Integer,
        ForeignKey("guion.id_guion", ondelete="SET NULL"),
    )
    personaje_sinopsis = Column(Text)
    interprete_nombre = Column(String(150))
    interprete_descripcion = Column(Text)
    lugar_detalle_ubicacion = Column(Text)
    lugar_apariencia = Column(Text)
    lugar_objetos = Column(Text)
    lugar_personajes = Column(Text)
    ultimo_uso = Column(Date)
    estado = Column(String(30), nullable=False, default="Disponible")
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_actualizacion = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
