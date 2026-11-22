# FOCCUS con Docker para desarrollo local

## Primer arranque

Requisitos: Docker Desktop activo, conexión para descargar imágenes y paquetes,
y puertos 5173 y 8000 libres. En Windows PowerShell, desde la raíz de FOCCUS:

```powershell
docker compose -p foccus-local --env-file docker/compose.empty.env -f compose.yaml up -d --build --wait
docker compose -p foccus-local --env-file docker/compose.empty.env -f compose.yaml ps
```

La primera vez puede tardar varios minutos. Abre <http://localhost:5173>,
<http://127.0.0.1:8000> y <http://127.0.0.1:8000/docs>. El navegador llama
directamente a la API en 127.0.0.1:8000; este montaje no es para acceso remoto.

Todos los comandos de esta guía usan explícitamente `docker/compose.empty.env`:
es un archivo sin variables que impide que Compose cargue el `.env` predeterminado.
Las imágenes tampoco copian `.env`, respaldos ni archivos previamente subidos.
La API tiene variables ficticias fijas y no monta el código ni el `.env` del
equipo. MySQL está solo en una red interna y no publica puertos; la API comparte
esa red y otra red local para que Windows pueda acceder a ella. La segunda red
de la API permite salida a Internet, pero su destino de base de datos está fijado
al servicio local `mysql`. No cambiar `DB_HOST` para apuntar a Aiven. La web y la API
publican puertos solo en localhost. Las contraseñas y clave JWT del Compose son
públicas y exclusivas de pruebas: **nunca sirven para producción**.

Para ver los logs, parar sin borrar datos o reiniciar después de editar código:

```powershell
docker compose -p foccus-local --env-file docker/compose.empty.env -f compose.yaml logs -f
# Ctrl+C deja de mostrar logs; no detiene los servicios.
docker compose -p foccus-local --env-file docker/compose.empty.env -f compose.yaml down
docker compose -p foccus-local --env-file docker/compose.empty.env -f compose.yaml up -d --build --wait
```

No hay recarga del código del anfitrión: vuelve a construir con `--build` después
de modificar archivos. MySQL conserva datos en el volumen `mysql_data`; los
archivos que se suban localmente quedan en `uploads`. `down` no los borra.

**Advertencia: el siguiente comando borra definitivamente ambos volúmenes
locales del proyecto `foccus-local`, incluida la base y los archivos subidos.**
Úsalo solo si deseas empezar desde cero; no borra Aiven:

```powershell
docker compose -p foccus-local --env-file docker/compose.empty.env -f compose.yaml down --volumes
```

## Limitaciones importantes

- La base empieza vacía. La API ejecuta su `create_all` habitual para los
  modelos importados; esto no equivale a todas las migraciones, datos iniciales
  ni al esquema de producción. No se crean cuentas o roles de ejemplo.
- El catálogo de bloques **no se migra automáticamente**. El script
  `scripts/migracion_20261121_catalogo_bloques.ps1 -DryRun` presenta la
  propuesta; `-Apply` sigue bloqueado. Se aplicó manualmente al volumen local
  de esta instalación el 22-11-2026; una instalación nueva o un volumen
  reiniciado no tendrán esa tabla hasta que `foccus-bd` valide y aplique la
  propuesta en ese MySQL local. Sin ella, las funciones del catálogo pueden fallar.
- No se configura SMTP con credenciales: los flujos que
  necesitan verificación, invitaciones o recuperación por correo no están
  completos en este entorno. No importar datos ni respaldos reales.
- Los paquetes del backend no están todos fijados a una versión en
  `requirements.txt`; una reconstrucción futura puede resolver versiones
  diferentes.

## Evidencia de migración aislada (22-11-2026)

`foccus-bd` ejecutó la propuesta exacta del dry-run en un contenedor temporal
`mysql:8.4`, sin red ni puertos, con un `projects` mínimo ficticio. MySQL
**8.4.13** creó `catalogo_bloques` con las seis columnas `id_bloque`,
`id_project`, `tipo`, `html`, `html_sha256` y `creado_en`; clave primaria,
índice único `(id_project, tipo, html_sha256)`, FK a `projects` con borrado en
cascada y CHECK de los cuatro tipos. Una segunda ejecución terminó con código 0
y aviso de tabla existente; eso **no verifica** que una tabla previa coincida.

