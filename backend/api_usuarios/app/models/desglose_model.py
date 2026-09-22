from sqlalchemy import Column, String, Text
from app.config.database import Base

# DESGLOSE MODEL
# Contenedor de "requerimientos por departamento" de UNA escena (Elenco,
# Props, Vestuario, SFX, etc). Se crea automaticamente la primera vez
# que se agrega un requerimiento a una escena, y la escena queda
# vinculada a el mediante Escena.id_desglose.


class Desglose(Base):
    __tablename__ = "desglose"

    id_desglose = Column(
        String(20),
        primary_key=True,
        index=True,
        nullable=False
    )

    notas = Column(
        Text
    )
