---
applyTo: "backend/**/*.py"
---

# Backend FastAPI (`backend\api_usuarios`)

- Sigue la arquitectura existente: `routes` (endpoints) → `controllers` (lógica) → `models` (SQLAlchemy). Validación de entrada/salida en `schemas` (Pydantic).
- Cada recurso nuevo lleva su propio archivo en cada capa, con el sufijo `_routes.py`, `_controller.py`, `_model.py`, y se registra en `app\main.py`.
- Autenticación con JWT (`utils\auth.py`); protege endpoints que manejan datos de proyectos y verifica la pertenencia del usuario al proyecto.
- Contraseñas con bcrypt/passlib; nunca guardarlas ni registrarlas en texto plano.
- Archivos subidos: usa `utils\file_storage.py`; valida tipo y tamaño.
- Configuración sensible desde variables de entorno (`.env`); no la escribas en el código.
- Usa sesiones de SQLAlchemy mediante la dependencia existente en `config\database.py`; evita SQL crudo con datos del usuario.
- Devuelve errores con `HTTPException` y códigos HTTP correctos.
- Añade dependencias nuevas a `requirements.txt`.
- Los cambios de esquema de BD deben documentarse (los scripts viven en `scripts\`).
