# Guía práctica de pruebas de requisitos funcionales

Esta guía cubre los RF-01 a RF-30 de la versión web. Sirve para hacer las
pruebas y registrar sus resultados; **seguir estos pasos no significa que ya
se hayan aprobado**. La aplicación móvil no se incluye en esta pasada.

## Estado de la demostración

Se creó el proyecto `DEMO FOCCUS - La última escena` desde la aplicación:

- Guion con tres versiones y dos escenas; la nota de la primera versión se
  confirmó en el lector al volver a abrirla.
- Una foto de continuidad de la primera escena se volvió a abrir y se
  comprobó que la imagen carga. Es una imagen temporal, no una foto de set.
- Galería con carta, Luna, sala de edición y chaqueta, todas con imágenes
  temporales. Se abrió la ficha de la carta, se comprobó su escena y se
  registró una versión de uso con imagen temporal.
- Un requerimiento de utilería y el vínculo de la carta a la primera escena.
- Una jornada ficticia con la primera escena y el proceso `Revisar iluminación`;
  la edición del proceso se conservó al volver a abrirlo.
- La búsqueda de `ESC-001` abrió la ficha correspondiente.
- Se descargaron los PDF de las versiones 1 y 2 y se comprobó que la frase
  agregada solo aparece en la segunda. En el PDF de la versión 1 se
  comprobaron portada, encabezados, páginas Carta y fuente Courier; no se
  han revisado todos los casos de formato o paginación. Una prueba aislada
  con jsPDF real verificó texto sintético de varios bloques en varias
  páginas, Courier 12 y numeración; no comprobó márgenes ni descarga.
- En pruebas aisladas se guardaron y extrajeron archivos sintéticos PDF con
  texto, DOCX y FDX. Además, se subió uno de cada tipo mediante la interfaz
  al proyecto de aislamiento y se comprobó su texto en el lector; el DOCX
  también se volvió a abrir tras recargar la página. Son ejemplos mínimos:
  no se han probado documentos complejos, PDF escaneados ni OCR.
- En el guion DOCX de prueba se añadió una nota a la versión 1 y se creó
  una versión 2 con texto adicional. La nota solo apareció en la versión 1;
  el texto adicional solo se comprobó en la versión 2.
- Una segunda cuenta recuperó su acceso, completó su perfil e ingresó como
  Usuario. Leyó la nota y cargó la foto de continuidad; no vio códigos en
  las respuestas de guiones ni de galería. La API rechazó con 403 tanto la
  creación de una nota como la búsqueda de un código. También pudo abrir la
  imagen de la versión de uso de la carta sin ver el control para subirla.

Una consulta de solo lectura, limitada a este proyecto, confirmó los
registros y sus relaciones en la BD antes de crear la tercera versión del
guion y la versión de uso de la carta.

También se creó `PRUEBA RF - Aislamiento`, con un guion desechable y sin
acceso concedido al segundo usuario. Contenía también tres guiones de
importación sintéticos y desechables. Ese usuario solo vio el proyecto de
demostración en la lista. La API rechazó con 403 las consultas al proyecto
ajeno y respondió 404 al solicitar el guion ajeno y sus versiones usando el
proyecto propio. Esta comprobación cubre esos casos, no todos los recursos.
Con autorización del usuario se eliminó ese proyecto mediante la API. Una
lectura posterior confirmó la ausencia de sus guiones, versiones, escena,
nota y códigos, así como de las carpetas locales de sus archivos de prueba.
El proyecto de exposición conservó su guion y códigos comprobados. El
navegador de pruebas no admitió la confirmación gráfica, por lo que ese paso
de interfaz queda pendiente. No se creó respaldo antes de esta eliminación.

En la última ejecución local pasaron 80 pruebas aisladas del backend y 16
del frontend; el frontend compiló y el análisis de los archivos web
modificados no reportó errores. Estas pruebas no sustituyen la comprobación
de todos los recorridos con servicios reales.

Al revisar RF-16 se corrigió la limpieza de dependencias, códigos y archivos
al eliminar un guion. Se probó con BD y archivos aislados, incluidos
desgloses compartidos y fallos de limpieza de códigos. Además, con la API
actualizada se eliminó un guion desechable de un proyecto creado para esa
prueba. Una lectura de MySQL confirmó la eliminación de su versión, nota,
escena, desglose, requerimiento y códigos; también se comprobó la ausencia
de su carpeta local. El guion del proyecto de exposición permaneció. Se
eliminó después el proyecto desechable. Ambos borrados se hicieron por API;
la confirmación gráfica sigue pendiente y no se hizo respaldo.

