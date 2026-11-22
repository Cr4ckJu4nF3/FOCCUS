# Cambios del web pendientes de adaptar a móvil

foccus-web agrega aquí cada cambio relevante (arriba lo más nuevo). foccus-mobile los adapta cuando el usuario lo pida y cambia el estado a `hecho en móvil`.

## 2026-11-22 – Catálogo de bloques aplicado en Aiven
- BD: `catalogo_bloques` creada en `foccus`; catálogo inicialmente vacío,
  sin backfill. Contrato verificado y reversa en `bd/ESQUEMA.md` y
  `bd/MIGRACIONES.md`. Esta entrada actualiza el estado de la propuesta del
  2026-11-21.
- API y pantallas: sin modificaciones en este seguimiento; no se comprobó
  despliegue ni flujo HTTP de la aplicación.
- Estado para móvil: pendiente; no se modificó Flutter.

## 2026-11-22 – Asociación manual al copiar escenas antiguas
- Rama/commit: rama actual; sin commit.
- Qué cambió (web/backend/BD): si la versión no tiene un vínculo único `data-escena-id`, el editor permite elegir explícitamente el fragmento de origen y revisar una vista previa antes de abrir la ficha de copia. Encabezados repetidos e IDs duplicados también requieren selección manual; no se relaciona por encabezado ni por posición. Se conserva el formato y se crea una identidad independiente; no se copian fotos ni relaciones. Si el fragmento no contiene texto, no se inventa ni inserta contenido y se indica «Nueva escena» como alternativa. Cancelar no altera el borrador. Sin cambios de backend, esquema ni datos reales; se mantienen los dos modos previos de borrado.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): ninguno.
- Pantallas web afectadas: Guion, catálogo de escenas y selección/preview de fragmento de origen.
- Estado para móvil: no requiere adaptación; no cambian contratos ni Flutter.
- Validación y límites: `node --test src/utils/guionVersionEscenas.test.js` (8/8), ESLint focalizado en JSX/utilidades/prueba y `npm run build` pasan; build mantiene el aviso de tamaño de chunks. La asociación manual solo ofrece fragmentos que la versión actual de origen permita leer; si no existe texto editable o ningún fragmento con cuerpo, se detiene sin copiar. No se inspeccionó ni modificó BD real.

## 2026-11-21 – Copia y borrado seguro de escenas
- Rama/commit: `main`; sin commit.
- Qué cambió (web/backend/BD): copiar escena crea una ficha independiente y copia únicamente su fragmento HTML completo con formato y datos escalares; no copia continuidad, rodaje, desglose, galería ni relaciones. «Quitar de versión» solo retira texto del borrador; «Eliminar ficha» borra ficha y datos escena-específicos, conservando el HTML histórico, los recursos de galería y las relaciones compartidas. Se guarda HTML y fichas en una transacción; si no hay vínculo explícito o es ambiguo, se muestra error. Sin migración ni cambios en estructura/datos reales.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): `POST /guiones/texto` y `POST /guiones/{id_guion}/versiones/texto` aceptan opcionalmente `acciones_escena`, lista de acciones `crear` (incluye `client_key`) y `actualizar` (incluye `id_escena`), ligada al HTML mediante `data-escena-key` / `data-escena-id`. Los cuerpos anteriores siguen válidos. `DELETE /escenas/{id_escena}` conserva ruta, cuerpo y respuesta exitosa; ahora limpia continuidad, vínculos y fichas auxiliares no compartidas, sin modificar versiones de guion.
- Pantallas web afectadas: Guion (crear, nueva versión, editar, copiar y quitar de versión); Escenas (confirmación de eliminación global). Mensajes del catálogo de bloques incluyen detalle HTTP y distinguen fallos de tabla/servidor como hipótesis no verificadas, sin alterar persistencia.
- Estado para móvil: pendiente; las rutas existentes conservan contratos anteriores y `acciones_escena` es opcional, por lo que móvil no requiere cambio para continuar usando los flujos previos.

## 2026-11-21 – Bloques reutilizables por proyecto
- Rama/commit: `main`; sin commit.
- Qué cambió (web/backend/BD): guardado automático por ráfagas y antes de retirar bloques de acción, diálogo, paréntesis y transición; catálogo independiente de las versiones, con búsqueda, vista e inserción. Fallos se muestran y pueden reintentarse mientras la página siga abierta. La tabla requiere la migración offline de `foccus-bd`, no aplicada en ninguna BD real.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): `GET /proyectos/{id_project}/catalogo-bloques?tipo=accion&q=texto` para miembros, devuelve lista `[{id_catalogo_bloque,id_project,tipo,html}]`; `POST` a la misma ruta para admin (`id_rol` 1001), cuerpo `{"tipo":"accion","html":"<p class=\"gb gb-accion\">Texto</p>"}`, devuelve el mismo objeto e ignora duplicados idénticos. JWT y `X-Project-Id` del proyecto; 401/403 sin acceso, 422 datos inválidos y 503 si falla BD. Tipos permitidos: `accion`, `dialogo`, `parentesis`, `transicion`; HTML seguro limitado a 30000 caracteres.
- Pantallas web afectadas: Guion, creación desde cero, nueva versión y edición.
- Estado para móvil: pendiente; no se modificó Flutter ni los contratos anteriores.

