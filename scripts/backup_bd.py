"""Backup y restauracion de la BD MySQL de FOCCUS (Aiven) sin necesitar mysqldump.

Lee DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME de backend/api_usuarios/.env
(opcional: DB_SSL_CA = ruta al certificado CA de Aiven). Nunca imprime la contrasena.
Conecta igual que app/config/database.py (pymysql); si hay DB_SSL_CA lo usa.

Uso (con el venv del backend):
  python scripts/backup_bd.py                      # crea backup en backups/ y lo verifica
  python scripts/backup_bd.py --verificar ARCHIVO  # compara un backup con la BD actual
  python scripts/backup_bd.py --restaurar ARCHIVO [--bd-destino OTRA_BD] [--si-estoy-seguro]
      # RESTAURAR ES DESTRUCTIVO: hace DROP TABLE de las tablas del backup y las recrea.
      # Pide escribir el nombre de la BD destino para confirmar.

Formato: backups/foccus_<BD>_<YYYYmmdd_HHMMSS>.sql.gz (esquema + datos, una sentencia
por bloque separado por '-- @@STMT@@'). La carpeta backups/ esta ignorada por git.
"""
import argparse
import datetime
import gzip
import os
import sys

import pymysql
from dotenv import load_dotenv

RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
BACKUPS = os.path.join(RAIZ, "backups")
SEP = "-- @@STMT@@"
LOTE = 500


def conectar(bd=None):
    load_dotenv(os.path.join(RAIZ, "backend", "api_usuarios", ".env"))
    kw = dict(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT") or 3306),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=bd or os.getenv("DB_NAME"),
        charset="utf8mb4",
        connect_timeout=20,
        read_timeout=600,
        write_timeout=600,
        autocommit=False,
        # Evita ANSI_QUOTES (el servidor lo usa) para que el DDL salga con `backticks`
        init_command="SET SESSION sql_mode='NO_ENGINE_SUBSTITUTION'",
    )
    ca = os.getenv("DB_SSL_CA")
    if ca:
        kw["ssl"] = {"ca": ca}
    return pymysql.connect(**kw)