Para RF-24 y RF-25 se corrigieron casos de lectura de encabezados y fechas de
PDF. Se probaron con documentos sintéticos y BD aislada. Después, en un
proyecto desechable y mediante la aplicación, se importaron dos PDF sintéticos:
se creó una escena con tres requerimientos y una jornada que recibió esa
escena. La BD confirmó esas relaciones y la jornada siguió visible tras
recargar. El proyecto de prueba se eliminó por API con autorización; no se
probó un documento real complejo ni OCR.

Esto es evidencia parcial, no una aprobación completa de los RF. Faltan, entre
otras pruebas, el aislamiento de otros recursos, más operaciones con el
segundo usuario, pruebas destructivas aisladas y revisión detallada del PDF.
Al probar inicialmente la exportación, la aplicación informó que no había
texto pese a verse en el lector. Se corrigió el manejador y se comprobó la
descarga y el contenido básico; faltan casos adicionales de formato.

La invitación inicial creó el miembro, pero notificó **cero correos enviados**.
Después se pudo recuperar el acceso por correo y activar la cuenta. Se corrigió
el manejo de cierre SMTP tras una desconexión observada, pero no se identificó
con certeza la causa original ni se ha reprobado una invitación nueva.

## Antes de empezar

1. Abre la web y comprueba que la API y la base de datos están disponibles.
   Para acceso local, la web normalmente está en `http://127.0.0.1:5173` y
   la documentación de la API en `http://127.0.0.1:8000/docs`.
2. Usa una empresa y un proyecto identificados como **DEMO**. Para el segundo
   miembro se necesita otro correo accesible. Las pruebas de permisos necesitan
   dos cuentas y, para el aislamiento, un segundo proyecto.
3. Usa únicamente información y archivos de prueba. Si usas fotografías
   provisionales, identifícalas como tales. Para recuperación, invitación y
   2FA se necesita envío de correo configurado y acceso a los buzones.
4. Antes de probar en una base compartida, acuerda un respaldo verificable de
   la base **y** del directorio de archivos subidos. Para las pruebas de
   eliminación usa preferiblemente una base y archivos aislados, o al menos
   cuentas y recursos desechables distintos del proyecto de exposición.
5. No escribas contraseñas, códigos de verificación, tokens ni datos personales
   en esta guía o en capturas. No insertes usuarios, roles o contraseñas con
   SQL: la aplicación crea las filas y las relaciones necesarias.

### Datos sugeridos

- Empresa: `FOCCUS DEMO`; representante: `Equipo de demostración`; documento,
  teléfono y dirección ficticios. El teléfono fijo es obligatorio en la BD.
  Los correos de empresa y usuario, y el documento de usuario, deben ser
  únicos. El correo de acceso debe ser real y estar bajo tu control.
- Proyecto: `DEMO FOCCUS - La última escena`, cortometraje de drama.
- Guion: `La última escena`. Ejemplo original:

  ```text
  INT. SALA DE EDICIÓN - DÍA
  LUNA encuentra una carta junto a una cámara.
  LUNA
  Todavía podemos contar esta historia.

  EXT. PATIO DEL ESTUDIO - TARDE
  Luna entrega la carta a MATEO.
  MATEO
  Entonces grabemos la última escena.
  ```

- Escenas: sala de edición y patio. Galería: personaje Luna, lugar sala de
  edición, objeto carta y vestuario chaqueta. Usa imágenes propias o
  autorizadas, en JPG, PNG o WEBP.
- Rodaje: `Jornada 1 - sala de edición`; proceso: `Revisar iluminación`.
  Nota de guion: `La carta debe permanecer en la mano izquierda`.

## Cómo comprobar cada RF

En cada caso anota: fecha, resultado **aprobado / falló / pendiente**, pasos
ejecutados y evidencia sin datos sensibles. Las columnas «BD» indican qué
registros consultar, no que debas insertarlos manualmente.

### RF-01 — Registro de empresa y administrador

