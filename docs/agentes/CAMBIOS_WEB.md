# Cambios del web pendientes de adaptar a móvil

foccus-web agrega aquí cada cambio relevante (arriba lo más nuevo). foccus-mobile los adapta cuando el usuario lo pida y cambia el estado a `hecho en móvil`.

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
