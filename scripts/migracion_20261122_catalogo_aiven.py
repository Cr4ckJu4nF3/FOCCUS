"""Catalogo de bloques: dry-run por defecto; --apply solo tras backup y prueba local.

--fixtures usa exclusivamente MySQL temporal sin red y datos ficticios.
No se muestran credenciales, contenidos de backups ni filas de usuarios.
"""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import time
import uuid

import pymysql
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "backend" / "api_usuarios" / ".env"
BACKUPS = ROOT / "backups"
IMAGE = "mysql:8.4"
SOCKET = "/var/run/mysqld/mysqld.sock"
SCHEMA = "foccus"
UNIQUE = "uq_catalogo_bloques_proyecto_tipo_hash"
FK = "fk_catalogo_bloques_proyecto"
CHECK = "ck_catalogo_bloques_tipo"

DDL = """CREATE TABLE catalogo_bloques (
  id_bloque BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_project VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  tipo VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  html LONGTEXT CHARACTER SET utf8mb4 NOT NULL,
  html_sha256 BINARY(32) NOT NULL,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id_bloque),
  UNIQUE KEY uq_catalogo_bloques_proyecto_tipo_hash (id_project, tipo, html_sha256),
  CONSTRAINT ck_catalogo_bloques_tipo CHECK (tipo IN ('accion','dialogo','parentesis','transicion')),
  CONSTRAINT fk_catalogo_bloques_proyecto FOREIGN KEY (id_project)
    REFERENCES projects (id_project) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4"""


class Stop(Exception):
    pass


def require(condition, label):
    if not condition:
        raise Stop(label)


def ident(value):
    return "`" + value.replace("`", "``") + "`"


def docker(args, input_data=None, timeout=120):
    p = subprocess.run(["docker"] + args, input=input_data, stdout=subprocess.PIPE,
                       stderr=subprocess.DEVNULL, timeout=timeout)
    require(p.returncode == 0, "comando Docker/MySQL local")
    return p.stdout


class Local:
    """MySQL desechable sin red; nunca usa un socket del host."""
    def __init__(self):
        self.container = None

    def __enter__(self):
        self.container = docker([
            "run", "--detach", "--network", "none", "--tmpfs", "/var/lib/mysql:rw,size=768m",
            "--env", "MYSQL_ALLOW_EMPTY_PASSWORD=yes", IMAGE, "--skip-log-bin",
            "--innodb-buffer-pool-size=64M", "--innodb-redo-log-capacity=32M",
            "--performance-schema=OFF", "--max-connections=10",
        ]).decode().strip()
        try:
            consecutive = 0
            for _ in range(120):
                p = subprocess.run(
                    ["docker", "exec", self.container, "mysql", "-uroot", "--protocol=SOCKET",
                     "--socket=" + SOCKET, "--batch", "--skip-column-names", "-e",
                     "SELECT @@GLOBAL.skip_networking"], stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL, timeout=5,
                )
                # El inicializador temporal tiene skip_networking=1. No usarlo.
                consecutive = consecutive + 1 if p.returncode == 0 and p.stdout.strip() == b"0" else 0
                if consecutive >= 2:
                    version = self.query(None, "SELECT VERSION()")
                    require(len(version) == 1 and re.match(r"^8\.4\.", version[0]), "version MySQL local")
                    return self
                time.sleep(1)
            raise Stop("servidor definitivo MySQL local no disponible")
        except Exception:
            self.__exit__(None, None, None)
            raise

    def __exit__(self, _type, _value, _trace):
        if self.container:
            container, self.container = self.container, None
            docker(["rm", "-f", "-v", container])

    def query(self, schema, sql):
        command = ["exec", "-i", self.container, "mysql", "-uroot", "--protocol=SOCKET",
                   "--socket=" + SOCKET, "--default-character-set=utf8mb4", "--batch",
                   "--raw", "--skip-column-names"]
        if schema:
            command.append(schema)
        prefix = ("SET SESSION sql_mode='NO_ENGINE_SUBSTITUTION';SET SESSION time_zone='+00:00';"
                  "SET SESSION information_schema_stats_expiry=0;")
        result = docker(command, (prefix + sql + ";").encode("utf-8"), timeout=600)
        return result.decode("utf-8").splitlines()

    def restore(self, schema, path):
        command = ["docker", "exec", "-i", self.container, "mysql", "-uroot",
                   "--protocol=SOCKET", "--socket=" + SOCKET, "--default-character-set=utf8mb4",
                   "--binary-mode", schema]
        p = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            with gzip.open(path, "rb") as stream:
                shutil.copyfileobj(stream, p.stdin)
            p.stdin.close()
            require(p.wait(timeout=600) == 0, "importacion MySQL local")
        finally:
            if p.poll() is None:
                p.kill()
                p.wait()


