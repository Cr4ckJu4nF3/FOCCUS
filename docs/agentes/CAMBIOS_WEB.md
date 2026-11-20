# Cambios del web pendientes de adaptar a móvil

foccus-web agrega aquí cada cambio relevante (arriba lo más nuevo). foccus-mobile los adapta cuando el usuario lo pida y cambia el estado a `hecho en móvil`.

## 2026-11-20 – Autorización de recursos por proyecto y edición de procesos
- Rama/commit: rama actual; sin commit.
- Qué cambió (web/backend/BD): las lecturas y escrituras de escenas, guiones/versiones, continuidad, rodajes/procesos, desglose, personajes y escenarios verifican que los recursos de la ruta pertenezcan al proyecto activo. Las referencias relacionadas en escenas (guion, rodaje y desglose) también se validan; los IDs de proyecto recibidos al crear guiones, rodajes, personajes o escenarios deben coincidir con el proyecto autorizado. Recursos inexistentes o de otro proyecto responden 404; un `id_project` de cuerpo/formulario distinto responde 403. `GET /guiones` queda limitado al proyecto activo incluso si no se envía `id_project`. Sin cambios de BD. En Rodaje, el administrador ahora puede editar nombre, ubicación, fecha, encargado, estado, orden y descripción de un proceso; el campo de archivo permanece fuera del formulario porque no había flujo de edición de adjuntos.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta):
  - `POST /personajes` y `POST /escenarios`: `id_project` del cuerpo debe coincidir con el proyecto activo; si no, responde 403. `PATCH/DELETE /personajes/{id_personaje}` y `PATCH/DELETE /escenarios/{id_escenario}`: el recurso debe pertenecer al proyecto activo; si no, responde 404.
  - Autorización por pertenencia reforzada en rutas existentes de `GET/PATCH/DELETE /guiones/{id_guion}`, `GET /guiones/{id_guion}/versiones`, `PATCH /guiones/{id_guion}/versiones/{id_guion_version}/estado`, notas/versiones de continuidad (`/escenas/{id_escena}/versiones` y `/escenas/versiones/{id_escena_version}/fotos`), escenas (`/escenas/{id_escena}`), rodajes y procesos (`/rodajes/{id_rodaje}`, `/rodajes/{id_rodaje}/procesos`, `/rodajes/procesos/{id_proceso}`), y desglose (`/guiones/{id_guion}/desglose`, `/escenas/{id_escena}/desglose` y requerimientos). En continuidad se conserva la carga de fotos solo-admin y consulta para miembros del mismo proyecto.
  - El cuerpo de `PATCH /rodajes/procesos/{id_proceso}` sigue aceptando campos parciales del proceso; ahora la pantalla web usa ese PATCH para editar sus datos.
  - Las rutas de listados y operaciones relacionadas mantienen su forma de respuesta cuando el recurso pertenece al proyecto; no se identificaron endpoints nuevos.
- Pantallas web afectadas: Rodaje (edición de los campos operativos del proceso, además de crear, cambiar estado y borrar; el atributo `archivo` queda fuera porque no existe un flujo UI de adjuntos para procesos).
- Estado para móvil: pendiente, no adaptado; el impacto en clientes Flutter no se revisó.

## 2026-11-20 – Proyectos del cliente filtrados por pertenencia
- Rama/commit: rama actual; sin commit.
- Qué cambió (web/backend/BD): `GET /projects/client/{id_client}` conserva su respuesta, pero los usuarios normales solo reciben los proyectos a los que pertenecen. El administrador global, verificado por su rol actual en BD, conserva el listado completo para ese cliente. Sin cambios de BD ni de Flutter.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): `GET /projects/client/{id_client}`; sin cambios en forma de respuesta (`data` sigue siendo una lista con los mismos campos), ahora filtrada por membresía. Un JWT con rol admin antiguo no amplía el resultado si el rol vigente ya no es admin.
- Pantallas web afectadas: no se identificó un caller web de este endpoint; el cambio corresponde al contrato de API.
- Impacto para consumidores: cualquier consumidor que necesite listar todos los proyectos del cliente debe adaptarse al nuevo filtrado por membresía.
- Estado para móvil: pendiente, no adaptado; no se evaluó el comportamiento de clientes Flutter antiguos ni se modificó Flutter. La incompatibilidad documentada de RF-03 corresponde al login/2FA, no a este endpoint.

