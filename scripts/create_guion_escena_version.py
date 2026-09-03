import sys
import json
from pathlib import Path
import urllib.request
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c2VyIjoxMCwiaWRfcm9sIjoxMDAxLCJleHAiOjE3ODg1NTI5ODh9.0kdcMP1VR7WV9L9szOyeeh4n_XZLhfKiGPiV2fBDmqQ"
BASE = "http://localhost:8000"

def post_json(path, payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(BASE+path, data=data, headers={'Content-Type':'application/json','Authorization':f'Bearer {TOKEN}'})
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def post_form(path, formdata):
    data = urllib.parse.urlencode(formdata).encode('utf-8')
    req = urllib.request.Request(BASE+path, data=data, headers={'Content-Type':'application/x-www-form-urlencoded','Authorization':f'Bearer {TOKEN}'})
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

if __name__ == '__main__':
    # 1) crear guion
    guion_payload = {"nombre":"Test Guion","descripcion":"Guion para prueba continuidad","id_project":"proj0001"}
    try:
        res = post_json('/guiones', guion_payload)
    except Exception as e:
        if hasattr(e, 'read'):
            body = e.read().decode('utf-8')
            print(json.dumps({'error':'creating_guion','body':body}))
        else:
            print(json.dumps({'error':'creating_guion','exception':str(e)}))
        sys.exit(1)
    id_guion = res['data']['id_guion']

    # 2) crear escena
    escena_payload = {
        'id_guion': id_guion,
        'numero_de_escena': '1',
        'encabezado': 'Escena de prueba',
        'descripcion': 'Descripcion',
    }
    try:
        res2 = post_json('/escenas', escena_payload)
    except Exception as e:
        if hasattr(e, 'read'):
            body = e.read().decode('utf-8')
            print(json.dumps({'error':'creating_escena','body':body}))
        else:
            print(json.dumps({'error':'creating_escena','exception':str(e)}))
        sys.exit(1)
    id_escena = res2['data']['id_escena']

    # 3) crear version de continuidad
    try:
        res3 = post_form(f'/escenas/{id_escena}/versiones', {'comentario_cambio':'Primera version prueba'})
    except Exception as e:
        if hasattr(e, 'read'):
            body = e.read().decode('utf-8')
            print(json.dumps({'error':'creating_version','body':body}))
        else:
            print(json.dumps({'error':'creating_version','exception':str(e)}))
        sys.exit(1)
    id_escena_version = res3['data']['id_escena_version']

    print(json.dumps({'id_guion':id_guion,'id_escena':id_escena,'id_escena_version':id_escena_version}))
