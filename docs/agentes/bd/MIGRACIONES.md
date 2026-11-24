# Registro de migraciones

## 2026-11-22 — Catálogo aplicado en Aiven
- **Estado:** aplicada exclusivamente la creación de `catalogo_bloques` en
  `foccus` (MySQL 8.4.11), con TLS autenticado por CA y hostname. No hubo
  backfill, escritura de prueba ni modificación de tablas previas. Antes:
  24 tablas y 1.022 filas; después: 25 tablas, las mismas 1.022 filas
  agregadas en las tablas anteriores y cero en catálogo. Proyectos: 4/4.
- **Diagnóstico:** en `roles`, `INFORMATION_SCHEMA.TABLES.AUTO_INCREMENT`
  mostraba 1 en origen y NULL en el MySQL restaurado hasta abrir la tabla con
  `SHOW CREATE TABLE`. Tras ello ambos mostraron 1. Se reprodujo el comportamiento
  con una tabla vacía ficticia; el control negativo detectó un contador
  ficticio distinto. El comparador inicializa las tablas antes de consultar
  metadatos, sin ignorar diferencias de contador reales.
- **Backup usado:** `backups/catalogo_previo_20261122_094958_b3653f1b.sql.gz`
  (31.820 bytes, ignorado por Git). Se reutilizó sin crear otro backup; se
  restauró en MySQL 8.4.13 temporal sin red. Antes del DDL coincidieron
  estructura de 24 tablas, 1.022 filas agregadas, huellas SHA-256 agregadas
  por tabla y cero huérfanos FK; se repitió la comparación con el origen
  antes del DDL. Las huellas agregadas detectan diferencias con alta
  probabilidad, pero no son una comparación fila a fila ni una garantía
  matemática contra colisiones.
- **Otros dos backups:** `catalogo_previo_20261122_094304_b394367e.sql.gz`
  y `catalogo_previo_20261122_094600_d7a3d823.sql.gz` permanecen en
  `backups/`, no vacíos e ignorados; no se completó su verificación de
  integridad/restauración y no deben considerarse probados. No se creó
  ningún cuarto backup durante este seguimiento.
- **Contrato verificado:** InnoDB; `id_bloque` bigint unsigned PK
  autoincremental; `id_project` varchar(20) `utf8mb4_general_ci` con FK a
  `projects.id_project` y `ON DELETE CASCADE`; `tipo` varchar(16) `ascii_bin`;
  `html` longtext utf8mb4; `html_sha256` binary(32); `creado_en` datetime(6)
  con `CURRENT_TIMESTAMP(6)`. Único
  `uq_catalogo_bloques_proyecto_tipo_hash` en proyecto/tipo/hash y CHECK
  activo con los cuatro tipos. Tabla y `html`: `utf8mb4_0900_ai_ci`.
  `SHOW CREATE TABLE` y metadatos verificados; duplicados, tipos inválidos y
  huérfanos del catálogo: 0. Huérfanos FK agregados en el esquema: 0.
- **Pruebas:** `--fixtures` pasó con controles negativos de estructura,
  contador, huellas y FK; `--dry-run` posterior identificó la tabla
  compatible y no modificó nada. La ejecución usó `--apply
  --existing-backup <ARCHIVO> --ca <RUTA_CA>`; no se insertaron datos reales
  de prueba. No se verificó despliegue ni flujo HTTP en la aplicación.
- **Reversa:** desactivar primero el uso del catálogo y respaldar/exportar
  las fichas creadas. Eliminar la tabla requiere confirmación explícita y
  perdería esas fichas; restaurar el backup completo puede sobrescribir
  cambios posteriores. El backup anterior no contiene el catálogo y su
  restauración completa no equivale por sí sola a quitar la tabla nueva.

