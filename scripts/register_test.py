import sys
from pathlib import Path
import json
import urllib.request
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend' / 'api_usuarios'))

url = 'http://localhost:8000/register'
payload = {
    "razon_social": "ACME Films",
    "representante_legal": "Juan Perez",
    "email_empresa": "empresa@example.com",
    "document": "900123456",
    "id_document": "NIT",
    "telephone": "555-1234",
    "number_cellphone": "+34123456789",
    "nombre": "Admin",
    "apellido": "User",
    "mail": "admin@example.com",
    "msisdn": "+34123456789",
    "contrasena": "Secret123!"
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    print(resp.status)
    print(resp.read().decode('utf-8'))
