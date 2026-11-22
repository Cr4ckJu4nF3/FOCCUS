from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.sql import func

from app.config.database import Base


class CatalogoBloque(Base):
    __tablename__ = "catalogo_bloques"
    __table_args__ = (
        UniqueConstraint("id_project", "tipo", "html_sha256", name="uq_catalogo_bloques_proyecto_tipo_hash"),
    )

    id_bloque = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    id_project = Column(String(20), ForeignKey("projects.id_project", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(16), nullable=False)
    html = Column(Text().with_variant(LONGTEXT, "mysql"), nullable=False)
    html_sha256 = Column(LargeBinary(32), nullable=False)
    creado_en = Column(DateTime, server_default=func.now(), nullable=False)