class Cloud:
    def __init__(self, ca):
        require(not any(k.startswith("DB_") for k in os.environ), "variables DB heredadas")
        cfg = dotenv_values(ENV_FILE)
        require(all(cfg.get(k) for k in ("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME")),
                "configuracion incompleta")
        require(cfg["DB_NAME"] == SCHEMA, "nombre de BD distinto")
        require(cfg["DB_HOST"].lower().endswith(".aivencloud.com"), "endpoint no Aiven")
        context = ssl.create_default_context(cafile=str(ca))
        require(context.check_hostname and context.verify_mode == ssl.CERT_REQUIRED, "TLS no autenticado")
        self.db = pymysql.connect(host=cfg["DB_HOST"], port=int(cfg["DB_PORT"]), user=cfg["DB_USER"],
                                  password=cfg["DB_PASSWORD"], database=SCHEMA, charset="utf8mb4",
                                  ssl=context, connect_timeout=20, read_timeout=600, write_timeout=600,
                                  autocommit=False)
        require(bool(self.db._sock.getpeercert()), "certificado del servidor")
        with self.db.cursor() as cur:
            cur.execute("SET SESSION sql_mode='NO_ENGINE_SUBSTITUTION'")
            cur.execute("SET SESSION time_zone='+00:00'")
            cur.execute("SET SESSION information_schema_stats_expiry=0")
            cur.execute("SELECT DATABASE()")
            require(cur.fetchone()[0] == SCHEMA, "BD efectiva distinta")

    def query(self, sql, args=None):
        with self.db.cursor() as cur:
            cur.execute(sql, args)
            return [row[0] for row in cur.fetchall()]

    def snapshot(self):
        self.db.rollback()
        with self.db.cursor() as cur:
            cur.execute("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ")
            cur.execute("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY")

    def close(self):
        self.db.close()


# JSON_ARRAY evita interpretar separadores presentes en nombres y comentarios.
# Solo se comparan metadatos; no se imprimen.
META = {
    "schema": """SELECT JSON_ARRAY(DEFAULT_CHARACTER_SET_NAME,DEFAULT_COLLATION_NAME)
       FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=DATABASE()""",
    "tables": """SELECT JSON_ARRAY(TABLE_NAME,TABLE_TYPE,ENGINE,ROW_FORMAT,TABLE_COLLATION,
       CREATE_OPTIONS,TABLE_COMMENT,AUTO_INCREMENT)
       FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME""",
    "columns": """SELECT JSON_ARRAY(TABLE_NAME,ORDINAL_POSITION,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,
       COLUMN_DEFAULT,EXTRA,CHARACTER_SET_NAME,COLLATION_NAME,CHARACTER_MAXIMUM_LENGTH,
       NUMERIC_PRECISION,NUMERIC_SCALE,DATETIME_PRECISION,GENERATION_EXPRESSION,COLUMN_COMMENT)
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION""",
    "indexes": """SELECT JSON_ARRAY(TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART,
       COLLATION,INDEX_TYPE,IS_VISIBLE,EXPRESSION,INDEX_COMMENT)
       FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
       ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX""",
    "constraints": """SELECT JSON_ARRAY(TABLE_NAME,CONSTRAINT_NAME,CONSTRAINT_TYPE,ENFORCED)
       FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE()
       ORDER BY TABLE_NAME,CONSTRAINT_NAME""",
    "keys": """SELECT JSON_ARRAY(TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION,COLUMN_NAME,
       POSITION_IN_UNIQUE_CONSTRAINT,IF(REFERENCED_TABLE_SCHEMA=DATABASE(),'$self',REFERENCED_TABLE_SCHEMA),
       REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME)
       FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE()
       ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION""",
    "references": """SELECT JSON_ARRAY(TABLE_NAME,CONSTRAINT_NAME,
       IF(UNIQUE_CONSTRAINT_SCHEMA=DATABASE(),'$self',UNIQUE_CONSTRAINT_SCHEMA),
       UNIQUE_CONSTRAINT_NAME,MATCH_OPTION,UPDATE_RULE,DELETE_RULE,REFERENCED_TABLE_NAME)
       FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
       ORDER BY TABLE_NAME,CONSTRAINT_NAME""",
    "checks": """SELECT JSON_ARRAY(t.TABLE_NAME,t.CONSTRAINT_NAME,c.CHECK_CLAUSE)
       FROM information_schema.TABLE_CONSTRAINTS t
       JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA
       AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME
       WHERE t.TABLE_SCHEMA=DATABASE() AND t.CONSTRAINT_TYPE='CHECK'
       ORDER BY t.TABLE_NAME,t.CONSTRAINT_NAME""",
}


