# Navegación y editor de guion unificado

## Resumen

La navegación debe facilitar volver y cambiar de módulo sin perder el contexto del proyecto. El usuario prefiere la apariencia del editor de una versión existente y pide una experiencia coherente al crear un guion, con más espacio para escribir y una distinción clara entre crear y editar.

## Qué dice la industria

- **Accesibilidad:** W3C recomienda mantener el orden relativo de los elementos de navegación repetidos para que resulten previsibles. Esto no obliga a usar una barra fija ni una disposición concreta: [WCAG, navegación coherente](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html).
- **Sugerencia de diseño:** mantener controles de regreso identificables y mostrar el contexto en una zona compacta, en vez de eliminar la posibilidad de volver, especialmente cuando hay cambios pendientes.
- **Formato de guion:** el editor debe seguir respetando los bloques existentes; Final Draft describe el encabezado como interior/exterior, lugar y momento: [Final Draft, elementos del guion](https://www.finaldraft.com/blog/how-to-use-final-draft-script-elements).

## Estado actual en FOCCUS

Revisión estática de los cambios locales, aún sin confirmar en git: `ModuleLayout.jsx` ofrece navegación por módulos con barra lateral y menú adaptable. El proyecto tiene enlaces de regreso propios en varias pantallas; algunos dependen del historial. `Guion.jsx` presenta vistas separadas para crear desde cero, crear versión y editar el contenido de una versión existente, con cabeceras y distribución diferentes.

## Recomendación para foccus-web

- **Alta:** mejorar navegación entre módulos, hacia el panel y la selección del proyecto, con rutas de regreso previsibles incluso al abrir enlaces directamente. Mantener el proyecto activo y permisos existentes; facilitar su uso con teclado y en pantallas estrechas.
- **Alta:** aproximar la creación y la edición a la interfaz de edición preferida, compartiendo componentes o estilos donde sea apropiado. Retirar la cabecera voluminosa indicada por el usuario y conservar un control compacto de regreso o salida y una indicación clara del modo y del guion o proyecto.
- **Alta:** no perder texto ni metadatos de guion o escenas al cambiar de vista o módulo. Avisar antes de abandonar cambios sin guardar; mantener las operaciones de guardar, cancelar, versión y formulario de escena.
- **Media:** probar los flujos con teclado y con distintos tamaños de pantalla; comprobar estados de carga y errores y evitar barras de navegación duplicadas.

## Impacto en móvil

Es un ajuste del frontend web; registrar en `docs/agentes/CAMBIOS_WEB.md` cualquier comportamiento nuevo que corresponda a Flutter. No implica cambiar endpoints ni adaptar Flutter sin solicitud.

## Riesgos y alcance estudiantil

Las vistas contienen lógica distinta de guardado y sincronización. Compartir la presentación sin borrar esas diferencias reduce el riesgo de perder datos. Conservar los cambios locales existentes y comprobar que la navegación siga disponible cuando se maximiza el espacio de escritura.
