from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT / 'backend' / 'api_usuarios'))
from app.config import database
from sqlalchemy import text
engine=database.engine
with engine.connect() as conn:
    res=conn.execute(text("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='desglose'"))
    for r in res.fetchall():
        print(r)