1. En **Registrar**, llena los tres pasos con datos ficticios y un correo de
   acceso controlado; acepta las condiciones solo si estás de acuerdo.
2. Pulsa **Crear cuenta**. Debe confirmarse el registro. Intenta un duplicado
   solo con datos de prueba: debe rechazarse sin crear otra cuenta.
3. BD: `clients` contiene la empresa; `users.id_client` apunta a ella y
   `users.id_rol` es `1001`. No muestres `users.contrasena`.

### RF-02 — Inicio de sesión

1. En **Ingresar**, usa el correo y la contraseña de la cuenta de prueba.
2. Debe abrirse la verificación por correo. Una contraseña incorrecta no debe
   abrir el panel ni entregar una sesión.
3. BD: consulta la existencia de la cuenta en `users`; no es necesario
   consultar contraseñas.

### RF-03 — Verificación en dos pasos

1. Inicia sesión, abre el correo recibido y escribe el código en la pantalla.
2. Un código incorrecto no debe dar acceso; el correcto debe abrir el panel.
   El código usado no debe servir nuevamente. No registres el código.
3. BD: el intento y el código son temporales en memoria, no una fila que
   debas buscar. Comprueba el acceso desde la interfaz.

### RF-04 — Recuperación de acceso

1. Usa una **cuenta desechable** y el enlace **¿Olvidaste tu contraseña o
   usuario?**. Solicita un código al correo de esa cuenta.
2. Introduce el código y una contraseña nueva. La anterior debe dejar de
   funcionar y la nueva debe permitir llegar a 2FA.
3. BD: `users` conserva la cuenta. No consultes ni copies su contraseña.
   El código de recuperación es temporal en memoria.

### RF-05 — Invitar a un miembro

1. En **Equipo y roles**, invita otro correo accesible al proyecto DEMO con
   rol **Usuario**. No uses correos de personas que no hayan aceptado.
2. Comprueba la invitación en el buzón y completa el acceso y perfil de esa
   segunda cuenta siguiendo el correo.
3. BD: comprueba la cuenta en `users` y el vínculo del proyecto en
   `user_projects` con `id_rol = 1005`.

### RF-06 — Permisos de escritura

1. Como administrador, crea o edita una escena de prueba.
2. Entra como Usuario del mismo proyecto: debe poder consultar la escena,
   pero no crear, editar ni borrar datos del proyecto. Si se prueba por API,
   la escritura debe ser rechazada y no cambiar los datos.
3. BD: `user_projects` conserva las membresías; verifica la escena en
   `escenas` antes y después. No publiques tokens en capturas.

### RF-07 — Retirar un miembro

1. En el proyecto desechable, invita una segunda cuenta de prueba.
2. Como administrador, retírala desde **Equipo y roles**. Debe dejar de ver
   ese proyecto, pero su cuenta no debe eliminarse.
3. BD: desaparece su vínculo correspondiente de `user_projects`; su fila de
   `users` permanece.

### RF-08 — Eliminar cuenta propia

1. Inicia sesión con una **cuenta desechable**, nunca con la cuenta del
   proyecto de exposición. En **Perfil**, solicita eliminar la cuenta.
2. Confirma la operación y verifica que ya no pueda iniciar sesión.
3. BD: comprueba que su fila de `users` y sus vínculos se eliminaron según la
   operación. **Es destructivo**; valida previamente las dependencias.

### RF-09 — Empresas cliente

1. Como administrador global, abre **Empresas cliente**, registra una
   empresa desechable, consulta sus datos y edítala.
2. Elimina esa empresa solo si no tiene proyectos. Intenta eliminar una
   empresa de prueba con un proyecto asociado: debe rechazarse.
3. BD: `clients` refleja alta, edición y eliminación; `projects.id_client`
   muestra la asociación que impide borrar.

### RF-10 — Proyectos

1. Crea el proyecto DEMO desde el panel. Abre **Editar proyecto**, cambia la
   sinopsis y guarda; vuelve a abrirlo para comprobar la persistencia.
2. Consulta otro proyecto desde una cuenta sin membresía: debe rechazarse.
   Para probar borrado utiliza un proyecto desechable, no el de exposición.
3. BD: `projects` contiene los datos; `user_projects` contiene el vínculo del
   administrador con rol `1001`.

### RF-11 — Eliminar proyecto y contenido

