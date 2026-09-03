import urllib.request, json
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c2VyIjoxMCwiaWRfcm9sIjoxMDAxLCJleHAiOjE3ODg1NTI5ODh9.0kdcMP1VR7WV9L9szOyeeh4n_XZLhfKiGPiV2fBDmqQ"
BASE = 'http://localhost:8000'
payload = {'id_guion':4,'numero_de_escena':'10','encabezado':'Prueba escena','descripcion':'desc'}
req = urllib.request.Request(BASE+'/escenas', data=json.dumps(payload).encode('utf-8'), headers={'Content-Type':'application/json','Authorization':f'Bearer {TOKEN}'})
try:
    with urllib.request.urlopen(req) as resp:
        print(resp.status)
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print('HTTPError', e.code)
    try:
        print(e.read().decode())
    except Exception as ex:
        print('no body')
except Exception as e:
    print('Error', e)
