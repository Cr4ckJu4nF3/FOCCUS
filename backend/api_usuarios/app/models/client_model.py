from sqlalchemy import Column, Integer, String, Text
from app.config.database import Base

class Client(Base):
    __tablename__ = "clients"

    id_cliente = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    document = Column(
        String(50),
        nullable=False
    )
    
    id_document = Column(
        Text,
        nullable=False
    )

    razon_social = Column(
        String(50),
        nullable=False
    )

    representante_legal = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(100),
        unique=True,
        nullable=False
    )

    address = Column(
        String(100)
    )

    telephone = Column(
        String(15),
        nullable=False
    )

    number_cellphone = Column(
        String(20)
    )

