from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT / 'backend' / 'api_usuarios'))
from app.config import database
from sqlalchemy import text
engine=database.engine
with engine.connect() as conn:
    res=conn.execute(text("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='personajes'"))
    print('personajes exists:', res.scalar())
