import sys
from pathlib import Path
# Asegurar que el paquete 'app' sea importable
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend' / 'api_usuarios'))
from app.config import database
from sqlalchemy import text

engine = database.engine
with engine.connect() as conn:
    print('Ejecutando ALTER TABLE para agregar id_project si no existe...')
    try:
        # MySQL may not support ADD COLUMN IF NOT EXISTS on older versions.
        res = conn.execute(text("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rodaje' AND COLUMN_NAME = 'id_project'"))
        exists = res.scalar() or 0
        if exists:
            print('La columna id_project ya existe, nada que hacer')
        else:
            conn.execute(text("ALTER TABLE rodaje ADD COLUMN id_project VARCHAR(20) COLLATE utf8mb4_unicode_ci"))
            try:
                conn.execute(text("CREATE INDEX idx_rodaje_id_project ON rodaje (id_project)"))
            except Exception:
                pass
            print('Columna agregada')
        # Asegurarse de que las columnas esperadas por el modelo existan
        expected_columns = {
            'nombre': "ALTER TABLE rodaje ADD COLUMN nombre VARCHAR(120)",
            'descripcion': "ALTER TABLE rodaje ADD COLUMN descripcion TEXT",
            'fecha_inicio': "ALTER TABLE rodaje ADD COLUMN fecha_inicio DATE",
            'fecha_fin': "ALTER TABLE rodaje ADD COLUMN fecha_fin DATE",
            'locacion': "ALTER TABLE rodaje ADD COLUMN locacion VARCHAR(255)",
            'estado': "ALTER TABLE rodaje ADD COLUMN estado VARCHAR(30) DEFAULT 'Pendiente'",
            'archivo': "ALTER TABLE rodaje ADD COLUMN archivo VARCHAR(255)",
            'fecha_creacion': "ALTER TABLE rodaje ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP"
        }

        for col, stmt in expected_columns.items():
            res = conn.execute(text(f"SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rodaje' AND COLUMN_NAME = '{col}'"))
            exists = res.scalar() or 0
            if exists:
                print(f"Columna {col} ya existe")
            else:
                try:
                    conn.execute(text(stmt))
                    print(f"Columna {col} agregada")
                except Exception as e:
                    print(f"Error agregando {col}:", e)
    except Exception as e:
        print('Error:', e)
