# FOCCUS

Plataforma para la gestión de continuidad en producciones audiovisuales (cine, series, comerciales). Permite administrar proyectos, equipos de trabajo con roles, guiones versionados, escenas con continuidad fotográfica (vestuario, objetos, espacios) y cronogramas de rodaje.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn (servidor ASGI) |
| Base de datos | MySQL en Aiven (plan gratis), SQLAlchemy (ORM), PyMySQL (driver) |
| Autenticación | JWT (PyJWT) + bcrypt (passlib) |
| Frontend | React 19, Vite, React Router v7 |
| Estilos | Tailwind CSS v4 + React-Bootstrap |
| Móvil | Flutter 3.44 / Dart 3.12 (Android/iOS), rama `mobile` |
| Envío de correo | SMTP de Gmail (smtplib) |

## Estructura del proyecto

```
FOCCUS/
├── backend/api_usuarios/
│   ├── app/
│   │   ├── config/database.py       # Conexión a MySQL (SQLAlchemy)
│   │   ├── models/                  # Tablas (SQLAlchemy ORM)
│   │   ├── schemas/                 # Validación de datos de entrada (Pydantic)
│   │   ├── controllers/             # Lógica de negocio
│   │   ├── routes/                  # Endpoints de la API (FastAPI routers)
│   │   ├── utils/                   # JWT (auth.py), correo (mail.py), archivos (file_storage.py)
│   │   ├── assets/                  # Logo y archivos subidos por los usuarios
│   │   └── main.py                  # Punto de entrada de la API
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── screen/                  # Pantallas (una por vista)
│   │   ├── desing/                  # CSS de cada pantalla
│   │   ├── componentes/             # Componentes reutilizables
│   │   ├── api.js                   # Cliente HTTP centralizado (fetch + JWT)
│   │   └── routes.jsx               # Definición de rutas de React Router
│   └── package.json
├── scripts/                         # Backup/restauración de BD, migración de códigos y utilidades
├── docs/agentes/                    # Equipo de agentes, informes de investigación y documentación de la BD
├── backups/                         # Backups de la BD (local, ignorada por git)
└── mobile/                          # App Flutter: el código vive en la rama `mobile` (ver sección Móvil)
```

## Requisitos previos

