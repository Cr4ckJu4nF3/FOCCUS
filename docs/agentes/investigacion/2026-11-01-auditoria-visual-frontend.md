# Auditoría visual y UX del frontend web de FOCCUS

## Resumen
Auditoría estática de pantallas, rutas, hojas CSS y componentes compartidos del frontend, sin ejecutar la aplicación ni verificar el renderizado en navegador. FOCCUS ya cuenta con flujos funcionales, módulos audiovisuales reconocibles y estados básicos; la brecha principal es la falta de cohesión entre módulos y la aplicación parcial de tema y accesibilidad. Se priorizan navegación y tokens comunes, formularios/modales/tablas accesibles y vistas de producción adaptables a móvil. Se recomienda adaptar flujos de la industria, no copiar toda la complejidad de productos profesionales.

## Qué dice la industria (con fuentes/URL)

### Hechos verificados y estándares
- **Accesibilidad:** WCAG 2.2 del W3C es una recomendación vigente y aplicable a varios dispositivos. Entre sus criterios AA: contraste mínimo 4.5:1 para texto normal y 3:1 para texto grande; foco visible; reflujo a 320 píxeles CSS/400% de zoom para contenido de desplazamiento vertical; errores identificados y objetivos táctiles de al menos 24×24 CSS px, con excepciones. El estándar no prueba el cumplimiento de FOCCUS: requiere pruebas de colores, teclado, lector de pantalla y tamaño. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflujo](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [objetivo táctil](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- **Producción:** StudioBinder presenta desglose, planificación de rodaje y hojas de llamado conectadas; Scenechronize enfatiza la distribución controlada de documentos; Movie Magic Scheduling se centra en programación de rodaje. Celtx describe etiquetado de elementos en guion, hojas de desglose, catálogo y stripboard. El patrón común es mantener proyecto, escena, fecha y estado conectados para reducir duplicación. [StudioBinder Scheduling](https://www.studiobinder.com/film-scheduling-software/), [hoja de llamado](https://www.studiobinder.com/call-sheet/), [Scenechronize](https://www.ep.com/scenechronize/), [Movie Magic Scheduling](https://www.ep.com/movie-magic-scheduling/), [Celtx Desglose](https://www.celtx.com/product/pre-production/breakdown/).
- **Continuidad/galería:** formularios de script supervisor y reportes organizan continuidad por escena/toma con notas y referencias visuales; Frame.io aporta el patrón de comentarios anclados al activo y revisión centrada en imágenes/video. Son referentes de flujo, no equivalentes exactos de una app de continuidad. [StudioBinder, formularios](https://www.studiobinder.com/blog/script-supervisor-forms-template/), [Frame.io Review & Approval](https://frame.io/features/review-and-approval).
- **Guion e intercambio:** Final Draft documenta elementos semánticos y diálogo dual; Fountain define texto plano estructurado; FDX es un formato estructurado de intercambio y exige mapear elementos, no solo guardar texto. Courier 12 y márgenes/sangrías tipográficas son convenciones profesionales; una página por minuto es estimación, no regla fija. [Final Draft, elementos](https://kb.finaldraft.com/hc/en-us/articles/27646947570196-What-are-script-elements), [diálogo dual](https://kb.finaldraft.com/hc/en-us/articles/27675427097748-How-do-I-use-dual-dialogue-side-by-side-dialogue), [duración](https://kb.finaldraft.com/hc/en-us/articles/15574991492628-What-is-the-general-rule-in-timing-a-script), [Fountain Syntax](https://fountain.io/syntax/), [Final Draft, exportación](https://kb.finaldraft.com/hc/en-us/articles/27525594609684-How-do-I-export-a-Final-Draft-file-to-a-different-format-like-RTF-or-PDF).
- **Escritura y diseño:** Final Draft, WriterDuet, Fade In, Highland y Arc Studio ilustran edición, colaboración, revisiones y formatos. Notion/Linear aportan inspiración de jerarquía y superficies de trabajo, no normas ni sustitutos de referentes audiovisuales. [Final Draft](https://www.finaldraft.com/), [WriterDuet](https://www.writerduet.com/), [Fade In](https://www.fadeinpro.com/page.pl?content=features), [Highland](https://highland2.app/), [Arc Studio colaboración](https://www.arcstudiopro.com/features/collaboration), [Arc Studio revisiones](https://help.arcstudiopro.com/how-tos/history/how-do-i-assign-names-and-revision-colours-to-a-history-entry-or-draft), [Notion](https://www.notion.so/product), [Linear](https://linear.app/features).

### Implicaciones para FOCCUS
- **Sugerencia:** usar lenguaje visual de herramienta de producción: navegación persistente, título claro, proyecto/guion activo, filtros visibles, acción primaria y estados que no dependan solo del color.
- **Sugerencia:** el desglose debe resumir escena, encabezado, página, día y departamentos; el rodaje debe priorizar fecha, llamado, ubicación, escenas y estado; continuidad, foto, escena, versión y notas. Son patrones coherentes con las funciones de producto citadas, no reglas obligatorias de diseño.
- **Intercambio:** PDF primero para lectura/entrega; Fountain como formato sencillo de texto estructurado. FDX requiere conversión bidireccional probada de elementos, numeración y metadatos. No prometer compatibilidad completa sin pruebas de ida y vuelta.

## Estado actual en FOCCUS (qué hay y qué falta)

**Alcance:** rutas de frontend/src/routes.jsx; pantallas de frontend/src/screen; estilos de frontend/src/desing; App, index.css, ThemeToggle, Menu y componentes compartidos. Revisados Landing, Login/registro, TwoFactor, ForgotPassword, CompleteInvitation, ProjectSelection, ProjectRegistration, AdminDashboard, ProjectDashboard, Dashboard, Roles, Guion, Galeria, Escena, Desglose, Rodaje y Profile, además de navegación/tema. Revisión estática, no prueba de contraste, teclado, móvil ni renderizado.

**Qué está bien:**
- La mayoría de los flujos separa JSX/CSS y contempla cargas, errores o vacíos. Hay formularios de invitación, proyecto, escena, rodaje y perfil.
- Guion contiene lista/versiones, editor y contexto de personajes/lugares; Galeria maneja objetos/personajes/lugares, cámara, ficha e historial; Desglose enlaza escena, departamentos, galería y día de rodaje; Rodaje expone escenas y procesos.
- ProjectDashboard y AdminDashboard resumen actividad/métricas y habilitan acceso a módulos. Algunos formularios tienen validación, TwoFactor y ProjectSelection reconocen espera/error, Galeria trata permisos de cámara.
- Hay tokens en index.css, Montserrat y Courier Prime, foco global :focus-visible, reducción de movimiento, ThemeToggle persistente y breakpoints en diversas páginas. Algunos diálogos ya definen role=dialog y aria-modal.

**Qué falta o es incoherente:**
- Los tokens no son fuente única: módulos fijan sus colores. Guion, Escena, Rodaje y Desglose usan fondos/paletas propios; Galeria tiene tokens propios y AdminDashboard es claro. Theme.css usa selectores genéricos por partes del nombre de clase y establece fondos/bordes globales, que pueden alterar semánticas locales. Contrastes no medidos: se marca como riesgo, no incumplimiento confirmado.
- Cabeceras, retorno, navegación y nombres de acciones cambian entre módulos. Dashboard es casi informativo. ProjectRegistration no está en rutas; /registro-proyecto conduce a ProjectSelection. /personajes redirige a Galeria.
- Hay cargas/vacíos/errores planos, no siempre con reintento o acción siguiente. No todos los avisos usan role=alert/status y varias etiquetas visuales no se enlazan mediante htmlFor/id.
- Algunas tarjetas/filas clicables son divs. Los overlays/modales no comparten un patrón que garantice Escape, foco atrapado/restaurado o bloqueo del fondo. Hay botones icon-only sin nombre accesible consistente.
- Se declara foco visible, pero CSS específicos usan outline:none y lo sustituyen por borde/sombra; hay que verificar foco/contraste. La presencia de media queries no demuestra reflujo completo a 320 px.
- Texto auxiliar compacto: Galeria usa tamaños cercanos a 0.65–0.86rem y etiquetas productivas alrededor de 0.7–0.85rem. Revisar legibilidad, placeholders, badges, estados deshabilitados y alertas en ambos temas.
- ThemeToggle flotante global puede tapar acciones móviles. Duplicación de creación de proyectos en ProjectSelection/AdminDashboard/ProjectRegistration favorece diferencias de experiencia.

## Recomendación para foccus-web

### Alta
1. **AppShell común:** cabecera/sidebar contextual con proyecto activo, navegación, módulo seleccionado y perfil; en móvil, drawer o navegación compacta accesible. Unificar retornos. Resolver ProjectRegistration vs. ProjectSelection y dar función clara a Dashboard o retirarlo de navegación.
2. **Tokens semánticos reales:** fondo, superficie, superficie elevada, borde, texto, texto secundario, primario, acento, éxito, advertencia, error y foco. Versiones clara/oscura con contraste AA medido; reducir overrides de Theme.css por substring de clase. Color de estado siempre con etiqueta/icono. Conservar azul/coral/violeta FOCCUS con tonos de lectura comprobados.
3. **Accesibilidad:** asociar label e id; nombres accesibles para iconos; alertas con role=alert/aria-live; orden de tabulación/foco visible; controles clicables semánticos. Modal compartido con título, Escape apropiado, control/restauración del foco y no cierre accidental. Objetivos ≥24×24 CSS px; evitar interacción solo en div.
4. **Estados de producto:** carga anunciada; error con causa y Reintentar; vacío con explicación y CTA; éxito visible. Distinguir filtro sin coincidencias de proyecto sin contenido. Confirmar o deshacer borrados importantes.
5. **Prueba responsive y accesibilidad:** recorrer flujos a 320 CSS px y zoom 400%, teclado, lector de pantalla, tema claro/oscuro y contraste AA. No desplazar horizontalmente toda la pantalla; para tablas complejas usar scroll local o diseño alternativo.

### Media: recomendaciones por módulo
- **Landing:** hero y CTA claros; mantener. Verificar contraste sobre foto, anclaje bajo cabecera fija y cierre/foco del menú móvil. Contacto debe anunciar éxito/error y ofrecer reintento; API no debe apuntar a URL local fija en despliegue.
- **Login/registro:** distinguir alta e inicio; registro largo por pasos con progreso, errores junto al campo y datos conservados al volver. Etiquetas, autocomplete, visibilidad de contraseña accesible, enlace de términos y alertas. No mostrar solo error genérico.
- **TwoFactor:** conservar código de 6 dígitos; entrada numérica sin bloquear pegar/autofill, describir expiración/reenvío, anunciar estado y dar vuelta clara al login.
- **ForgotPassword / CompleteInvitation:** paso actual/siguiente, error junto al campo, aria-live, pegar/autofill de código, política de contraseña y toggles accesibles. Agrupar datos personales y credenciales; limitar obligatorios al alcance necesario.
- **ProjectSelection / ProjectRegistration:** tarjetas con título, formato, estado/actividad y continuar; vacío con Crear proyecto. Diálogo accesible y alta con campos mínimos. Evitar duplicar la creación en tres pantallas.
- **AdminDashboard / ProjectDashboard / Dashboard:** unificar shell; selector y tareas arriba, KPIs solo si tienen datos/fórmula y actividad reciente enlazada. Reducir sidebar y poner cuatro módulos principales primero en móvil.
- **Roles:** mantener miembros e invitación; tabla semántica en escritorio, tarjetas en móvil, edición de teclado, feedback y confirmación. Separar cargo/departamento de permiso de app.
- **Guion:** preservar lista/versiones y enlaces al catálogo. Separar escritura del formato rico; agrupar toolbar y plegar panel contextual. contentEditable y herramientas de texto no garantizan bloques ni paginación profesional. Definir modelo de encabezado, acción, personaje, paréntesis, diálogo, transición y nota; página imprimible Courier Prime 12 antes de prometer Final Draft. Versiones/guardado primero, colores de revisión después.
- **Escena:** lista buscable por número/encabezado; ficha con INT/EXT, momento y estado; continuidad separada y enlaces a desglose/rodaje. Navegación accesible; no depender del modal para leer una escena.
- **Desglose:** mantener guion, filtros por momento y escena/tags. Añadir búsqueda y filtros de departamento/asignación, totales y orden. Filas accesibles; en móvil expandir elementos bajo resumen de escena. Texto acompaña al color.
- **Rodaje:** cronograma por fecha/semana y tarjetas con fecha, llamado, ubicación, escenas y estado. Distinguir plan de rodaje de hoja de llamado; no simular campos de elenco, clima o seguridad que no existen. En etapa estudiantil, crear/importar día, asignar escenas e imprimir resumen; stripboard avanzado puede esperar.
- **Galeria:** buen contexto de continuidad: tipo, imagen, ficha, historial y cámara. Mejorar filtros, visor grande, escena/guion/versión y notas. En móvil cámara trasera y fallback de carga; probar permisos/orientación/tamaño. Ficha debe ser útil sin foto.
- **Profile:** separar datos y cambio de contraseña; estados de carga/error, guardar/cancelar y no redirigir antes de que se lea éxito. Foto con límites de archivo, preview y estado de carga.

### Baja
- Conservar animación moderada y respetar reducción de movimiento en sistema compartido.
- Favoritos/filtros guardados solo si el equipo los necesita. No replicar chat colaborativo, permisos de estudio, scheduling multiunidad, análisis automatizado, aprobaciones formales o suite de postproducción en el alcance inicial.

### Sistema de diseño común sugerido
- **Color:** tokens canvas/surface/raised, texto principal/secundario, border, primary azul, accent coral, violeta, success/warning/danger. Claro/oscuro con AA medido para disabled, hover, badges y placeholder. Departamento usa color más etiqueta.
- **Tipografía:** interfaz sans coherente (Montserrat si se conserva), texto base 16 px y auxiliar ≥14 px; etiquetas ≥12 px salvo información incidental. Courier Prime 12 pt solo en página de guion. Escala sugerida títulos 24/20/16, cuerpo 16, auxiliar 14.
- **Espacio:** escala 4/8/12/16/24/32 px; radios 8/12 px; ancho máximo común y densidad compacta solo para vistas de datos. Controles de 40–44 px recomendados para toque; WCAG AA mínimo general de objetivo es 24 px con excepciones.
- **Componentes:** AppShell, breadcrumb, selector de proyecto, botones primario/secundario, campo label/ayuda/error, alertas, badge, estados loading/error/empty, tabla responsive, tarjeta escena, toolbar, modal accesible, visor de galería y confirmación destructiva.
- **Reglas:** nombres y retorno uniformes; jerarquía primaria/secundaria; estados accesibles; aria-hidden para iconos decorativos, nombre para iconos accionables; variantes documentadas en lugar de pintar clases por coincidencia parcial.

## Impacto en móvil (para foccus-mobile)
- Compartir con web AppShell, tokens semánticos, estados, etiquetas y orden de acción; no trasladar CSS de escritorio literalmente.
- Navegación: barra inferior o menú con módulos principales y proyecto activo; selector accesible y perfil dentro del menú. Evitar toggle flotante sobre controles.
- Guion: lectura primero, editor de bloques compacto después; toolbar por grupos, paneles plegables y selección/teclado probados.
- Rodaje: agenda vertical por día; fecha, llamado, ubicación, estado y escenas primero; formularios cortos y cambios de estado fáciles en set.
- Desglose/Escena: tarjetas por escena con departamentos/elementos expandibles; filtros con alternativa accesible y estado actual anunciado.
- Galeria: captura con cámara trasera/selector, miniaturas y visor; escena/versión/notas con pocas acciones. Prever falta de cámara y conexión.
- Roles/dashboard: tarjetas en lugar de tabla ancha; acciones permitidas y confirmación para cambios sensibles.
- Probar uso a una mano, orientación vertical/horizontal y 320 px. 44 px es recomendación de comodidad; 24 px es el mínimo AA general con excepciones.

## Riesgos y alcance estudiantil
- **Hecho:** revisión de código estático; no se inspeccionó CSS calculado, capturas, interacción ejecutable, APIs, contraste con herramienta ni lector de pantalla. Posibles fallos son riesgos pendientes, no incumplimientos medidos.
- **Estándar:** WCAG es verificable; la forma de dashboard, scheduler o fichas depende de producción. Las guías comerciales describen productos, no reglas universales de UX.
- **Sugerencia:** implementar cohesión, accesibilidad básica y el flujo guion → escena → desglose → rodaje → referencia visual. PDF/impresión clara y relaciones internas valen más que paridad visual exacta con Final Draft o sistemas de estudio. FDX/reportes avanzados después y con alcance explícito.
- No mostrar estados sin datos ni llamar hoja de llamado profesional a una vista que carezca de campos/roles necesarios. Proteger información del elenco y metadatos en futuras funciones de compartir/exportar.
