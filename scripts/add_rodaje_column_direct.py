from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv("..\\backend\\api_usuarios\\.env")
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')

if not all([DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME]):
    # try loading from system env
    DB_HOST = os.getenv('DB_HOST')
    DB_PORT = os.getenv('DB_PORT')
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_NAME = os.getenv('DB_NAME')

url = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(url)
with engine.connect() as conn:
    print('Ejecutando ALTER TABLE para agregar id_project si no existe...')
    try:
        conn.execute(text("ALTER TABLE rodaje ADD COLUMN IF NOT EXISTS id_project VARCHAR(20) COLLATE utf8mb4_unicode_ci"))
        conn.execute(text("ALTER TABLE rodaje ADD INDEX idx_rodaje_id_project (id_project)"))
        print('Completado')
    except Exception as e:
        print('Error:', e)