## 2026-11-22 — Catálogo: tres respaldos, migración detenida (histórico)
- **Estado final comprobado:** no aplicada. El dry-run posterior autenticó
  Aiven mediante CA y hostname, confirmó `foccus` y 24 tablas base; el
  catálogo seguía ausente. No se ejecutó el DDL ni se insertaron datos de
  prueba en Aiven. No aplica reversa.
- **Destino y preflight:** MySQL 8.4.11, `projects.id_project` es
  `varchar(20) NOT NULL`, PK completa y `utf8mb4_general_ci`. Se comprobaron
  privilegios directos y motores InnoDB. El DDL adaptado se probó en MySQL
  8.4.13 aislado; requiere una tabla, PK, índice único, FK y CHECK.
- **Socket:** se reprodujo la secuencia de MySQL temporal
  `skip_networking=1` → socket ausente → servidor definitivo
  `skip_networking=0`. El ejecutor espera dos comprobaciones consecutivas
  del servidor definitivo por el socket explícito dentro del contenedor.
- **Fixtures ficticios:** se comprobó la comparación semántica y controles
  negativos de tipo, colación, índice, FK y CHECK. Se reprodujeron
  estadísticas `AUTO_INCREMENT` obsoletas y la alteración de un ID cero al
  restaurar sin `NO_AUTO_VALUE_ON_ZERO`. Se ajustaron ambas sesiones para
  estadísticas frescas y el dump para preservar el cero; las pruebas
  completas pasaron dos veces consecutivas tras los ajustes. Esto no prueba
  que esos casos fueran la causa de la discrepancia observada en la nube.
- **Respaldos locales ignorados por Git:** tres gzip no vacíos y comprobados
  como gzip, con 1.022 filas exportadas cada uno:
  - `backups/catalogo_previo_20261122_094304_b394367e.sql.gz` (31.804 bytes).
  - `backups/catalogo_previo_20261122_094600_d7a3d823.sql.gz` (31.804 bytes).
  - `backups/catalogo_previo_20261122_094958_b3653f1b.sql.gz` (31.820 bytes).
  Cada importación local se detuvo al comparar metadatos de tablas; no se
  completó la comparación de huellas de filas. **Ninguno debe considerarse
  restauración verificada.** No se usaron estos backups para depuración.
- **Bloqueo pendiente:** la comparación semántica de la categoría `tables`
  sigue detectando diferencias tras los ajustes. Su causa concreta no se
  identificó con fixtures; no se debe omitir la comparación. El script
  `scripts/migracion_20261122_catalogo_aiven.py` permanece en dry-run por
  defecto y detiene `--apply` si la restauración no coincide.
- **Comandos probados:** `python scripts/migracion_20261122_catalogo_aiven.py
  --fixtures` y el mismo script con `--dry-run --ca <RUTA_CA>` pasaron;
  `--apply --ca <RUTA_CA>` se detuvo antes del DDL en los tres intentos.
  Continuar requiere reproducir y corregir la discrepancia restante con
  datos ficticios y, después, generar otro backup fresco y verificar su
  restauración antes de aplicar.

## 2026-11-22 — Diagnóstico aislado del restaurador de catálogo
- **Alcance:** solo datos ficticios en MySQL 8.4 temporal sin red. No se
  conectó a Aiven ni se usó un backup real.
- **Causa reproducida:** la importación terminó con código 0, pero la
  comparación literal de `SHOW CREATE TABLE` rechazó el resultado. En la
  columna ficticia `prueba`, MySQL añadió explícitamente
  `CHARACTER SET utf8mb4`; la colación y los metadatos de la columna eran
  iguales. El conteo y la huella de la fila ficticia también coincidieron.
- **Comprobación de corrección:** comparar metadatos en lugar de exigir
  igualdad textual aceptó este fixture; una modificación ficticia del tipo
  de columna fue detectada en el control negativo. La prueba cubrió tabla,
  columnas, índices y restricciones del fixture, que tenía clave primaria;
  no demuestra cobertura completa de FK, CHECK u otros objetos reales.
