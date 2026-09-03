import jwt
import datetime
secret='6c7dace051ad83c8ecdf021cf5ee63a5414229741d0b278ab74f994dc97ba1f7'
payload={'id_user':1,'id_rol':1001,'exp':int((datetime.datetime.utcnow()+datetime.timedelta(days=7)).timestamp())}
print(jwt.encode(payload, secret, algorithm='HS256'))
