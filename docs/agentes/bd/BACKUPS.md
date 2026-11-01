# Backups de la BD

BD: MySQL en Aiven (plan gratuito/básico: pocos backups propios, por eso estos backups locales son la red de seguridad).

## Herramienta usada
No se instaló `mysqldump`: se usa `scripts\backup_bd.py` (Python + pymysql del `.venv` del backend). No necesita permisos de administrador ni servidor MySQL local. Lee `DB_*` de `backend\api_usuarios\.env` (opcional `DB_SSL_CA`); nunca imprime la contraseña.

## Dónde
`backups\foccus_<BD>_<fecha>.sql.gz` (carpeta ignorada por git: contiene datos de usuarios; verificado con `git check-ignore`). Cada archivo trae `DROP TABLE IF EXISTS` + `CREATE TABLE` + `INSERT` por tabla.

## Crear y verificar
```
backend\api_usuarios\.venv\Scripts\python.exe scripts\backup_bd.py
backend\api_usuarios\.venv\Scripts\python.exe scripts\backup_bd.py --verificar backups\ARCHIVO.sql.gz
```
Verifica tamaño > 0, nº de tablas y filas por tabla contra la BD (el modo `--verificar` compara con la BD actual; si hubo cambios después, mostrará diferencias).

## Restaurar (DESTRUCTIVO)
```
backend\api_usuarios\.venv\Scripts\python.exe scripts\restaurar_bd.py backups\ARCHIVO.sql.gz [--bd-destino OTRA_BD]
```
Hace `DROP`/`CREATE`/`INSERT` de las tablas del backup (las tablas que no están en el archivo no se tocan) y pide escribir el nombre de la BD para confirmar. Para probar sin riesgo, restaura a una BD distinta con `--bd-destino`.

## Notas
- El servidor usa `ANSI_QUOTES`; el script fuerza `sql_mode` de sesión para que el DDL salga con backticks.
- Backups hechos: ver `MIGRACIONES.md`.
