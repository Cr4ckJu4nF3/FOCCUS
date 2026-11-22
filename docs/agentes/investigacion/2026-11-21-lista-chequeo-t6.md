# Lista de chequeo T6 para FOCCUS

## Resumen

La lista solicita evidencia de integración, pruebas, documentación y calidad. El equipo asignó los puntos 2, 6, 7 y 14 a otro compañero. Esta revisión es preliminar: encontrar código o documentación no equivale a comprobar que un criterio esté aprobado. El significado de «cuarto backend» requiere confirmación con el instructor.

## Qué dice la industria y la lista

- **Criterio solicitado:** la [lista T6](https://github.com/ergrato-dev/checklist-proyectos-adso/blob/main/listas-de-chequeo/listas-oferta-abierta/t6/6t-lista-de-chequeo-oa.md) exige al menos 20 casos, cobertura mínima del 50 % de un módulo crítico y dos ciclos de corrección verificables.
- **Criterio solicitado:** el punto 6 es una bonificación de IoT, no un requisito obligatorio según la introducción de esa lista.
- **Contexto:** la [justificación del instrumento](https://github.com/ergrato-dev/checklist-proyectos-adso/blob/main/1.justificaci%C3%B3n-metodologica.md) lo presenta como documento en evolución; las exigencias vigentes deben contrastarse con el instructor.
- **Distinción:** desarrollar cuatro servicios sin un propósito real no es una regla profesional general; la lista puede responder a una exigencia académica concreta.

## Estado actual en FOCCUS

- El README describe React, FastAPI, MySQL y Flutter; existe `.env.example`. La documentación interactiva de FastAPI está prevista en `/docs`, pero no se verificó el arranque en esta revisión.
- `docs/agentes/GUIA_PRUEBAS_RF.md` documenta una demostración y pruebas parciales; advierte que no son aprobación de todos los requisitos.
- Hay pruebas automatizadas de frontend y backend y commits de corrección como `2397a2b`. No se midió cobertura en esta revisión ni se encontró una colección Postman en las rutas revisadas.
- La carpeta móvil del checkout actual no permite verificar su código fuente; el README indica que vive en otra rama. La integración web-móvil y el estado de ese componente deben demostrarse, no darse por aprobados.
- El catálogo de bloques está pendiente de migración segura. Docker y ese cambio están pausados por decisión del usuario.

## Recomendación para foccus-web y equipo

### Alta

- **1:** redactar junto al equipo qué está terminado, qué sigue pendiente y qué pasa a T7, con responsables y sin presentar tareas pendientes como terminadas.
- **3:** preguntar qué exige exactamente el cuarto backend y qué entregaron antes. Si deben existir cuatro implementaciones distintas, evaluar el esfuerzo y seguir el criterio del instructor; si aceptan responsabilidades o evolución de un solo servicio, justificarlo con evidencia. No inventar antecedentes.
- **4:** comprobar arranque desde cero, validación y JWT con casos válidos e inválidos y `.env.example` sin secretos. Instalar en un entorno limpio y seguro y dejar evidencia reproducible.
- **5:** actualizar el diagrama real de componentes y preparar una demostración de un flujo integral con datos ficticios. El equipo debe ejecutar y explicar el recorrido.
- **8:** construir una matriz de 20 o más casos positivos y negativos, coordinada con el plan del compañero. Registrar datos ficticios, pasos, resultados esperados y resultados reales solo después de ejecutarlos.
- **9:** elegir y justificar un módulo crítico, medir cobertura real y añadir pruebas hasta alcanzar al menos el 50 % de ese módulo. Crear y ejecutar una colección Postman con pruebas y variables sin credenciales.
- **10:** registrar las ejecuciones, fecha, entorno, versión y resultados; registrar defectos reales en GitHub Issues u otra herramienta acordada, con severidad y estado.
- **11:** identificar dos defectos reales; enlazar cada detección, caso, commit específico y reejecución. `2397a2b` puede contener candidatos, pero no se ha demostrado aquí el ciclo completo.

### Media

- **12:** actualizar README con preparación, ejecución y resultados de pruebas; revisar `/docs` y complementar la API del backend requerido. No afirmar que instalar desde cero funciona hasta probarlo.
- **13:** usar commits de construcción y de corrección distinguibles a partir de ahora, idealmente enlazados a issues; no reescribir ni fabricar historia.
- **15:** documentar deuda técnica priorizada y elaborar comparación de los cuatro backends si realmente existen. Si no existen o el requisito es ambiguo, aclararlo con el instructor y documentar la situación real.

### Formato

No se requieren cambios al formato del guion audiovisual para esta evaluación.

## Impacto en móvil

La demostración debe incluir la app móvil si hace parte del sistema que el equipo presentará. No se debe afirmar que sus flujos o contratos están verificados sin probar la rama y el dispositivo correspondientes.

## Riesgos y alcance estudiantil

El principal riesgo es tratar evidencia parcial como aprobación: no inventar resultados, defectos, backends, métricas ni commits. El 50 % es un umbral sobre el módulo crítico elegido, no sobre un archivo trivial elegido solo para alcanzar el número. Coordinar con el responsable del plan de pruebas y evitar pruebas destructivas sobre datos reales. Ningún código, secreto ni dato del proyecto se envió a la fuente externa.
