import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend' / 'api_usuarios'))
from app.config import database
from sqlalchemy import text

engine = database.engine
with engine.connect() as conn:
    res = conn.execute(text("SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'escenas'"))
    rows = res.fetchall()
    print('Columns in escenas:')
    for r in rows:
        print(r[0], r[1], r[2], r[3])
