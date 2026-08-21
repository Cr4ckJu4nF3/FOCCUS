from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# CARGAR VARIABLES .env
load_dotenv()

# VARIABLES ENTORNO

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

# URL CONEXION POSTGRESQL

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# ENGINE SQLALCHEMY

engine = create_engine(DATABASE_URL)

# SESIONES

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# BASE ORM
Base = declarative_base()

# DEPENDENCIA DB

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# PRUEBA CONEXION

try:
    connection = engine.connect()
    print("Conexion exitosa PostgreSQL")
    connection.close()
except Exception as error:
    print("Error conexion:", error)