# Pruebas en vivo RF-01 a RF-30: web y consultas MySQL

## Alcance y seguridad

Esta es una **guía para ejecutar**, no un informe de pruebas realizadas. La
demostración es `DEMO FOCCUS - La última escena`. El recorrido es web; no cubre
móvil. Contrasta los resultados con `FOCCUS-RF/requisitos/RF.md` y la
`docs/agentes/GUIA_PRUEBAS_RF.md`. Las consultas se contrastaron con los
modelos y el esquema **locales**, no con una conexión al servidor: si allí
falta una tabla o columna, detente y consulta al responsable de BD.

- Solicita autorización de lectura y selecciona la BD correcta en tu cliente
  MySQL. No se presupone que tengas permisos, correo configurado, buzones
  accesibles ni datos concretos ya creados.
- No pruebes borrados, retiro de miembros, recuperación de contraseña ni
  reimportaciones sobre el proyecto, guion o cuenta de exposición. Usa una
  **empresa, proyecto, guion y cuentas desechables independientes** para esas
  pruebas y verifica que no compartan recursos con la exposición.
- Antes de cualquier acción web que cree, edite o elimine datos, acuerda un
  respaldo verificable de la BD **y de los archivos subidos**. Si falta o falla
  uno, detente. Los borrados pueden ser irreversibles; no intentes restaurar sin
  el responsable de BD. Las pruebas de importación pueden modificar o
  reemplazar datos existentes: solo en recursos desechables.
- Todo el SQL de esta guía es de lectura. La web sí modifica datos en las
  pruebas indicadas. Nunca registres ni muestres contraseñas, códigos de
  verificación, tokens, correos o datos personales en resultados o capturas.
  Los códigos de entidades como `ESC-001` son distintos de los códigos de
  verificación y se usan solo en evidencia controlada.
- Usa texto y archivos ficticios propios o autorizados. Para correo, necesitas
  buzones bajo tu control y envío configurado; si falta, marca **pendiente**.
  No envies contacto ni invitaciones sin acuerdo del destinatario.
- Anota fecha, RF, resultado **aprobado / falló / pendiente**, IDs de prueba,
  comparación antes/después y evidencia sin datos sensibles. Un resultado
  vacío solo demuestra ausencia si el ID, la conexión y los permisos son
  correctos. Los permisos, archivos y formato requieren además prueba visual.

## Cómo usar las consultas

1. Abre tu cliente MySQL, conéctate mediante el procedimiento autorizado y
   selecciona la base de pruebas. No copies credenciales en el editor.
2. Ejecuta cada sentencia `SELECT` por separado. Sustituye el marcador completo:
   valores de texto entre comillas, por ejemplo `'ID_PROYECTO'` por `'p123'`;
   IDs numéricos como `ID_GUION` por `123`, sin comillas. Los ejemplos no son
   IDs reales. No dejes marcadores sin reemplazar.
3. Las consultas nombradas A–N se reutilizan abajo. Ejecútalas **antes** y
   **después** de la acción indicada; guarda los IDs y resultados seguros
   antes de una eliminación, porque después los enlaces pueden haber
   desaparecido. Si hay varias filas, registra **todos** sus IDs y repite las
   consultas para cada uno. No uses `SELECT *`.
4. Antes de probar cada borrado, confirma visualmente el nombre y los IDs de
   los recursos desechables, verifica respaldos y detente ante cualquier
   ambigüedad o referencia a la exposición. Después recarga la interfaz y
   compara usando los IDs capturados, no solo una búsqueda por nombre.

### A. Identificar proyecto y empresa

```sql
SELECT id_project, project_name, id_client
FROM projects
WHERE project_name = 'DEMO FOCCUS - La última escena';
```

Debe identificarse inequívocamente una fila. Si hay varias, detente y aclara
cuál corresponde; si no hay ninguna, crea o localiza el proyecto por la web
con autorización. Copia `id_project` y `id_client`. Para un proyecto
desechable, reemplaza el nombre por su nombre exacto de prueba; no uses el ID
DEMO para pruebas destructivas.

