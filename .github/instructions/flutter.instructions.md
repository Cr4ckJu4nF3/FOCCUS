---
applyTo: "mobile/**/*.dart"
---

# Flutter / Dart (carpeta `mobile`)

- Usa null safety y tipos explícitos en APIs públicas. Prefiere `final` y `const`.
- Estructura sugerida en `lib\`: `models\`, `services\` (llamadas HTTP), `screens\`, `widgets\`, `providers\` (estado), `utils\`.
- Gestor de estado: usa **Provider** por defecto (el más simple para empezar) salvo que el equipo decida otro. No mezcles varios gestores.
- Consumo de API: paquete `http`; la URL base va en un único archivo de configuración (en emulador Android el host local es `10.0.2.2`). El token JWT se envía en `Authorization: Bearer <token>` y se guarda con `flutter_secure_storage`.
- Los modelos Dart reflejan los schemas del backend (`fromJson`/`toJson`); respeta los nombres de campos en español.
- Separa UI y lógica: los widgets no hacen llamadas HTTP directamente.
- Maneja estados de carga, error y vacío en cada pantalla.
- Divide widgets grandes en widgets pequeños reutilizables; evita lógica pesada en `build`.
- No uses `BuildContext` después de un `await` sin verificar `mounted`.
- Antes de dar por terminado un cambio ejecuta `flutter analyze` y, si hay pruebas, `flutter test`.
- Al añadir dependencias usa `flutter pub add <paquete>` y explica por qué se necesita.
