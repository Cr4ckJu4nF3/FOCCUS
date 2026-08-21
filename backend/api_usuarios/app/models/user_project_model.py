from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.config.database import Base

class UserProject(Base):
    __tablename__ = "user_projects"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    id_user = Column(
        Integer,
        ForeignKey("users.id_user", ondelete="CASCADE"),
        nullable=False
    )

    id_project = Column(
        String,
        ForeignKey("projects.id_project", ondelete="CASCADE"),
        nullable=False
    )

    id_rol = Column(
        Integer,
        nullable=False,
        default=1005
    )

    fecha_vinculacion = Column(
        DateTime,
        server_default=func.now()
    )