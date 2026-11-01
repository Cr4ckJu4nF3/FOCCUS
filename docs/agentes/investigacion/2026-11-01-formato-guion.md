# Formato profesional de guion y comparación con otras plataformas

Fecha: 2026-11-01 · Autor: foccus-investigador · Para: foccus-web (y luego foccus-mobile)

## Resumen
- El "APA de los guiones" es el **formato de guion de cine estándar**: Courier 12, hoja Carta, márgenes 1.5" izq / 1" der / 1" arriba y abajo, y **seis tipos de bloque** (encabezado de escena, acción, personaje, paréntesis, diálogo, transición), cada uno con su sangría fija. Con eso 1 página ≈ 1 minuto.
- Final Draft, Fade In, WriterDuet, Arc Studio, Celtx y Highland **no dejan al usuario "dar formato"**: el usuario elige el *tipo de bloque* y el programa pone sangría, mayúsculas y saltos. Se escribe con teclado (Enter/Tab cambia el tipo de bloque).
- FOCCUS hoy usa un editor de texto enriquecido tipo Word (negrita, listas, alinear, fuente Georgia en pantalla) y guarda HTML libre. **Eso es lo opuesto al modelo de las plataformas profesionales**; por eso el guion no se ve ni se exporta como guion real (PDF en Courier 10 sin sangrías, sin numeración de escenas, sin portada).
- Recomendación central: pasar de "HTML libre" a **bloques tipados** (escena, acción, personaje, paréntesis, diálogo, transición) con estilos CSS fijos en Courier 12, y exportar PDF/Fountain con esas reglas. Es viable en un proyecto estudiantil si se hace por fases.

## Qué dice la industria (con fuentes/URL)
Leyenda: **[Hecho]** verificado en fuente consultada · **[Estándar]** convención de la industria ampliamente aceptada · **[Sugerencia]** opinión mía.

### 1. Reglas de formato (inglés, estándar de Hollywood)
- **[Estándar]** Fuente Courier / Courier New / Courier Prime 12 pt, interlineado simple, ~55 líneas por página, papel Carta (EE. UU., y también el habitual en México y gran parte de Latinoamérica; España usa A4). Fuente consultada: https://filmdaft.com/screenplay-margins/ y https://skrib.com/blog/screenplay-format-template-and-example
- **[Estándar]** Márgenes de página: izquierdo 1.5" (3.8 cm, por la encuadernación), derecho 1", superior 1", inferior 1".
- **[Estándar]** Posiciones horizontales (medidas desde el borde izquierdo de la hoja, valores por defecto de Final Draft):

