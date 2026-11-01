# Códigos únicos y buscador transversal para FOCCUS

## Resumen (3-5 líneas)

En producciones reales se cruzan, sobre todo, el número de escena del guion, los elementos del desglose (por departamento), los días de rodaje y los registros de continuidad; no hay un código universal único para todas las entidades ni una convención global para cada utilería/vestuario.
Se recomienda separar la clave técnica actual de FOCCUS de un **código público inmutable**, legible, generado por proyecto y reservado al administrador (`id_rol=1001`).
Ejemplo: `GUI-001`, `VGU-001`, `ESC-014`, `PER-003`, `LOC-002`, `OBJ-005`, `VES-003`, `DRO-004`.
La generación debe centralizarse en el backend con contador transaccional por proyecto y tipo, respaldado por índices únicos; un buscador administrativo debe devolver coincidencias de código y enlaces a los módulos existentes.
Migrar de forma aditiva: columnas nuevas inicialmente nulas, backfill, verificación y restricciones únicas; conservar IDs y relaciones actuales.

## Qué dice la industria (con fuentes/URL)

**Hecho verificado en documentación de software**

- StudioBinder documenta un flujo donde se navega por escenas, se asignan locaciones, elenco y otros elementos, se consulta un reporte consolidado de elementos, se exporta el desglose y se incorporan escenas nuevas o revisiones. Su documentación habla de elementos y categorías asociados a escenas; no impone un identificador global universal para cada clase de objeto. Fuentes: [colección oficial de ayuda: Script Breakdowns](https://support.studiobinder.com/en/collections/67892-script-breakdowns), [element list reports](https://support.studiobinder.com/en/articles/11166483-how-to-view-element-list-reports), [asignar locación a escena](https://support.studiobinder.com/en/articles/1393585-how-to-assign-a-location-to-a-scene-in-breakdowns), [importar un guion revisado](https://support.studiobinder.com/en/articles/11654856-how-to-import-a-revised-script-via-breakdowns).
- Movie Magic Scheduling es un sistema de desglose/planificación cuya guía oficial describe los campos de encabezado de escena, tarjetas/strips y trabajo con datos de producción. Es una referencia de flujo y organización, no evidencia de un estándar universal de códigos únicos para activos. Fuente: [manual oficial de Movie Magic Scheduling](https://mms-docs.ep.com/contents.html); [Entertainment Partners: producto y soporte](https://www.ep.com/movie-magic-scheduling/).
- Scenechronize organiza documentación de producción y datos de escenas/desglose. La ayuda pública disponible es antigua y no permite concluir que todos los proyectos usen una misma forma de Asset ID; FOCCUS debería adoptar una convención propia, documentada y consistente en lugar de presentarla como estándar oficial. Fuente: [ayuda Scenechronize](https://www.scenechronize.com/schelp/).
- Final Draft documenta que la numeración de escena se aplica como acción de producción (no asigna números de forma automática al crear/borrar cada escena); permite conservar números existentes y asignar letras a escenas insertadas, y mantener escenas omitidas identificables. Por tanto, `12A` es una **numeración editorial/producción**, distinta del ID interno o del nuevo código FOCCUS. Fuente: [Final Draft: How do I number scenes?](https://kb.finaldraft.com/hc/en-us/articles/27810301418132-How-do-I-number-scenes).
- Fountain permite adjuntar un número al encabezado como `#12A#` y describe sintaxis para escenas, diálogo y elementos; su especificación está pensada para intercambio de texto, no para estandarizar IDs de utilería o registros de inventario. Fuente: [Fountain Syntax](https://fountain.io/syntax/).

**Estándar/práctica de la industria (no universal)**

- En producción se usa el número de escena del guion para coordinar desglose, plan de rodaje, sides y reportes. Al bloquear el guion, se preservan números existentes y a menudo se inserta una letra en escenas nuevas (`12A`), o se marca una escena omitida en vez de renumerar el resto. Esto facilita que departamentos distintos no pierdan referencias durante revisiones.
- El desglose etiqueta necesidades por escena y departamento (elenco, utilería, vestuario, maquillaje, arte, sonido, efectos, etc.) y alimenta listas e informes. Los nombres, colores y abreviaturas de departamentos varían por producción y software; no prometer que una abreviatura como `P` o `W` sea universal.
- Continuidad relaciona escena, toma/planos, fecha y observaciones de vestuario, utilería, posiciones y acción. Las formas `escena + letra de setup/shot + toma` son comunes, pero no existe una nomenclatura única global aplicable a todo rodaje. Una hoja de continuidad no equivale a un catálogo de activos.
- Las herramientas comerciales conectan escenas y elementos con reportes, documentos, planillas y exportaciones. Es común que una producción defina identificadores de inventario o códigos internos propios para activos; no se encontró evidencia confiable de que Scenechronize, StudioBinder o Movie Magic impongan un mismo esquema de Asset ID a toda la industria.

**Opinión/sugerencia de producto**

FOCCUS puede ofrecer códigos estables tipo inventario sin intentar copiar cada función de un software de producción grande. Mantener como campos distintos: (a) PK interna para API/relaciones, (b) código FOCCUS para búsqueda/referencia, (c) número de escena/día de producción que el usuario puede necesitar editar. Nunca cambiar la PK actual ni usar `12A` como código público de escena.

## Estado actual en FOCCUS (qué hay y qué falta)

Inspección estática de `backend/api_usuarios/app/models`, `backend/api_usuarios/app/controllers`, `backend/api_usuarios/app/routes`, `backend/api_usuarios/app/utils/auth.py` y módulos web; no se modificó código.

- `projects.id_project` es PK textual (`String(20)`). La ruta de creación genera `proj0001`, etc., cuando el campo viene vacío; acepta también un ID aportado, y encuentra el siguiente con consulta al máximo actual. No existe un campo separado de código público.
- `guion.id_guion` es entero autoincremental; sus ediciones viven en `guion_version.id_guion_version` también autoincremental, además de `numero_de_version` dentro de cada guion. El serializador de guiones devuelve IDs internos y versión actual; las respuestas de creación/subida devuelven IDs enteros.
- `escenas.id_escena` es texto, hoy generado como `esc0001` mediante búsqueda del mayor ID; `numero_de_escena` es un campo separado (`String(45)`) que ya puede reflejar la numeración de producción. `escena_version.id_escena_version` es autoincremental.
- `personajes.id_personaje` se genera como `psj0001`; `escenarios.id_escenario` como `loc0001`. Ambos generadores buscan el último ID de toda la tabla, sin filtrar por proyecto y sin mecanismo visible de reserva atómica. Personaje y escenario tienen `id_project`.
- `galeria_items.id_galeria` es autoincremental, y el elemento sí tiene `id_project`, `tipo`, `categoria` y relaciones opcionales. Hay tablas de versiones/fotos de galería con IDs enteros. Esta galería contiene entradas de distinta clase, por lo que habrá que acordar la asignación del prefijo en función de `tipo` o mantener un prefijo común si se modela como activo genérico.
- `rodaje.id_rodaje` usa generación textual (`rod0001` según controller) y está relacionado con proyecto. `proceso_rodaje.id_proceso` es autoincremental; en la interfaz/BD también hay `dia_dramatico`, `fecha`, nombre y orden, que no son equivalentes a una identidad persistente de día.
- El desglose usa `desglose.id_desglose`, creado para una escena, y `desglose_requerimientos.id_requerimiento`, cuyos generadores usan prefijos `des`/`req` y consultas del último ID global. Los requerimientos son necesidades ligadas a una escena, no necesariamente activos reutilizables únicos.
- Las rutas de guion/escena/personajes/escenarios/galería/rodaje/desglose usan controles de miembro o administrador según operación. `require_project_admin` comprueba la membresía en `user_projects` y rol `1001` en BD; `require_project_member` valida pertenencia. Esto permite autorizar por proyecto. **La UI no puede ser el control de acceso:** `localStorage` contiene `project_role`, pero no sustituye la verificación del servidor.
- Los serializadores de escena, personaje, escenario y galería construyen diccionarios de respuesta; varios incluyen el PK interno. Para que el nuevo código sea solo administrativo, debe añadirse condicionalmente y no incluirse por defecto en esquemas/respuestas compartidas a miembros. Los endpoints de creación también requieren cuidado: responder con el código solo si la sesión es administradora.
- En el frontend existen `/guion`, `/escenas`, `/galeria`, `/desglose`, `/rodaje` y `/proyecto-dashboard`; hay acceso de rol en `api.js` y en dashboards. No se encontró un buscador transversal por identificador. No se ve en la raíz inspeccionada una estructura Alembic establecida; sí hay scripts sueltos. Planear la migración explícita y revisada antes de desplegar.

## Recomendación para foccus-web

### Cambios concretos en frontend / backend / BD (priorizados: Alta / Media / Baja)

**Alta — definir los códigos públicos y distinguirlos de los IDs actuales**

- Añadir columna de código público distinta de cada PK: por ejemplo `codigo` en entidad, `codigo_publico` para proyecto. No exponer ni reemplazar `id_project`, `id_guion`, `id_escena`, `id_galeria`, etc.; los IDs actuales siguen utilizándose para relaciones y rutas existentes.
- Propuesta de tipos y prefijos iniciales, mayúsculas y guion: proyecto `PRO-001` (código global, no por proyecto); guion maestro `GUI-001`; versión de guion `VGU-001`; escena `ESC-001`; personaje `PER-001`; escenario/locación `LOC-001`; activo de utilería `OBJ-001`; vestuario `VES-001`; elemento de galería no clasificado `GAL-001`; jornada real de rodaje `DRO-001`; desglose `DES-001`; requerimiento por escena `REQ-001`. El número de escena editorial (`12A`) queda en `numero_de_escena` y no se cambia a `ESC-014`.
- Las versiones deben tener identidad pública separada de su ordinal. `VGU-008` identifica una fila concreta y `numero_de_version=3` significa tercera revisión de ese guion. No usar `GUI-001-v3` como clave inmutable, ya que el formato no sirve como ID independiente y puede confundir versión lógica con registro.
- No asignar códigos a tablas auxiliares puramente relacionales/fotos/notas en primera etapa. Una foto no es automáticamente un activo; si luego necesita referirse a ella, definir categoría (`FOT`) y ciclo de vida por separado.
- Códigos siempre inmutables y no reutilizados después de eliminar registros. Si el mismo activo se modifica, conserva código; las versiones representan historial. Para diferenciar a futuro inventario individual repetido (p. ej. varias copas), definir primero la necesidad de inventario físico y no inventar códigos por cada mención textual.

**Alta — generación backend atómica y límites de unicidad**

- Implementar servicio central `asignar_codigo(db, id_project, tipo)` usado por todas las altas y por la herramienta de backfill; nunca generar con `MAX(id)` en código de aplicación. Para proyectos, usar ámbito global.
- Crear tabla de contadores, por ejemplo `project_code_counters(id_project, tipo, next_value)` con clave única compuesta. En una transacción InnoDB: crear fila del contador si falta, bloquearla (`SELECT ... FOR UPDATE`) o incrementarla con una operación atómica, asignar el número y confirmar junto con el registro. Reintentar de manera acotada en colisión/`IntegrityError` y devolver error claro si el commit falla. Si hay más de una API worker, los locks e índices deben residir en MySQL, no en memoria.
- Guardar un entero separado `codigo_seq` opcional para poder ordenar/backfillear robustamente; calcular texto en código o guardar `codigo` final. Por simplicidad y búsqueda, se recomienda persistir el texto y añadir `UNIQUE(id_project, codigo)` en cada tabla del proyecto; proyecto usa `UNIQUE(codigo_publico)`. Índices por `codigo` y `(id_project,codigo)` según tabla/consultas. Los prefijos diferentes evitan colisión lógica entre clases aunque la unicidad SQL sea por tabla.
- Establecer validación backend: prefijo y secuencia no editables desde schemas de entrada; normalizar a mayúscula; número de al menos tres dígitos sin límite rígido al llegar a `1000`; no depender de ceros rellenos para orden alfabético. El tipo usado para el código de un activo queda registrado al crearlo: cambiar tipo/categoría no debe renumerarlo.
- Transacciones completas también en creación de combos maestro+primera versión (guion y versión) y en creación de items de galería que generan personaje/locación. Evitar consumir/reservar un código cuando la creación completa falla; si el contador avanza por un rollback parcial, permitir huecos y nunca intentar reutilizar números.

**Alta — permiso y buscador API**

- Endpoint recomendado: `GET /projects/{id_project}/buscar-codigo?q=ESC-01` con `Depends(require_project_admin)`. Este guard ya toma `id_project` de la ruta y valida en BD que el miembro tenga `id_rol=1001`; añadir comparación coherente con cualquier `X-Project-Id`. Admin de otro proyecto, miembro, invitado o no autenticado: 403/401; no revelar si un código existe fuera del proyecto.
- Recibir `q` con longitud máxima razonable (p. ej. 40), recortarlo, normalizar a uppercase y exigir mínimo 2 caracteres; validar formato/caracteres permitidos y tratar `%`/`_` como literales, no como comodines aportados por usuario. El prefijo parcial debe ser válido (`ESC-0`); no exigir el código completo.
- Consultar únicamente tablas incluidas en la lista permitida, siempre filtrando `id_project`. Orden: match exacto, luego prefijo, luego subcadena; limitar resultado a 25/50 y paginar si hace falta. Para un volumen estudiantil, una consulta UNION en un servicio de búsqueda está bien; no agregar motores externos. Evitar `%q%` sin límite, que puede escanear las tablas; priorizar `codigo LIKE 'q%'` y si se exige “parte del código”, subcadena en pocas tablas con límites/índices/caché eventual.
- Respuesta mínima para admin: `{tipo, codigo, nombre, id_interno, destino}` o equivalente. `destino` es ruta frontend válida del registro: `/guion` con guion seleccionado, `/escenas` con escena seleccionada, `/galeria` con item, etc. Si la UI aún no acepta deep-link, agregar parámetros (`?id=...`) con carga y resaltado en el módulo. No construir destino a partir de texto de usuario. Para versión, llevar al guion y seleccionar esa versión.
- Excluir códigos de serializadores generales a miembros. Pasar explícitamente `es_admin_proyecto` desde la dependencia validada o tener serializadores administrativos separados; **no** basarse en un `if role` del frontend ni confiar en rol de JWT/localStorage. La consulta de búsqueda siempre debe devolver 403 incluso si se llama directamente desde una cuenta miembro.
- Los mismos filtros aplican a cualquier endpoint de entidad: la API no debe incluir el campo nuevo en listas y detalles para roles no administradores, ni en errores/metadatos que filtren coincidencias. IDs legacy podrán seguir utilizándose internamente; evitar exponer nuevos códigos por rutas compartidas.

**Alta — backfill seguro en Aiven MySQL**

1. Copia de seguridad verificable y ensayo en una copia/ambiente de prueba de la BD. Confirmar versión MySQL, InnoDB, claves y tamaños actuales.
2. Agregar columnas nuevas `codigo`/`codigo_publico` inicialmente `NULL`, junto con la tabla de contadores; desplegar aplicación compatible que lea campo nulo pero lo genere para altas nuevas. No borrar ni cambiar PK/FK.
3. Backfill por proyecto y tipo, en lotes, con orden determinista por PK existente (o fecha+PK si se decide expresamente). Formatear por ejemplo `ESC-001`. Para proyectos el código debe ser globalmente único (`PRO-...`). Resolver previamente IDs duplicados/malformados, si aparecen, sin editar IDs originales.
4. Inicializar cada contador al siguiente valor tras el máximo asignado del prefijo en su ámbito. Verificar conteos no nulos, duplicados, formato, proyecto propietario y que todas las filas son consultables antes de añadir `NOT NULL` y `UNIQUE`.
5. Añadir restricciones/índices en ventana apropiada; comprobar bloqueos/impacto de DDL con proveedor Aiven y volumen real, usar migración progresiva si la tabla ya fuera grande. Activar emisión de códigos en todas las rutas de alta solo cuando backfill e índices estén completos.
6. Revisar staging y producción: altas concurrentes de dos sesiones, proyecto con cero registros, secuencia mayor a 999, fallo de creación combinada, rollback, backfill reejecutable, búsqueda por exacto/prefijo/subcadena y permisos. Mantener plan de reversa que desactive el campo y conserve columnas/datos, nunca DROP ni borrado.

**Media — interfaz web admin**

- Añadir un buscador global en dashboard del proyecto activo (preferible en cabecera, accesible desde los módulos), visible únicamente para administradores del proyecto. El rol debe venir de datos activos del proyecto, no del rol global guardado en `localStorage`.
- En pantallas de administración, mostrar el código junto al nombre con botón copiar; no desplazar ni reemplazar número editorial de escena ni número de versión. Etiqueta clara “Código FOCCUS”. Ocultarlo por completo a miembros, incluida la vista de galería/desglose.
- Una coincidencia abre directamente el detalle o el módulo existente y selecciona/resalta el registro. Si el módulo no puede cargar por ID, primero implementar resolución con `destino`; no hacer un enlace que solo abra una pantalla genérica.

**Media — decidir el alcance funcional de activos y días**

- `GaleriaItem` funciona como espacio de materiales visuales/entidades con `tipo` y tiene versiones; decidir qué tipos son elementos físicos rastreables. Recomendación: codificar primero props y vestuario (`OBJ`, `VES`) y dejar fichas de personaje/locación con sus propios `PER`/`LOC`; no crear dos códigos para la misma ficha vinculada a la galería.
- Un `DesgloseRequerimiento` tipo “espadas x2” es una necesidad de escena, no necesariamente un ítem de inventario: `REQ` lo identifica como requerimiento; el elemento de galería/inventario (si existe) conserva su `OBJ`/`VES`. El vínculo de escena debe relacionar ambos sin duplicar la identidad.
- `Rodaje` representa una fecha/jornada planificada. Dar código `DRO` al registro, y conservar `dia_dramatico`/semana/fecha como datos editables. No codificar aún cada proceso/llamado/toma: son alcance futuro.

**Baja — búsqueda expandida e intercambio**

- En una fase posterior, incluir búsquedas por nombre, alias, número de escena y día de rodaje, siempre distinguiendo esos campos del código. Permitir exportar códigos en reportes PDF/CSV; mantenerlos estables al exportar/importar.
- No generar IDs globales con UUID legibles, códigos de barras, QR, roles/permisos por departamento, buscador indexado externo o catálogo completo de equipo en el primer lanzamiento. Es carga operativa excesiva para un proyecto estudiantil.

### Reglas exactas sugeridas

- Forma canónica: `^[A-Z]{2,3}-[0-9]{3,}$`; ejemplos válidos `GUI-001`, `ESC-014`, `ESC-1000`. Prefijo constante por entidad/tipo, guion ASCII, consecutivo decimal iniciando en `001`, extensión automática después de 999; uppercase obligatorio, sin espacios ni caracteres acentuados.
- Secuencia separada por (proyecto, prefijo); código no incorpora nombre, fecha, título, número de versión lógico ni escena de guion. Así cambios de nombre/fecha/orden no afectan referencias.
- Proyecto: `PRO-001` global. Todas las entidades dependientes: secuencia por `id_project` y tipo (`ESC-001` puede existir en dos proyectos sin colisión en su espacio de proyecto). Versiones `VGU` propias del proyecto; asociadas por FK al guion padre.
- El número ordinal de una escena de guion acepta sufijos alfabéticos de producción (`12A`, `12B`) y puede conservarse al omitir/eliminar escenas según revisión; no se deriva del `codigo` FOCCUS. Si escenas se trasladan entre guiones, el `codigo` se conserva y el nuevo ámbito no renumera registros.
- No permitir que el cliente asigne o modifique códigos. Unicidad lógica dentro de proyecto y tipo respaldada en BD; una vez borrado un registro, su consecutivo no se recicla. Mantener códigos válidos aunque cambie nombre o categoría del activo.

## Impacto en móvil (para foccus-mobile)

- El móvil debe tratar el código como campo opcional porque miembros no lo reciben y registros viejos podrían tener `NULL` durante rollout. No inferir el código desde PK ni generarlo localmente.
- Primera fase móvil puede limitarse a mostrar el código en las vistas de administrador y copiarlo, una vez el API devuelva el campo autorizado. No mostrar el campo a usuarios no admin ni guardar rol como autorización de cliente.
- El endpoint de búsqueda tiene proyecto activo como ámbito y misma autorización que web. La pantalla móvil de admin puede implementar el buscador después de que web defina rutas/IDs de destino; los enlaces web no se deben asumir navegables dentro de Flutter.
- Para deep-link móvil, backend devolvería `tipo` e ID técnico solo a admin; Flutter resuelve el tipo a pantalla y carga registro. Con alcance estudiantil, mejor entregar primero el buscador web y mantener la app compatible sin él.

## Riesgos y alcance estudiantil

- **Riesgo alto:** confiar solo en ocultar campos con CSS/localStorage filtraría códigos a través de JSON. Autorización y serialización por proyecto son obligatorias en backend y deben probarse con roles admin y miembro.
- **Riesgo alto:** generadores actuales basados en “último ID + 1” tienen colisión bajo concurrencia y algunos son globales, no por proyecto. El contador central y las restricciones únicas deben entrar juntos; no migrar manteniendo el patrón antiguo.
- **Riesgo medio:** código no es la numeración oficial de escena. Mostrar `ESC-014` como si reemplazara `12A` confundiría rodaje, guion, edición y alumnado. Etiquetar visualmente ambos como “Código FOCCUS” y “N.º escena”.
- **Riesgo medio:** la galería combina fichas/recursos con imágenes y versiones; decidir si un registro representa un activo o solo referencia visual. Evitar códigos dobles para personaje/escenario que ya tienen su propia entidad.
- **Riesgo medio:** DDL de MySQL en producción y cambios con código que espera `NOT NULL` pueden bloquear altas/lecturas. Hacer rollout aditivo, backfill comprobable y mantener compatibilidad; no eliminar ni reescribir IDs históricos.
- **Alcance recomendado:** primera entrega: proyecto (`PRO`), guion/versión (`GUI`,`VGU`), escena (`ESC`), personaje/locación (`PER`,`LOC`), activo de utilería/vestuario de galería (`OBJ`,`VES`) y jornada (`DRO`); backfill; administración-only en respuestas; buscador web limitado a estos tipos. Añadir desglose/requerimientos (`DES`,`REQ`) si tras revisión de modelos/interfaces hay un caso real de búsqueda, no solo para “codificar todo”.
- **Dejar para después:** tomas/planos, fotos individuales, notas, fases/llamados, copias físicas de cada utilería, códigos de barras/QR e IDs por departamento. Para proyecto estudiantil, priorizar búsqueda, trazabilidad básica y cero regresiones en permisos frente a una taxonomía exhaustiva.

### Fuentes adicionales consultadas

- [Final Draft: Locked Pages and Page Numbering](https://kb.finaldraft.com/hc/en-us/articles/15573887116948-Final-Draft-Locked-Pages-and-Page-Numbering) — mantener paginación/números en producción.
- [Fountain, especificación oficial](https://fountain.io/syntax/) — escenas, diálogos, notas, numeración opcional; formato textual interoperable.
- [StudioBinder: etiquetas de elementos no mencionados explícitamente en guion](https://support.studiobinder.com/en/articles/11381124-how-to-tag-elements-that-aren-t-mentioned-in-the-script) — el desglose puede incluir necesidades de producción, no solo palabras del texto.
- [StudioBinder: añadir días de guion a breakdown strips](https://support.studiobinder.com/en/articles/16223757-how-to-add-script-days-to-breakdown-strips) — día de guion/desglose es un dato de planificación, no necesariamente identidad del registro.
- [Celtx: editor Film & TV (ayuda oficial)](https://support.celtx.com/hc/en-us/articles/360009310173-The-Film-TV-Script-Editor) — referente de edición/formato; acceso automatizado a la página puede estar restringido.
- [SetHero: explicación de reporte de script supervisor](https://sethero.com/blog/script-supervisor-report-explained/) — referencia práctica secundaria de campos de reporte de continuidad; no fuente de un estándar universal de códigos.
