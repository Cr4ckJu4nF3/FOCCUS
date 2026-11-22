# Catálogo de fichas reutilizables en el guion

## Resumen

El usuario solicita reutilizar escenas, personajes, lugares, objetos y también bloques como diálogos, acciones, paréntesis y transiciones, tanto al crear como al editar un guion. Quitar contenido del documento no debe eliminar lo guardado para reutilizar. La galería de escenas debe abarcar el proyecto; una escena de otro guion se utiliza mediante una copia independiente. El usuario aclaró que los bloques de texto también deben guardarse automáticamente para reutilizarlos.

## Qué dice la industria

- **Hecho verificado:** el navegador de Final Draft muestra escenas y personajes; su vista de escenas corresponde al guion activo. [Final Draft: Navigator 2.0](https://kb.finaldraft.com/hc/en-us/articles/27788910080020-How-do-I-use-the-Navigator-2-0-in-Final-Draft-13).
- **Adaptación solicitada:** FOCCUS tendrá un catálogo de escenas de todo el proyecto, no solamente el navegador del guion activo. La copia entre guiones es una decisión de producto, no una función atribuida aquí a Final Draft.

## Estado actual en FOCCUS

- `Guion.jsx` comparte herramientas entre creación y edición. «Escena» abre un formulario contextual y «Nueva escena» fuerza la creación. Personaje, lugar y objeto ya ofrecen selectores de galería.
- Los bloques de acción, personaje, diálogo, paréntesis, transición y escena forman parte del HTML del guion; no son todos fichas reutilizables.
- La sincronización de escenas conserva las fichas que ya no aparecen en la versión del documento, pero actualmente no ofrece un selector para recuperarlas.
- `GET /guiones/{id_guion}/escenas` lista por guion y `GET /guiones` lista por proyecto. `Escena` tiene `id_guion`; no es una ficha compartida de forma independiente entre guiones.

## Recomendación para foccus-web

### Alta

- Sustituir la acción del botón «Escena» por un selector de escenas del proyecto que permita buscar, ver la ficha y utilizarla en la posición elegida. Mantener «Nueva escena» para crear; conservar un acceso claro a la edición de la ficha actual.
- Al quitar una escena, personaje, lugar u objeto del texto, conservar la ficha persistida. No modificar la eliminación explícita desde los módulos de gestión ni prometer recuperar cambios no guardados.
- Para acción, diálogo, paréntesis y transición, conservar automáticamente contenido reutilizable del proyecto y permitir buscarlo, consultarlo e insertarlo de nuevo con su tipo y formato. No confundir los estilos del editor con fichas de producción; prevenir duplicados innecesarios y evitar que el borrado en el documento destruya lo guardado. Hacer explícitos errores o límites de guardado y respetar los permisos y el aislamiento entre proyectos.
- Al seleccionar una escena del mismo guion, reutilizar la ficha existente sin duplicarla. Si procede de otro guion, copiarla de forma independiente en el guion de destino al guardar; no modificar la original ni sus vínculos accidentalmente. Gestionar los conflictos de numeración y los fallos sin sobrescrituras ni éxito parcial silencioso.
- Cubrir creación desde cero, nueva versión y edición, guardado y recarga, escenas sin encabezado en la versión, permisos, cancelación, errores y datos de otros proyectos. Los borradores sin `id_guion` deben aplazar la persistencia hasta guardar.
- Reutilizar las galerías actuales de personaje, lugar y objeto y verificar que permiten seleccionar y consultar sus fichas después de retirar el texto. Mantener la compatibilidad de los contratos existentes; si se necesita un endpoint o cambio de esquema, revisar sus consumidores y coordinar cambios de BD con `foccus-bd`.

### Media

- Identificar claramente el guion de origen en el selector y explicar cuándo se creará una copia. Mantener la selección y el foco del editor al cerrar el selector.

### Formato

- Conservar el sistema existente de bloques y formato de guion; este cambio no requiere nuevas medidas de margen ni sangría.

## Impacto en móvil

La solicitud es para el editor web. Si se cambia un endpoint o comportamiento de datos, documentar su impacto y mantener la compatibilidad con Flutter; no modificar móvil sin solicitud.

## Riesgos y alcance estudiantil

La identidad de la escena, su guion de origen y su número no deben inferirse solo por el encabezado. La ficha puede tener relaciones de continuidad: no copiar ni borrar relaciones sin definir su significado. Evitar migraciones y abstracciones innecesarias.