| Columna | Tipo en la propuesta |
|---|---|
| `id_bloque` | `BIGINT UNSIGNED`, autoincremental, clave primaria |
| `id_project` | `VARCHAR(20)`, `utf8mb4_unicode_ci` |
| `tipo` | `VARCHAR(16)`, `ascii_bin` |
| `html` | `LONGTEXT`, `utf8mb4` |
| `html_sha256` | `BINARY(32)` |
| `creado_en` | `DATETIME(6)`, valor inicial `CURRENT_TIMESTAMP(6)` |

Todas son `NOT NULL`. El índice se llama
`uq_catalogo_bloques_proyecto_tipo_hash`; la FK,
`fk_catalogo_bloques_proyecto`; el CHECK, `ck_catalogo_bloques_tipo`.

La inserción válida funcionó; duplicado, tipo inválido y proyecto inexistente
produjeron errores 1062, 3819 y 1452 respectivamente. El mismo hash con otro
tipo fue aceptado y el borrado del proyecto eliminó los bloques relacionados.
La columna padre ficticia usó `utf8mb4_unicode_ci`; las pruebas con
`utf8mb4_general_ci`, `utf8mb4_0900_ai_ci`, `utf8mb4_bin` y `latin1_swedish_ci`
fallaron con error 3780 por incompatibilidad de la FK. **En aquella prueba no
se había comprobado el esquema real ni aprobado una migración a Aiven.** El contenedor y sus datos de
prueba se eliminaron. La configuración de MySQL local usa `utf8mb4_unicode_ci`
para bases nuevas; cambiarla no modifica un volumen que ya existe.

Comandos principales de aquella prueba (el nombre corresponde al contenedor
temporal ya eliminado, no al MySQL de Compose):

```powershell
docker run --detach --name foccus-bd-prueba-417fbc71d524 --network none --env MYSQL_ALLOW_EMPTY_PASSWORD=yes mysql:8.4
docker exec foccus-bd-prueba-417fbc71d524 mysqladmin --protocol=tcp --host=127.0.0.1 --user=root ping
$dry = @(& '.\scripts\migracion_20261121_catalogo_bloques.ps1' -DryRun)
$dry[3] | docker exec -i foccus-bd-prueba-417fbc71d524 mysql --user=root --database=foccus_fixture --show-warnings
```

La base `foccus_fixture` y su tabla `projects` mínima se prepararon previamente
con datos ficticios; estos comandos documentan la evidencia y no son un
procedimiento para aplicar la migración en otra base.

## Aplicación al volumen Compose de esta instalación (22-11-2026)

Después de identificar el servicio `mysql` del proyecto `foccus-local`,
`foccus-bd` comprobó que MySQL 8.4.13 no publicaba puertos, que
`projects.id_project` era compatible y que `catalogo_bloques` no existía.
Aplicó el DDL exacto del dry-run a `foccus_local`, sin usar `-Apply` ni conectar
con Aiven. Confirmó las seis columnas, la clave única, el CHECK y la FK. La
collation predeterminada de la tabla es `utf8mb4_0900_ai_ci`, pero la columna
`id_project` usa explícitamente `utf8mb4_unicode_ci`.

Con fixtures ficticios en esa misma base, la API devolvió 200 al guardar,
200 al repetir el bloque (mismo registro), 200 al listar, 403 para un miembro
sin permiso, 401 sin JWT y 403 con proyecto discordante. Se eliminaron solo
los fixtures: las 23 tablas quedaron sin filas; el autoincremento del catálogo
quedó en 2. La tabla permanece en el volumen local. Se generaron dos copias
**locales solo de estructura**, sin datos, en `backups/` antes de la migración
y la prueba; no son respaldos de producción.

La aplicación fue manual, usando el DDL extraído en memoria y `docker exec` al
contenedor local. No se convierte en una migración automática: tras `down
--volumes`, pide a `foccus-bd` que compruebe de nuevo destino, collation y
esquema antes de repetirla. `CREATE TABLE IF NOT EXISTS` no garantiza que una
tabla existente sea compatible. No se autoriza el uso de esta prueba para
modificar Aiven o cualquier otra base.
