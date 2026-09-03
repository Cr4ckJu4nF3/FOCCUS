import urllib.request, json
url='http://127.0.0.1:8000/projects/create'
headers={'Content-Type':'application/json','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c2VyIjoxLCJpZF9yb2wiOjEwMDEsImV4cCI6MTc4OTA4OTA4NH0.YmhPGbKVVgVzKT2JApqrQiOiEno5GBe8Ulcn_cwqzjM'}
payload={"project_name":"Prueba API","formato_de_produccion":"cortometraje","genero":"drama","sinopsis":"Prueba","director":"Test","id_client":1,"id_user":1}
req=urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        print(r.status)
        print(r.read().decode('utf-8'))
except Exception as e:
    import traceback
    traceback.print_exc()