def metadata(query):
    # En tablas InnoDB recien creadas el contador puede aparecer NULL hasta
    # que se abre la tabla. SHOW CREATE solo consulta estructura y lo inicializa.
    tables = query("""SELECT TABLE_NAME FROM information_schema.TABLES
                      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME""")
    for table in tables:
        query("SHOW CREATE TABLE " + ident(table))
    return {name: [json.loads(row) for row in query(sql)] for name, sql in META.items()}


def table_info(meta):
    tables = [row[0] for row in meta["tables"]]
    columns = {t: [] for t in tables}
    for row in meta["columns"]:
        require(not row[13], "columna generada no admitida")
        columns[row[0]].append(row[2])
    require(all(columns.values()), "tabla sin columnas visibles")
    return tables, columns


def hash_query(table, columns):
    pieces = ["IF(" + ident(c) + " IS NULL,'N;',CONCAT('V',LENGTH(HEX(" + ident(c) +
              ")),':',HEX(" + ident(c) + "),';'))" for c in columns]
    return "SELECT SHA2(CONCAT(" + ",".join(pieces) + "),256) FROM " + ident(table)


def signatures(query, tables, columns):
    result = {}
    for table in tables:
        inner = hash_query(table, columns[table]).replace(" FROM ", " AS h FROM ", 1)
        parts = [
            "CAST(COALESCE(SUM(CAST(CONV(SUBSTRING(h," + str(start) +
            ",16),16,10) AS DECIMAL(20,0))),0) AS CHAR)"
            for start in (1, 17, 33, 49)
        ]
        sql = "SELECT JSON_ARRAY(COUNT(*),COUNT(h)," + ",".join(parts) + ") FROM (" + inner + ") AS huellas"
        row = query(sql)
        require(len(row) == 1, "agregado de huellas")
        value = json.loads(row[0])
        require(value[0] == value[1], "huella nula")
        result[table] = tuple(value)
    return result


def foreign_key_violations(query, meta):
    groups = {}
    for row in meta["keys"]:
        if row[5] is not None:
            require(row[5] == "$self", "FK hacia otra BD")
            groups.setdefault((row[0], row[1], row[6]), []).append(row)
    total = 0
    for (child, _constraint, parent), rows in groups.items():
        rows.sort(key=lambda row: row[2])
        on = " AND ".join("c." + ident(row[3]) + "=p." + ident(row[7]) for row in rows)
        not_null = " AND ".join("c." + ident(row[3]) + " IS NOT NULL" for row in rows)
        sql = ("SELECT COUNT(*) FROM " + ident(child) + " AS c LEFT JOIN " + ident(parent) +
               " AS p ON " + on + " WHERE " + not_null + " AND p." + ident(rows[0][7]) + " IS NULL")
        values = query(sql)
        require(len(values) == 1, "conteo FK")
        total += int(values[0])
    return total


def local_database(local, schema):
    local.query(None, "CREATE DATABASE " + ident(schema) + " CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci")