## 2026-11-21 – Catálogo de bloques: propuesta de BD
- Estado: DDL offline propuesto, **no aplicado**; sin cambios en web, backend, móvil ni endpoints. Contrato y riesgos en `bd/ESQUEMA.md` y `bd/MIGRACIONES.md`.
- Para móvil: pendiente de definir y adaptar cuando exista el contrato API; quitar un bloque del guion no debe eliminar la ficha reutilizable.

## 2026-11-21 – Selector de escenas reutilizables
- Rama/commit: `main`; sin commit.
- Qué cambió (web/backend/BD): el botón «Escena» abre el catálogo de fichas de todo el proyecto con búsqueda, consulta de campos y origen del guion. «Nueva escena» conserva la creación y «Editar ficha» conserva el acceso contextual de edición. Una ficha del guion destino conserva su identidad; una de otro guion se crea como ficha independiente, sin copiar vínculos de rodaje/desglose. Los conflictos de identidad o numeración se informan y no se resuelven por coincidencia de encabezado únicamente. Las sincronizaciones fallidas quedan en `localStorage` aisladas por proyecto y se pueden reintentar tras recargar. Se permite guardar texto en modo escenas aunque algún bloque no tenga encabezado; las fichas existentes se conservan. No se modificó esquema ni BD real.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): nuevo `GET /projects/{id_project}/escenas`, requiere token, membresía y `X-Project-Id` coincidente; devuelve `{success,message,data}` con las fichas del proyecto y `nombre_guion`. Las lecturas `GET /guiones/{id_guion}/escenas` y `GET /escenas/{id_escena}` y el borrado `DELETE /escenas/{id_escena}` filtran ahora por el proyecto activo; contrato de éxito existente conservado. Continúa el lote `POST /guiones/{id_guion}/escenas/sincronizar` descrito abajo.
- Pantallas web afectadas: Guion (crear desde cero, nueva versión, edición del contenido y selector de Personaje/Lugar/Objeto).
- Estado para móvil: pendiente; no se modificó Flutter. El GET nuevo permite listar escenas de un proyecto; la persistencia de fallos de sincronización aplica únicamente al editor web.

## 2026-11-21 – Sincronización de escenas por lote
- Rama/commit: `main`; sin commit.
- Qué cambió (web/backend/BD): la sincronización de fichas del editor usa un lote transaccional; se eliminó el primer intento individual que ignoraba errores al crear el guion. No cambia el esquema ni los endpoints anteriores. La versión y las fichas aún se guardan por separado: un error se informa; el reintento se conserva ahora entre recargas en el almacenamiento local del navegador, separado por proyecto.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): `POST /guiones/{id_guion}/escenas/sincronizar`, administrador del proyecto, JWT y `X-Project-Id`; cuerpo `{"acciones":[{"tipo":"crear","payload":{"numero_de_escena":"1","encabezado":"INT. CASA"}},{"tipo":"actualizar","id_escena":"esc0001","payload":{"descripcion":"Texto"}}]}`. Respuesta habitual `{success,message,data,error}` con fichas en el orden de las acciones; 409 para conflictos, 404 para recursos ajenos o inexistentes, 422 para datos inválidos. Sin eliminaciones; en actualizaciones se conservan campos omitidos.
- Pantallas web afectadas: editor de guiones (creación, nueva versión y edición). El selector y la copia entre guiones se documentan en la entrada posterior.
- Estado para móvil: pendiente; no se solicitó modificar Flutter.

## 2026-11-20 – Validación de importación de desglose y cronograma
- Rama/commit: `main`; sin commit.
- Qué cambió (web/backend/BD): los dos importadores reconocen y rechazan con mensaje claro archivos que no son PDF; el plan de rodaje rechaza fechas no válidas antes de modificar datos. Se corrige el análisis de encabezados `INT.`/`EXT.` y momentos en mayúsculas. Sin cambios de esquema ni de BD real.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): `POST /guiones/{id_guion}/desglose/importar` y `POST /projects/{id_project}/rodajes/importar`; cuerpo exitoso sin cambios. Respuesta de error existente `{success, message, data, error}` ahora usa `UNSUPPORTED_FILE_FORMAT` para archivos que no sean PDF; el rodaje también usa `INVALID_SCHEDULE_DATE` si una fecha no se reconoce. PDF dañado conserva `PDF_READ_ERROR` con mensaje genérico.
- Pantallas web afectadas: Desglose y Rodaje; los formularios existentes muestran el mensaje del backend, no requieren cambios.
- Estado para móvil: pendiente; adaptación móvil excluida de esta tarea.

