"""Atajo para restaurar un backup: python scripts/restaurar_bd.py ARCHIVO.sql.gz [--bd-destino BD]

Es destructivo sobre las tablas del backup; pide confirmacion escribiendo el nombre de la BD.
Ver scripts/backup_bd.py --help.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import backup_bd  # noqa: E402

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.argv = [sys.argv[0], "--restaurar"] + sys.argv[1:]
    backup_bd.main()
