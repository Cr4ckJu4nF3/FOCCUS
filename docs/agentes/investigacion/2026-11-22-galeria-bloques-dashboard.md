# Galería de bloques reutilizables desde el dashboard

## Resumen (3-5 líneas)

FOCCUS ya tiene un catálogo funcional de bloques dentro del editor de guion, pero todavía no tiene una galería independiente accesible desde el dashboard. La propuesta recomendable es una pantalla propia del proyecto, separada de la galería fotográfica actual, que permita buscar y previsualizar bloques de acción, diálogo, paréntesis y transición. Debe priorizar consulta clara y aislamiento por proyecto; crear, insertar y eliminar requieren reglas distintas y todavía no están plenamente definidas.

## Qué dice la industria (con fuentes/URL)

- **Hecho verificado:** Final Draft diferencia el navegador del guion activo de sus escenas y elementos; los elementos se muestran en un contexto conectado con el guion. Es una referencia útil, no una prueba de que deban usarse bloques entre guiones: [Final Draft, Navigator 2.0](https://kb.finaldraft.com/hc/en-us/articles/27788910080020-How-do-I-use-the-Navigator-2-0-in-Final-Draft-13).
- **Hecho verificado:** las tarjetas muestran una ficha resumida y llevan a detalles; separar el resumen visual del contenido completo ayuda a evitar una lectura masiva. Es una pauta general, no una recomendación específica de guiones: [Nielsen Norman Group, Cards](https://www.nngroup.com/articles/cards-component/).
- **Estándar de accesibilidad:** toda función debe poder operarse con teclado, tener nombres y estados programables, navegación predecible y estados de carga o errores anunciables: [W3C, WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/).
- **Sugerencia de diseño:** presentar filtros y búsqueda visibles, una vista previa y una acción primaria clara reduce ambigüedad; adaptarlo a FOCCUS sin copiar interfaces comerciales.

## Estado actual en FOCCUS (qué hay y qué falta)

- **Existente:** el dashboard de proyecto conserva el proyecto activo y ofrece un menú lateral con Guión, Crear Escenas, Plan de Rodaje, Desglose y Galería. El módulo Galería actual contiene fotografías y fichas visuales de utilería, personajes y lugares; no contiene bloques de texto.
- **Existente:** dentro de `Guion.jsx` existe el botón «Catálogo de bloques» y un selector modal con tipo, búsqueda, lista, vista previa e «Insertar bloque». Solo permite acción, diálogo, paréntesis y transición.
- **Existente:** el backend ya tiene el modelo y los endpoints por proyecto `/proyectos/{id_project}/catalogo-bloques`. Miembros pueden leer; el guardado HTTP está limitado a administradores. La tabla `catalogo_bloques` fue aplicada según `docs/agentes/bd/ESQUEMA.md`, pero no hay una pantalla autónoma ni rutas dedicadas para ella.
- **Existente:** los bloques se guardan automáticamente desde el editor durante ráfagas y se conservan al retirar texto. Los errores permiten reintento solo mientras la página sigue abierta.
- **Falta:** acceso desde el dashboard fuera del editor, nombre de ficha propio, edición/eliminación gestionables, orden o favoritos, fecha de uso, contador de usos y asociación con guiones. El catálogo actual solo guarda tipo y HTML.

## Recomendación para foccus-web

- **Alta — Pantalla independiente:** añadir un acceso llamado «Bloques reutilizables» al menú/dashboard y una ruta web propia, preferiblemente `/catalogo-bloques`, conservando proyecto y permitiendo volver al panel. No mezclarlo dentro de «Galería» sin una separación visible, porque esa ruta significa referencias visuales y podría confundir al usuario.
- **Alta — Página inicial:** mostrar título «Bloques reutilizables», contexto del proyecto activo, búsqueda por texto y filtros visibles para Todos, Acción, Diálogo, Paréntesis y Transición. Mantener el filtro y la búsqueda al navegar por la vista si es posible.
- **Alta — Presentación:** usar una lista compacta o cuadrícula con fragmento real del texto, etiqueta de tipo y vista previa fiel al formato. La tarjeta no debe ser el único contenido accesible: incluir título/acción programática y permitir abrir el detalle sin depender del hover.
- **Alta — Acciones concretas:** cada bloque debe ofrecer «Abrir/vista previa» y, en contexto de edición, «Insertar» al regresar al guion. Fuera del editor, la única acción segura es consultar o copiar texto si se implementa; no inventar «Enviar al guion» sin un guion destino seleccionado.
- **Alta — Estados y accesibilidad:** incluir cargando, vacío, sin resultados, error de red y bloque inválido. Mantener foco al cerrar detalles, Escape y botón visible de cierre, búsqueda con etiqueta, contraste y relación entre filtros seleccionados. Confirmar salidas con cambios solo si después existe edición en esta pantalla.
- **Alta — Permisos y aislamiento:** filtrar por `id_project` y conservar las comprobaciones de membresía. Mostrar la vista de lectura a todos los miembros; una acción de guardar o gestionar bloques debe respetar la misma regla que el backend hasta que FOCCUS defina una política diferente.
- **Media — Creación dentro de la galería:** no es imprescindible para una primera versión. Puede enlazar a «Editar en Guión» y guardar el bloque desde el editor, con captura automática existente. Si se añade «Crear bloque» aquí, debe validar un único bloque permitido y evitar HTML libre.
- **Media — Gestión:** diferenciar entre retirar un bloque del guion y eliminarlo del catálogo. «Eliminar» puede invalidar referencias futuras y no debería implementarse sin una confirmación clara y, idealmente, sin borrar el texto histórico de guiones existentes.
- **Baja — Complementos:** favoritos, nombres personalizados, etiquetas propias, contador de usos y orden manual pueden esperar. No son esenciales para el alcance estudiantil y añaden esquema y lógica de mantenimiento.

### Reglas de comportamiento esenciales

- Clasificar exactamente: acción, diálogo, paréntesis y transición; nunca mostrar escena, personaje o lugar como bloque textual reutilizable en esta galería.
- Buscar en texto visible, no en nombres de clases HTML ni etiquetas técnicas.
- Deduplicar por tipo y contenido; conservar alineación permitida y formato seguro. No aceptar scripts, eventos, imágenes ni varios bloques dentro de una misma ficha.
- Al usar una ficha, mostrar una vista previa y copiarla como un bloque independiente. Inserta sin modificar el catálogo ni el bloque original.
- Distinguir «guardado pendiente», «guardado», «error» y «reintento». Si no hay conexión, no afirmar que el bloque fue guardado.

## Impacto en móvil (para foccus-mobile)

No modificar Flutter por una primera versión web. Si se adapta después, reutilizar lectura y búsqueda; no trasladar el modal a pantalla estrecha sin una ruta clara de regreso ni controles táctiles visibles. Los endpoints pueden mantenerse compatibles, pero falta acordar si móvil tendrá creación explícita y permisos de edición.

## Riesgos y alcance estudiantil

- **Ambigüedad principal:** el dashboard actual enlaza «Galería» a referencias visuales. La propuesta debe decidir si la nueva pantalla queda separada o si «Galería» pasa a tener pestañas. La opción separada reduce confusión y cambios en la pantalla visual existente.
- **Ambigüedad de permisos:** el catálogo puede guardar solo administradores mientras los miembros pueden consultarlo. Para uso colaborativo, decidir si todos pueden almacenar nuevos bloques o si solo admin gestiona la biblioteca.
- **Ambigüedad de gestión:** no existe nombre propio ni acción de eliminar/editar en el contrato actual. Una versión fuera del editor debería limitarse a leer y previsualizar hasta definir esas operaciones.
- **Riesgo:** convertir la eliminación del texto del guion en eliminación del catálogo sería destructivo. Deben ser acciones separadas.
- **Riesgo:** duplicar un catálogo visual de personajes/objetos como si fueran bloques sería excesivo. Personaje, lugar y objeto deben seguir en sus galerías actuales.
- **Alcance:** esencial es leer, filtrar, buscar y previsualizar por proyecto. Opcional es crear desde fuera del editor y gestionar fichas. Excesivo ahora sería favoritos, estadísticas, colaboración en tiempo real o integración con continuidad/rodaje.
