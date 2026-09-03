from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Date, DateTime, ForeignKey
from app.config.database import Base


class ProcesoRodaje(Base):
    __tablename__ = "proceso_rodaje"
    __table_args__ = {"mysql_collate": "utf8mb4_unicode_ci"}

    id_proceso = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        index=True
    )

    id_rodaje = Column(
        String(20, collation="utf8mb4_unicode_ci"),
        ForeignKey("rodaje.id_rodaje", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    nombre = Column(
        String(120),
        nullable=False
    )

    ubicacion = Column(
        String(255),
        nullable=False
    )

    fecha = Column(
        Date,
        nullable=False
    )

    encargado = Column(
        String(120)
    )

    estado = Column(
        String(30),
        default="Pendiente"
    )

    descripcion = Column(
        Text
    )

    orden = Column(
        Integer,
        default=1
    )

    archivo = Column(
        String(255)
    )

    fecha_creacion = Column(
        DateTime,
        default=datetime.utcnow
    )
