# Esquema de la BD (MySQL Aiven, base `foccus`)

Modelos: `backend\api_usuarios\app\models\`. Conexión: `app\config\database.py` (SQLAlchemy + pymysql, variables `DB_*` de `.env`).

## Tablas (24) y filas al 2026-11-01
clients 1 · codigos_contador 16 · codigos_entidad 82 · continuidad_foto 0 · desglose 30 · desglose_requerimientos 356 · escena_galeria_items 0 · escena_version 0 · escenarios 4 · escenas 35 · galeria_items 18 · galeria_lugar_personajes 3 · galeria_version_fotos 1 · galeria_versiones 8 · guion 8 · guion_nota 0 · guion_version 8 · personajes 11 · proceso_rodaje 0 · projects 2 · rodaje 10 · roles 0 · user_projects 5 · users 4

Relaciones principales: `projects` ← `user_projects` (id_user, id_project, id_rol; 1001 = admin del proyecto) → `users`; `guion` → `projects`; `escenas` → `guion`; `guion_version` → `guion`; `personajes`, `escenarios`, `galeria_items`, `rodaje` → `projects`.

## Códigos públicos (nuevas)
**`codigos_contador`**: PK (`ambito` varchar(20), `tipo` varchar(3)), `ultimo` int. Último consecutivo emitido; no se reutiliza.

**`codigos_entidad`**: `id` PK int, `ambito`, `tipo`, `id_project` varchar(20), `entidad_id` varchar(40), `codigo` varchar(20), `creado_en` datetime.
Índices: `uq_codigos_ambito_codigo` (ambito, codigo) único; `uq_codigos_tipo_entidad` (tipo, entidad_id) único; `ix_codigos_proyecto_codigo` (id_project, codigo).

Tipos: PRO proyecto, GUI guion, VGU versión de guion, ESC escena, PER personaje, LOC lugar, OBJ utilería, VES vestuario, DRO jornada de rodaje. Formato `XXX-NNN`. Solo el admin del proyecto (rol 1001) los ve.
Pendiente de decisión: el borrado de una entidad no limpia su fila en `codigos_entidad` (queda huérfana).