- **Limitaciones:** una prueba intermedia recibió error local 2002 del socket
  MySQL antes del control negativo; no se determinó su causa. El control
  negativo posterior pasó en otro servidor temporal aislado. El ejecutor
  experimental ya había sido retirado, así que la corrección se probó solo
  en el fixture y no quedó incorporada a un ejecutor de migración.
- **Pendiente:** implementar y probar una comparación estructural completa y
  un respaldo/restauración real antes de cualquier DDL en Aiven.

## 2026-11-22 — Catálogo: continuación detenida en prueba aislada
- **Estado:** no aplicada. No se ejecutó DDL ni se modificaron datos en
  Aiven; no se creó un backup real nuevo. La reversa no aplica.
- **Identidad:** conexión al endpoint Aiven configurado con CA y comprobación
  del nombre del servidor; TLS autenticado correctamente. La BD efectiva fue
  `foccus`, con MySQL 8.4.11. No se modificó `.env`.
- **Preflight de solo lectura:** 24 tablas base InnoDB visibles; sin vistas,
  triggers, rutinas ni eventos visibles. `catalogo_bloques` no existía.
  `projects.id_project` era `varchar(20) NOT NULL`, clave primaria completa,
  `utf8mb4_general_ci`. Se observaron privilegios directos globales de
  `SELECT`, `CREATE` y `REFERENCES`, además de los usados para inspeccionar
  objetos; no había roles activos. La visibilidad de objetos depende de permisos.
- **Prueba de DDL:** una tabla de catálogo con la colación adaptada a
  `utf8mb4_general_ci` se creó en un MySQL 8.4 temporal sin red y se
  comprobaron seis columnas, CHECK, FK y tres columnas del índice único.
  No se insertaron datos de prueba en Aiven.
- **Bloqueo de respaldo:** antes de copiar datos reales, la prueba del
  mecanismo de restauración con datos ficticios se bloqueó con `Blocked`;
  la salida no identificó la etapa concreta. No quedó demostrada la
  restaurabilidad, por lo que no se intentó el respaldo real ni el DDL.
  No se conservó el ejecutor experimental. Para continuar, identificar y
  corregir la causa en aislamiento, probarlo, y después generar y restaurar
  un respaldo consistente antes de reconsiderar la migración.

## 2026-11-22 — Catálogo: precondición de identidad no satisfecha
- **Estado:** no aplicada. La autorización del usuario no elimina los
  controles previos. No se conectó a la BD ni se ejecutó DDL o escritura de
  datos; por ello no hay comprobación actual de tabla, índice o permisos.
- **Identidad:** la configuración local contiene los campos de conexión
  requeridos y el nombre de BD coincide con `foccus`; no había variables
  `DB_*` heredadas. No se confirmó que sea el destino efectivo del backend.
  No hay una CA explícita configurada, por lo que este preflight no pudo
  autenticar la identidad del servidor según la conexión prevista. Se detuvo
  sin probar métodos alternativos.
- **Respaldo:** no se creó uno nuevo después del bloqueo de identidad; no se
  probó una restauración. `backups/` está ignorado por Git. Hay Docker e imagen
  MySQL 8.4 disponible, pero eso no demuestra la restaurabilidad del respaldo.
- **Colación y ejecutor:** la observación anterior de `utf8mb4_general_ci` en
  `projects.id_project` no se ha revalidado; difiere de
  `utf8mb4_unicode_ci` en el DDL probado localmente. El script existente
  bloquea `-Apply`. No se debe trasladar ese DDL sin resolver y verificar
  estas precondiciones y las indicadas en el registro anterior.
- **Reversa:** no aplica; no hubo cambios en la BD. Una reversa futura con
  eliminación de tabla es destructiva y requiere respaldo y confirmación
  explícita.

