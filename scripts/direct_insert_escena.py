import sys,traceback
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend' / 'api_usuarios'))
from app.config.database import SessionLocal
from app.models.escena_model import Escena
from app.models.desglose_model import Desglose
from app.models.rodaje_model import Rodaje
from app.models.Guion import Guion

s = SessionLocal()
try:
    new = Escena(
        id_escena='esc9999',
        numero_de_escena='999',
        encabezado='Insert directa prueba',
        descripcion='desc',
        id_guion=4
    )
    s.add(new)
    s.commit()
    print('Insert OK')
except Exception as e:
    print('Exception during insert:')
    traceback.print_exc()
    s.rollback()
finally:
    s.close()
