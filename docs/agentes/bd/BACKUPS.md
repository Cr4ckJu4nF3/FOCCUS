# Backups de la BD

BD: MySQL en Aiven. El plan del servicio no está confirmado; los respaldos
locales son una red de seguridad adicional.

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

## Catálogo de bloques: estado 2026-11-22

El ejecutor `scripts/migracion_20261122_catalogo_aiven.py` tiene dry-run por
defecto. `--fixtures` usa solo datos ficticios y MySQL aislado sin red;
`--dry-run --ca <RUTA_CA>` comprueba el destino con TLS autenticado.
Con `--apply --ca <RUTA_CA>`, crea un gzip consistente e intenta restaurarlo
en MySQL aislado antes de cualquier DDL; la aplicación queda bloqueada si
fallan los controles. `--apply --existing-backup <ARCHIVO> --ca <RUTA_CA>`
reutiliza un backup local existente, sin crear otro, y exige verificar su
integridad y coincidencia con el origen antes de aplicar.

Los tres backups de ese día son no vacíos y están ignorados por Git. El
tercero, `catalogo_previo_20261122_094958_b3653f1b.sql.gz`, se restauró en
MySQL aislado y coincidió con el origen antes de la migración en estructura,
conteos, huellas agregadas y FK. Los dos anteriores no tienen verificación
completa. No se creó otro backup en el seguimiento. Estos archivos contienen
datos de usuarios; no subirlos ni restaurarlos sobre la BD real sin evaluar
el riesgo de sobrescribir cambios posteriores. Véase `MIGRACIONES.md`.

## Continuidad: esquema actual sin datos (2026-11-22)

**Copia recomendada:** `backups/esquema_aiven_20261122_145832_d5fcc527.sql.gz`
(2.777 bytes), ignorada por Git. SHA-256:
`9d943712f6cba8f02c521081656fae32890c0c23535acf94560eafdf13979351`.
Contiene solo estructura: no exporta filas, cuentas, contraseñas ni archivos
subidos. No conserva los valores de los contadores `AUTO_INCREMENT` de las
tablas, pues el destino empieza vacío. No contiene `DROP`.

Se leyó el origen MySQL 8.4.11 con la CA local confirmada por el usuario,
verificando certificado y hostname. Se obtuvieron los `SHOW CREATE TABLE`
de las 25 tablas visibles y se compararon los metadatos antes y después de
la captura. No había comentarios ni valores predeterminados de texto en los
DDL examinados. No se modificaron datos ni estructura en Aiven. La lectura
no impide DDL concurrente; la doble comparación reduce, pero no elimina,
ese riesgo.

El archivo se restauró en MySQL 8.4.13 temporal, sin red ni puertos, que se
eliminó después. Coincidieron con el origen: configuración de esquema,
25 tablas, 195 columnas, 77 entradas de columnas de índice, 70 restricciones,
77 entradas de columnas de clave, 36 FK y un CHECK. Las 25 tablas tenían PK
y cero filas en el destino. Se compararon tipos, nulabilidad, colaciones,
valores predeterminados, índices, claves y acciones de FK; se excluyeron los
contadores `AUTO_INCREMENT`. No se hicieron pruebas de la aplicación.

En el origen se observaron cero vistas, triggers, rutinas y eventos, y cero
FK a otra base; por eso el archivo no incluye esos objetos. La cuenta tenía
privilegios directos de `SHOW VIEW`, `TRIGGER`, `EVENT`, `CREATE ROUTINE` y
`ALTER ROUTINE`, pero no se observó `SHOW_ROUTINE`. Los metadatos dependen
de los permisos: no se puede descartar que existan objetos no visibles ni
afirmar que la copia cubre objetos ocultos. La tabla `roles` del origen tenía
cero filas; no se incluyeron registros de referencia. Los límites de cuentas,
correo, archivos, códigos y versiones se detallan más abajo.

**Restauración:** seguir la sección «Restaurar una copia de estructura» de
abajo usando este archivo y este hash. Copiarlo además a un lugar controlado
y cifrado fuera de este equipo y comprobar el hash: una sola copia local
puede perderse con el equipo.

## Continuidad: copia provisional histórica (2026-11-22)

