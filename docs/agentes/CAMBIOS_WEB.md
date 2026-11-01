# Cambios del web pendientes de adaptar a mÃ³vil

foccus-web agrega aquÃ­ cada cambio relevante (arriba lo mÃ¡s nuevo). foccus-mobile los adapta cuando el usuario lo pida y cambia el estado a `hecho en mÃ³vil`.

Formato de cada entrada:

```
## AAAA-MM-DD â€“ TÃ­tulo corto
- Rama/commit:
- QuÃ© cambiÃ³ (web/backend/BD):
- Endpoints nuevos o modificados (mÃ©todo, ruta, cuerpo, respuesta):
- Pantallas web afectadas:
- Estado para mÃ³vil: pendiente | hecho en mÃ³vil (fecha)
```

## 2026-11-01 â€“ CÃ³digos Ãºnicos legibles y buscador (solo admin)
- Rama/commit: `feat/codigos-y-buscador` (commits `feat(backend)` y `feat(web)`).
- QuÃ© cambiÃ³ (backend/BD/web):
  - CÃ³digos `PRO, GUI, VGU, ESC, PER, LOC, OBJ, VES, DRO` con formato `TIPO-001` (consecutivo por proyecto y tipo; `PRO` global). Se generan solo en backend, con contador transaccional, y son inmutables (no se reutilizan).
  - BD: 2 tablas NUEVAS `codigos_contador` y `codigos_entidad` (no se tocan tablas existentes). NO se crean al arrancar; se crean con `scripts/migrar_codigos.py --apply` (por defecto es `--dry-run`). Sin migrar, la API sigue igual y `codigo` sale `null`.
- **Regla de visibilidad: SOLO admin del proyecto (id_rol 1001).** Los demÃ¡s roles NO reciben el campo `codigo` (ni la clave). MÃ³vil: no mostrar ni pedir el cÃ³digo si el campo no viene.
- Endpoints modificados (campo opcional `codigo`, solo admin): GET listar/detalle de guiones (`/guiones`, `/guiones/{id}`, versiones), escenas, personajes, escenarios (lugares), galerÃ­a (OBJ/VES; personaje y lugar usan PER/LOC), rodajes, `GET /projects/{id}`. Las respuestas de crear/actualizar (rutas ya solo-admin) devuelven `codigo`; crear guion devuelve tambiÃ©n `codigo_version`.
- Endpoint nuevo: `GET /projects/{id_project}/buscar-codigo?q=ESC-01` (solo admin, 403 a otros). `q`: 2â€“40 caracteres `A-Z0-9-` (se pasa a mayÃºsculas). Respuesta: `data: [{tipo, codigo, nombre, id_interno, destino}]` (mÃ¡x. 25; coincidencia exacta, prefijo o parte). Errores: `INVALID_QUERY`, `CODES_NOT_READY` (migraciÃ³n sin aplicar). `destino` es una ruta web (`/galeria?item=ID`, `/rodaje?rodaje=ID`, etc.).
- Pantallas web afectadas: `AdminDashboard` (cuadro de bÃºsqueda, solo admin), `Galeria` (`?item=`, `?tipo=`), `Rodaje` (`?rodaje=`).
- Pendiente / fuera de alcance: DES, REQ, GAL, tomas, fotos, QR; mostrar "CÃ³digo FOCCUS" con botÃ³n copiar en cada ficha; deep-link de `Guion` (`?guion=&version=`) y `Escena` (`?guion=&escena=`) (hoy el buscador lleva a la pantalla pero no selecciona la entidad).
- Estado para mÃ³vil: pendiente

---

## 2026-11-01 â€“ Formato de guion (informe del investigador) â€“ adaptado en mÃ³vil
- Origen: `investigacion\2026-11-01-formato-guion.md` (secciÃ³n "Impacto en mÃ³vil").
- Hecho en mÃ³vil (rama `mobile`): lector con bloques de guion (escena, acciÃ³n, personaje, parÃ©ntesis, diÃ¡logo, transiciÃ³n) en Courier Prime con sangrÃ­as proporcionales, tamaÃ±o de letra ajustable y "â‰ˆ N min"; menÃº "Bloque" en el editor; editor en Courier Prime.
- LimitaciÃ³n: el mÃ³vil reconoce los bloques por el texto (mayÃºsculas, `INT./EXT.`, `CORTE A:`), porque el web aÃºn guarda el guion sin bloques tipados. Cuando foccus-web los implemente (`gb-*` o JSON), hay que cambiar `lib\models\guion_formato.dart`.
- Pendiente para foccus-web: estimaciÃ³n de minutos, PDF y portada desde el backend.
- Estado para mÃ³vil: hecho en mÃ³vil (2026-11-01), ajustar cuando el web tenga bloques tipados
## 2026-11-01 â€“ Guion por bloques (formato profesional) y base de UI
- Rama/commit: `feat/formato-guion-y-ui` (b3e4fdb y siguientes)
- QuÃ© cambiÃ³ (web/backend/BD): solo web. El contenido de `guion_version.contenido` sigue siendo HTML, pero ahora son bloques `<p class="gb gb-TIPO">` (escena, accion, personaje, parentesis, dialogo, transicion). Escena/personaje/transiciÃ³n en MAYÃšSCULAS; parÃ©ntesis entre `( )`. Guiones antiguos se muestran con heurÃ­stica y se normalizan al editarlos. Al crear un guion nuevo se crean filas `escenas` desde los encabezados INT./EXT. PDF generado en web (Carta, Courier 12, portada sin nÃºmero, "N." desde pÃ¡g. 2, (MÃS)/(CONT'D)). Tokens de diseÃ±o, foco visible, accesibilidad global y componente de estados (cargando/error/vacÃ­o).
- Endpoints nuevos o modificados: ninguno; sin cambios de BD.
- Pantallas web afectadas: Guion (editor, lector, PDF, lista), Theme global, todas (accesibilidad).
- Para mÃ³vil: lector con Courier Prime y sangrÃ­as proporcionales por tipo de bloque (`gb-*`), respetar MAYÃšSCULAS/parÃ©ntesis, estados con acciÃ³n (Reintentar / CTA), â‰¥12 px de texto.
- Estado para mÃ³vil: pendiente

---

_Fin de entradas._
