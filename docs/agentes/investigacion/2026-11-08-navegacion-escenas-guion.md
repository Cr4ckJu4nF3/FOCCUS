# Navegación persistente y escenas desde el guion

## Resumen

La navegación principal debe seguir disponible al cambiar de módulo. Al crear o editar una escena desde el guion, un formulario contextual debe permitir completar sus parámetros y reflejar el resultado en el documento, sin perder el contenido existente. Las recomendaciones se basan en una revisión estática, no en una prueba de navegador.

## Qué dice la industria

- **Referencia verificada:** Final Draft describe el encabezado como un elemento que indica interior/exterior, lugar y momento del día; su editor aplica el formato del elemento automáticamente. [Final Draft: elementos del guion](https://www.finaldraft.com/blog/how-to-use-final-draft-script-elements).
- **Referencia verificada:** su navegador permite localizar escenas mediante el contenido del encabezado o el resumen. [Final Draft: Navigator](https://kb.finaldraft.com/hc/en-us/articles/27788910080020-How-do-I-use-the-Navigator-2-0-in-Final-Draft-13).
- **Accesibilidad:** WCAG 2.2, criterio 3.2.3, exige mantener el mismo orden relativo de mecanismos de navegación repetidos; no exige por sí mismo que la barra permanezca fija. [W3C: navegación coherente](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html).

## Estado actual en FOCCUS

- `frontend/src/routes.jsx` monta los módulos como rutas independientes. La navegación del panel está en `ProjectDashboard.jsx` y la administrativa también aparece en pantallas propias, por lo que hay que revisar ambos contextos y sus permisos.
- `frontend/src/screen/Guion.jsx` incluye un modo por escenas para el borrador; agregar una escena crea un buffer vacío. También hay creación de guion y de versiones, y edición en el lector: hay que comprobar todos los puntos de entrada.
- `EscenaSchema` y `EscenaUpdateSchema` ya contemplan número, encabezado, descripción, vista, momento, ciudad, página, fecha, día dramático, estado, rodaje y desglose. La API ofrece creación y actualización de escenas; cambiar la ficha no implica necesariamente actualizar el HTML del guion.
- El guion se guarda por versiones: insertar texto en un borrador no debe confundirse con confirmar una escena persistida.

## Recomendación para foccus-web

### Alta

- Compartir la navegación principal apropiada al contexto entre módulos, manteniendo rutas, proyecto activo y permisos. En escritorio que permanezca visible; en pantallas pequeñas permitir abrirla con un control siempre accesible, con teclado, foco visible y módulo actual identificado. No imponer navegación de administrador a miembros.
- Reutilizar o extraer el formulario existente de escenas. En **crear guion**, **crear versión** y **editar guion**, abrirlo en todos los puntos pertinentes para crear o editar una escena. Precargar proyecto/guion, número sugerido y parámetros deducibles cuando sea fiable; permitir corregirlos.
- Al confirmar, generar o actualizar el bloque de encabezado en la posición o escena correspondiente con el tipo de bloque de guion ya existente. Usar mayúsculas y `INT./EXT.`, lugar y momento cuando estén disponibles; no inventar campos. Preservar el resto del contenido, vínculos y selección.
- Mantener sincronizados documento y escena persistida: evitar duplicados, no reemplazar escenas equivocadas por número o posición ambiguos, no perder metadatos ni modificaciones sin guardar. En guion nuevo, conservar los datos como borrador hasta que exista un identificador de guion; cancelar no debe escribir en BD. Mostrar errores y evitar éxito parcial silencioso. Verificar el contrato actual antes de modificarlo.
- Cubrir pruebas de crear y editar, cancelación, validación, error de API, guion nuevo y existente, varias escenas, persistencia al recargar, permisos y navegación en escritorio y pantalla estrecha.

### Media

- Gestionar el foco al abrir y cerrar el formulario, identificar errores junto a cada campo y avisar antes de abandonar cambios sin guardar.

### Baja

- Añadir mejoras de navegación secundaria solo si no sustituyen la navegación principal.

## Impacto en móvil

El pedido se refiere a la navegación de la página web. Registrar cambios de contratos y comportamiento en `docs/agentes/CAMBIOS_WEB.md`; no modificar Flutter salvo que el usuario solicite su adaptación. Preservar la compatibilidad de los endpoints existentes.

## Riesgos y alcance estudiantil

Unificar el formulario y reutilizar el contrato es más sencillo que crear otro editor independiente. La parte delicada es relacionar un encabezado con su escena real y tratar versiones y fallos de guardado; no presentar como sincronizado algo que solo cambió en pantalla. Consultar a `foccus-bd` si se necesita modificar estructura o datos.