**No es una copia verificada del estado actual de Aiven.** El servidor
respondió por TCP, pero la conexión autenticada falló al verificar el
certificado: no hay CA explícita configurada y el almacén de confianza local
no aceptó la cadena. Una búsqueda posterior encontró
`%USERPROFILE%\Downloads\ca\ca.pem` fuera del repositorio. Con esa CA, el
handshake TLS verificó certificado y hostname (TLS 1.3), sin autenticación
ni consultas SQL. El usuario había indicado anteriormente que ya tenía la
CA, pero no se verificó independientemente la procedencia exacta del archivo.
No se desactivó la verificación TLS ni se modificó la base remota. El
respaldo actual se completó después y se documenta en la sección anterior.

- Archivo ignorado por Git:
  `backups/esquema_historico_reconstruido_20261122_145247_4358cac0.sql.gz`.
  Tamaño: 2.838 bytes. SHA-256:
  `0cec1e64da83d68f9329ce334489d5e9a9d789adc5b9c650e6a17cf1f094bfa0`.
- Es una **reconstrucción histórica**, no un volcado actual: 24 sentencias
  `CREATE TABLE` extraídas del backup previo a la migración ya validado, más
  el DDL de `catalogo_bloques` de la migración documentada. Se eliminaron
  valores de contador `AUTO_INCREMENT` de tabla. No incluye filas, cuentas,
  secretos de conexión ni archivos subidos. El backup anterior sí contiene
  datos personales: no usarlo como copia pública.
- El respaldo previo no exportó vistas, triggers, rutinas ni eventos. En el
  preflight de esa migración se registraron cero visibles, pero no se pudo
  verificar el estado ni los permisos **actuales**; por tanto esos objetos
  podrían faltar. Tampoco se pueden descartar cambios posteriores.
- Prueba: se importó en MySQL 8.4.13 temporal, sin red ni puertos, y se
  eliminó el contenedor. Resultaron 25 tablas vacías, 195 columnas, 25 PK,
  77 entradas de columnas de índice, 36 FK y un CHECK; 0 vistas, triggers,
  rutinas y eventos en la copia. Las 24 tablas históricas coincidieron con
  su DDL fuente en columnas, índices, claves y restricciones, ignorando los
  contadores. El catálogo procede del DDL del script, no de una nueva lectura
  de Aiven. La prueba no verifica la aplicación ni la equivalencia actual.
- Es una copia en este equipo, no una copia externa: guardar otra copia
  cifrada en un dispositivo o almacenamiento controlado, comprobar su hash
  y restringir acceso. Git no es un sistema de backup.

### Restaurar una copia de estructura en otra base vacía

1. Preparar MySQL 8.4 compatible, una **base nueva y vacía** con conjunto
   `utf8mb4` y collation predeterminada `utf8mb4_general_ci`, y un usuario
   con permisos para crear tablas, índices y referencias. Nunca apuntar al
   origen ni a una base con datos. Revisar compatibilidad y privilegios del
   proveedor; PostgreSQL no acepta este SQL.
2. Desde la raíz del proyecto verificar el hash y descomprimir en `backups/`,
   que está ignorado por Git. En PowerShell:

   ```powershell
   $archivo = 'backups/esquema_aiven_20261122_145832_d5fcc527.sql.gz'
   Get-FileHash $archivo -Algorithm SHA256
   ```

   Comparar el hash con el indicado para la copia elegida antes de
   descomprimir. El ejemplo usa la copia actual; para usar la histórica,
   cambiar `$archivo` y comparar con su hash. Si coincide:

   ```powershell
   backend/api_usuarios/.venv/Scripts/python.exe -c "import gzip,shutil,sys; a=gzip.open(sys.argv[1],'rb'); b=open(sys.argv[2],'xb'); shutil.copyfileobj(a,b); b.close(); a.close()" $archivo 'backups/esquema_continuidad.sql'
   ```

   El modo `xb` no sobrescribe un archivo existente. Usar una ruta nueva si
   ya existe. Se necesita Python con soporte gzip; no requiere paquetes extra.