## 2026-11-21 — Catálogo: preflight detenido, sin aplicar
- **Estado:** se consultó en solo lectura el destino configurado en
  `backend/api_usuarios/.env`; no se ejecutó DDL ni se modificaron datos.
  La aplicación usa `load_dotenv()` y variables heredadas: no se pudo
  verificar que el proceso activo use exactamente ese destino. En el
  entorno del preflight no había variables `DB_*` heredadas.
- **Metadatos observados:** MySQL 8.4.11; 24 tablas base InnoDB, sin vistas;
  cuatro filas en `projects`. `projects.id_project` es `varchar(20) NOT NULL`,
  `utf8mb4_general_ci`, clave primaria completa. `catalogo_bloques` no existe.
  El esquema usa `utf8mb4_general_ci`. Se observaron ocho referencias FK
  visibles a `projects.id_project` y cero triggers, rutinas y eventos visibles;
  la visibilidad puede depender de permisos.
- **Incompatibilidad:** la propuesta offline usa `utf8mb4_unicode_ci` para la
  FK y no coincide con la columna padre. No ejecutar el DDL propuesto sin
  adaptarlo y volver a verificarlo. La detección de concesiones que mencionan
  `SELECT`, `CREATE` y `REFERENCES` no prueba permisos efectivos sobre los
  objetos; falta verificarlos de forma concluyente.
- **Conexión:** se observó TLS activo; el archivo de configuración no indica
  una CA explícita. No se verificó identidad del servidor ni equivalencia con
  la conexión efectiva del proceso de la aplicación.
- **Respaldo y restauración:** no se creó un backup nuevo: no se dispone de
  un MySQL 8.4.11 aislado para probar su restauración. Docker no estaba
  accesible y el servidor local disponible es MariaDB 10.4.32, no equivalente.
  El script de backup existente incluye sentencias destructivas al restaurar;
  no se ejecutó. No se ha demostrado consistencia ni restaurabilidad para esta
  migración. Los backups anteriores no sustituyen un respaldo actual probado.
- **Prueba aislada:** cuatro pruebas HTTP con SQLite y datos ficticios pasaron;
  incluyen inserción y deduplicación secuencial. No prueban el DDL MySQL,
  concurrencia, integridad de una restauración ni efectos sobre datos reales.
- **Para continuar:** identificar de forma segura la configuración efectiva
  del backend y autenticar el servidor; disponer de MySQL compatible, aislado
  y desechable; crear un backup consistente de estructura y datos, comprobarlo
  y restaurarlo allí, verificando integridad. Después implementar preflight y
  ejecutor con `--apply` explícito, permisos efectivos, colación correcta,
  validación completa de objetos existentes, conteos y prueba de deduplicación
  concurrente con datos ficticios aislados. Solo entonces considerar el DDL.
  MySQL confirma implícitamente el DDL: un rollback transaccional no lo revierte.
- **Reversa:** no aplica por no haberse ejecutado la migración. Si se aplica
  más adelante, exportar primero las fichas creadas y pedir confirmación
  explícita antes de eliminar la tabla; restaurar un backup completo puede
  sobrescribir cambios posteriores.

## 2026-11-21 — Catálogo de bloques (`catalogo_bloques`): PROPUESTA
- **Estado inicial de la propuesta:** solo DDL versionado; no aplicado, sin conexión ni consulta a BD
  real. No se creó backup ni hay conteos reales. No se cambiaron modelos,
  controladores, frontend ni datos. El script
  `scripts\migracion_20261121_catalogo_bloques.ps1` muestra el DDL con
  `-DryRun` o sin argumentos; `-Apply` se rechaza y no abre conexiones.
- **Alcance:** una tabla InnoDB, índice único por proyecto/tipo/hash y FK a
  proyecto; cero backfill. `IF NOT EXISTS` solo evita un error al repetir:
  no valida ni corrige una tabla previa incompatible, por lo que no basta
  para declarar una migración exitosa o idempotencia del esquema.
