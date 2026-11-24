# Esquema de la BD (MySQL Aiven, base `foccus`)

Modelos: `backend\api_usuarios\app\models\`. Conexión: `app\config\database.py` (SQLAlchemy + pymysql, variables `DB_*` de `.env`).

## Verificación de estructura (2026-11-22)

La lectura autenticada más reciente encontró 25 tablas visibles, 195
columnas, 25 claves primarias, 36 claves foráneas y un CHECK. No se
observaron vistas, triggers, rutinas ni eventos con los permisos disponibles;
podría haber objetos ocultos. La copia sin filas y la comparación con MySQL
aislado están documentadas en `BACKUPS.md`. Los conteos de filas siguientes
son históricos, no una lectura actual.

## Tablas (24) y filas al 2026-11-01
clients 1 · codigos_contador 16 · codigos_entidad 82 · continuidad_foto 0 · desglose 30 · desglose_requerimientos 356 · escena_galeria_items 0 · escena_version 0 · escenarios 4 · escenas 35 · galeria_items 18 · galeria_lugar_personajes 3 · galeria_version_fotos 1 · galeria_versiones 8 · guion 8 · guion_nota 0 · guion_version 8 · personajes 11 · proceso_rodaje 0 · projects 2 · rodaje 10 · roles 0 · user_projects 5 · users 4

Relaciones principales: `projects` ← `user_projects` (id_user, id_project, id_rol; 1001 = admin del proyecto) → `users`; `guion` → `projects`; `escenas` → `guion`; `guion_version` → `guion`; `personajes`, `escenarios`, `galeria_items`, `rodaje` → `projects`.

## Catálogo de bloques por proyecto (2026-11-22)

**Aplicada** en la base `foccus` de Aiven: 25 tablas, catálogo vacío y sin
backfill al verificar. El respaldo previo se restauró y comprobó en MySQL
aislado; detalles, limitaciones y reversa en `MIGRACIONES.md`. La existencia
de la tabla no demuestra el despliegue del código de aplicación.

`catalogo_bloques`: `id_bloque` bigint unsigned PK autoincremental;
`id_project` varchar(20) `utf8mb4_general_ci` no nulo, FK a
`projects.id_project`; `tipo` varchar(16) `ascii_bin` con CHECK
(`accion`, `dialogo`, `parentesis`, `transicion`); `html` LONGTEXT
`utf8mb4_0900_ai_ci` no nulo; `html_sha256` BINARY(32) no nulo;
`creado_en` datetime(6) no nulo con `CURRENT_TIMESTAMP(6)`. La colación
predeterminada de la tabla es `utf8mb4_0900_ai_ci`.
Índice único `(id_project, tipo, html_sha256)` también sirve para filtrar por
proyecto y tipo. La tabla es independiente de guiones, versiones y escenas:
quitar o modificar un bloque del guion **no borra** la ficha. La FK
usa `ON DELETE CASCADE`: **eliminar el proyecto sí borraría su catálogo**.

Contrato para quien implemente el backend:
- Guardar el HTML completo del bloque, con formato, después de sanitizarlo
  con una política determinista que conserve el formato permitido. Calcular
  SHA-256 sobre los bytes UTF-8 exactos de ese HTML almacenado, sin otras
  normalizaciones; guardar los 32 bytes, no los 64 caracteres hexadecimales.
  La igualdad es exacta: HTML semánticamente igual pero serializado distinto
  produce fichas distintas; tipos o proyectos distintos no se deduplican.
- Validar los cuatro tipos y el HTML útil antes de insertar, y verificar
  permisos y pertenencia al proyecto en cada operación. La BD no comprueba
  que el hash corresponda al HTML ni que el HTML sea seguro: nunca confiar
  en un hash del cliente y no renderizar HTML sin sanitización.
- Insertar de forma atómica; ante conflicto de la clave única, recuperar la
  ficha existente del mismo proyecto/tipo/hash y comparar el HTML exacto.
  Si no coincide, informar colisión o corrupción; nunca sobrescribirlo.
  Eliminar contenido del documento no debe sincronizar eliminaciones al
  catálogo. Cambiar formato o contenido puede generar otra ficha.
- La migración no incluyó backfill. La presencia de endpoints en el árbol de
  trabajo no demuestra su despliegue ni el destino efectivo de la aplicación.

## Códigos públicos (nuevas)
**`codigos_contador`**: PK (`ambito` varchar(20), `tipo` varchar(3)), `ultimo` int. Último consecutivo emitido; no se reutiliza.

**`codigos_entidad`**: `id` PK int, `ambito`, `tipo`, `id_project` varchar(20), `entidad_id` varchar(40), `codigo` varchar(20), `creado_en` datetime.
Índices: `uq_codigos_ambito_codigo` (ambito, codigo) único; `uq_codigos_tipo_entidad` (tipo, entidad_id) único; `ix_codigos_proyecto_codigo` (id_project, codigo).

Tipos: PRO proyecto, GUI guion, VGU versión de guion, ESC escena, PER personaje, LOC lugar, OBJ utilería, VES vestuario, DRO jornada de rodaje. Formato `XXX-NNN`. Solo el admin del proyecto (rol 1001) los ve.
Al borrar una entidad (con `db.delete`), un listener de SQLAlchemy en `utils/codigos.py` borra su fila de `codigos_entidad`. El contador no retrocede, así que el número no se reutiliza.