## 2026-11-20 – Corrección transaccional del borrado de guiones
- Rama/commit: `main`; sin commit.
- Qué cambió (web/backend/BD): backend elimina desgloses y requerimientos solo si ninguna otra escena los referencia; conserva elementos, versiones y fotos de galería, desvinculando las referencias al guion y escenas borrados. Si falla la limpieza de códigos o su comprobación, revierte la transacción; solo omite códigos si la tabla no existe. Sin cambios de esquema.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): `DELETE /guiones/{id_guion}`; sin cambios de método, cuerpo ni respuesta exitosa. Un fallo de base de datos se propaga como error del servidor en lugar de comunicar éxito.
- Pantallas web afectadas: ninguna modificada.
- Estado para móvil: pendiente; no se solicitó adaptación.

## 2026-11-20 – Limpieza completa al eliminar guiones
- Rama/commit: rama actual; sin commit.
- Qué cambió (web/backend/BD): `DELETE /guiones/{id_guion}` elimina las notas, versiones, escenas y continuidades asociadas, además de los códigos públicos y archivos propios del guion. El borrado sigue siendo transaccional en BD; los archivos se limpian después del commit y un fallo físico devuelve `error: "FILE_CLEANUP_FAILED"` con rutas pendientes. Sin cambios de esquema.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): `DELETE /guiones/{id_guion}`; sin cambios de método, ruta ni cuerpo. Éxito conserva `{success, message, data, error}`; el fallo posterior al commit informa explícitamente los archivos pendientes. Recursos de otro proyecto siguen respondiendo 404; sin autenticación sigue respondiendo 401.
- Pantallas web afectadas: Guion; el flujo existente muestra el mensaje de error devuelto y actualiza la lista tras éxito.
- Estado para móvil: pendiente; el usuario excluyó adaptación móvil por ahora. No se modificó Flutter.

## 2026-11-20 – Limpieza de códigos al borrar proyectos
- Rama/commit: `main`; sin commit.
- Qué cambió (web/backend/BD): backend elimina los códigos del proyecto y sus entidades en la misma transacción de borrado, sin tocar contadores ni códigos de otros proyectos. Sin cambios de esquema ni operaciones sobre datos reales.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): `DELETE /projects/{id}` y `POST /projects/{id}/delete`; sin cuerpo y con respuesta exitosa sin cambios. Si falla la limpieza de códigos, se revierte la transacción.
- Pantallas web afectadas: ninguna modificada.
- Estado para móvil: pendiente; no se solicitó adaptación y no cambia la forma de la respuesta exitosa.

## 2026-11-20 – Protección de la recuperación de cuentas invitadas
- Rama/commit: `main`; sin commit.
- Qué cambió (web/backend/BD): backend genera códigos de recuperación y contraseñas temporales de invitación con aleatoriedad criptográfica. Un código de recuperación solo queda disponible si se envía el correo; cinco errores entre verificación y cambio invalidan el código. Hay una espera de 60 segundos entre solicitudes exitosas por correo. El estado y los límites son en memoria por proceso: no protegen conjuntamente varios workers ni sobreviven reinicios. Sin cambios de BD ni de pantallas.
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta): `POST /users/recover-password` mantiene `{mail}` y la respuesta habitual, pero puede devolver `success: false, error: "RATE_LIMITED"` durante la espera; el fallo SMTP devuelve `MAIL_ERROR` y no deja un código válido. `POST /users/verify-recovery-code` mantiene `{mail, codigo}` y `POST /users/reset-password` mantiene `{mail, codigo, nueva_contrasena}`; comparten el límite de cinco errores, tras el cual el código ya no existe. No hay endpoint de reenvío de invitación.
- Pantallas web afectadas: ninguna; la pantalla existente de recuperación muestra el mensaje de error del backend.
- Estado para móvil: pendiente; no se solicitó adaptación. Clientes deben manejar `RATE_LIMITED` y solicitar un nuevo código cuando el anterior se invalide.

## 2026-11-20 – Autorización de recursos por proyecto y edición de procesos
- Rama/commit: `main`, `bb4295222290cfb7705893995003b46fe01c8f26`.
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