```sql
SELECT id_cliente, razon_social FROM clients WHERE id_cliente = ID_CLIENTE;
SELECT id_project, project_name, id_client FROM projects
WHERE id_project = 'ID_PROYECTO';
SELECT id_project FROM projects WHERE id_client = ID_CLIENTE;
```

La última consulta delimita la empresa de prueba y permite contar sus
proyectos. `projects.id_client` es una asociación en el modelo; no se supone
una llave foránea física.

### B. Usuarios y membresías de prueba

Para identificar una cuenta controlada, sustituye el marcador por su correo
en privado. La consulta **no devuelve** el correo ni otra información
personal. No compartas la sentencia rellenada.

```sql
SELECT id_user, id_client, id_rol, estado
FROM users WHERE mail = 'CORREO_DE_CUENTA_DE_PRUEBA';
SELECT id_user, id_project, id_rol
FROM user_projects WHERE id_project = 'ID_PROYECTO';
SELECT id_user, id_client, id_rol, estado
FROM users WHERE id_user = ID_USUARIO;
SELECT id_user, id_project, id_rol
FROM user_projects WHERE id_user = ID_USUARIO AND id_project = 'ID_PROYECTO';
SELECT id_project, id_rol FROM user_projects WHERE id_user = ID_USUARIO;
```

La última sentencia identifica todas las membresías antes de eliminar una
cuenta desechable. Úsala solo para esa cuenta. `users.id_rol` no sustituye al
rol de `user_projects` para permisos por proyecto.

### C. Guiones, versiones y notas

```sql
SELECT id_guion, nombre, id_project, id_guion_version_actual
FROM guion WHERE id_project = 'ID_PROYECTO';
SELECT id_guion_version, id_guion, numero_de_version, estado
FROM guion_version WHERE id_guion = ID_GUION ORDER BY numero_de_version;
SELECT id_nota, id_guion_version, id_user
FROM guion_nota WHERE id_guion_version = ID_VERSION;
```

Elige y guarda el ID del guion, de **cada** versión y de las notas pertinentes.
Las consultas no muestran texto de notas ni del guion; su contenido se
comprueba en la web.

### D. Escenas y continuidad

```sql
SELECT id_escena, id_guion, numero_de_escena, encabezado, id_rodaje, id_desglose
FROM escenas WHERE id_guion = ID_GUION;
SELECT id_escena_version, id_escena, numero_version
FROM escena_version WHERE id_escena = 'ID_ESCENA';
SELECT id_foto, id_escena_version, tipo
FROM continuidad_foto WHERE id_escena_version = ID_VERSION_ESCENA;
```

Guarda todos los IDs de escena, versión de escena, foto y desglose para las
pruebas de borrado. Las filas no prueban que las imágenes abran.

### E. Desglose y referencias compartidas

```sql
SELECT id_desglose FROM desglose WHERE id_desglose = 'ID_DESGLOSE';
SELECT id_requerimiento, id_desglose, departamento, etiqueta, cantidad
FROM desglose_requerimientos WHERE id_desglose = 'ID_DESGLOSE';
SELECT id_escena, id_guion FROM escenas WHERE id_desglose = 'ID_DESGLOSE';
```

La última consulta detecta escenas que comparten el desglose. Para borrados,
detente si alguna referencia no pertenece al recurso desechable. Al eliminar
solo un guion, un desglose aún usado por otra escena debe conservarse, junto
con sus requerimientos; no presupongas que todos se eliminan.

### F. Galería, versiones y relaciones

```sql
SELECT id_galeria, id_project, tipo, categoria, nombre, id_personaje,
       id_escenario, id_guion, id_escena
FROM galeria_items WHERE id_project = 'ID_PROYECTO';
SELECT id_version, id_galeria, id_project, numero_version, id_guion, id_escena
FROM galeria_versiones WHERE id_galeria = ID_GALERIA;
SELECT id_foto, id_version, id_project
FROM galeria_version_fotos WHERE id_version = ID_VERSION_GALERIA;
SELECT id_escena, id_galeria FROM escena_galeria_items
WHERE id_escena = 'ID_ESCENA';
SELECT id_lugar_galeria, id_personaje_galeria FROM galeria_lugar_personajes
WHERE id_lugar_galeria = ID_GALERIA OR id_personaje_galeria = ID_GALERIA;
SELECT id_personaje FROM personajes WHERE id_project = 'ID_PROYECTO';
SELECT id_escenario FROM escenarios WHERE id_project = 'ID_PROYECTO';
```

