from sqlalchemy import Column, String, Text, ForeignKey
from app.config.database import Base

# ESCENARIO MODEL
# Locaciones/sets reutilizables dentro de un proyecto (ej. "Cabana - Sala
# Principal", "Bosque"). Se usan como atajo al escribir el guion desde
# cero y, mas adelante, se pueden vincular a escenas.


class Escenario(Base):
    __tablename__ = "escenarios"

    id_escenario = Column(
        String(15),
        primary_key=True,
        index=True,
        nullable=False
    )

    nombre = Column(
        String(100),
        nullable=False
    )

    descripcion = Column(
        Text
    )

    tipo = Column(
        String(20)
    )  # Int | Ext | Int/Ext

    id_project = Column(  ## llave foranea
        String(20),
        ForeignKey("projects.id_project", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