def fixture():
    with Local() as local:
        local_database(local, "fixture_source")
        local_database(local, "fixture_restore")
        query = lambda sql: local.query("fixture_source", sql)
        restored = lambda sql: local.query("fixture_restore", sql)
        query("CREATE TABLE projects (id_project VARCHAR(20) CHARACTER SET utf8mb4 "
              "COLLATE utf8mb4_general_ci NOT NULL PRIMARY KEY, prueba TEXT) ENGINE=InnoDB")
        query(DDL)
        query("CREATE TABLE fixture_ceros (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, texto TEXT) ENGINE=InnoDB")
        query("CREATE TABLE fixture_vacia (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY) ENGINE=InnoDB")
        raw_counter = query("""SELECT COALESCE(CAST(AUTO_INCREMENT AS CHAR),'NULL')
             FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fixture_vacia'""")
        require(raw_counter == ["NULL"], "fixture contador antes de inicializar")

        def seed(run):
            run("SET SESSION sql_mode='NO_ENGINE_SUBSTITUTION,NO_AUTO_VALUE_ON_ZERO'; "
                "INSERT INTO fixture_ceros VALUES (0,'ficticio')")
            run("INSERT INTO projects VALUES ('ficticio','texto ficticio')")
            run("INSERT INTO catalogo_bloques (id_project,tipo,html,html_sha256,creado_en) "
                "VALUES ('ficticio','accion','<p>ficticio</p>',UNHEX(SHA2('<p>ficticio</p>',256)),"
                "'2020-01-02 03:04:05.123456')")

        # Llenar deliberadamente la cache de estadisticas antes de insertar.
        query("SET SESSION information_schema_stats_expiry=86400; SELECT AUTO_INCREMENT "
              "FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='catalogo_bloques'")
        seed(query)
        base = metadata(query)
        require([r[7] for r in base["tables"] if r[0] == "fixture_vacia"] == [1],
                "contador de tabla vacia no inicializado")
        require([r[7] for r in base["tables"] if r[0] == "catalogo_bloques"] == [2],
                "estadisticas AUTO_INCREMENT no actualizadas")
        create = "\n".join(query("SHOW CREATE TABLE catalogo_bloques"))
        verify_catalog(query, create, "fixture_source", expect_empty=False)
        tables, columns = table_info(base)
        source_hashes = signatures(query, tables, columns)
        require(foreign_key_violations(query, base) == 0, "FK fixture origen")
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "fixture.sql.gz"
            with gzip.open(path, "wt", encoding="utf-8", newline="\n") as out:
                out.write("SET SESSION sql_mode='NO_ENGINE_SUBSTITUTION,NO_AUTO_VALUE_ON_ZERO';SET SESSION time_zone='+00:00';"
                          "SET NAMES utf8mb4;SET FOREIGN_KEY_CHECKS=0;\n")
                for table in tables:
                    raw = query("SHOW CREATE TABLE " + ident(table))
                    require(raw and "\t" in raw[0], "SHOW CREATE ficticio")
                    # --raw representa el DDL en varias lineas.
                    out.write(raw[0].split("\t", 1)[1] + "\n" + "\n".join(raw[1:]) + ";\n")
                out.write("INSERT INTO projects VALUES ('ficticio','texto ficticio');\n")
                out.write("INSERT INTO fixture_ceros VALUES (0,'ficticio');\n")
                out.write("INSERT INTO catalogo_bloques VALUES (1,'ficticio','accion','<p>ficticio</p>',"
                          "UNHEX(SHA2('<p>ficticio</p>',256)),'2020-01-02 03:04:05.123456');\n"
                          "SET FOREIGN_KEY_CHECKS=1;\n")
            local.restore("fixture_restore", path)
        require(metadata(restored) == base, "metadatos ficticios restaurados")
        require(signatures(restored, tables, columns) == source_hashes, "filas ficticias restauradas")
        require(foreign_key_violations(restored, base) == 0, "FK fixture restaurado")
        mutations = [
            ("tipo", "columns", DDL.replace("VARCHAR(16)", "VARCHAR(17)")),
            ("collation", "columns", DDL.replace("html LONGTEXT CHARACTER SET utf8mb4 NOT NULL",
                                                "html LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL")),
            ("indice", "indexes", DDL.replace(
                "  UNIQUE KEY uq_catalogo_bloques_proyecto_tipo_hash (id_project, tipo, html_sha256),\n", "")),
            ("fk", "references", DDL.replace(
                "  CONSTRAINT fk_catalogo_bloques_proyecto FOREIGN KEY (id_project)\n"
                "    REFERENCES projects (id_project) ON DELETE CASCADE\n", "").replace(
                "  CONSTRAINT ck_catalogo_bloques_tipo CHECK (tipo IN ('accion','dialogo','parentesis','transicion')),\n",
                "  CONSTRAINT ck_catalogo_bloques_tipo CHECK (tipo IN ('accion','dialogo','parentesis','transicion'))\n")),
            ("check", "checks", DDL.replace(
                "  CONSTRAINT ck_catalogo_bloques_tipo CHECK (tipo IN ('accion','dialogo','parentesis','transicion')),\n", "")),
        ]
        for label, category, changed_ddl in mutations:
            require(changed_ddl != DDL, "preparacion fixture " + label)
            schema = "fixture_" + label
            local_database(local, schema)
            changed = lambda sql: local.query(schema, sql)
            changed("CREATE TABLE projects (id_project VARCHAR(20) CHARACTER SET utf8mb4 "
                    "COLLATE utf8mb4_general_ci NOT NULL PRIMARY KEY, prueba TEXT) ENGINE=InnoDB")
            changed("CREATE TABLE fixture_ceros (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, texto TEXT) ENGINE=InnoDB")
            changed("CREATE TABLE fixture_vacia (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY) ENGINE=InnoDB")
            changed(changed_ddl)
            seed(changed)
            require(metadata(changed)[category] != base[category], "control negativo " + label)
        local_database(local, "fixture_contador")
        changed = lambda sql: local.query("fixture_contador", sql)
        changed("CREATE TABLE projects (id_project VARCHAR(20) CHARACTER SET utf8mb4 "
                "COLLATE utf8mb4_general_ci NOT NULL PRIMARY KEY, prueba TEXT) ENGINE=InnoDB")
        changed("CREATE TABLE fixture_ceros (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, texto TEXT) ENGINE=InnoDB")
        changed("CREATE TABLE fixture_vacia (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY) ENGINE=InnoDB")
        changed(DDL)
        seed(changed)
        require(metadata(changed) == base, "base del control de contador")
        changed("ALTER TABLE fixture_vacia AUTO_INCREMENT=7")
        require(metadata(changed)["tables"] != base["tables"], "control negativo contador")
        restored("UPDATE catalogo_bloques SET html='<p>cambiado</p>'")
        require(signatures(restored, tables, columns) != source_hashes, "control negativo datos")
        restored("SET FOREIGN_KEY_CHECKS=0; INSERT INTO catalogo_bloques "
                 "(id_project,tipo,html,html_sha256) VALUES ('huerfano','accion','ficticio',"
                 "UNHEX(SHA2('ficticio',256)))")
        require(foreign_key_violations(restored, base) == 1, "control negativo huerfano")
        print("Fixture OK: restauracion, tabla vacia, contador, id cero, tipos, collation, indice, FK, CHECK y huella; controles negativos.")


