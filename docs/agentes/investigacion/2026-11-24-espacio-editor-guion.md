# Espacio de escritura del guion

## Resumen

El editor debe priorizar la hoja y mantener sus herramientas accesibles.
Al crear un guion, el nombre provisional y los datos definitivos no necesitan ocupar el espacio de escritura.
La creación y la edición deben presentar una experiencia coherente.

## Qué dice la industria

- **Hecho verificado:** Microsoft Word permite contraer la cinta de herramientas y ofrece un modo de pantalla completa para ampliar la vista del documento. [Soporte de Microsoft](https://support.microsoft.com/en-us/office/foundations-experiences/show-or-hide-the-ribbon-in-office).
- **Sugerencia:** adoptar el principio de controles compactos y recuperables, sin copiar la interfaz de Word ni sus funcionalidades completas.

## Estado actual en FOCCUS

- El editor de creación muestra nombre y descripción sobre la hoja; la edición usa una cabecera y un área de escritura diferentes.
- Ya existen herramientas de formato, escenas, catálogo y una opción para ocultar herramientas.
- Guardar un guion desde cero exige un título y crea su primera versión.

## Recomendación para foccus-web

- **Alta:** mostrar un nombre provisional compacto en creación y solicitar título y descripción al guardar; conservar el borrador si se cancela el formulario.
- **Alta:** aprovechar el ancho y la altura disponibles en creación y edición, manteniendo las herramientas existentes accesibles y la selección del editor estable.
- **Alta:** conservar la validación del título, la confirmación de salida y la creación de la primera versión.
- **Media:** mantener controles compactos o desplegables y un diseño adaptable al tamaño de pantalla.
- **Baja:** evaluar nuevas herramientas de edición por separado, según necesidades concretas.
- Mantener el formato de la hoja de guion y no cambiar márgenes ni tipografía por esta mejora de interfaz.
- No se requieren cambios de backend ni de base de datos si se conserva el contrato de creación existente.

## Impacto en móvil

No se cambia la aplicación Flutter ni el contrato de la API. El editor web debe seguir siendo utilizable en pantallas pequeñas.

## Riesgos y alcance estudiantil

Evitar perder el texto o la selección al abrir el formulario de guardado y al volver al editor. No replicar toda la complejidad de un procesador de textos.