Guarda IDs de fichas, versiones, fotos, personajes, escenarios y ambas columnas
de los vínculos. La existencia de una ruta o fila no demuestra que el archivo
esté disponible.

### G. Jornadas y procesos

```sql
SELECT id_rodaje, id_project, nombre, fecha_inicio, estado
FROM rodaje WHERE id_project = 'ID_PROYECTO';
SELECT id_proceso, id_rodaje, nombre, fecha, estado
FROM proceso_rodaje WHERE id_rodaje = 'ID_RODAJE';
SELECT id_escena, id_guion, id_rodaje
FROM escenas WHERE id_rodaje = 'ID_RODAJE';
```

Guarda IDs de jornada, proceso y escena. La última consulta comprueba la
asignación relacional de escenas a la jornada.

### H. Códigos

```sql
SELECT ambito, tipo, entidad_id, codigo
FROM codigos_entidad WHERE id_project = 'ID_PROYECTO';
SELECT ambito, codigo, COUNT(*) AS repeticiones
FROM codigos_entidad WHERE id_project = 'ID_PROYECTO'
GROUP BY ambito, codigo HAVING COUNT(*) > 1;
SELECT tipo, entidad_id, COUNT(*) AS repeticiones
FROM codigos_entidad WHERE id_project = 'ID_PROYECTO'
GROUP BY tipo, entidad_id HAVING COUNT(*) > 1;
```

Los duplicados deben dar cero filas dentro del proyecto consultado. El ámbito
de proyecto `PRO` es global (`*`): esta consulta limitada no demuestra
ausencia de duplicados globales. La restricción de BD, si existe, debe
verificarla el responsable sin exponer otros proyectos. `entidad_id` es texto;
registra tipo e ID juntos. Los códigos pueden tener más de tres dígitos.

### I. Dependencias después de borrar un guion o proyecto

**Antes** de borrar, ejecuta A–H en el proyecto desechable y guarda todos los
IDs. En particular guarda `ID_GUION`, `ID_VERSION`, `ID_ESCENA`,
`ID_VERSION_ESCENA`, `ID_DESGLOSE`, `ID_RODAJE`, `ID_GALERIA` e
`ID_VERSION_GALERIA`. Para cada uno comprueba también sus relaciones. Si no
existe un tipo de recurso, marca esa comprobación «no aplicable»; no inventes
IDs. Usa de preferencia un recurso de cada tipo, y repite para cada ID
adicional. Conserva un inventario privado de los archivos de prueba y sus
ubicaciones, sin publicarlas.

Tras borrar, además de volver a ejecutar A–H, ejecuta las siguientes consultas
**directamente por los IDs guardados**, aunque ya no exista el padre:

