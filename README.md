# FOCCUS

Plataforma para la gestión de continuidad en producciones audiovisuales (cine, series, comerciales). Permite administrar proyectos, equipos de trabajo con roles, guiones versionados, escenas con continuidad fotográfica (vestuario, objetos, espacios) y cronogramas de rodaje.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn (servidor ASGI) |
| Base de datos | MySQL, SQLAlchemy (ORM), PyMySQL (driver) |
| Autenticación | JWT (PyJWT) + bcrypt (passlib) |
| Frontend | React 19, Vite, React Router v7 |
| Estilos | Tailwind CSS v4 + React-Bootstrap |
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
└── scripts/                          # Scripts sueltos usados durante el desarrollo/depuración
```

## Requisitos previos

- Python 3.11 o superior
- Node.js 18 o superior
- Una base de datos MySQL accesible (local vía XAMPP, o en la nube — el equipo usa [Railway](https://railway.app))
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
| `DB_HOST` | Host de la base de datos MySQL | `127.0.0.1` o el host de Railway |
| `DB_PORT` | Puerto de conexión MySQL | `3306` (Railway asigna uno distinto, ver su panel) |
| `DB_USER` | Usuario de la base de datos | `root` |
| `DB_PASSWORD` | Contraseña del usuario de la base de datos | — |
| `DB_NAME` | Nombre de la base de datos | `foccus` |
| `MAIL_USER` | Cuenta de Gmail que envía los correos (invitaciones, 2FA, recuperación) | `proyecto@gmail.com` |
| `MAIL_PASSWORD` | Contraseña de aplicación de Gmail (no la contraseña normal de la cuenta) | — |
| `CONTACT_EMAIL` | Correo destino del formulario de contacto | `soporte@ejemplo.com` |
| `JWT_SECRET_KEY` | Clave secreta para firmar los tokens JWT | genera una con `python -c "import secrets; print(secrets.token_hex(32))"` |
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

Todas las rutas de escritura (crear/editar/borrar) requieren un token JWT válido en el header `Authorization: Bearer <token>`. Las acciones administrativas (crear/editar/borrar clientes, proyectos, roles, guiones, escenas, rodajes, invitar o remover usuarios) exigen además que el usuario tenga rol de Administrador.

## Autores

Proyecto desarrollado por Camilo (Aerxs666) y Juan (Cr4ckJu4nF3).
