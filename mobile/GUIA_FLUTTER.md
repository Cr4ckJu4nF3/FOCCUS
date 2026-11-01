# Guía de Flutter en FOCCUS (app móvil)

## 1. ¿Cómo funciona la app?

La app móvil está hecha con **Flutter** (lenguaje **Dart**). No tiene base de datos propia: es un "cliente" que le habla por internet a la **API FastAPI**, y la API habla con **MySQL (Aiven)**.

```
Celular (Flutter)  --HTTP-->  Backend FastAPI (PC)  -->  MySQL en Aiven (nube)
```

### Estructura de `mobile/lib`
| Carpeta | Qué hace |
|---|---|
| `main.dart` | Punto de entrada: tema claro/oscuro y restauración de sesión. |
| `config/api_config.dart` | URL base de la API (`API_URL`) y construcción de URL de imágenes. |
| `models/` | Clases Dart que representan los datos (guion, escena...). |
| `services/` | Llamadas HTTP al backend (`api_client.dart`, `auth_service.dart`, `guion_service.dart`...) y la sesión (`session.dart`). |
| `screens/` | Pantallas (login, proyectos, guion, escenas, galería...). |
| `widgets/` | Componentes reutilizables y animaciones (`foccus_ui.dart`). |

Flujo típico: **pantalla → servicio → ApiClient → backend**. El `ApiClient` agrega solo el token y el header `X-Project-Id`.

## 2. Requisitos en cualquier PC (Windows)

1. **Flutter SDK**: https://docs.flutter.dev/get-started/install/windows (descomprimir y agregar `flutter\bin` al PATH).
2. **Android Studio** (trae el Android SDK, `adb` y el emulador).
3. **Git** y **Python 3.11+** (para el backend).
4. Verifica todo con:
   ```powershell
   flutter doctor
   ```
   Acepta licencias con `flutter doctor --android-licenses`.

## 3. Levantar el backend

```powershell
cd backend\api_usuarios
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- Necesitas el archivo `.env` con los datos de Aiven (no se sube a git; pídelo al equipo).
- El servicio de Aiven debe estar **encendido** y permitir tu IP.
- Prueba: abre http://127.0.0.1:8000/docs

## 4. Correr la app

Primero, en la carpeta de la app:
```powershell
cd .worktrees\mobile\mobile      # o la carpeta mobile de la rama "mobile"
flutter pub get
```

### Opción A: Celular físico por USB
1. En el celular: Ajustes → Acerca del teléfono → toca 7 veces "Número de compilación" → activa **Opciones de desarrollador → Depuración USB**.
2. Conecta el cable y acepta "¿Permitir depuración USB?".
3. Verifica: `flutter devices` (debe salir tu modelo).
4. Redirige el puerto para que el celular llegue al backend del PC:
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
   ```
   (repetir cada vez que reconectes el cable)
5. Ejecuta:
   ```powershell
   flutter run --dart-define=API_URL=http://127.0.0.1:8000
   ```

### Opción B: Celular físico por Wi-Fi (sin `reverse`)
PC y celular en la misma red; el firewall debe permitir el puerto 8000 (requiere administrador).
```powershell
flutter run --dart-define=API_URL=http://IP_DEL_PC:8000
```
La IP se ve con `ipconfig`.

### Opción C: Celular virtual (emulador)
1. Android Studio → Device Manager → Create Device → elige un Pixel y una imagen del sistema.
2. Inícialo (o `flutter emulators --launch NOMBRE`).
3. El emulador ve el PC en `10.0.2.2`:
   ```powershell
   flutter run --dart-define=API_URL=http://10.0.2.2:8000
   ```

## 5. Comandos útiles durante `flutter run`
| Tecla | Acción |
|---|---|
| `r` | Hot reload (aplica cambios al instante). |
| `R` | Hot restart (reinicia la app). |
| `q` | Salir. |

Otros: `flutter analyze` (revisar código), `flutter test` (pruebas), `flutter clean` (limpiar si algo se rompe).

## 6. Generar un APK para instalar sin cable
```powershell
flutter build apk --release --dart-define=API_URL=https://URL_PUBLICA_DE_LA_API
```
El archivo queda en `build\app\outputs\flutter-apk\app-release.apk`. Cópialo al celular e instálalo. Para que funcione fuera de casa, la API debe estar publicada (túnel o nube).

## 7. Problemas comunes
- **"No se pudo conectar con el servidor"**: backend apagado, `adb reverse` no hecho, o `API_URL` incorrecta.
- **El celular no aparece en `flutter devices`**: cable de solo carga, depuración USB desactivada o no autorizada.
- **Backend no arranca / "getaddrinfo failed"**: el servicio de Aiven está apagado o el host del `.env` cambió.
- **Fotos no se ven**: las imágenes salen de `API_URL/assets/uploads/...`; revisa que la API responda.
- **Errores `gralloc4` en el log**: ruido de algunos Samsung; se pueden ignorar.
- **`http` bloqueado**: ya está habilitado `usesCleartextTraffic` en `AndroidManifest.xml`.