1. Crea un **proyecto desechable** con guion, escena y archivo de prueba.
2. Elimínalo y confirma que ya no aparece y que sus recursos dependientes
   dejan de estar disponibles. Verifica los archivos solo en su directorio.
3. BD: consulta `projects`, `guion`, `escenas` y `user_projects` para los
   identificadores de prueba. **Es destructivo**.

### RF-12 — Roles por proyecto

1. Invita un miembro como Usuario. Comprueba que administrador y Usuario ven
   el mismo proyecto y que solo el administrador puede modificarlo.
2. Verifica que solo se ofrecen Administrador y Usuario al asignar roles.
   Las membresías legadas 1002–1004 deben ser de solo lectura.
3. BD: `user_projects.id_rol` es `1001` o `1005` para las nuevas membresías.
   Una tabla `roles` vacía no demuestra por sí sola que esto falle.

### RF-13 — Crear guion y extraer texto

1. En **Guiones → Crear guion → Crear desde cero**, escribe el ejemplo y
   guarda. Ábrelo y comprueba que el contenido se conserva.
2. En otro guion de prueba, elige **Subir guion** y carga un PDF con texto,
   DOCX o FDX propio; comprueba el texto extraído. Un PDF escaneado puede no
   ofrecer texto editable: no hay que atribuirle OCR.
3. BD: `guion` y `guion_version`; los archivos se almacenan en disco del
   backend y la BD conserva sus rutas.

### RF-14 — Versiones de guion

1. Abre el guion, entra en **Versiones**, lee la primera y elige
   **Editar como nueva versión**. Cambia una línea y guarda.
2. Comprueba que existen ambas versiones y que la primera conserva su texto.
3. BD: `guion_version` tiene dos registros con el mismo `id_guion`;
   `guion.id_guion_version_actual` identifica la versión actual.

### RF-15 — Notas de versión

1. Como administrador, abre una versión en **Leer versión**, escribe una
   nota y pulsa **Guardar nota**. Recarga y comprueba que permanece.
2. Consulta como miembro; verifica que puede leerla, pero no crearla.
   Abre otra versión y comprueba que la nota no aparece allí.
3. BD: `guion_nota.id_guion_version`, `id_user` y `contenido` vinculan la
   nota a su versión y autor.

### RF-16 — Eliminar guion

1. Crea un guion desechable dentro de un proyecto desechable.
2. Usa **Eliminar guion** y confirma; deja intacto el guion de exposición.
3. BD: comprueba la ausencia del guion y de sus dependencias de prueba.
   **Es destructivo**.

### RF-17 — Escenas

1. Abre **Escenas**, selecciona el guion y comprueba las escenas derivadas de
   sus encabezados. Crea o edita una escena de prueba y revisa sus datos.
2. Comprueba que no se pueda editar una escena de otro proyecto.
3. BD: `escenas.id_guion` apunta al guion; revisa número y encabezado.

### RF-18 — Continuidad visual

1. Abre una escena → **Continuidad visual** → **Crear versión**.
2. En **Subir fotos**, carga una imagen autorizada, indica tipo, etiqueta y
   notas. Al volver a abrir la escena, debe aparecer y abrirse la imagen.
   Repite para vestuario, objeto y espacio si se van a presentar los tres.
3. BD: `escena_version.id_escena` y `continuidad_foto.id_escena_version`;
   la foto se guarda en disco y `archivo_path` indica su ruta.

### RF-19 — Cronograma de rodaje

1. En **Plan de rodaje → Crear Plan → Crear desde cero**, crea un día con
   fecha, día dramático, semana y locación; ábrelo y edita sus datos o estado.
2. Recarga y comprueba que se conserva en el proyecto correcto.
3. BD: `rodaje.id_project`, `nombre` y `fecha_inicio`.

### RF-20 — Procesos del rodaje

1. Dentro de la jornada, agrega el proceso `Revisar iluminación` con fecha
   y ubicación. Edita el nombre o estado y guarda.
2. Vuelve a abrir la jornada y comprueba el cambio. Para borrar, usa un
   proceso desechable. El formulario no edita el campo de archivo.
3. BD: `proceso_rodaje.id_rodaje`, `nombre`, `fecha` y estado.

### RF-21 — Contacto público

1. Sin iniciar sesión, abre la página principal y completa **Contacto** con
   datos de prueba y un mensaje identificado como prueba.