## 2026-11-20 – Roles de proyecto y permisos de escritura
- Rama/commit: rama actual; sin commit.
- Qué cambió (web/backend/BD): web y backend asignan solo Administrador (`id_rol=1001`) o Usuario (`id_rol=1005`). Las membresías existentes `1002`–`1004` siguen en BD y conservan lectura, sin migración ni cambio de datos. Las operaciones de escritura del proyecto requieren ser admin; autenticación, perfil propio, completar invitación, recuperar contraseña y borrar la propia cuenta permanecen personales. Sin cambios de estructura ni datos de BD.
- Catálogo global `/roles`: sin cambios; es un catálogo separado, no se usa para autorizar ni asignar roles de membresía y no representa una jerarquía configurable.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta):
  - `POST /users/invite` y `PATCH /users/{id_user}/project/{id_project}`: solo admiten asignar `id_rol` 1001 o 1005; los valores legados 1002–1004 se rechazan con 422.
  - `POST /guiones/versiones/{id_guion_version}/notas`: ahora requiere administrador del proyecto; miembro/rol legado recibe 403 y no crea la nota. Cuerpo y respuesta exitosa sin cambios; el GET de notas sigue disponible para miembros.
  - `POST /projects/{id_project}/galeria/{id_galeria}/versiones`, `/uso` y `/versiones/{id_version}/foto`: ahora requieren administrador del proyecto; miembro/rol legado recibe 403, sin cambiar el contrato exitoso. Las consultas GET de galería siguen disponibles para miembros.
- Pantallas web afectadas: Roles y Equipo (selector y etiquetas de rol).
- Estado para móvil: pendiente; API de permisos modificada, no se implementó adaptación Flutter en esta tanda.

## 2026-11-20 – Edición web de proyectos
- Rama/commit: main; sin commit.
- Qué cambió (web/backend/BD): web permite editar los datos del proyecto activo al administrador del proyecto; sin cambios de backend ni BD.
- Endpoints nuevos o modificados: ninguno. Se usa el existente `GET /projects/{id}` para precargar y `PATCH /projects/{id}` con `{project_name, formato_de_produccion, genero, sinopsis, director}`; responde `data: {id_project, project_name}`. No se envía `id_client`.
- Pantallas web afectadas: panel administrativo.
- Estado para móvil: pendiente; no se solicitó adaptación.

## 2026-11-20 – Notas por versión de guion
- Rama/commit: main; sin commit.
- Qué cambió (web/backend/BD): se pueden consultar las notas de una versión del guion; solo el administrador del proyecto puede crearlas. Backend verifica que la versión pertenezca al proyecto activo. Sin cambios de BD.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta):
  - `GET /guiones/versiones/{id_guion_version}/notas`: requiere token y `X-Project-Id`; devuelve `data` con lista de `{id_nota, id_user, contenido, fecha_creacion}`.
  - `POST /guiones/versiones/{id_guion_version}/notas`: requiere token, `X-Project-Id` y rol admin del proyecto; miembros y roles legados reciben 403. Cuerpo `{contenido}` no vacío; respuesta exitosa `data: {id_nota, contenido, id_user}`.
  - El GET devuelve 404 si la versión no existe o no pertenece al proyecto; el POST devuelve 404 para el admin en ese caso y 422 si el contenido está vacío o solo contiene espacios.
- Pantallas web afectadas: lector de versiones de Guion.
- Estado para móvil: pendiente, no adaptado; el POST ahora requiere permisos admin.

## 2026-11-20 – Inicio de sesión con 2FA obligatorio
- Rama/commit: main; sin commit.
- Qué cambió (web/backend/BD): backend exige código por correo antes de emitir una sesión; los intentos caducan a los 10 minutos, permiten cinco códigos incorrectos y son de un solo uso. Web no continúa si falla la comprobación o el envío. No cambia la BD. Los tokens anteriores sin 2FA dejan de servir.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta):
  - `POST /users/login`: cuerpo `{mail, contrasena, remember_me, device_id}`; respuesta `data: {requires_2fa: true, pending_token}` sin token de acceso.
  - `POST /users/2fa/check` y `POST /users/2fa/send`: cuerpo `{mail, device_id, pending_token}`; `check` responde `data: {requires_2fa: true}`; `send` confirma el envío.
  - `POST /users/2fa/verify`: cuerpo `{mail, device_id, pending_token, codigo}`; solo con código válido devuelve `data` con datos de usuario, `access_token` y `token_type`. La duración de la sesión depende de `remember_me` del login, no de verify.
  - `POST /register`: mantiene los datos de registro, pero ya no devuelve `access_token`; se debe iniciar sesión y completar 2FA.
  - Intento ausente: error de validación 422; inválido, caducado o asociado a otro correo/dispositivo: 401. El código incorrecto o error de correo devuelve `success: false`.
