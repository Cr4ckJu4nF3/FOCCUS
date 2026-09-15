from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Date, DateTime, ForeignKey
from app.config.database import Base


class Rodaje(Base):
    __tablename__ = "rodaje"

    id_rodaje = Column(
        String(20),
        primary_key=True,
        index=True,
        nullable=False
    )

    id_project = Column(
        String(20),
        ForeignKey("projects.id_project", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    nombre = Column(
        String(120),
        nullable=False
    )

    descripcion = Column(
        Text
    )

    fecha_inicio = Column(
        Date,
        nullable=False
    )

    fecha_fin = Column(
        Date,
        nullable=True
    )

    dia_dramatico = Column(
        Integer
    )  # "Día N" del cronograma (mismo numero que Escena.dia_dramatico)

    semana = Column(
        Integer
    )  # agrupacion "Semana N" en pantalla

    llamado = Column(
        String(20)
    )  # hora de llamado general del dia, ej "5:30 AM"

    locacion = Column(
        String(255)
    )

    estado = Column(
        String(30),
        default="Pendiente"
    )

    archivo = Column(
        String(255)
    )

    fecha_creacion = Column(
        DateTime,
        default=datetime.utcnow
    )