- **Antes de una futura aplicación autorizada:** verificar con
  `INFORMATION_SCHEMA` el tipo, longitud, charset, colación, índice y motor
  de `projects.id_project`; el DDL supone `VARCHAR(20)`,
  `utf8mb4_unicode_ci` e InnoDB. Adaptar la propuesta si difiere. Comprobar
  versión MySQL (CHECK se hace cumplir en MySQL 8.0.16 o posterior), permisos,
  existencia y definición completa de `catalogo_bloques`; detenerse ante
  incompatibilidad. No asumir que el índice único o la FK existen porque la
  tabla ya exista. Respaldar estructura y datos, comprobar que el backup no
  esté vacío y verificar su restaurabilidad antes de cualquier escritura.
  Ejecutar primero un dry-run con conteos reales; el script offline actual no
  puede hacerlo ni aplicar la migración.
- **Aplicación futura:** implementar o usar un ejecutor controlado que
  requiera `--apply` explícito, compruebe el backup y el esquema, aplique el
  DDL y falle ante incompatibilidades. MySQL hace commit implícito del DDL:
  una transacción no garantiza reversión. Medir bloqueos y planificar ventana.
- **Verificación futura:** comparar conteos de proyectos y demás tablas antes
  y después; comprobar definición de tabla, índice único, FK y CHECK en
  `INFORMATION_SCHEMA`/`SHOW CREATE TABLE`, y cero huérfanos, duplicados por
  proyecto/tipo/hash y tipos inválidos. Validar hashes recomputando SHA-256
  de los bytes UTF-8 del HTML; verificar que altas duplicadas y concurrentes
  no creen más de una ficha y que quitar bloques del guion no borre fichas.
  La prueba de escrituras debe ser en una BD aislada con datos ficticios.
- **Reversa:** desactivar primero el uso de catálogo en la aplicación.
  Restaurar el estado anterior desde backup probado o, solo con confirmación
  explícita del usuario y tras respaldar/exportar las fichas creadas,
  eliminar `catalogo_bloques` con `DROP TABLE catalogo_bloques;`.
  La reversa elimina el catálogo y es destructiva; no modifica el HTML de
  `guion_version`, pero restaurar un backup completo puede perder cambios
  posteriores y exige una estrategia de recuperación acorde.

## 2026-11-01 — Códigos públicos (`codigos_contador`, `codigos_entidad`)
- **Tipo:** aditiva (2 tablas nuevas + backfill). No modifica tablas existentes.
- **Backup previo:** `backups\foccus_foccus_20261101_183614.sql.gz` (14.631 bytes, 22 tablas, 504 filas, verificado). Backup posterior: `foccus_foccus_20261101_183911.sql.gz` (24 tablas).
- **Script:** `scripts\migrar_codigos.py` (`--dry-run` por defecto, `--apply`; idempotente, probado dos veces).
- **Antes:** 22 tablas, sin códigos. **Después:** 24 tablas, 82 códigos y 16 contadores.
  PRO 2, GUI 8, VGU 8, ESC 35, PER 11, LOC 4, OBJ 3, VES 1, DRO 10. Duplicados 0, formato inválido 0.
- **Prueba de punta a punta (uvicorn :8010):** `buscar-codigo` 200 admin / 403 miembro; listados con `codigo` solo para admin; un personaje nuevo recibió `PER-003` (consecutivo). El registro de prueba (`psj0012`) y su fila de código se eliminaron; el contador queda en 3 (los números no se reutilizan).
- **Corrección en el script:** `with db.begin()` fallaba (transacción ya iniciada); ahora usa `commit/rollback`.
- **Reversa:** `DROP TABLE codigos_entidad; DROP TABLE codigos_contador;` (nada más depende de ellas en los datos; el código del backend ya tolera su ausencia solo si se revierte el commit del backend) o restaurar el backup previo (`scripts\restaurar_bd.py`, que no toca tablas ausentes del archivo).