- Python 3.11 o superior
- Node.js 18 o superior
- Una base de datos MySQL accesible (local vía XAMPP, o en la nube — el equipo usa [Aiven](https://aiven.io) con el plan gratis; si el servicio está apagado, el backend no arranca)
- Una cuenta de Gmail con una [contraseña de aplicación](https://myaccount.google.com/apppasswords) generada (solo necesario si se va a probar el envío de correos)

## Instalación — Backend

```bash
cd backend/api_usuarios

# 1. Crear y activar un entorno virtual
python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# Mac/Linux:
source .venv/bin/activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Crear el archivo .env (ver tabla de variables más abajo)
copy .env.example .env      # Windows
cp .env.example .env        # Mac/Linux

# 4. Levantar el servidor
uvicorn app.main:app --reload
```

El backend queda disponible en `http://127.0.0.1:8000`. La documentación interactiva de la API (Swagger) se genera sola en `http://127.0.0.1:8000/docs`.

Las tablas se crean automáticamente al arrancar (`Base.metadata.create_all`) si la base de datos ya existe pero está vacía. Si la base tiene datos de un script SQL previo, verifica que los nombres de columnas coincidan con los modelos en `app/models/`.

## Instalación — Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`. Ya está configurado (`src/api.js`) para apuntar al backend en `http://127.0.0.1:8000`.

## Variables de entorno

Archivo `backend/api_usuarios/.env` (nunca se sube a Git — está en `.gitignore`):

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DB_HOST` | Host de la base de datos MySQL | `127.0.0.1` o el host de Aiven |
| `DB_PORT` | Puerto de conexión MySQL | `3306` (Aiven asigna uno distinto, ver su panel) |
| `DB_USER` | Usuario de la base de datos | `root` |
| `DB_PASSWORD` | Contraseña del usuario de la base de datos | — |
| `DB_NAME` | Nombre de la base de datos | `foccus` |
| `MAIL_USER` | Cuenta de Gmail que envía los correos (invitaciones, 2FA, recuperación) | `proyecto@gmail.com` |
| `MAIL_PASSWORD` | Contraseña de aplicación de Gmail (no la contraseña normal de la cuenta) | — |
| `CONTACT_EMAIL` | Correo destino del formulario de contacto | `soporte@ejemplo.com` |
| `JWT_SECRET_KEY` | Clave secreta para firmar los tokens JWT | genera una con `python -c "import secrets; print(secrets.token_hex(32))"`. También la usa `scripts/generate_token.py` |
| `JWT_EXPIRE_MINUTES` | Minutos de validez de la sesión | `1440` (24 horas) |

Si `JWT_SECRET_KEY` se deja vacío, se genera una clave temporal aleatoria: las sesiones se invalidan al reiniciar. En producción hay que configurar una clave segura y común.

## Módulos de la API

FOCCUS tiene **un único backend FastAPI** (`app.main`), organizado en routers; no son cuatro servicios independientes. Sus responsabilidades principales son:

| Routers | Responsabilidad |
|---|---|
| `user`, `role`, `contact` | Acceso, usuarios, roles y contacto |
| `client`, `project`, `codigo` | Clientes, proyectos y búsqueda por código |
| `guion`, `escena`, `desglose` | Guiones, escenas y desglose |
| `continuidad`, `galeria`, `personaje`, `escenario`, `rodaje` | Continuidad, recursos y planificación del rodaje |

El catálogo interactivo completo se genera en `/docs` y el contrato OpenAPI en `/openapi.json`. Algunos ejemplos de rutas:

| Módulo | Ruta base | Descripción |
|---|---|---|
| Autenticación | `/users/login`, `/register`, `/users/2fa/*`, `/users/recover-password` | Login, registro, verificación en dos pasos, recuperación de contraseña |
| Usuarios | `/users` | CRUD de usuarios, invitaciones a proyectos, eliminar cuenta propia |
| Clientes | `/clients` | CRUD de empresas/clientes |
| Proyectos | `/projects` | CRUD de proyectos de producción |
| Roles | `/roles` | CRUD de roles y niveles jerárquicos |
| Guion | `/guiones` | CRUD del guion maestro, versionamiento, notas |
| Escenas | `/escenas` | CRUD de escenas, versionamiento de continuidad |
| Continuidad | `/escenas/{id}/versiones`, `/escenas/versiones/{id}/fotos` | Fotos de vestuario, objetos y espacios por versión de escena |
| Rodaje | `/rodajes` | Cronograma de rodaje y procesos asociados |
| Galería | `/projects/{id}/galeria` | Personajes, lugares, objetos y vestuario con versiones y fotos |
| Desglose | `/guiones/{id}/desglose` | Desglose de escenas de un guion |
| Códigos (solo admin) | `/projects/{id}/buscar-codigo?q=` | Busca por código (ej. `ESC-003`); 403 si no es admin |

Las rutas protegidas requieren un JWT válido en `Authorization: Bearer <token>` y, según la operación, comprueban rol y pertenencia al proyecto. Hay excepciones públicas, como login, registro y recuperación de contraseña; consulta `/docs` y las rutas para cada caso.

## Pruebas y evidencia T6

Ejecución del **21-11-2026**, Windows, Python 3.12.10 y Node 24.16.0. Las 36 pruebas de backend y Newman se repitieron sobre una copia aislada del commit base `9126d8f` con los archivos T6 añadidos; frontend se probó en el árbol de trabajo con cambios sin commit. No es una instalación limpia ni una prueba de todo el producto. Plan, defectos y límites: [evidencia T6](docs/agentes/T6_EVIDENCIA.md).

### Backend: seguridad y cobertura

Se eligió `backend/api_usuarios/app/utils/auth.py` porque controla JWT, 2FA, roles y separación de recursos por proyecto. Con las pruebas existentes de permisos y los casos nuevos se cubrieron **108 de 116 sentencias (93 %, redondeado por coverage.py)**, no ramas ni todo el backend. Las sentencias sin ejecutar fueron 99, 216, 225, 232, 258, 269, 277 y 287. Antes de los casos nuevos, las dos suites existentes cubrían 96 de 116 (83 %).

Preparación comprobada en PowerShell desde la raíz de la **rama de evidencia**, sin copiar ni leer `.env`:

```powershell
cd backend/api_usuarios
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

La instalación de dependencias en un entorno virtual nuevo no demuestra una instalación funcional completa del producto; las versiones no están fijadas salvo bcrypt. Con Python 3.12.10 se repitieron estas pruebas el 22-11-2026. Para comprobar JWT y validación **sin coverage**:

```powershell
.\.venv\Scripts\python.exe -B -m unittest -v tests.test_t6_seguridad_aislada
```

Resultado: **27 pruebas aprobadas**. Se firma y verifica un JWT con una clave ficticia, incluyendo casos inválidos y expirados; no se demuestra un login exitoso.

Para repetir además las nueve pruebas HTTP de permisos y medir cobertura, instala `coverage` **solo si aún no está instalado** (no está en `requirements.txt`):

```powershell
.\.venv\Scripts\python.exe -m pip install coverage
.\.venv\Scripts\python.exe -m coverage run --source=app.utils.auth -m unittest -v tests.test_t6_seguridad_aislada tests.test_project_resource_ownership tests.test_projects_client_permissions
.\.venv\Scripts\python.exe -m coverage report -m
```

Resultado: **36 pruebas aprobadas, 0 fallidas, código 0**. Las 27 nuevas comprueban JWT, roles y validación; las 9 existentes ejecutan permisos mediante HTTP local y SQLite en memoria. Se sustituyen `dotenv.load_dotenv` y la creación del motor MySQL antes de importar el backend: el mensaje `Conexion exitosa MySQL` proviene del motor simulado, **no** de una conexión real. Tampoco se envía correo; los archivos de continuidad se simulan. No ejecutar indiscriminadamente todas las suites: algunas podrían necesitar servicios o configuración reales.

El arranque de `app.main` completo se comprobó aparte, en un proceso de prueba con motor y creación de tablas simulados, carpeta temporal y sin `.env`:

```powershell
.\.venv\Scripts\python.exe -B -m unittest -v tests.test_t6_arranque_aislado
```

Resultado: **1 prueba, 0 fallos, código 0**. Uvicorn inició en puerto libre; `/`, `/docs` y `/openapi.json` respondieron 200. La documentación describió 69 rutas en la copia base. El JWT se firmó y validó realmente con una clave ficticia, no mediante un login completo. No se verificaron consultas reales, SMTP ni persistencia en ese arranque.

### Matriz de casos ejecutados

Cada paso es ejecutar el método `test_NN` correspondiente en `tests/test_t6_seguridad_aislada.py`; su código contiene los datos ficticios y las comprobaciones exactas. «Aprobado» significa que se ejecutó y que todas las aserciones del caso pasaron, no que se haya probado una API o BD de producción.

| ID | Datos ficticios y acción | Resultado esperado | Resultado real |
|---|---|---|---|
| 01 | Firmar JWT de usuario 1 con 2FA y verificar | Devuelve usuario 1 | Aprobado |
| 02 | Verificar sin cabecera | HTTPException 401 | Aprobado |
| 03 | Verificar `Basic prueba` | 401 | Aprobado |
| 04 | Verificar Bearer malformado | 401 | Aprobado |
| 05 | Firmar JWT ya expirado y verificar | 401 | Aprobado |
| 06 | Firmar JWT sin `id_user` y verificar | 401 | Aprobado |
| 07 | Firmar JWT sin 2FA y verificar | 401 | Aprobado |
| 08 | Firmar JWT con 2FA falso y verificar | 401 | Aprobado |
| 09 | Consultar rol simulado 1001 con claim 1005 | Autoriza como 1001 | Aprobado |
| 10 | Consultar rol simulado 1005 con claim 1001 | 403 | Aprobado |
| 11 | Consultar administrador con cuenta inexistente | 401 | Aprobado |
| 12 | Validar login con `a@example.test` y dispositivo `d` | Acepta dispositivo | Aprobado |
| 13 | Validar login sin dispositivo | Error de validación | Aprobado |
| 14 | Validar login con dispositivo vacío | Error de validación | Aprobado |
| 15 | Validar login con dispositivo de 256 caracteres | Error de validación | Aprobado |
| 16 | Validar recuperación con contraseña de 72 bytes | Acepta | Aprobado |
| 17 | Validar recuperación con contraseña de 73 bytes | Error de validación | Aprobado |
| 18 | Validar recuperación con 37 caracteres `ñ` (74 bytes) | Error de validación | Aprobado |
| 19 | Validar invitación ficticia con nombre ` Persona ` | Acepta y elimina espacios | Aprobado |
| 20 | Validar invitación con nombre solo espacios | Error de validación | Aprobado |
| 21 | Validar invitación con fecha de nacimiento de hoy | Error de validación | Aprobado |
| 22 | Validar invitación con fecha futura | Error de validación | Aprobado |
| 23 | Validar contraseña `Ab1!` | Error por longitud | Aprobado |
| 24 | Validar contraseña `prueba123!` | Error por falta de mayúscula | Aprobado |
| 25 | Validar contraseña `PRUEBA123!` | Error por falta de minúscula | Aprobado |
| 26 | Validar contraseña `PruebaABC!` | Error por falta de número | Aprobado |
| 27 | Validar contraseña `Prueba123` | Error por falta de carácter especial | Aprobado |

### API: colección Postman

La colección está en `backend/api_usuarios/tests/FOCCUS_T6.postman_collection.json`. Utiliza únicamente datos ficticios y `baseUrl` local; **no cambiarla para apuntar a producción**. Ejecutarla exclusivamente contra `tests.postman_app_aislada`, que expone cuatro rutas reales de usuario con BD simulada; no es la aplicación completa. Desde `backend/api_usuarios`, en dos terminales:

```powershell
# Terminal 1: comprobar que el puerto 8765 esté libre; detener con Ctrl+C al terminar.
.\.venv\Scripts\python.exe -m uvicorn tests.postman_app_aislada:app --host 127.0.0.1 --port 8765 --no-access-log

# Terminal 2: desde backend/api_usuarios; si falta Newman en esta carpeta, instalarlo:
npm install --prefix "$env:TEMP\foccus-newman-t6-verificacion" newman@6.2.3 --no-save --no-audit --no-fund
& "$env:TEMP\foccus-newman-t6-verificacion\node_modules\.bin\newman.cmd" run tests\FOCCUS_T6.postman_collection.json --reporters cli
```

Resultado final: **7 solicitudes y 7 aserciones aprobadas, 0 fallidas, código 0**. En la repetición se usó un puerto libre y se sobrescribió `baseUrl` con `--env-var`. Se probó `POST /users/login` con usuario inexistente (200 con `success: false` y `USER_NOT_FOUND`), validación de dispositivo (422), `GET /users` sin JWT o con JWT inválido (401), límite de contraseña en `POST /users/reset-password` (422) y `POST /users/2fa/check` sin intento (401). `GET /docs` devolvió 200 en la aplicación parcial. La colección no prueba login exitoso, SMTP ni MySQL real.

### Frontend y pendientes

Desde `frontend` en el árbol sucio: `npm test` dio **37 aprobadas, 0 fallidas**, código 0; `npm run build` terminó con código 0 y aviso de chunks de más de 500 kB. `npm run lint` falló con código 1: **14 errores**, en `Escena.jsx` (2), `Landing.jsx` (1), `Profile.jsx` (7), `ProjectRegistration.jsx` (1) y `ProjectSelection.jsx` (3). No se corrigieron en esta ejecución. En Chrome aislado se comprobó inicio → login y acceso sin sesión a `/guion` → inicio, sin backend; no se verificó la app móvil.

Durante el montaje de la aplicación Postman, la primera ejecución tuvo 1 aserción fallida: el login devolvió 500 porque la sustitución de dependencias no se aplicaba al copiar las rutas. Se corrigió el servidor **de prueba** incluyendo el router mediante FastAPI; la reejecución pasó 7/7. No se presenta como defecto de producción ni como ciclo con commit. Faltan **dos ciclos demostrables de defecto real → corrección con commit → reejecución**; no se crearon commits ni issues. También quedan pendientes el arranque desde cero y la integración con infraestructura real en un entorno de prueba autorizado.

## Novedades de la versión actual

- **Guion con formato profesional:** el guion se guarda por bloques tipados (escena, acción, personaje, paréntesis, diálogo, transición) en `<p class="gb gb-TIPO">`. Se exporta a PDF en Carta, Courier 12 y portada. Informe: `docs/agentes/investigacion/2026-11-01-formato-guion.md`.
- **Base de diseño y accesibilidad:** tokens de color, foco visible y estados con acción (cargando/error/vacío). Informe: `2026-11-01-auditoria-visual-frontend.md`.
- **Códigos únicos (solo admin, rol 1001):** cada cosa recibe un código legible `TIPO-001`.

  | Prefijo | Qué es | Prefijo | Qué es |
  |---|---|---|---|
  | PRO | Proyecto | PER | Personaje |
  | GUI | Guion | LOC | Lugar |
  | VGU | Versión de guion | OBJ | Objeto |
  | ESC | Escena | VES | Vestuario |
  | DRO | Jornada de rodaje | | |

  El consecutivo es por proyecto y tipo (PRO es global), se genera en el backend, no cambia y no se reutiliza (al borrar, su fila se elimina y el contador no retrocede). Se guardan en las tablas `codigos_entidad` y `codigos_contador`. Se ven como una etiqueta que se copia al hacer clic en cada módulo, y el módulo **Buscar código** (`/buscar-codigo`, menú lateral del admin) los encuentra y abre la ficha. Informe: `2026-11-01-codigos-y-buscador.md`.

## Base de datos: backups y migraciones

Las gestiona el agente `foccus-bd`. Documentación en `docs/agentes/bd/` (`ESQUEMA.md`, `MIGRACIONES.md`, `BACKUPS.md`).

```bash
# desde la raíz, con el Python del entorno virtual del backend
backend\api_usuarios\.venv\Scripts\python.exe scripts\backup_bd.py                     # crea un backup en backups\
backend\api_usuarios\.venv\Scripts\python.exe scripts\restaurar_bd.py backups\ARCHIVO.sql.gz   # restaura (pide confirmación)
backend\api_usuarios\.venv\Scripts\python.exe scripts\migrar_codigos.py                # simulación (--apply para aplicar)
```

Las tablas de códigos NO se crean al arrancar: hay que correr `migrar_codigos.py --apply`. Sin migrar, la API funciona igual y `codigo` sale vacío. Los backups no se suben a git.

## App móvil (Flutter)

El código está **solo en la rama `mobile`** (worktree `.worktrees/mobile`, carpeta `mobile/`). Consume la misma API. Incluye proyectos, guiones (lector y editor con bloques en Courier Prime), escenas, galería, rodaje, desglose, roles, tema claro/oscuro, y códigos y buscador para el admin.

```bash
git checkout mobile
cd mobile
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_URL=http://IP_DEL_BACKEND:8000
```

Con un celular por USB: `adb reverse tcp:8000 tcp:8000` y `--dart-define=API_URL=http://127.0.0.1:8000`. La guía completa está en `mobile/GUIA_FLUTTER.md` (rama `mobile`). La rama `mobile` recibe cambios de `main`, nunca al revés.

## Equipo de agentes

Cuatro agentes de GitHub Copilot (`.github/agents/`) que se llaman entre sí: **foccus-web** (web, backend, ramas), **foccus-investigador** (informes en `docs/agentes/investigacion/`), **foccus-mobile** (Flutter) y **foccus-bd** (base de datos). Los cambios del web que afectan al móvil se registran en `docs/agentes/CAMBIOS_WEB.md`. Más detalle en `docs/agentes/README.md`.

## Seguridad

`.env`, backups y secretos nunca se suben a git. `scripts/generate_token.py` lee `JWT_SECRET_KEY` del `.env`.

## Autores

Proyecto desarrollado por Camilo (Aerxs666) y Juan (Cr4ckJu4nF3).