```sql
SELECT id_guion FROM guion WHERE id_guion = ID_GUION;
SELECT id_guion_version, id_guion FROM guion_version WHERE id_guion = ID_GUION;
SELECT id_nota, id_guion_version FROM guion_nota WHERE id_guion_version = ID_VERSION;
SELECT id_escena, id_guion FROM escenas WHERE id_guion = ID_GUION;
SELECT id_escena_version, id_escena FROM escena_version WHERE id_escena = 'ID_ESCENA';
SELECT id_foto, id_escena_version FROM continuidad_foto
WHERE id_escena_version = ID_VERSION_ESCENA;
SELECT id_escena, id_galeria FROM escena_galeria_items
WHERE id_escena = 'ID_ESCENA';
SELECT id_desglose FROM desglose WHERE id_desglose = 'ID_DESGLOSE';
SELECT id_requerimiento, id_desglose FROM desglose_requerimientos
WHERE id_desglose = 'ID_DESGLOSE';
SELECT id_galeria, id_guion, id_escena FROM galeria_items
WHERE id_galeria = ID_GALERIA;
SELECT id_version, id_guion, id_escena FROM galeria_versiones
WHERE id_version = ID_VERSION_GALERIA;
SELECT id_foto, id_version FROM galeria_version_fotos
WHERE id_version = ID_VERSION_GALERIA;
SELECT id_lugar_galeria, id_personaje_galeria FROM galeria_lugar_personajes
WHERE id_lugar_galeria = ID_GALERIA OR id_personaje_galeria = ID_GALERIA;
SELECT id_proceso, id_rodaje FROM proceso_rodaje WHERE id_rodaje = 'ID_RODAJE';
SELECT id_escena, id_rodaje FROM escenas WHERE id_rodaje = 'ID_RODAJE';
SELECT tipo, entidad_id, codigo FROM codigos_entidad
WHERE id_project = 'ID_PROYECTO';
```

Al borrar **solo el guion**, deben desaparecer sus versiones, notas, escenas,
continuidad, vínculos y códigos `GUI`, `VGU` y `ESC` correspondientes. Los
elementos y versiones de galería sobreviven y sus referencias al guion y
escenas eliminados quedan vacías; jornadas y procesos no se presuponen
eliminados. Para desglose aplica la regla de E. Al borrar **el proyecto**,
espera también ausencia de sus miembros, guiones, jornadas, procesos, fichas,
versiones, fotos, vínculos, personajes, escenarios y códigos; confirma A–H
con los IDs guardados. Las cuentas de los miembros no deben confundirse con
sus membresías. No se espera que los contadores de códigos retrocedan.
La limpieza real de archivos se comprueba por separado con el responsable:
una BD vacía no demuestra que se eliminaran. Si algo queda, o falta algo que
debía sobrevivir, registra el fallo y detente.

### J. Cuenta: dependencias antes de eliminar

Además de B, captura y revisa los IDs de estas relaciones de la cuenta
desechable. Si hay vínculos con recursos ajenos o de exposición, no continúes.

```sql
SELECT id_nota, id_guion_version, id_user FROM guion_nota
WHERE id_user = ID_USUARIO;
SELECT id_guion_version, id_guion, creado_por FROM guion_version
WHERE creado_por = ID_USUARIO;
SELECT id_escena_version, id_escena, creado_por FROM escena_version
WHERE creado_por = ID_USUARIO;
```

Después repite B y J y consulta cada ID guardado directamente:

```sql
SELECT id_nota, id_guion_version, id_user FROM guion_nota
WHERE id_nota = ID_NOTA;
SELECT id_guion_version, id_guion, creado_por FROM guion_version
WHERE id_guion_version = ID_VERSION;
SELECT id_escena_version, id_escena, creado_por FROM escena_version
WHERE id_escena_version = ID_VERSION_ESCENA;
```

La cuenta y sus membresías deben desaparecer. Según los modelos, la nota del
usuario se elimina y las referencias de autor de las versiones quedan nulas;
compruébalo por los IDs previos sin suponer que los recursos creados se
borran. Si el esquema instalado o la aplicación se comportan distinto,
registra el resultado y detente.

## Recorridos

### RF-01 — Registro de empresa y primer administrador

1. **Antes:** con un nombre de empresa de prueba único, consulta:
   ```sql
   SELECT id_cliente, razon_social FROM clients
   WHERE razon_social = 'EMPRESA_DE_PRUEBA_UNICA';
   ```
   Debe estar ausente; consulta B por la cuenta controlada, también ausente.
2. En **Registrar**, completa los pasos con datos ficticios y correo
   controlado; acepta condiciones solo si estás de acuerdo y crea la cuenta.
   Debe confirmarse. Un intento duplicado con los mismos datos debe rechazarse.
3. **Después:** repite la consulta anterior y B. Debe haber una empresa y una
   cuenta cuyo `id_client` sea el ID de esa empresa y `users.id_rol = 1001`;
   el duplicado no debe crear otra fila. No presupongas una membresía de
   proyecto antes de crear el proyecto.

