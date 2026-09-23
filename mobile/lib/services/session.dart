import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

/// Equivalente movil del bloque de sesion de frontend/src/api.js.
/// Alla se usa localStorage; aca SharedPreferences, que persiste igual
/// entre reinicios de la app y guarda exactamente las mismas claves
/// (access_token, device_id, id_user, nombre, apellido, mail, id_rol,
/// id_client) para que ambos clientes hablen el mismo idioma.
class Session {
  const Session._();

  static const _kToken = 'access_token';
  static const _kDeviceId = 'device_id';

  static SharedPreferences? _prefs;

  /// Se llama una sola vez en main() antes de runApp().
  static Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  static SharedPreferences get _p {
    final prefs = _prefs;
    if (prefs == null) {
      throw StateError('Session.init() no fue llamado antes de usar la sesion');
    }
    return prefs;
  }

  // ==========================================
  // DEVICE ID
  // ==========================================
  // En la web es crypto.randomUUID(). Aca se genera un UUID v4 a mano
  // para no meter una dependencia extra solo por esto. Se guarda una
  // vez y se reutiliza siempre: el backend lo usa como identificador
  // del dispositivo en el flujo de 2FA.
  static String getDeviceId() {
    var deviceId = _p.getString(_kDeviceId);
    if (deviceId == null || deviceId.isEmpty) {
      deviceId = _generateUuidV4();
      _p.setString(_kDeviceId, deviceId);
    }
    return deviceId;
  }

  static String _generateUuidV4() {
    final rnd = Random.secure();
    final bytes = List<int>.generate(16, (_) => rnd.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    String hex(int start, int end) => bytes
        .sublist(start, end)
        .map((b) => b.toRadixString(16).padLeft(2, '0'))
        .join();
    return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
  }

  // ==========================================
  // TOKEN (JWT)
  // ==========================================
  static String? getToken() => _p.getString(_kToken);

  static Future<void> setToken(String? token) async {
    if (token != null && token.isNotEmpty) {
      await _p.setString(_kToken, token);
    }
  }

  static Future<void> clear() => _p.clear();

  /// Lee la fecha de expiracion del token sin verificar la firma (eso lo
  /// hace siempre el backend). Sirve solo para decidir en el cliente si
  /// hay que mandar al usuario de vuelta al login antes de intentar una
  /// peticion que de todas formas fallaria con 401.
  static bool isTokenValid([String? token]) {
    final t = token ?? getToken();
    if (t == null || t.isEmpty) return false;
    try {
      final parts = t.split('.');
      if (parts.length != 3) return false;
      final payload = json.decode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      ) as Map<String, dynamic>;
      final exp = payload['exp'];
      if (exp == null) return true;
      return (exp as num) * 1000 > DateTime.now().millisecondsSinceEpoch;
    } catch (_) {
      return false;
    }
  }

  // ==========================================
  // DATOS DEL USUARIO
  // ==========================================
  /// Guarda el mismo set de datos que Login.jsx mete en localStorage
  /// despues de un login exitoso.
  static Future<void> saveUser(Map<String, dynamic> data) async {
    Future<void> put(String key) async {
      final value = data[key];
      if (value == null) return;
      await _p.setString(key, value.toString());
    }

    await put('id_user');
    await put('nombre');
    await put('apellido');
    await put('mail');
    await put('id_rol');
    await put('id_client');
  }

  static String? get nombre => _p.getString('nombre');
  static String? get apellido => _p.getString('apellido');
  static String? get mail => _p.getString('mail');
  static String? get idUser => _p.getString('id_user');
  static String? get idRol => _p.getString('id_rol');
  static String? get idClient => _p.getString('id_client');
}
