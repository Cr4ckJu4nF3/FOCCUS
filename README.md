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

Si `JWT_SECRET_KEY` se deja vacío, el backend arranca igual usando una clave por defecto de desarrollo — **no usar esa configuración en producción**.

## Módulos de la API

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

Todas las rutas de escritura (crear/editar/borrar) requieren un token JWT válido en el header `Authorization: Bearer <token>`. Las acciones administrativas (crear/editar/borrar clientes, proyectos, roles, guiones, escenas, rodajes, invitar o remover usuarios) exigen además que el usuario tenga rol de Administrador.

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