### RF-02 — Inicio de sesión

1. **Antes:** B por el ID de cuenta desechable; anota existencia y estado.
2. En **Ingresar**, prueba una contraseña incorrecta y luego la correcta. La
   incorrecta no debe dar acceso; la correcta debe conducir a verificación.
3. **Después:** repite B; la cuenta debe seguir existiendo. La BD no demuestra
   que la contraseña haya sido aceptada ni que exista sesión; observa la web.

### RF-03 — Verificación por correo

1. **Antes:** B por la cuenta de prueba. Comprueba acceso al buzón controlado.
2. Inicia sesión; prueba un código incorrecto, después el recibido y, si la
   interfaz lo permite, intenta reutilizarlo. Solo el correcto y vigente debe
   permitir entrar. No reveles el código ni el token.
3. **Después:** repite B. La cuenta debe permanecer. Los desafíos son
   temporales en memoria: una fila de usuario no demuestra 2FA ni cuándo se
   emitió el acceso. Comprueba la interfaz; sin correo marca pendiente.

### RF-04 — Recuperación de acceso

1. **Antes:** B y J para una cuenta **desechable independiente**; verifica
   respaldo, buzón y que no sea la cuenta de exposición.
2. En **¿Olvidaste tu contraseña o usuario?**, solicita recuperación y sigue
   el correo. Cambia la contraseña de esa cuenta; comprueba que la anterior no
   entra y la nueva llega a 2FA.
3. **Después:** repite B: la cuenta sigue existiendo. No consultes contraseñas
   ni códigos. La BD no demuestra la recepción ni la validez del código.

### RF-05 — Invitar miembro

1. **Antes:** A y B para el proyecto DEMO y la segunda cuenta controlada.
   Guarda las membresías existentes; no envíes correos sin consentimiento.
2. Como administrador, en **Equipo y roles** invita al segundo usuario con rol
   **Usuario**. Abre la invitación en su buzón y completa el acceso si llega.
3. **Después:** B: la relación concreta debe tener `id_rol = 1005`; la cuenta
   debe existir. Una fila no demuestra entrega del correo: registra
   separadamente el resultado del envío y la recepción o pendiente.

### RF-06 — Administrador escribe; Usuario consulta

1. **Antes:** B y D del proyecto y guion DEMO; guarda el ID y estado de una
   escena de prueba. Verifica los roles de ambos participantes.
2. Como administrador crea o edita una escena de prueba. Como Usuario abre
   esa escena e intenta la operación de edición disponible sin borrar nada:
   debe poder leer, pero no modificar. Si no existe control, anótalo; una
   prueba de rechazo de API autorizada es complementaria, sin divulgar token.
3. **Después:** repite B y D: el cambio del administrador persiste y el
   intento del Usuario no altera la escena. La BD sola no prueba el rechazo
   ni todas las operaciones o recursos.

### RF-07 — Retirar un miembro

1. **Antes:** en un proyecto desechable independiente, usa B para verificar
   el miembro controlado, su cuenta y la relación exacta con el proyecto.
2. Como administrador retíralo en **Equipo y roles**. Debe dejar de ver ese
   proyecto, sin perder su cuenta.
3. **Después:** B por los IDs capturados: desaparece solo esa membresía y
   permanece la cuenta. Comprueba que otras membresías de prueba no cambien.

### RF-08 — Eliminar cuenta propia

1. **Antes:** con cuenta y proyecto desechables, ejecuta B y J, guarda todos
   sus IDs y comprueba que no afecta exposición. Verifica ambos respaldos.
2. Como esa cuenta, en **Perfil** solicita y confirma la eliminación. Debe
   dejar de poder iniciar sesión.
3. **Después:** repite B y J con IDs guardados, siguiendo las expectativas de
   J. Comprueba también que el proyecto de exposición no se utilizó.

### RF-09 — Empresas cliente

1. **Antes:** consulta la empresa desechable por nombre como en RF-01;
   registra su ID tras crearla. Usa A para contar proyectos asociados.