- Pantallas web afectadas: Login y verificación 2FA.
- Operación: los intentos viven en la memoria de un proceso; reiniciar lo invalida y varias instancias no los comparten. Sin `JWT_SECRET_KEY` configurada, la clave JWT es temporal y las sesiones se invalidan al reiniciar; para producción usar una clave secreta fuerte compartida por las instancias.
- Estado para móvil: pendiente. Flutter debe enviar `device_id` en login, conservar el `pending_token` solo para el intento y enviarlo en check/send/verify; no debe usar tokens anteriores ni continuar sin verify exitoso.

## 2026-11-08 – Navegación y editor de guion más cómodos
- Rama/commit: rama actual; sin commit.
- Qué cambió (web/backend/BD): web: navegación persistente por proyecto con regreso al panel según el rol y menú adaptable; los enlaces directos de guion y versión abren el contenido correspondiente. Crear guion, escribir una versión y editar usan una presentación más coherente y una barra compacta con modo y contexto. Se avisa antes de abandonar cambios de texto, metadatos o escenas y al cerrar o recargar la página; errores de guardado mantienen el borrador. Backend y BD sin cambios.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): ninguno.
- Pantallas web afectadas: Guion, Roles, Galería y Buscar código; navegación común de módulos de proyecto.
- Estado para móvil: pendiente (solo comportamiento web; sin cambios de API ni adaptación Flutter solicitada).

## 2026-11-08 – Número y parámetros del encabezado en el guion
- Rama/commit: rama actual; sin commit.
- Qué cambió (web/backend/BD): web: el formulario de escena muestra el nombre del proyecto activo (o indica que no se cargó) y escribe número, interior/exterior, ciudad y momento seleccionados en el bloque de escena. Al desactivar una opción se elimina del texto; al reabrir no se duplican número ni valores. Extracción y sincronización existentes se conservan; sin cambios de backend ni BD.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): ninguno.
- Pantallas web afectadas: Guion (crear escena, editar encabezado, crear guion desde cero, nueva versión y edición de versión).
- Estado para móvil: pendiente

Formato de cada entrada:

```
## AAAA-MM-DD – Título corto
- Rama/commit:
- Qué cambió (web/backend/BD):
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta):
- Pantallas web afectadas:
- Estado para móvil: pendiente | hecho en móvil (fecha)
```

## 2026-11-08 – Navegación persistente y escenas contextuales en el guion
- Rama/commit: rama actual; sin commit.
- Qué cambió (web/backend/BD):
  - Web: navegación principal persistente en módulos de proyecto, con rutas según el rol activo y menú móvil accesible; sin cambios de permisos.
  - Web: formulario de escena desde los editores de creación de guion, nueva versión y edición. Los encabezados se aplican al borrador conservando acción y diálogo. Tras guardar el documento se reconcilian las escenas por identificador/encabezado/número, preservando metadatos ajenos al documento y sin borrar filas. Los errores parciales son visibles y se pueden reintentar.
  - Backend/BD: sin cambios; usa las rutas y schemas ya existentes. No se consultaron ni alteraron datos reales.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): ninguno; la web sigue usando `GET /guiones/{id_guion}/escenas`, `POST /escenas` y `PATCH /escenas/{id_escena}` con sus contratos existentes.
- Pantallas web afectadas: Guion, Escenas, Rodaje, Desglose, Galería, Roles y Buscar código (navegación); creación, nueva versión y edición del guion (formulario contextual de escena).
- Estado para móvil: pendiente (cambio web solamente; no se modificó Flutter ni se solicita adaptación).

## 2026-11-01 – Códigos visibles en la web y módulo «Buscar código» (solo admin)
- Rama/commit: `feat/codigos-visibles` (solo commits locales).
- Qué cambió (web/backend):
  - Web: componente `CodigoChip` (etiqueta monoespaciada ≥12px, clic = copiar). Se muestra solo si el backend manda `codigo` (admin).
  - Backend: `codigo` ahora también en galería para personaje (PER) y lugar (LOC) además de OBJ/VES; en `escenas` de cada rodaje (ESC) y en el desglose por guion (ESC).
  - Nuevo módulo web `/buscar-codigo` (barra lateral del admin, ítem «Buscar código»); se quitó el cuadro de AdminDashboard. Deep-links nuevos: `/guion?guion=ID[&version=ID]` y `/escenas?guion=ID&escena=ID`.
