import 'package:flutter/foundation.dart';

/// Equivalente a la constante API_URL de frontend/src/api.js.
///
/// En la web basta con "http://127.0.0.1:8000" porque el navegador corre en
/// la misma maquina que el backend. En movil no: 127.0.0.1 apunta al propio
/// telefono/emulador, no al PC donde corre uvicorn. Por eso:
///
///   - Emulador Android -> 10.0.2.2 (alias del host desde el emulador)
///   - Simulador iOS / desktop / web -> 127.0.0.1
///   - Celular fisico -> hay que pasar la IP del PC en la red local:
///
///       flutter run --dart-define=API_URL=http://192.168.1.25:8000
///
/// (la IP se saca con `ipconfig` en Windows o `ifconfig` en Mac/Linux, y el
/// backend debe arrancarse con `uvicorn app.main:app --host 0.0.0.0 --port 8000`
/// para que acepte conexiones desde fuera del PC).
class ApiConfig {
  const ApiConfig._();

  static const String _override = String.fromEnvironment('API_URL');

  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (kIsWeb) return 'http://127.0.0.1:8000';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8000';
    }
    return 'http://127.0.0.1:8000';
  }

  static Uri resolve(String path) => Uri.parse('$baseUrl$path');
}