2. Como administrador con permiso para **Empresas cliente**, crea, consulta y
   edita la empresa desechable; vuelve a abrirla. Intenta eliminar otra empresa
   desechable que tenga proyecto: debe rechazarse. Elimina solo una empresa
   desechable sin proyectos, con respaldo y confirmación de la interfaz.
3. **Después:** A por ambos IDs: la empresa con proyecto y su vínculo siguen;
   la empresa sin proyectos ya no aparece. Anota si faltan permisos en vez de
   asumirlos.

### RF-10 — Gestionar proyectos

1. **Antes:** A y B para DEMO. Si el proyecto aún no existe, registra la
   ausencia por nombre y usa una empresa de prueba autorizada.
2. Crea el proyecto si hace falta; en **Editar proyecto** cambia una sinopsis
   ficticia y recarga. Verifica que una cuenta sin membresía no acceda a otro
   proyecto de prueba. Para eliminación usa solo el recurso de RF-11.
3. **Después:** A y B: proyecto asociado al cliente y administrador
   relacionado con rol `1001`. Para verificar la sinopsis ficticia:
   ```sql
   SELECT id_project, sinopsis FROM projects WHERE id_project = 'ID_PROYECTO';
   ```
   La restricción de acceso se demuestra en la web, no solo con membresías.

### RF-11 — Eliminar proyecto y dependencias

1. **Antes:** prepara proyecto, guion, escena, jornada, galería y archivos
   desechables separados de exposición. Ejecuta A–I y guarda todos los IDs.
   En E revisa que no existan desgloses compartidos fuera del proyecto y en G
   que ninguna escena ajena esté asignada a sus jornadas; contrasta el
   `id_guion` de cada escena con C. Comprueba también los vínculos de F. Si hay
   referencias ajenas, detente. Verifica ambos respaldos.
2. En la web elimina **únicamente el proyecto desechable** y confirma. Debe
   desaparecer de la lista; no modifiques el proyecto de exposición.
3. **Después:** repite A–H e I con IDs anteriores. Comprueba relaciones y
   archivos según I; las cuentas de los miembros deben seguir existiendo.
   Si falla la limpieza de archivos, registra fallo aunque falten las filas.

### RF-12 — Roles fijos

1. **Antes:** B en DEMO; anota roles por proyecto.
2. En **Equipo y roles**, revisa que para nuevas asignaciones se ofrezcan
   Administrador y Usuario. Con ambas cuentas prueba lectura y un cambio no
   destructivo como en RF-06. Si ya hay usuarios legados 1002–1004 en un
   entorno de prueba autorizado, comprueba su solo lectura; no crees roles
   legados artificialmente.
3. **Después:** B: nuevas membresías con `1001` o `1005`, sin cambios por
   intentos de escritura no autorizados. Si no hay roles legados, su prueba
   queda pendiente. Una tabla `roles` vacía no decide el resultado.

### RF-13 — Crear guion y extraer texto

1. **Antes:** C del proyecto y guarda guiones existentes.
2. En **Guiones → Crear guion → Crear desde cero**, escribe texto ficticio y
   guarda. Abre y recarga. En un guion de prueba diferente, usa **Subir
   guion** con PDF de texto, DOCX o FDX propio; comprueba el texto extraído.
3. **Después:** C: nuevos guiones y su primera versión, con puntero actual
   correspondiente. El contenido y el archivo se verifican en web; PDF
   escaneado y OCR no se presuponen compatibles.

### RF-14 — Versiones del guion

1. **Antes:** C para el guion; guarda IDs, números y versión actual.
2. En **Versiones**, abre una versión, elige **Editar como nueva versión**,
   modifica una línea ficticia y guarda. Reabre la antigua y la nueva.
3. **Después:** C: existe una versión adicional con el mismo `id_guion` y
   `id_guion_version_actual` apunta a la nueva. En la web comprueba que la
   anterior conserva el texto, no solo que exista su fila.

### RF-15 — Notas de versión

