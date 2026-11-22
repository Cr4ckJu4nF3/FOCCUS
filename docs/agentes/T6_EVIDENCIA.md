# T6: plan, ejecución y seguimiento

Fecha: 21-11-2026. Esto es evidencia parcial, no una valoración de la lista ni una aprobación del jurado. El móvil está pendiente.

## Verificación complementaria: 22-11-2026

En un worktree limpio de `docs/t6-evidencia-20261121` se creó un entorno virtual nuevo con Python 3.12.10 y se instalaron las dependencias de `requirements.txt`; después se instaló `coverage` únicamente para medir cobertura. No se leyó `.env`, ni se usaron MySQL, correo o credenciales reales. Los comandos reproducibles están en [README: pruebas T6](../../README.md#pruebas-y-evidencia-t6).

| Punto | Evidencia y límite |
|---|---|
| 3 | `app.main` registra los routers de un **único backend FastAPI**; el README agrupa sus responsabilidades. Esto describe FOCCUS, no prueba que existan cuatro servicios. |
| 4 | Suite JWT/validación: 27/27; arranque aislado de `app.main`: 1/1, con `/`, `/docs` y `/openapi.json` HTTP 200 y JWT ficticio firmado y validado. La base está simulada y la dependencia de BD deshabilitada. No se probó login real ni arranque con MySQL; instalar dependencias no equivale a una instalación completa del producto. |
| 12 | El README explica routers, OpenAPI y reproducción en PowerShell. Suite combinada: 36/36; cobertura de sentencias de `auth.py`: 108/116 (93 %). Newman 6.2.3: 7/7 solicitudes y aserciones contra cuatro rutas de una API parcial simulada. No demuestra toda la API ni infraestructura real. |

Se usaron datos ficticios. El mensaje de conexión MySQL lo emite el motor simulado. No se ejecutó lint en esta verificación; Docker y catálogo de bloques siguen en pausa. No se declara completo lo que no se ha verificado.

## Plan de pruebas acordado

- **Alcance:** acceso y permisos, proyectos, guiones y escenas, galería y continuidad, rodaje. Móvil pendiente de su equipo.
- **Niveles:** unitarias; API integrada; navegador. Incluir casos positivos, negativos y de permisos.
- **Ambiente y datos:** solamente datos ficticios; BD y archivos de prueba aislados. Sin MySQL aislado disponible, usar SQLite en memoria y simulaciones. No usar la BD real, correo real ni archivos reales.
- **Criterio por caso:** registrar datos, pasos, resultado esperado y obtenido; no tratar lo no ejecutado como aprobado. La matriz de 27 casos de seguridad está en [README](../../README.md#matriz-de-casos-ejecutados); sus pasos son ejecutar el método indicado, cuyos datos y aserciones están en el archivo de prueba. Los nueve casos de API de abajo completan el alcance ejecutado.
- **Brechas de plan:** los casos de galería no fueron ejercitados como flujo propio; continuidad sí se cubrió parcialmente. No hay recorrido completo con login, persistencia y cierre de sesión en navegador, ni prueba móvil. Los casos existentes no demuestran ausencia total de regresiones respecto a T5.

## Matriz complementaria de API integrada

Pasos comunes: ejecutar los métodos indicados con el comando de 36 pruebas del README; la preparación crea proyectos `p1` y `p2`, usuarios ficticios, JWT real y SQLite temporal en memoria. Estado obtenido: todos pasaron en esa ejecución. No son pruebas contra MySQL.

| Caso (método de prueba) | Datos y acción | Esperado | Obtenido |
|---|---|---|---|
| `test_usuario_solo_recibe_proyectos_a_los_que_pertenece` | Usuario 1 lista proyectos del cliente 10 | HTTP 200, solo `p1` | 200, solo `p1` |
| `test_admin_global_vigente_ve_todo_y_claim_obsoleto_no_eleva_permisos` | Admin global y usuario 1 con claim antiguo listan cliente 10 | Admin ve `p1` y `p2`; usuario solo `p1` | Coincide |
| `test_reads_cannot_cross_projects_or_list_all_scripts` | Usuario de `p1` lista guiones y lee recursos de `p2` | Lista solo propia y deniega lecturas ajenas | Coincide |
| `test_cross_project_mutations_are_denied_and_leave_rows_unchanged` | Usuario de `p1` intenta modificar recursos de `p2` | Denegación y filas intactas | Coincide |
| `test_project_ids_and_linked_resource_ids_in_bodies_are_scoped` | Crear recursos vinculados a proyecto ajeno | HTTP 403 para las solicitudes comprobadas | Coincide |
| `test_same_project_read_and_write_still_work_for_continuity_and_processes` | Leer/crear versión de escena propia y editar proceso de rodaje | HTTP 200 y cambios comprobados | Coincide |
| `test_personajes_y_escenarios_no_cruzan_proyectos` | Listar y modificar personajes/escenarios propios y ajenos | Ver los propios y denegar cambios ajenos | Coincide |
| `test_admin_sube_foto_continuidad_y_miembro_del_proyecto_puede_consultarla` | Admin carga foto ficticia y miembro consulta | Aceptar y permitir consulta; archivo simulado | Coincide |
| `test_patch_project_admin_puede_editar_su_proyecto_pero_no_otro` | Admin edita `p1` y después intenta editar `p2` | Guardar el propio y denegar el ajeno | Coincide |

Los primeros dos métodos están en `backend/api_usuarios/tests/test_projects_client_permissions.py`; los otros siete, en `test_project_resource_ownership.py`.

## Ejecución y límites

Backend: se exportó `9126d8f` a una carpeta temporal con `git archive` y se añadieron únicamente los archivos de pruebas T6. `python -m coverage run --source=app.utils.auth -m unittest -v tests.test_t6_seguridad_aislada tests.test_project_resource_ownership tests.test_projects_client_permissions`: **rc 0, 36 pasaron, 0 fallaron**. `python -m coverage report -m`: **rc 0, 108/116 sentencias (93 %)**; sin cobertura de ramas. Python global inicialmente dio `No module named coverage` (rc 1); se usó el intérprete `.venv` existente, sin instalar coverage.

Con solo las dos suites existentes, el mismo comando sin `tests.test_t6_seguridad_aislada` dio **rc 0, 9 pasaron** y `coverage report -m` **rc 0, 96/116 (83 %)**.

`python -B -m unittest -v tests.test_t6_arranque_aislado`: **rc 0, 1 pasó**. Arranca Uvicorn para `app.main` completo en puerto libre, sin leer `.env`, con motor simulado, `create_all` desactivado, archivos bajo carpeta temporal y dependencia de BD deshabilitada. El JWT firmado y validado usa PyJWT y clave ficticia; no prueba un login real. `/`, `/docs`, `/openapi.json`: HTTP 200; el esquema de la base tenía 69 rutas. El mensaje de conexión MySQL procede del mock. No verifica infraestructura real.

Newman 6.2.3: `newman run tests/FOCCUS_T6.postman_collection.json --env-var baseUrl=http://127.0.0.1:<puerto-libre> --reporters cli`: **rc 0, 7 solicitudes y 7 aserciones, 0 fallidas**. Se inició `uvicorn tests.postman_app_aislada:app --host 127.0.0.1 --port <puerto-libre> --no-access-log` con entorno ficticio y se detuvo ese proceso. Es una API parcial de cuatro rutas, no el arranque completo. El primer intento del colaborador con `newman` en PATH dio rc 1 por comando ausente; se usó una instalación temporal ya existente.

Frontend, **árbol de trabajo sucio**, no el commit exportado: `npm test` **rc 0, 37 pasaron, 0 fallaron, 0 omitidas**; `npm run build` **rc 0**, aviso de chunks superiores a 500 kB; `npm run lint` **rc 1, 14 errores, 0 advertencias**. Incluye cambios paralelos que no se publican en esta evidencia; no atribuir estos resultados al commit base ni al commit de evidencia.

Docker y navegador se verificaron por separado: `docker info` **rc 1**, error HTTP 500 del daemon; no se retomó trabajo Docker. `node --version` **rc 0**, v24.16.0. `require.resolve('playwright',{paths:['./frontend']})` falló con `MODULE_NOT_FOUND`; instalación temporal offline falló con `ENOTCACHED` de `playwright-core-1.65.1.tgz` (rc 1), e instalación temporal normal con npm pasó (rc 0). No se enviaron datos del proyecto a npm.

Para repetir las dos comprobaciones del navegador sobre un `dist` de prueba, sin API:

```powershell
$env:PW_MODULE = Join-Path $env:TEMP 'foccus-t6-playwright\node_modules\playwright'
$env:FRONT_DIST = (Resolve-Path frontend\dist).Path
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node frontend\tests\t6_browser_aislado.cjs
```

Chrome headless, servidor estático propio en puerto libre, políticas CSP sin conexiones/iframes, bloqueo de solicitudes no locales y resolución externa deshabilitada: **rc 0, 2 recorridos, 0 fallos** (inicio → login y `/guion` sin sesión → inicio). Se cerraron navegador y servidor propios. Se usó el `dist` del árbol sucio; no hay login, API ni persistencia en esta prueba. En un primer intento se esperó erróneamente que `/guion` redirigiera a `/login`; falló por timeout (rc 1). Se revisó `ProtectedRoute` y se corrigió la expectativa del test a `/`; no se presenta como defecto de producto.

### Resumen de validación

```text
environment:
  docker: UNAVAILABLE — docker info rc 1, HTTP 500 del daemon
  node: AVAILABLE — node --version rc 0, v24.16.0
  playwright: AVAILABLE — paquete temporal y Chrome instalado; sin descargar navegador
  infra-tier: FALLBACK — SQLite y mocks; sin fidelidad de MySQL
  browser-tier: PRIMARY — Playwright, únicamente servidor estático
startup: PASS — unittest de arranque, rc 0, / y /docs 200
integration: PASS — rc 0, 36 pasaron, 0 fallaron, 0 omitidas; alcance parcial
e2e: PARTIAL — rc 0, 2 pasaron, 0 fallaron; sin backend ni persistencia
overall: FAIL — lint rc 1; además faltan instalación limpia, comparación T5 y flujos completos
```

La etiqueta `overall` refleja la ejecución técnica, no una calificación de la lista. No se generaron tres pruebas de flujo integral con persistencia; el nivel E2E sigue parcial.

## Registro local de defectos y seguimiento

| ID | Hallazgo y reproducción | Severidad | Estado |
|---|---|---|---|
| T6-D01 | `npm run lint` termina con 14 errores: `Escena.jsx` 2, `Landing.jsx` 1, `Profile.jsx` 7, `ProjectRegistration.jsx` 1 y `ProjectSelection.jsx` 3. | Media: bloquea el control de calidad estático; impacto funcional no establecido | Abierto, sin corrección en esta tarea |

Este archivo es el registro local, no un issue externo. No se demostró que los errores de lint sean regresiones de T5. La primera falla de la prueba de navegador fue una expectativa incorrecta de la prueba, no un defecto registrado del producto. Siguen sin demostrarse dos ciclos defecto real → corrección con commit → reejecución.

## Por punto solicitado

- **4:** validación y JWT unitarios comprobados; no se probó instalación desde cero ni login exitoso completo. Existe `.env.example`.
- **8:** 27 casos unitarios y nueve integrados descritos, ejecutados con datos ficticios; alcance de negocio parcial.
- **9:** cobertura de sentencias de `auth.py` 93 % y colección con tests 7/7; no equivale a cobertura integral.
- **10:** ejecución y defecto registrado aquí; confirmación en el sistema de seguimiento acordado queda pendiente.
- **12:** README y OpenAPI comprobados en arranque simulado; FOCCUS organiza sus responsabilidades en routers de un único backend.
- **14:** lint falla; sin línea base T5 no se demuestra ausencia de regresiones.
