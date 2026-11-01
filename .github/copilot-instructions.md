# FOCCUS – Instrucciones para el agente

Proyecto estudiantil. FOCCUS es una plataforma para la gestión de continuidad en producciones audiovisuales: proyectos, equipos con roles, guiones versionados, escenas con continuidad fotográfica, galerías, desglose y cronogramas de rodaje.

Responde siempre en español. Prioriza soluciones simples y fáciles de entender; el equipo está aprendiendo.

## Estructura

- `backend\api_usuarios\app\` – API FastAPI + SQLAlchemy + MySQL. Capas: `routes` → `controllers` → `models`, con `schemas` (Pydantic) y `utils` (JWT, correo, almacenamiento de archivos).
- `frontend\` – React 19 + Vite + React Router v7 + Tailwind v4.
- `mobile\` – App Flutter/Dart (Android/iOS). Consume la misma API del backend.
- `scripts\` – Scripts auxiliares de Python para inspeccionar/poblar la BD.
- `.worktrees\` – Worktrees de git; no editar ahí salvo que se pida.

## Reglas generales

- Cambios pequeños y enfocados; no refactorizar código no relacionado.
- Nunca subir secretos: `.env` no se toca ni se commitea; usa `.env.example` para documentar variables.
- Los nombres de dominio están en español (`escena`, `guion`, `rodaje`, `personaje`); mantén esa convención.
- Antes de crear un endpoint nuevo en el backend, revisa el contrato existente para que web y móvil sigan funcionando.
- Si cambias un endpoint, indica el impacto en `frontend` y `mobile`.

## Comandos

- Backend: `cd backend\api_usuarios; pip install -r requirements.txt; uvicorn app.main:app --reload`
- Frontend: `cd frontend; npm install; npm run dev; npm run lint`
- Móvil: `cd mobile; flutter pub get; flutter analyze; flutter test; flutter run`
