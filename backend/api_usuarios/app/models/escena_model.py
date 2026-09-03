from sqlalchemy import Column, String, Text, Integer, Date, ForeignKey
from app.config.database import Base

# ESCENA MODEL
# Mapea la tabla `escenas` que ya existe en la BD (creada manualmente).
# No se toca su estructura: solo se formaliza aca para poder
# consultarla/crearla desde la API.

class Escena(Base):
    __tablename__ = "escenas"

    id_escena = Column(
        String(15),
        primary_key=True,
        index=True
    )

    numero_de_escena = Column(
        String(45),
        nullable=False
    )

    encabezado = Column(
        Text,
        nullable=False
    )

    descripcion = Column(
        Text
    )

    id_guion = Column(  ## llave foranea
        Integer,
        ForeignKey("guion.id_guion", ondelete="CASCADE")
    )

    modo_vista = Column(
        String(20)
    )  # int | ext | int/ext | ext/int

    momento_dia = Column(
        String(20)
    )  # dia | noche | amanecer | atardecer | amanecer/dia | dia/noche

    ciudad = Column(
        Text
    )

    pagina = Column(
        Integer
    )

    fecha_de_grabacion = Column(
        Date
    )

    dia_dramatico = Column(
        Integer
    )

    id_rodaje = Column(  ## llave foranea (tabla de cronograma de rodaje, fuera de este modulo)
        String(20),
        ForeignKey("rodaje.id_rodaje", ondelete="CASCADE")
    )

    id_desglose = Column(  ## llave foranea (tabla de desglose de produccion, fuera de este modulo)
        String(20),
        ForeignKey("desglose.id_desglose", ondelete="CASCADE")
    )