- Endpoints modificados (campo opcional `codigo`, solo admin): `GET /projects/{id}/galeria` (ahora también personaje/lugar y respuesta de crear), `GET /projects/{id}/rodajes` y `GET /rodajes/{id}` (`escenas[].codigo`), `GET /guiones/{id}/desglose` (`[].codigo`). Sin cambios de contrato para no-admin (no reciben la clave).
- Pantallas web afectadas: Guion (tarjetas, ficha, versiones, personajes/escenarios del lateral), Escena (lista y ficha), Galería (tarjetas y ficha), Rodaje (jornadas, ficha y escenas), Desglose, AdminDashboard (código del proyecto), BuscarCodigo.
- Estado para móvil: pendiente

## 2026-11-01 – Códigos únicos legibles y buscador (solo admin)
- Rama/commit: `feat/codigos-y-buscador` (commits `feat(backend)` y `feat(web)`).
- Qué cambió (backend/BD/web):
  - Códigos `PRO, GUI, VGU, ESC, PER, LOC, OBJ, VES, DRO` con formato `TIPO-001` (consecutivo por proyecto y tipo; `PRO` global). Se generan solo en backend, con contador transaccional, y son inmutables (no se reutilizan).
  - BD: 2 tablas NUEVAS `codigos_contador` y `codigos_entidad` (no se tocan tablas existentes). NO se crean al arrancar; se crean con `scripts/migrar_codigos.py --apply` (por defecto es `--dry-run`). Sin migrar, la API sigue igual y `codigo` sale `null`.
- **Regla de visibilidad: SOLO admin del proyecto (id_rol 1001).** Los demás roles NO reciben el campo `codigo` (ni la clave). Móvil: no mostrar ni pedir el código si el campo no viene.
- Endpoints modificados (campo opcional `codigo`, solo admin): GET listar/detalle de guiones (`/guiones`, `/guiones/{id}`, versiones), escenas, personajes, escenarios (lugares), galería (OBJ/VES; personaje y lugar usan PER/LOC), rodajes, `GET /projects/{id}`. Las respuestas de crear/actualizar (rutas ya solo-admin) devuelven `codigo`; crear guion devuelve también `codigo_version`.
- Endpoint nuevo: `GET /projects/{id_project}/buscar-codigo?q=ESC-01` (solo admin, 403 a otros). `q`: 2–40 caracteres `A-Z0-9-` (se pasa a mayúsculas). Respuesta: `data: [{tipo, codigo, nombre, id_interno, destino}]` (máx. 25; coincidencia exacta, prefijo o parte). Errores: `INVALID_QUERY`, `CODES_NOT_READY` (migración sin aplicar). `destino` es una ruta web (`/galeria?item=ID`, `/rodaje?rodaje=ID`, etc.).
- Pantallas web afectadas: `AdminDashboard` (cuadro de búsqueda, solo admin), `Galeria` (`?item=`, `?tipo=`), `Rodaje` (`?rodaje=`).
- Pendiente / fuera de alcance: DES, REQ, GAL, tomas, fotos, QR; mostrar "Código FOCCUS" con botón copiar en cada ficha; deep-link de `Guion` (`?guion=&version=`) y `Escena` (`?guion=&escena=`) (hoy el buscador lleva a la pantalla pero no selecciona la entidad).
- Estado para móvil: pendiente

---

## 2026-11-01 – Guion por bloques (formato profesional) y base de UI
- Rama/commit: `feat/formato-guion-y-ui` (b3e4fdb y siguientes)
- Qué cambió (web/backend/BD): solo web. El contenido de `guion_version.contenido` sigue siendo HTML, pero ahora son bloques `<p class="gb gb-TIPO">` (escena, accion, personaje, parentesis, dialogo, transicion). Escena/personaje/transición en MAYÚSCULAS; paréntesis entre `( )`. Guiones antiguos se muestran con heurística y se normalizan al editarlos. Al crear un guion nuevo se crean filas `escenas` desde los encabezados INT./EXT. PDF generado en web (Carta, Courier 12, portada sin número, "N." desde pág. 2, (MÁS)/(CONT'D)). Tokens de diseño, foco visible, accesibilidad global y componente de estados (cargando/error/vacío).
- Endpoints nuevos o modificados: ninguno; sin cambios de BD.
- Pantallas web afectadas: Guion (editor, lector, PDF, lista), Theme global, todas (accesibilidad).
- Para móvil: lector con Courier Prime y sangrías proporcionales por tipo de bloque (`gb-*`), respetar MAYÚSCULAS/paréntesis, estados con acción (Reintentar / CTA), ≥12 px de texto.
- Estado para móvil: pendiente

---

_Fin de entradas._
