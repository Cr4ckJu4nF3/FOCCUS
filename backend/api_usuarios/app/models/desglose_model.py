from sqlalchemy import Column, String
from app.config.database import Base


class Desglose(Base):
    __tablename__ = "desglose"

    id_desglose = Column(
        String(20),
        primary_key=True,
        index=True,
        nullable=False
    )