3. Conectar con el cliente **MySQL** usando el host, puerto y usuario del
   destino, TLS autenticado y contraseña solicitada interactivamente; no
   escribir la clave en comandos ni archivos versionados. En un cliente MySQL
   compatible, sustituir los marcadores por los valores de destino:

   ```text
   mysql --host=HOST_DESTINO --port=PUERTO --user=USUARIO --password --ssl-mode=VERIFY_IDENTITY --ssl-ca=RUTA_CA
   ```

   Comprobar manualmente el servidor y la base nueva. Dentro del cliente:

   ```sql
   USE BASE_NUEVA;
   SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = DATABASE();
   ```

   El conteo debe ser 0. Después ejecutar `SOURCE` con la ruta absoluta del
   SQL descomprimido, usando `/` como separador en Windows:

   ```text
   SOURCE C:/RUTA/FOCCUS/backups/esquema_continuidad.sql;
   ```

   Revisar **todos** los errores del cliente: `SOURCE` puede continuar tras
   un error y MySQL no revierte automáticamente los DDL ya aplicados. No
   repetir sobre una base parcialmente importada. Comprobar 25 tablas, PK,
   índices, 36 FK y el CHECK del catálogo contra la evidencia anterior; los
   conteos por sí solos no prueban equivalencia. Verificar los privilegios de
   la aplicación y sus flujos antes de ponerla en servicio.
4. Configurar por un canal seguro `DB_HOST`, `DB_PORT`, `DB_USER`,
   `DB_PASSWORD` y `DB_NAME` para el destino; no versionar claves ni mostrar
   `.env`. El `database.py` actual construye la URL interpolando variables y
   **no configura CA ni verificación TLS**: no asumir que `DB_SSL_CA` activa
   TLS autenticado en la aplicación. Pedir a `foccus-web` que lo implemente
   y pruebe antes de usar una BD remota; también debe manejar correctamente
   caracteres especiales de las credenciales. Arrancar solo después de
   restaurar: `create_all` no sustituye las migraciones.

### Límites operativos

- No hay usuarios ni empresas: registrar de nuevo la primera cuenta. El
  registro del código asigna rol 1001; el código también usa 1005. La tabla
  `roles` queda vacía y no hay FK hacia ella en esta copia; el catálogo de
  roles puede estar vacío y sus necesidades deben validarse. No se inventaron
  registros de referencia ni se probó el registro de extremo a extremo.
- Proyectos, guiones, catálogos y contadores de códigos quedan vacíos. Los
  códigos pueden empezar de nuevo y coincidir con códigos antiguos externos.
  Los archivos en `app/assets/uploads` o en el volumen de Docker no forman
  parte del SQL y no se recuperan.
- Correo, recuperación, invitaciones y 2FA requieren configurar y probar
  `MAIL_USER`, `MAIL_PASSWORD` y `CONTACT_EMAIL`; no hay secretos en la
  copia. Configurar una clave JWT segura para el nuevo entorno. Los tokens
  anteriores no deben suponerse válidos.
- Origen documentado: MySQL 8.4.11; prueba: 8.4.13. No se verificó otra
  versión ni otro motor. Algunas dependencias Python no tienen versión
  fijada, por lo que una instalación futura puede diferir.

### Para futuros respaldos actuales

Con la CA oficial, autenticar el servidor y consultar en solo lectura
`INFORMATION_SCHEMA` para inventariar tablas, vistas, triggers, rutinas,
eventos, FK externas y permisos efectivos. Usar un `mysqldump` compatible
con `--no-data`, `--routines`, `--triggers`, `--events`, sin tablespaces,
con verificación de CA y hostname; nunca pasar la contraseña en argumentos.
Revisar el archivo localmente: definidores, comentarios, valores por defecto
o cuerpos de rutinas pueden contener identidades o secretos. No publicar una
copia sin revisar. Validar integridad y restauración en otra base vacía
aislada, comparar los objetos visibles y documentar los que falten por
permisos. Evitar cambios de DDL concurrentes: una lectura consistente de
datos no garantiza una instantánea consistente de estructura.

[Aiven anuncia](https://aiven.io/changelog/507f8b1b-dd8f-4841-ac4a-940ac492b688)
que apagará MySQL **free** y eliminará sus datos y backups el 21 de diciembre
de 2026; los planes pagos no están afectados por ese anuncio. El plan de
este servicio no se ha confirmado: comprobarlo en la consola sin compartir
credenciales y actuar antes de la fecha si corresponde.