def preflight(cloud):
    q = cloud.query
    require(q("SELECT DATABASE()") == [SCHEMA], "BD efectiva")
    version = q("SELECT VERSION()")[0]
    require(re.match(r"^8\.4\.", version), "version MySQL")
    parent = [json.loads(x) for x in q("""SELECT JSON_ARRAY(COLUMN_TYPE,IS_NULLABLE,CHARACTER_SET_NAME,COLLATION_NAME)
                 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                 AND TABLE_NAME='projects' AND COLUMN_NAME='id_project'""")]
    require(parent == [["varchar(20)", "NO", "utf8mb4", "utf8mb4_general_ci"]], "columna padre")
    primary = [json.loads(x) for x in q("""SELECT JSON_ARRAY(COLUMN_NAME,NON_UNIQUE,SEQ_IN_INDEX,SUB_PART)
                 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
                 AND TABLE_NAME='projects' AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX""")]
    require(primary == [["id_project", 0, 1, None]], "clave padre")
    require(q("""SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
                 AND (TABLE_NAME='catalogo_bloques' OR TABLE_TYPE='VIEW')""") == [0], "catalogo o vistas")
    for table, field in (("TRIGGERS", "TRIGGER_SCHEMA"), ("ROUTINES", "ROUTINE_SCHEMA"),
                         ("EVENTS", "EVENT_SCHEMA")):
        require(q("SELECT COUNT(*) FROM information_schema." + table + " WHERE " + field + "=DATABASE()") == [0],
                "objetos adicionales")
    require(q("""SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
                 AND CONSTRAINT_NAME IN ('fk_catalogo_bloques_proyecto','ck_catalogo_bloques_tipo')""") == [0],
            "nombres de restricciones existentes")
    require(q("""SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE()
                 AND REFERENCED_TABLE_SCHEMA IS NOT NULL AND REFERENCED_TABLE_SCHEMA<>DATABASE()""") == [0],
            "referencia a otra BD")
    grantee = "CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',1)), '@', QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',-1)))"
    privileges = set(q("SELECT PRIVILEGE_TYPE FROM information_schema.USER_PRIVILEGES WHERE GRANTEE=" + grantee))
    privileges.update(q("SELECT PRIVILEGE_TYPE FROM information_schema.SCHEMA_PRIVILEGES WHERE TABLE_SCHEMA=DATABASE() AND GRANTEE=" + grantee))
    require({"SELECT", "CREATE", "REFERENCES", "TRIGGER", "EVENT", "SHOW VIEW",
             "CREATE ROUTINE", "ALTER ROUTINE", "EXECUTE"}.issubset(privileges), "permisos directos")
    require(q("SELECT CURRENT_ROLE()") == ["NONE"], "roles activos")
    m = metadata(q)
    require(m["schema"] == [["utf8mb4", "utf8mb4_general_ci"]], "collation del esquema")
    require(m["tables"] and all(row[1] == "BASE TABLE" and row[2] == "InnoDB" for row in m["tables"]),
            "tablas no InnoDB")
    require(any(row[0] == "projects" for row in m["tables"]), "projects")
    return version, m