2. Envía únicamente si se acordó el destinatario: comprueba la confirmación
   y la recepción del mensaje. Si falla el correo, registra el error.
3. BD: la prueba comprueba envío; no presupone una tabla de mensajes.

### RF-22 — Galería

1. En **Galería → Agregar fotografía**, crea una ficha por cada tipo:
   personaje, lugar y objeto; para vestuario usa la categoría del objeto.
2. Abre cada ficha y verifica su imagen. Para registrar una versión de uso,
   inserta la ficha desde el editor del guion, describe sus cambios en el
   formulario de uso y luego revisa el historial de la ficha en Galería.
3. BD: `galeria_items`, `galeria_versiones` y, al subir fotos de versión,
   `galeria_version_fotos`; los archivos reales están en disco.

### RF-23 — Vincular galería y escena

1. En **Desglose**, abre una escena y vincula un elemento de galería, por
   ejemplo la carta. Registra el uso disponible desde su ficha.
2. Comprueba que el elemento aparece en la escena correcta y no en otra.
3. BD: `escena_galeria_items.id_escena` e `id_galeria`; para versiones de
   uso consulta `galeria_versiones`.

### RF-24 — Desglose

1. En **Desglose**, selecciona el guion y abre una escena. Pulsa **Agregar
   requerimiento** y usa el departamento `Props` y detalle `Carta`.
2. Comprueba la lista y los totales. Si vas a probar importación, utiliza
   un PDF de desglose de prueba con el formato esperado por la aplicación.
3. BD: `escenas.id_desglose`, `desglose` y
   `desglose_requerimientos.id_desglose`.

Para probar la importación, crea un PDF **con texto seleccionable** que
contenga líneas como estas; utiliza un guion y escenas desechables:

```text
SEMANA 1
DÍA 1 · Lunes, 2 de marzo 2026 · Estudio · Llamado: 6:00 AM ·
Sala principal
1 INT. SALA - DÍA
Entrada de la protagonista
Props: Carta, Taza
Vestuario: Abrigo
Fin Día 1
```

La estructura anterior se verificó con PDF sintético en BD aislada y en la
aplicación con BD real, usando un proyecto desechable. Una
reimportación puede actualizar escenas y reemplazar requerimientos: no la
ensayes sobre el proyecto de exposición. No se comprobó OCR.

### RF-25 — Escenas en jornadas

1. Crea una jornada, abre su detalle y agrega una escena disponible.
2. Comprueba que aparece en esa jornada y puede retirarse en un caso de
   prueba. Si pruebas importación por PDF, utiliza un archivo de prueba
   compatible con el formato de plan de rodaje esperado.
3. BD: `escenas.id_rodaje` apunta a la jornada de `rodaje`.

Para importar un plan, crea primero una escena desechable con número `1` y
un PDF con texto seleccionable como este:

```text
SEMANA 1
DÍA 1 · Lunes, 2 de marzo 2026 · Estudio · Llamado: 6:00 AM ·
Sala principal
Sc. 1 INT. SALA - DÍA 2/8
La protagonista entra al recinto.
Fin Día 1
```

Las pruebas aislada y real confirmaron la creación de la jornada y la
asignación por número. La importación también puede actualizar datos de la escena, así que
debe probarse en un proyecto desechable. Se requieren fechas válidas en
español; no se probó OCR ni documentos reales complejos.

### RF-26 — Bloques del guion

1. En el editor crea bloques de escena, acción, personaje, paréntesis,
   diálogo y transición mediante **Tipo de bloque**.
2. Guarda, abre la versión y comprueba el orden y formato de cada bloque.
3. BD: `guion_version.contenido` conserva el contenido HTML. La prueba visual
   no sustituye revisar todos los casos de formato.

### RF-27 — Exportar PDF

1. Abre una versión del guion y pulsa **Descargar PDF**.
2. Abre el archivo y revisa portada, tamaño Carta, tipografía Courier,
   sangrías, contenido y paginación. Comprueba textos largos y saltos de
   página con un guion de prueba si se necesita validar esos casos.
3. BD: no debe requerirse una fila nueva por la descarga generada en web.

### RF-28 — Códigos únicos