1. **Antes:** C para dos versiones; guarda sus IDs y notas.
2. Como administrador abre **Leer versión**, escribe una nota ficticia y
   guarda. Recarga; como Usuario léela e intenta agregar una nota sin divulgar
   credenciales. Abre la otra versión: no debe mostrar esa nota.
3. **Después:** C para ambas versiones: la nota nueva apunta a la versión y
   autor correctos y el intento de Usuario no crea otra. La lectura y el
   rechazo se verifican en la interfaz.

### RF-16 — Eliminar guion

1. **Antes:** usa un guion dentro de un proyecto desechable, no el de DEMO.
   Ejecuta A–I, captura todos los IDs y comprueba desgloses compartidos y
   respaldos. Si hay recursos ajenos vinculados, detente.
2. En la web usa **Eliminar guion** y confirma solo el guion desechable.
3. **Después:** I y E con IDs previos: comprueba dependencias borradas y
   galería sobreviviente, incluyendo referencias vacías. Comprueba por
   separado sus archivos. El proyecto y el guion de exposición no se tocan.

### RF-17 — Escenas

1. **Antes:** C y D para el guion DEMO.
2. En **Escenas**, selecciona el guion, comprueba sus escenas y crea o edita
   una escena de prueba. Recarga. En otro proyecto de prueba sin permiso
   comprueba que no se permita modificar una escena ajena, sin borrarla.
3. **Después:** D: la escena apunta al guion correcto y conserva número y
   encabezado esperados. La restricción de acceso se comprueba en la web.

### RF-18 — Continuidad visual

1. **Antes:** D para una escena DEMO de prueba, incluyendo versiones y fotos.
2. Abre **Continuidad visual → Crear versión**; carga imagen propia para
   vestuario, objeto o espacio. Reabre la escena y la imagen. Repite los
   tipos necesarios para la exposición.
3. **Después:** D: versión ligada a la escena y foto ligada a la versión, con
   tipo correcto. Una fila no demuestra que la imagen se pueda abrir.

### RF-19 — Cronograma

1. **Antes:** G para DEMO.
2. En **Plan de rodaje → Crear Plan → Crear desde cero**, crea una jornada
   ficticia con fecha, día dramático, semana y locación; edítala y recarga.
3. **Después:** G: nueva jornada con `id_project` correcto y cambios visibles.
   Compara la fecha y el estado; los demás datos se observan en la web.

### RF-20 — Procesos del rodaje

1. **Antes:** G para la jornada DEMO; guarda sus procesos.
2. Dentro de la jornada agrega `Revisar iluminación` con fecha y ubicación
   ficticias. Edita nombre o estado y vuelve a abrirla. Para probar eliminación
   usa solo un proceso de jornada desechable con respaldo.
3. **Después:** G: proceso ligado a la jornada y cambios persistentes. Para
   eliminación desechable compara el ID exacto antes y después.

### RF-21 — Contacto público

1. **Antes:** abre la landing sin sesión y acuerda destinatario y buzón de
   prueba. No se presupone una tabla de contacto.
2. Completa **Contacto** con datos ficticios y envía solo con autorización.
   Debe mostrarse confirmación y llegar el mensaje al destinatario acordado.
3. **Después:** comprueba recepción por canal seguro. **BD no demuestra**
   este envío; si no hay correo o acceso al buzón, marca pendiente.

### RF-22 — Galería

1. **Antes:** F para DEMO y sus fichas relevantes.
2. En **Galería → Agregar fotografía**, crea fichas ficticias de personaje,
   lugar, objeto y vestuario (categoría de objeto); abre sus imágenes.
   Desde el editor registra una versión de uso y vuelve a abrir su historial.
3. **Después:** F para cada ficha y versión: compara tipo, categoría,
   relaciones y fotos de versión cuando se suban. Verifica imágenes en web;
   una fila no demuestra su disponibilidad.

### RF-23 — Vincular galería a escena

1. **Antes:** D y F para la escena y ficha DEMO; anota sus IDs y vínculos.
2. En **Desglose** abre la escena y vincula una ficha de prueba, por ejemplo
   una carta. Registra un uso desde el flujo disponible y comprueba que no
   aparezca como vínculo de otra escena.
