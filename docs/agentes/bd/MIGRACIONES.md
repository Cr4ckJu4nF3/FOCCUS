# Registro de migraciones

## 2026-11-01 — Códigos públicos (`codigos_contador`, `codigos_entidad`)
- **Tipo:** aditiva (2 tablas nuevas + backfill). No modifica tablas existentes.
- **Backup previo:** `backups\foccus_foccus_20261101_183614.sql.gz` (14.631 bytes, 22 tablas, 504 filas, verificado). Backup posterior: `foccus_foccus_20261101_183911.sql.gz` (24 tablas).
- **Script:** `scripts\migrar_codigos.py` (`--dry-run` por defecto, `--apply`; idempotente, probado dos veces).
- **Antes:** 22 tablas, sin códigos. **Después:** 24 tablas, 82 códigos y 16 contadores.
  PRO 2, GUI 8, VGU 8, ESC 35, PER 11, LOC 4, OBJ 3, VES 1, DRO 10. Duplicados 0, formato inválido 0.
- **Prueba de punta a punta (uvicorn :8010):** `buscar-codigo` 200 admin / 403 miembro; listados con `codigo` solo para admin; un personaje nuevo recibió `PER-003` (consecutivo). El registro de prueba (`psj0012`) y su fila de código se eliminaron; el contador queda en 3 (los números no se reutilizan).
- **Corrección en el script:** `with db.begin()` fallaba (transacción ya iniciada); ahora usa `commit/rollback`.
- **Reversa:** `DROP TABLE codigos_entidad; DROP TABLE codigos_contador;` (nada más depende de ellas en los datos; el código del backend ya tolera su ausencia solo si se revierte el commit del backend) o restaurar el backup previo (`scripts\restaurar_bd.py`, que no toca tablas ausentes del archivo).
