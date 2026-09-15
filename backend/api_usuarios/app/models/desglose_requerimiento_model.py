from sqlalchemy import Column, String, Integer, Text, ForeignKey
from app.config.database import Base

# DESGLOSE REQUERIMIENTO MODEL
# Cada fila es UNA necesidad de UN departamento para la escena (ej.
# "Vestuario x2 - trajes de epoca", "Props x3 - copas de cristal").
# Agrupadas por id_desglose forman el desglose completo de una escena.


class DesgloseRequerimiento(Base):
    __tablename__ = "desglose_requerimientos"

    id_requerimiento = Column(
        String(15),
        primary_key=True,
        index=True,
        nullable=False
    )

    id_desglose = Column(  ## llave foranea
        String(20),
        ForeignKey("desglose.id_desglose", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    departamento = Column(
        String(60),
        nullable=False
    )  # Elenco | Props | Vestuario | Maquillaje y Pelo | Arte | Camara | Sonido | SFX | VFX | Stunts | Crew Adicional

    etiqueta = Column(
        String(150)
    )  # detalle especifico, ej. "Copas de cristal"

    cantidad = Column(
        Integer,
        default=1
    )

    notas = Column(
        Text
    )