| Bloque | Inicio | Fin | Formato |
|---|---|---|---|
| Encabezado de escena | 1.5" | 7.5" | MAYÚSCULAS, alineado a la izquierda |
| Acción | 1.5" | 7.5" | Mayúscula/minúscula normal, presente |
| Personaje | 3.7" | ~7.25" | MAYÚSCULAS |
| Paréntesis | 3.1" | ~5.5" | minúscula, entre paréntesis, bajo el personaje |
| Diálogo | 2.5" | 6.0" (≈3.5" de ancho) | normal |
| Transición | 6.0" | 7.5" | MAYÚSCULAS, a la derecha, termina en `:` (ej. CORTE A:) |

- **[Estándar]** Líneas en blanco: una línea vacía antes de cada encabezado de escena, acción y personaje; ninguna entre personaje, paréntesis y diálogo.
- **[Estándar]** Encabezado de escena = `INT./EXT.` + LOCACIÓN + momento del día. Separador: guion (` - `) o punto; lo importante es ser **consistente**. Variante bilingüe en español: `INT. COCINA DE LA ABUELA - NOCHE`. Fuente: https://escaleta.mx/guias/formato-de-guion
- **[Estándar]** Extensiones del personaje junto al nombre: `(V.O.)` voz en off, `(O.S.)` fuera de cuadro (en español también se ve `(V.O.)` y `(F.C.)`/`(OFF)`; elegir una y ser consistente).
- **[Estándar]** `(CONT'D)` (continuación) cuando el mismo personaje sigue hablando tras una acción; `(MORE)` + `PERSONAJE (CONT'D)` cuando un diálogo se parte entre páginas. Los programas lo ponen **automático**.
- **[Estándar]** Diálogo dual (dos personajes hablando a la vez): dos columnas lado a lado. Lo soportan Final Draft, Fade In, WriterDuet y Fountain (`^` tras el personaje). Es raro; opcional.
- **[Estándar]** Numeración de escenas: **solo en guion de rodaje** (shooting script), a ambos márgenes del encabezado (1, 2, 3…; escenas añadidas posteriormente: 12A, 12B). En el guion de venta/lectura NO se numeran.
- **[Estándar]** Numeración de páginas: arriba a la derecha, "1." , desde la página 2; la portada no cuenta.
- **[Estándar]** Portada: título centrado, "escrito por", autor, y abajo a la izquierda datos de contacto/borrador/fecha. Sin imágenes ni numeración.
- **[Estándar]** Regla de duración: 1 página ≈ 1 minuto de pantalla (largometraje típico 90-120 págs; capítulo de TV de 1 hora ≈ 50-60 págs; de 30 min ≈ 22-35 págs). Es aproximada; la acción pesada o el diálogo rápido la distorsionan.
- **[Estándar]** Notas, revisiones: en producción, cada tanda de cambios se imprime en **páginas de color** en orden fijo (blanco, azul, rosa, amarillo, verde, naranja, … ) y las líneas modificadas se marcan con asterisco `*` en el margen derecho. Las páginas añadidas llevan sufijo (12A). Las plataformas modernas lo automatizan (Final Draft "Revision Mode", WriterDuet, Fade In).

### 2. Variantes en español / Latinoamérica
- **[Hecho]** El formato es el mismo de Hollywood (Courier 12, mismos márgenes); lo que cambia es el idioma de los marcadores: INT./EXT. se mantienen, "DÍA/NOCHE", transiciones como "CORTE A:", "FUNDIDO A NEGRO:". Fuentes: https://escaleta.mx/guias/formato-de-guion y https://www.danitzayanez.com/formato-de-guion-cinematografico/
- **[Hecho]** Se distingue **guion literario** (lo que se escribe y se envía a productoras: escenas, acción, diálogo; sin planos de cámara) y **guion técnico** (lo hace el director: numeración de escenas, planos, movimientos de cámara, sonido). FOCCUS debe soportar el literario; el técnico se solapa con "desglose/plan de rodaje".
- **[Sugerencia]** Algunas escuelas de cine y teatro en Latinoamérica usan formato a dos columnas (imagen | sonido) para guion de documental, publicidad o TV. No es el estándar de ficción; dejarlo como "no necesario".
- **[Sugerencia]** Cada institución puede pedir su propia plantilla; conviene permitir que el docente/proyecto indique la regla (ej. "INT. - LUGAR - DÍA" vs "INT. LUGAR. DÍA.") en configuración, pero por defecto usar la del ejemplo.

### 3. Formato Fountain (texto plano abierto)
- **[Hecho]** Regla de oro: "que parezca un guion". Encabezado empieza con INT/EXT; personaje en MAYÚSCULAS; diálogo justo debajo; paréntesis entre ( ); transiciones terminan en `TO:` (o forzadas con `>`). Fuente oficial: https://fountain.io/syntax/
- **[Hecho]** Sintaxis extra relevante: notas `[[nota]]`, secciones `#`, sinopsis `=`, centrado `> texto <`, diálogo dual con `^`, escenas numeradas `#12#`, saltos de página `===`.
- **[Sugerencia]** Fountain es la mejor opción de **importación/exportación** para un proyecto estudiantil: es texto plano, hay parsers en JS/Python/Dart, no depende de licencia.

### 4. Cómo se comparan las plataformas (conocimiento general; verificar al implementar)
| Plataforma | Modelo | Lo relevante para FOCCUS |
|---|---|---|
| **Final Draft** (referente principal) | Editor de bloques tipados; Tab/Enter cambia de tipo; autocompleta nombres y locaciones; CONT'D/MORE automáticos; Revision Mode por colores; numeración de escenas; Navigator por escenas; guardado nativo en **.fdx** (XML) | Meta de comportamiento. FDX es XML con `<Paragraph Type="Scene Heading">…`; FOCCUS ya lo extrae en `guion_content.py` |
| **Celtx** | Web; guion + desglose (breakdown) + presupuesto/plan de rodaje | Muestra el enlace guion → desglose, que es el espíritu de FOCCUS |
| **WriterDuet** | Colaboración en tiempo real, revisiones por color, importa/exporta Fountain y FDX | Referente para historial de versiones y notas |
| **Fade In** | Editor ligero, bloques tipados, importa/exporta FDX, Fountain, PDF | Prueba de que un editor sencillo basta |
| **Highland (2)** | Escribe en Fountain, vista de página formateada | Evidencia de que "texto plano + render" funciona |
| **Arc Studio** | Web/colaborativo, diseño moderno, "Story Developer", exporta PDF/FDX/Fountain | Referente UX |
| **StudioBinder** | Guion + desglose + calendario + hoja de llamado + shot list + storyboard | Su flujo "guion → etiquetar elementos → tabla de desglose → plan de rodaje → hoja de llamado" es el que FOCCUS replica |
| **Movie Magic Scheduling / Scenechronize** | Producción: tableros de tiras (stripboard), calendarios, reportes | Excesivo para el alcance estudiantil; solo inspiración |

**Nota honesta:** la tabla anterior sintetiza características publicadas por los fabricantes y reseñas generales; no pude abrir la documentación oficial de Final Draft/StudioBinder (StudioBinder devolvió 403 al lector). Verificar el detalle fino (atajos, colores exactos de revisión) en la ayuda oficial antes de prometerlo: https://www.finaldraft.com/ , https://www.studiobinder.com/ , https://www.writerduet.com/ , https://www.fadeinpro.com/ , https://www.arcstudiopro.com/ , https://www.celtx.com/ , https://quoteunquoteapps.com/highland/.

### 5. Flujo real de un set (para entender qué consume el guion)
1. Guion bloqueado → **desglose** (breakdown): por escena se etiquetan personajes, locación, utilería, vestuario, maquillaje, vehículos, etc. (**[Estándar]**).
2. **Plan de rodaje** agrupa escenas por locación/disponibilidad de actores; no sigue el orden del guion.
3. **Hoja de llamado** diaria (call sheet) con escenas, horarios, elenco.
4. **Script supervisor / continuista**: anota por toma qué se filmó, y mantiene continuidad (vestuario, utilería, posiciones, estado del personaje) con fotos y reportes diarios.
5. Los cambios de guion llegan como **revisiones por color** y deben propagarse al equipo.

Todo esto necesita **escenas como entidades numeradas e identificables**, no un solo bloque HTML.

## Estado actual en FOCCUS (qué hay y qué falta)
Archivos revisados: `frontend/src/screen/Guion.jsx`, `frontend/src/desing/Guion.css`, `backend/api_usuarios/app/routes/guion_routes.py`, `controllers/guion_controller.py`, `utils/guion_content.py`, `models/guion_version_model.py`, `models/guion_nota_model.py`.

### Lo que ya está bien
- Versionado de guion (número de versión, estado, fecha, comentario) y cambio de estado (`PATCH …/versiones/{id}/estado`). Es un buen punto de partida para "revisiones".
- Dos orígenes: escrito en el sistema (`contenido` LONGTEXT) o archivo PDF/DOCX/FDX con extracción de texto (`guion_content.py`).
- Modo "por escenas": cada escena se guarda como fila en la tabla `escenas` (`numero_de_escena`, `encabezado`, `descripcion`), útil para desglose.
- Selector de locación con `INT./EXT.` + `DÍA/NOCHE/AMANECER/ATARDECER` que genera encabezado en mayúsculas; inserta personajes en MAYÚSCULAS.
- Insertar bloque de diálogo y transición; notas por versión (`guion_nota`, endpoints existentes aunque la UI del guion no los usa).
- Descarga PDF con jsPDF en tamaño Carta, Courier y paginación.
- Sanitización de HTML al guardar (`limpiarHtmlGuion`).

### Lo que está mal o falta (frente al estándar)
1. **Editor tipo Word, no tipo guion (problema principal).** `contentEditable` con negrita/cursiva/listas/alinear/justificar/sub-superíndice/resaltar/sangría genérica. El usuario "alinea" a mano; no hay concepto de bloque (escena/acción/personaje/diálogo). Consecuencia: formato inconsistente y no exportable.
2. **Tipografía y página en pantalla:** `.guion-editor-surface` usa `Georgia` 1.02rem, interlineado 1.8, ancho `min(100%, 900px)`. No hay Courier 12, no hay ancho de página Carta (6" de texto), no hay sangrías por bloque. En el lector (`.guion-reader__text`) sí hay Courier pero a ~0.94rem y `<pre>` sin sangrías porque `htmlATextoPlano` aplana todo.
3. **El lector pierde la estructura:** `htmlATextoPlano` convierte el HTML en texto plano; centrados/derecha/negritas se pierden al leer. El diálogo no queda sangrado.
4. **PDF exportado no es de guion:** Courier **10** pt, margen izquierdo 25 mm (no 38 mm), todo pegado a la izquierda (sin sangrías de personaje/diálogo/transición), sin numeración arriba a la derecha en formato "N.", pie `1 / N` en Helvetica, título en Helvetica 18 en la misma primera hoja (no hay portada), 5 mm por línea (≈ 40 líneas, no 55). Resultado: **más de 1 página ≠ 1 minuto**.
5. **Encabezado de escena no es una entidad:**
   - En modo escenas se antepone `<h3>ESCENA N</h3>` (no es parte de un guion real; el estándar no escribe "ESCENA 1" sino `1 INT. LUGAR - DÍA`).
   - `insertarEscenaEnEdicion` inserta `<h1>ESCENA n</h1>` y detecta escenas con una regex de texto: frágil.
   - El `encabezado` de la tabla `escenas` se toma de **la primera línea de texto**, que puede no ser un encabezado válido.
   - No hay numeración con letras (12A), ni se ve el número a ambos márgenes.
6. **Falta CONT'D/MORE, diálogo dual, extensiones (V.O./O.S.), paréntesis con formato propio** (el bloque de diálogo es solo `<p>` centrados; el estándar NO centra el diálogo: lo sangra, texto a la izquierda).
7. **Diálogo insertado centrado:** `insertarBloqueEditor` y la inserción de personaje usan `text-align:center`. El estándar es bloque con sangría izquierda, no texto centrado (el nombre del personaje se ve parecido al centrado, pero el diálogo no).
8. **Sin portada** (título, autor, fecha, contacto, borrador) ni metadatos de autor/derechos.
9. **Sin revisiones por color** (hay estados de versión pero no color ni marca de líneas cambiadas); sin comparación entre versiones.
10. **Sin notas dentro del texto ni en la UI** (el backend las tiene; en front hay botón "Cita / nota" como `<blockquote>`, que no se filtra en `limpiarHtmlGuion` y se elimina al guardar porque `BLOCKQUOTE` no está en `etiquetasPermitidas`).
11. **Pérdida de formato por el sanitizador:** `limpiarHtmlGuion` solo permite `text-align` y descarta `BLOCKQUOTE`, `S/STRIKE`, `SUP/SUB`, `MARK` o `FONT`/`SPAN style` con color (al ejecutar "resaltar", "tachado", "súper/subíndice" desaparecen al guardar). Botones que no persisten = bug de UX.
12. **Estados de versión incoherentes entre capas:** `guion_version.estado` es `String(20)` y el comentario del modelo dice "Borrador | Revision | Aprobado | En Rodaje | Archivado", mientras el front ofrece 8 valores (`Pendiente`, `En revisión`, `Completado`, `Finalizado`…). "Finalizado" (10) cabe, pero conviene unificar (es riesgo de datos/validación).
13. **Importación:** FDX se extrae como párrafos sin leer `Type=` (se pierde si es escena/personaje/diálogo); DOCX/PDF se extraen línea a línea. No se detectan bloques automáticamente. No existe importación/exportación Fountain; tampoco exportar FDX.
14. **Móvil:** el guion es HTML; en pantallas pequeñas hay que re-mapear sangrías (ver abajo).

## Recomendación para foccus-web

### Decisión de diseño (la más importante)
Pasar de "HTML libre" a **documento de bloques**. Guardar en `guion_version.contenido` (LONGTEXT) un **JSON** (o Fountain) como fuente de verdad, y renderizar a HTML/PDF. Alternativa de menor esfuerzo (recomendada para empezar): seguir guardando HTML pero **solo con clases de bloque** (`<p class="gb gb-escena">…`), sin estilos inline ni alineación manual.

Tipos de bloque (nombres internos): `escena`, `accion`, `personaje`, `parentesis`, `dialogo`, `transicion`, y opcionalmente `nota`, `titulo-seccion`.

### Alta prioridad
1. **Editor por bloques con teclado estilo Final Draft (frontend).**
   - Selector del tipo de bloque en la barra (una lista: Escena / Acción / Personaje / Paréntesis / Diálogo / Transición) y **eliminar** o esconder: justificar, sangría genérica, listas, sub/superíndice, resaltar, tachar, cita, línea separadora, fuente/alineación libre. Se mantiene: negrita, cursiva, subrayado, deshacer/rehacer.
   - Reglas de flujo (igual a Final Draft/Fountain):
     - Tras **Escena** → Enter → **Acción**.
     - Tras **Personaje** → Enter → **Diálogo**; Tab en un diálogo vacío → **Paréntesis**; tras Paréntesis → Enter → Diálogo.
     - Tras **Diálogo** → Enter → Acción (o Personaje con una acción de menú); Tab → cambia el tipo de la línea vacía por ciclo.
     - Tras **Acción** → Tab → Personaje; Tras **Transición** → Enter → Escena.
   - Auto-mayúsculas en `escena`, `personaje` y `transicion` (por CSS `text-transform: uppercase` + guardar ya en mayúsculas).
   - Auto-completado de personajes (la lista `personajes` ya existe) y de locaciones (`escenarios`) al escribir.
2. **CSS de página de guion (frontend, `Guion.css`):** clase `.guion-pagina` con fuente `"Courier Prime","Courier New",Courier,monospace`, `font-size: 12pt`, `line-height: 1` (≈ 1 línea = 12 pt = 1/6"), ancho de texto 6" (=72ch aprox. de 10 cpi: 60 caracteres por línea a 12 pt) y márgenes visuales 1.5" izq. En pantalla, usa `ch` para que escale:

   | Clase | `margin-left` | `width`/`max-width` | Otras |
   |---|---|---|---|
   | `.gb-escena` | 0 | 6" | MAYÚSC., negrita opcional (Final Draft la deja sin negrita; muchas guías sí la permiten), margen superior 1 línea |
   | `.gb-accion` | 0 | 6" | margen superior 1 línea |
   | `.gb-personaje` | 2.2" | 3.3" | MAYÚSC., margen sup. 1 línea |
   | `.gb-parentesis` | 1.6" | 2.5" | minúsc., encerrado en `( )` |
   | `.gb-dialogo` | 1.0" | 3.5" | |
   | `.gb-transicion` | 4.5" (o `text-align:right`) | 1.5" | MAYÚSC., a la derecha |

   (Equivalencias medidas desde el margen izquierdo del texto, que empieza en 1.5" de la hoja: personaje 3.7"→2.2", paréntesis 3.1"→1.6", diálogo 2.5"→1.0", transición 6.0"→4.5".)
3. **Lector y PDF con la misma plantilla (frontend).** Reemplazar `htmlATextoPlano` + `<pre>` por render de los bloques con las clases anteriores. Para el PDF con `jsPDF`: Carta, Courier 12, interlineado 12 pt (≈ 55 líneas/pág.), márgenes 38.1 mm izq / 25.4 mm der / 25.4 mm arriba y abajo; sangrías en mm (personaje 55.9 mm desde el margen, diálogo 25.4 mm, paréntesis 40.6 mm, transición 114.3 mm) sumadas al margen izquierdo; **número de página arriba a la derecha "2."** desde la página 2; **sin** `n / total` abajo. Un diálogo no debe quedar con el personaje solo al final de página (keep-with-next); si se parte: `(MORE)` y `NOMBRE (CONT'D)`.
4. **Encabezado de escena estructurado (backend + BD).**
   - Al guardar una versión de texto, parsear los bloques `escena` y **sincronizar** la tabla `escenas` (número, tipo INT./EXT., locación, momento) en lugar de depender de "la primera línea".
   - Añadir a `escenas` (si no existen): `tipo` (`INT`,`EXT`,`INT/EXT`), `locacion`, `momento`, `numero_de_escena` string (permite `12A`).
   - Quitar `<h3>ESCENA N</h3>`/`<h1>ESCENA n</h1>`: el número de escena es **metadato** y se muestra en márgenes solo si el guion es de "rodaje" (opción).
5. **Corregir el sanitizador** (`limpiarHtmlGuion`) para permitir solo `P` con `class` que empiece por `gb-`, `B/I/U/STRONG/EM`, `BR`; descartar el resto. Hoy botones como "resaltar" o "tachar" se pierden al guardar.
6. **Quitar centrado manual** del diálogo y del personaje al insertar fichas: usar `gb-personaje` y `gb-dialogo`.

### Media prioridad
7. **Portada (título, autor, contacto, borrador, fecha):** campos en `guion` (`autor`, `contacto`, `fecha_borrador`) y generar la hoja 1 del PDF con título centrado ~ 1/3 de la página, "escrito por", autor; contacto abajo izquierda. Sin número de página.
8. **CONT'D automático** y extensiones `(V.O.)`/`(O.S.)` (lista desplegable al lado del personaje). CONT'D/MORE al paginar se puede resolver solo en el PDF (calcular salto de página), no en el editor.
9. **Numeración de escenas opcional** ("guion de rodaje") con interruptor por versión; números en ambos márgenes del encabezado; al insertar escena entre 12 y 13 → `12A`. Bloquear la renumeración una vez en "En Rodaje" (esto encaja con el estado que ya existe).
10. **Importación/exportación Fountain.** Conversión texto ↔ bloques; es más sencilla que FDX y permite abrir en Highland/WriterDuet/Fade In. Librería sugerida (a evaluar): `fountain-js` / `screenplay-js` en frontend o `fountain` en Python para backend. Fuente: https://fountain.io/syntax/
11. **Importar FDX respetando `Type`** (Scene Heading, Action, Character, Parenthetical, Dialogue, Transition) → mapear a los bloques. Hoy `_extraer_fdx` ignora `Type`. Exportar FDX = generar XML con `<Paragraph Type="…"><Text>…</Text></Paragraph>` (estructura simple, pero **verificar contra un archivo real de Final Draft** antes de prometer compatibilidad).
12. **Estados de versión:** unificar la lista (front, esquema, comentario del modelo). Propuesta: `Borrador, En revisión, Aprobado, En Rodaje, Archivado` (+ las que ya usan). Documentar.
13. **Notas** (usar `guion_nota` que ya existe en backend): panel lateral de notas por versión; en texto, notas inline `[[…]]` que **no se imprimen** en el PDF final.
14. **Contador de páginas/duración estimada** (muestra "≈ N págs · N min"): 55 líneas lógicas por página, calculadas al renderizar.

### Baja prioridad (opcional)
15. Revisiones por color (azul, rosa, amarillo, verde, naranja…) con marca `*` en líneas modificadas y comparación v(n) vs v(n-1) a nivel de bloque (diff).
16. Diálogo dual (dos columnas).
17. Plantilla de teleplay/serie (el "acto" y la numeración de teaser) y formato a dos columnas (imagen | sonido) para publicidad/documental.
18. Navegador de escenas (panel lateral con la lista de encabezados; arrastrar para reordenar).

### Reglas de formato exactas (resumen para copiar)
- Hoja Carta 8.5"×11" (216×279 mm). Margen izq 1.5" (38.1 mm), der 1" (25.4 mm), sup/inf 1" (25.4 mm).
- Courier / Courier Prime 12 pt, interlineado simple (12 pt), ~55 líneas por página, 10 caracteres por pulgada (60 cols por 6").
- Escena: MAYÚSC., izquierda, `INT./EXT. LUGAR - MOMENTO`. Un espacio entre `INT.`/`EXT.` y la locación; separador consistente.
- Acción: izquierda, presente, párrafos de 3-4 líneas máximo, nombres de personajes en MAYÚSC. la primera vez que aparecen (convención).
- Personaje: MAYÚSC., sangría 2.2" desde el margen (3.7" de la hoja). Extensión `(V.O.)`/`(O.S.)` a continuación.
- Paréntesis: sangría 1.6" (3.1"), entre paréntesis, minúsculas, corto (una línea).
- Diálogo: sangría 1.0" (2.5"), ancho 3.5" (hasta 6.0" de la hoja), alineado a la izquierda, **no centrado ni justificado**.
- Transición: MAYÚSC., a la derecha (6.0"), termina en `:` (CORTE A:, FUNDIDO A NEGRO:). Usar poco.
- Espacios: una línea en blanco entre bloques distintos; ninguna entre personaje–paréntesis–diálogo.
- Número de página: arriba a la derecha, "N." desde la página 2.
- Portada sin número; el cuerpo empieza en la página 1.
- Negritas/subrayado en el texto: solo para énfasis puntual (ej. rótulos o sonidos). No colores, no otras fuentes.

## Impacto en móvil (para foccus-mobile)
- Si foccus-web mueve el contenido a **bloques tipados** (JSON o HTML con clases `gb-*`), el móvil debe renderizar cada bloque en un `Text`/`RichText` con `fontFamily: 'Courier Prime'` (añadir como asset), sin intentar el ancho de 6"; reducir sangrías proporcionalmente (ej. diálogo 12% de ancho, personaje 22%).
- Lectura: modo lectura con scroll vertical y tamaño de letra ajustable; la estimación "≈ N min" conviene calcularla en el backend para que coincida.
- Edición en móvil: **no recomendable** el editor con teclado de bloques (Tab no existe). Si se edita, solo cambio de tipo de bloque desde un menú. Lo prioritario en móvil es leer, ver notas/escenas y continuidad.
- PDF: usar el mismo PDF que genere la web (descargar desde un endpoint) en vez de recrearlo en Flutter.
- Compatibilidad: mientras el contenido legado sea HTML libre, mostrarlo "tal cual" (sanitizado) y ofrecer "Convertir a formato guion" desde la web.

## Riesgos y alcance estudiantil
- **Esencial (haz esto primero):** bloques tipados + CSS de página Courier 12 + lector y PDF con la misma plantilla + encabezado de escena estructurado + sanitizador consistente. Aporta ~80% de la sensación de "Final Draft".
- **Opcional:** portada, CONT'D en PDF, numeración de escenas, Fountain, notas, contador de duración.
- **Excesivo (no hacer ahora):** revisiones por color completas con diff por línea, diálogo dual, colaboración en tiempo real, compatibilidad FDX perfecta (el XML de Final Draft tiene muchas opciones: no prometer "100 %"), plantillas de TV/dos columnas, integración tipo Movie Magic.
- **Riesgo técnico 1:** `contentEditable` + `execCommand` está obsoleto y es frágil (cursor, pegado desde Word, deshacer). Alternativa mantenida: **TipTap/ProseMirror** (nodos personalizados por tipo de bloque) o **Slate**. Para un proyecto estudiantil, TipTap con 6 nodos es la ruta más segura. Evita escribir un editor propio desde cero.
- **Riesgo técnico 2:** migración de guiones existentes (HTML libre). Propuesta: no migrar automáticamente; marcar versiones antiguas como "formato libre" y ofrecer una herramienta "Convertir" con heurística (líneas en MAYÚSC. que empiezan con INT./EXT. = escena; MAYÚSC. cortas = personaje; etc.) revisable por el usuario.
- **Riesgo técnico 3:** el PDF con jsPDF no mide texto en monoespaciada exactamente igual que el editor; para precisión, calcular líneas por caracteres (60 columnas de acción, 35 de diálogo) en vez de depender de `splitTextToSize` en mm.
- **Riesgo de datos:** el cambio de formato de `contenido` afecta Desglose/Rodaje/Continuidad si leen `escenas.descripcion` (texto plano). Mantener `escenas.descripcion` en texto plano y probar esas pantallas.
- **Derechos de autor:** este informe resume reglas y enlaza fuentes; no incluye texto copiado. Usar fuentes libres (Courier Prime es SIL OFL; Courier Final Draft es de pago, no la incluyas).
- **Qué no pude verificar:** documentación oficial de Final Draft/StudioBinder (acceso bloqueado o contenido propietario), atajos de teclado exactos y colores de revisión por país. Las cifras de márgenes/sangrías son las de uso general del estándar (coinciden en varias fuentes), pero pueden variar ±0.1" entre programas.

## Fuentes
- https://fountain.io/syntax/ (especificación Fountain)
- https://filmdaft.com/screenplay-margins/ (márgenes y sangrías)
- https://skrib.com/blog/screenplay-format-template-and-example (plantilla de formato)
- https://escaleta.mx/guias/formato-de-guion (formato en español, MX)
- https://www.danitzayanez.com/formato-de-guion-cinematografico/ (guion literario vs técnico, español)
- Sitios oficiales de referencia (no verificados en detalle): finaldraft.com, studiobinder.com, writerduet.com, fadeinpro.com, arcstudiopro.com, celtx.com, quoteunquoteapps.com/highland