def make_backup(cloud, meta):
    BACKUPS.mkdir(exist_ok=True)
    ignored = subprocess.run(["git", "check-ignore", "-q", str(BACKUPS / "test.sql.gz")], cwd=ROOT,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    require(ignored.returncode == 0, "backups no ignorados por git")
    tables, columns = table_info(meta)
    name = "catalogo_previo_" + time.strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:8] + ".sql.gz"
    path = BACKUPS / name
    print("Preparando backup local (aun no validado):", name)
    expected = signatures(cloud.query, tables, columns)
    with gzip.open(path, "xt", encoding="utf-8", newline="\n") as out:
        out.write("SET SESSION sql_mode='NO_ENGINE_SUBSTITUTION,NO_AUTO_VALUE_ON_ZERO';SET SESSION time_zone='+00:00';"
                  "SET NAMES utf8mb4;SET FOREIGN_KEY_CHECKS=0;\n")
        with cloud.db.cursor() as cur:
            for table in tables:
                cur.execute("SHOW CREATE TABLE " + ident(table))
                out.write(cur.fetchone()[1] + ";\n")
        for table in tables:
            with cloud.db.cursor(pymysql.cursors.SSCursor) as cur:
                cur.execute("SELECT * FROM " + ident(table))
                count = 0
                for row in cur:
                    values = ["X'" + bytes(v).hex() + "'" if isinstance(v, (bytes, bytearray))
                              else cloud.db.literal(v) for v in row]
                    out.write("INSERT INTO " + ident(table) + " VALUES (" + ",".join(values) + ");\n")
                    count += 1
                require(count == expected[table][0], "conteo durante backup")
        out.write("SET FOREIGN_KEY_CHECKS=1;\n")
    require(path.is_file() and path.stat().st_size > 0, "backup vacio")
    with gzip.open(path, "rb") as stream:
        while stream.read(1024 * 1024):
            pass
    return path, expected