def tablas(cur):
    cur.execute("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
    return [r[0] for r in cur.fetchall()]


def conteos(cur):
    out = {}
    for t in tablas(cur):
        cur.execute(f"SELECT COUNT(*) FROM `{t}`")
        out[t] = cur.fetchone()[0]
    return out


def crear_backup():
    os.makedirs(BACKUPS, exist_ok=True)
    con = conectar()
    nombre_bd = os.getenv("DB_NAME")
    ruta = os.path.join(BACKUPS, f"foccus_{nombre_bd}_{datetime.datetime.now():%Y%m%d_%H%M%S}.sql.gz")
    cur = con.cursor()
    try:
        # Lectura consistente entre tablas
        cur.execute("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        cur.execute("START TRANSACTION WITH CONSISTENT SNAPSHOT")
        lista = tablas(cur)
        esperado = {}
        with gzip.open(ruta, "wt", encoding="utf-8", newline="\n") as f:
            f.write(f"-- Backup FOCCUS BD={nombre_bd} fecha={datetime.datetime.now().isoformat()}\n")
            f.write("SET FOREIGN_KEY_CHECKS=0;\n" + SEP + "\n")
            f.write("SET NAMES utf8mb4;\n" + SEP + "\n")
            for t in lista:
                cur.execute(f"SHOW CREATE TABLE `{t}`")
                ddl = cur.fetchone()[1]
                f.write(f"DROP TABLE IF EXISTS `{t}`;\n{SEP}\n{ddl};\n{SEP}\n")
                cur.execute(f"SELECT * FROM `{t}`")
                n = 0
                while True:
                    filas = cur.fetchmany(LOTE)
                    if not filas:
                        break
                    vals = ",\n".join("(" + ",".join(con.literal(v) for v in fila) + ")" for fila in filas)
                    f.write(f"INSERT INTO `{t}` VALUES\n{vals};\n{SEP}\n")
                    n += len(filas)
                esperado[t] = n
            f.write("SET FOREIGN_KEY_CHECKS=1;\n")
        con.rollback()
    finally:
        con.close()
    print(f"Backup creado: {ruta}")
    verificar(ruta, esperado)
    return ruta


def leer_backup(ruta):
    """Devuelve (tablas_en_archivo, filas_por_tabla) contando sin ejecutar."""
    creadas, filas, actual = [], {}, None
    with gzip.open(ruta, "rt", encoding="utf-8") as f:
        for linea in f:
            if linea.startswith("CREATE TABLE `"):
                actual = linea.split("`")[1]
                creadas.append(actual)
                filas[actual] = 0
            elif linea.startswith("INSERT INTO `"):
                actual = linea.split("`")[1]
            elif linea.startswith("(") and actual:
                filas[actual] += 1
    return creadas, filas


def verificar(ruta, esperado=None):
    if not os.path.isfile(ruta) or os.path.getsize(ruta) == 0:
        sys.exit(f"ERROR: backup vacio o inexistente: {ruta}")
    creadas, filas = leer_backup(ruta)
    if esperado is None:
        con = conectar()
        try:
            esperado = conteos(con.cursor())
        finally:
            con.close()
    ok = True
    print(f"Tamano: {os.path.getsize(ruta):,} bytes | tablas en archivo: {len(creadas)} | tablas en BD: {len(esperado)}")
    for t, n in esperado.items():
        en_archivo = filas.get(t)
        marca = "OK" if en_archivo == n else "DIFERENTE"
        if en_archivo != n:
            ok = False
        print(f"  {t}: BD={n} archivo={en_archivo} {marca}")
    if set(creadas) != set(esperado):
        ok = False
        print("  ERROR: el conjunto de tablas no coincide")
    print(f"Total filas en archivo: {sum(filas.values())}")
    if not ok:
        sys.exit("VERIFICACION FALLIDA (si compara con la BD actual, puede haber cambios posteriores al backup)")
    print("VERIFICACION OK")


def restaurar(ruta, bd_destino, si_seguro):
    if not os.path.isfile(ruta) or os.path.getsize(ruta) == 0:
        sys.exit("ERROR: archivo de backup invalido")
    load_dotenv(os.path.join(RAIZ, "backend", "api_usuarios", ".env"))
    destino = bd_destino or os.getenv("DB_NAME")
    print(f"RESTAURAR sobrescribe (DROP/CREATE/INSERT) las tablas del backup en la BD '{destino}'.")
    if not si_seguro:
        resp = input(f"Escribe el nombre de la BD ({destino}) para confirmar: ").strip()
        if resp != destino:
            sys.exit("Cancelado: no coincide.")
    con = conectar(destino)
    cur = con.cursor()
    n = 0
    try:
        with gzip.open(ruta, "rt", encoding="utf-8") as f:
            for bloque in f.read().split(SEP + "\n"):
                sql = "\n".join(l for l in bloque.splitlines() if not l.startswith("-- Backup")).strip()
                if sql:
                    cur.execute(sql)
                    n += 1
        con.commit()
    finally:
        con.close()
    print(f"Restauracion terminada: {n} sentencias.")
    con = conectar(destino)
    try:
        _, filas = leer_backup(ruta)
        reales = conteos(con.cursor())
    finally:
        con.close()
    malo = [t for t, v in filas.items() if reales.get(t) != v]
    print("Verificacion post-restauracion:", "OK" if not malo else f"DIFERENCIAS en {malo}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--verificar", metavar="ARCHIVO")
    ap.add_argument("--restaurar", metavar="ARCHIVO")
    ap.add_argument("--bd-destino")
    ap.add_argument("--si-estoy-seguro", action="store_true", help="omite la pregunta (solo uso consciente)")
    a = ap.parse_args()
    if a.restaurar:
        restaurar(a.restaurar, a.bd_destino, a.si_estoy_seguro)
    elif a.verificar:
        verificar(a.verificar)
    else:
        crear_backup()


if __name__ == "__main__":
    main()
