# Cambios del web pendientes de adaptar a móvil

foccus-web agrega aquí cada cambio relevante (arriba lo más nuevo). foccus-mobile los adapta cuando el usuario lo pida y cambia el estado a `hecho en móvil`.

Formato de cada entrada:

```
## AAAA-MM-DD – Título corto
- Rama/commit:
- Qué cambió (web/backend/BD):
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta):
- Pantallas web afectadas:
- Estado para móvil: pendiente | hecho en móvil (fecha)
```

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
