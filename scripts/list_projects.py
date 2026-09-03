import urllib.request
req=urllib.request.Request('http://127.0.0.1:8000/users/1/projects', headers={'Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c2VyIjoxLCJpZF9yb2wiOjEwMDEsImV4cCI6MTc4OTA4OTA4NH0.YmhPGbKVVgVzKT2JApqrQiOiEno5GBe8Ulcn_cwqzjM'})
import urllib.error
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        print(r.status)
        print(r.read().decode())
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode())
except Exception as e:
    print('ERR', e)