1. Como administrador crea o consulta proyecto, guion, versión, escena,
   personaje, lugar, objeto y jornada. Anota sus códigos visibles sin
   asumir consecutivos concretos.
2. Comprueba que se mantienen al volver a abrirlos y que no se repiten dentro
   del ámbito y tipo correspondientes.
3. BD: `codigos_entidad` y `codigos_contador`. Si no existen o el código no
   aparece, consulta al responsable de BD; no ejecutes migraciones por tu cuenta.

### RF-29 — Códigos visibles solo al administrador

1. Como administrador, copia un código desde su ficha.
2. Inicia sesión como Usuario del mismo proyecto y verifica que el código no
   se muestra; revisa también que la respuesta API no incluya la propiedad
   `codigo`. No expongas el token.
3. BD: los códigos siguen en `codigos_entidad`; la diferencia es de permisos
   y respuesta, no de eliminar filas.

### RF-30 — Buscar por código

1. Como administrador, abre **Buscar código**, escribe un código existente
   de la demostración y abre el resultado.
2. Comprueba que lleva al elemento correcto. Como Usuario, la búsqueda debe
   estar restringida.
3. BD: el código corresponde a su entidad en `codigos_entidad`.

## Consultas de lectura orientativas

Ejecuta estas consultas solo si tienes autorización de lectura. Sustituye
`ID_DEL_PROYECTO` por el identificador de tu proyecto DEMO, no por el nombre,
y sustituye los demás identificadores por los obtenidos en la aplicación o
en la consulta anterior. Nunca consultes todas las cuentas ni contraseñas.

```sql
SET @proyecto = 'ID_DEL_PROYECTO';
SELECT id_project, project_name, id_client FROM projects WHERE id_project = @proyecto;
SELECT id_user, id_project, id_rol FROM user_projects WHERE id_project = @proyecto;
SELECT id_guion, nombre, id_guion_version_actual FROM guion WHERE id_project = @proyecto;
SELECT id_rodaje, nombre, fecha_inicio FROM rodaje WHERE id_project = @proyecto;
SELECT id_galeria, tipo, nombre FROM galeria_items WHERE id_project = @proyecto;
SELECT tipo, entidad_id, codigo FROM codigos_entidad WHERE id_project = @proyecto;

SET @guion = ID_NUMERICO_DEL_GUION;
SELECT id_guion_version, id_guion, numero_de_version, estado
FROM guion_version WHERE id_guion = @guion;
SELECT id_escena, id_guion, id_rodaje, id_desglose
FROM escenas WHERE id_guion = @guion;

SET @version = ID_NUMERICO_DE_VERSION;
SELECT id_guion_version, id_user, contenido
FROM guion_nota WHERE id_guion_version = @version;
```

En las dos últimas asignaciones sustituye el texto completo por un número,
por ejemplo `SET @guion = 123;`. Para comprobar fotos, procesos o vínculos,
filtra por el ID de la escena o jornada de demostración, sin consultar
registros de otros proyectos.

## Qué significan las notas del documento RF

Las notas 1 y 2 describen permisos y roles por proyecto; son decisiones de
funcionamiento, no errores que deban borrarse. La 3 enumera formas de crear
un guion. La 4 explica permisos de notas y que antes no había evidencia con
datos reales. La 5 advierte que la prueba anterior de fotografías simulaba
el guardado. La 6 documenta una corrección de códigos verificada con pruebas
aisladas.

La nota 3 es documentación del contrato y puede trasladarse a una sección
técnica sin cambiar el funcionamiento. La nota 2 documenta la decisión de
roles y conviene conservarla como regla. Para la nota 1 ya se comprobó el
aislamiento del guion entre los dos proyectos de prueba; faltan otros recursos
y más operaciones por rol. La 4 ya tiene evidencia de guardado
por administrador, lectura por miembro y rechazo del POST para miembro. La 5
tiene evidencia de carga y lectura por miembro de una imagen temporal; faltan
más tipos y pruebas de permisos. La 6 tiene evidencia de búsqueda por
administrador y restricción para miembro en el buscador y respuesta de
guiones y galería; faltan comprobar los demás módulos.

Después de las pruebas, se corrigen los fallos observados y se actualiza la
trazabilidad con la evidencia y sus límites. Borrar advertencias sin hacer las
pruebas no las resuelve; una prueba parcial tampoco garantiza funcionamiento
perfecto.