3. **Después:** F para ambas escenas y la ficha: la pareja
   `id_escena`/`id_galeria` debe existir solo donde corresponde; revisa
   `galeria_versiones` para el uso creado.

### RF-24 — Desglose e importación

1. **Antes:** D y E para una escena de prueba; registra desglose,
   requerimientos y escenas que lo referencian.
2. En **Desglose**, selecciona guion y escena, agrega departamento `Props` y
   etiqueta `Carta`, comprueba lista y totales. Para importar, usa un PDF
   sintético con texto seleccionable en un **guion desechable independiente**;
   sigue el ejemplo de la guía web. No reimportes sobre exposición.
3. **Después:** D y E: la escena apunta al desglose y el requerimiento al
   mismo ID; compara detalle y cantidad. Comprueba antes/después también en
   el guion desechable importado. OCR y PDF complejos quedan pendientes si no
   se probaron.

### RF-25 — Escenas en jornadas

1. **Antes:** D y G para una jornada y escena de prueba; anota `id_rodaje`.
2. En la jornada agrega una escena y recarga. Para probar retirar una escena
   o importar un PDF usa proyecto y jornada desechables, con respaldo; la
   importación puede cambiar escenas. Sigue el ejemplo de la guía web.
3. **Después:** D y G: `escenas.id_rodaje` debe apuntar a la jornada correcta.
   En el caso desechable verifica la asignación y su retirada por el ID
   capturado. No supongas OCR.

### RF-26 — Bloques tipados

1. **Antes:** C del guion y versión actual.
2. En el editor crea bloques de escena, acción, personaje, paréntesis, diálogo
   y transición con texto ficticio. Guarda y abre la versión; revisa orden y
   formato.
3. **Después:** C confirma la versión. El contenido HTML y su formato deben
   comprobarse visualmente; la existencia de una fila no demuestra los seis
   tipos ni su presentación.

### RF-27 — Exportar PDF

1. **Antes:** C y guarda ID y número de versión.
2. En la versión pulsa **Descargar PDF**. Abre el archivo y revisa contenido,
   portada, tamaño Carta, Courier 12, sangrías y paginación. Usa guion de
   prueba con texto largo para saltos de página.
3. **Después:** repite C: la descarga no debe añadir una versión. La BD no
   demuestra el formato, la descarga ni el contenido del PDF.

### RF-28 — Códigos únicos

1. **Antes:** H y A, C, D, F y G para relacionar códigos con entidades DEMO.
2. Como administrador abre proyecto, guion, versión, escena, personaje, lugar,
   objeto, vestuario y jornada. Anota sus códigos visibles sin asumir
   consecutivos; vuelve a abrirlos y compara.
3. **Después:** H: cada código debe corresponder a su tipo y entidad, con
   formato como `ESC-001`; consultas de duplicados deben quedar vacías.
   El alcance global de `PRO` tiene la limitación descrita en H.

### RF-29 — Códigos solo para administrador

1. **Antes:** B y H; verifica membresías de administrador y Usuario de DEMO.
2. Como administrador copia un código desde su ficha. Como Usuario abre la
   misma ficha: no debe mostrarse. Si se revisa la respuesta autorizada de la
   API, no debe incluir `codigo`; no captures ni publiques tokens.
3. **Después:** H: el código permanece igual en BD. La diferencia de
   visibilidad y respuesta solo se demuestra con ambas sesiones.

### RF-30 — Buscar por código

1. **Antes:** H; escoge un código y guarda `tipo`, `entidad_id` y proyecto.
   Confirma la entidad relacionada con A, C, D, F o G según corresponda.
2. Como administrador usa **Buscar código**, introduce el código y abre el
   resultado: debe ser la ficha correcta. Como Usuario intenta la búsqueda:
   debe estar restringida.
3. **Después:** repite H: el vínculo código-entidad no cambia. La BD confirma
   la asociación, pero no demuestra navegación ni autorización.
