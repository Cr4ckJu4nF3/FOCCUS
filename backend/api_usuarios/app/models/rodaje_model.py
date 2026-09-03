from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Date, DateTime, ForeignKey
from app.config.database import Base


class Rodaje(Base):
    __tablename__ = "rodaje"
    __table_args__ = {"mysql_collate": "utf8mb4_unicode_ci"}

    id_rodaje = Column(
        String(20, collation="utf8mb4_unicode_ci"),
        primary_key=True,
        index=True,
        nullable=False
    )

    id_project = Column(
        String(20, collation="utf8mb4_unicode_ci"),
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
        nullable=False
    )

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