def verify_restore(path, expected_meta, expected_hashes):
    tables, columns = table_info(expected_meta)
    with Local() as local:
        local_database(local, SCHEMA)
        local.restore(SCHEMA, path)
        query = lambda sql: local.query(SCHEMA, sql)
        actual_meta = metadata(query)
        for category in META:
            require(actual_meta[category] == expected_meta[category], "metadatos restaurados: " + category)
        require(signatures(query, tables, columns) == expected_hashes, "datos restaurados distintos")
        require(foreign_key_violations(query, actual_meta) == 0, "FK restauradas huerfanas")
    print("Backup restaurado y verificado en MySQL aislado: metadatos, conteos y huellas.")


def backup_digest(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.digest()


def existing_backup(path):
    require(not path.is_symlink() and path.is_file() and path.stat().st_size > 0, "backup existente")
    resolved = path.resolve()
    require(resolved.parent == BACKUPS.resolve() and resolved.name.endswith(".sql.gz"),
            "backup fuera de carpeta autorizada")
    ignored = subprocess.run(["git", "check-ignore", "-q", str(resolved)], cwd=ROOT,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    require(ignored.returncode == 0, "backup no ignorado por git")
    return resolved


def verify_catalog(q, ddl, schema=SCHEMA, expect_empty=True):
    require(q("SELECT DATABASE()") == [schema], "BD final")
    require(all(name in ddl for name in (UNIQUE, FK, CHECK)), "SHOW CREATE TABLE")
    meta = metadata(q)
    table = [row for row in meta["tables"] if row[0] == "catalogo_bloques"]
    require(len(table) == 1 and table[0][1] == "BASE TABLE" and table[0][2] == "InnoDB"
            and table[0][4].startswith("utf8mb4_"), "tabla InnoDB utf8mb4")
    cols = [row for row in meta["columns"] if row[0] == "catalogo_bloques"]
    require(len(cols) == 6, "columnas")
    require([(r[2], r[3], r[4]) for r in cols] == [
        ("id_bloque", "bigint unsigned", "NO"), ("id_project", "varchar(20)", "NO"),
        ("tipo", "varchar(16)", "NO"), ("html", "longtext", "NO"),
        ("html_sha256", "binary(32)", "NO"), ("creado_en", "datetime(6)", "NO")], "tipos")
    require("auto_increment" in cols[0][6], "autoincrement")
    require(cols[1][7:9] == ["utf8mb4", "utf8mb4_general_ci"], "collation FK")
    require(cols[2][7:9] == ["ascii", "ascii_bin"] and cols[3][7] == "utf8mb4", "collation columnas")
    require(str(cols[5][5]).lower() == "current_timestamp(6)", "default fecha")
    idx = [r for r in meta["indexes"] if r[0] == "catalogo_bloques"]
    require([(r[3], r[4], r[5]) for r in idx if r[1] == "PRIMARY" and r[2] == 0] ==
            [(1, "id_bloque", None)], "PK")
    require([(r[3], r[4], r[5]) for r in idx if r[1] == UNIQUE and r[2] == 0] ==
            [(1, "id_project", None), (2, "tipo", None), (3, "html_sha256", None)], "indice unico")
    keys = [r for r in meta["keys"] if r[0] == "catalogo_bloques" and r[1] == FK]
    require(len(keys) == 1 and keys[0][3:8] == ["id_project", 1, "$self", "projects", "id_project"], "FK columnas")
    refs = [r for r in meta["references"] if r[0] == "catalogo_bloques" and r[1] == FK]
    require(len(refs) == 1 and refs[0][5:8] == ["NO ACTION", "CASCADE", "projects"], "FK reglas")
    checks = [r for r in meta["checks"] if r[0] == "catalogo_bloques" and r[1] == CHECK]
    enforced = [r for r in meta["constraints"] if r[0] == "catalogo_bloques" and r[1] == CHECK]
    require(len(checks) == 1 and len(enforced) == 1 and enforced[0][3] == "YES", "CHECK activo")
    clause = re.sub(r"\s+", "", checks[0][2].lower().replace("`", "").replace("\\'", "'"))
    clause = re.sub(r"_(?:ascii|utf8mb4)(?=')", "", clause)
    require(clause.strip("()") == "tipoin('accion','dialogo','parentesis','transicion')".strip("()"), "CHECK valores")
    if expect_empty:
        require(q("SELECT COUNT(*) FROM catalogo_bloques") == [0], "catalogo no vacio")


def main():
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--dry-run", action="store_true")
    modes.add_argument("--fixtures", action="store_true")
    modes.add_argument("--apply", action="store_true")
    parser.add_argument("--ca", type=Path)
    parser.add_argument("--existing-backup", type=Path)
    args = parser.parse_args()
    phase = "fixture"
    cloud = None
    applied = False
    backup = None
    try:
        require(not args.existing_backup or args.apply, "backup existente requiere --apply")
        if args.fixtures:
            fixture()
            return 0
        require(args.ca and args.ca.is_file(), "CA ausente")
        if args.apply:
            fixture()
        phase = "conexion autenticada y preflight"
        cloud = Cloud(args.ca)
        existing = cloud.query("""SELECT COUNT(*) FROM information_schema.TABLES
                                  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='catalogo_bloques'""")
        if existing == [1]:
            with cloud.db.cursor() as cur:
                cur.execute("SHOW CREATE TABLE catalogo_bloques")
                catalog_ddl = cur.fetchone()[1]
            verify_catalog(cloud.query, catalog_ddl, expect_empty=False)
            print("TLS CA/hostname OK; BD=foccus; catalogo compatible ya existe: sin cambios.")
            return 0
        version, initial = preflight(cloud)
        print("TLS CA/hostname OK; BD=foccus; MySQL=" + version)
        print("Dry-run: %d tablas existentes; crear solo catalogo, sin backfill." % len(initial["tables"]))
        if not args.apply:
            return 0
        phase = "backup consistente"
        cloud.snapshot()
        _, snapshot_meta = preflight(cloud)
        require(snapshot_meta == initial, "estructura cambio antes de backup")
        backup_checksum = None
        tables, columns = table_info(snapshot_meta)
        require(foreign_key_violations(cloud.query, snapshot_meta) == 0, "FK origen huerfanas")
        if args.existing_backup:
            backup = existing_backup(args.existing_backup)
            backup_checksum = backup_digest(backup)
            expected = signatures(cloud.query, tables, columns)
            print("Backup existente (no se crea uno nuevo):", backup.name)
        else:
            backup, expected = make_backup(cloud, snapshot_meta)
        require(metadata(cloud.query) == snapshot_meta, "estructura cambio durante backup")
        cloud.db.rollback()
        print("Origen: filas agregadas:", sum(x[0] for x in expected.values()))
        phase = "restauracion local"
        verify_restore(backup, snapshot_meta, expected)
        phase = "preflight final"
        cloud.snapshot()
        _, final_meta = preflight(cloud)
        require(final_meta == snapshot_meta, "estructura cambio antes de DDL")
        require(signatures(cloud.query, tables, columns) == expected, "datos cambiaron antes de DDL")
        require(foreign_key_violations(cloud.query, final_meta) == 0, "FK origen huerfanas")
        if backup_checksum is not None:
            require(backup_digest(backup) == backup_checksum, "backup modificado durante verificacion")
        before = cloud.query("SELECT COUNT(*) FROM projects")[0]
        cloud.db.rollback()
        phase = "DDL"
        with cloud.db.cursor() as cur:
            cur.execute(DDL)
        applied = True
        phase = "verificacion posterior"
        with cloud.db.cursor() as cur:
            cur.execute("SHOW CREATE TABLE catalogo_bloques")
            catalog_ddl = cur.fetchone()[1]
        verify_catalog(cloud.query, catalog_ddl)
        after = cloud.query("SELECT COUNT(*) FROM projects")[0]
        print("Catalogo aplicado y verificado; proyectos antes/despues: %d/%d." % (before, after))
        return 0
    except Exception as exc:
        print("BLOQUEO en", phase, "clase:", type(exc).__name__)
        if isinstance(exc, Stop):
            print("Motivo:", str(exc))
        print("DDL:", "ejecutado; verificacion incompleta" if applied else "no confirmado")
        if backup:
            print("Backup local:", backup.name)
        return 2
    finally:
        if cloud:
            cloud.close()


if __name__ == "__main__":
    sys.exit(main())
