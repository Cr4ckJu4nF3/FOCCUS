from app.config import database
from sqlalchemy import text

engine = database.engine
with engine.connect() as conn:
    print('Ejecutando ALTER TABLE para agregar id_project si no existe...')
    try:
        conn.execute(text("ALTER TABLE rodaje ADD COLUMN IF NOT EXISTS id_project VARCHAR(20) COLLATE utf8mb4_unicode_ci"))
        conn.execute(text("ALTER TABLE rodaje ADD INDEX IF NOT EXISTS idx_rodaje_id_project (id_project)"))
        print('Completado')
    except Exception as e:
        print('Error:', e)
