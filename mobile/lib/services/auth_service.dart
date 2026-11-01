import 'api_client.dart';
import 'session.dart';

enum LoginOutcome {
  /// Login correcto y el dispositivo ya estaba verificado: entra directo.
  authenticated,

  /// Login correcto pero el backend pide el codigo de 6 digitos.
  requires2fa,

  /// Credenciales malas, error de validacion o error del backend.
  failed,
}

class LoginResult {
  LoginResult(this.outcome, {this.message, this.mail});

  final LoginOutcome outcome;
  final String? message;
  final String? mail;
}

/// Replica exacta del flujo de autenticacion de la web
/// (frontend/src/screen/Login.jsx + TwoFactor.jsx), usando los mismos
/// endpoints y los mismos nombres de campo del backend FastAPI.
class AuthService {
  const AuthService._();

  // ==========================================
  // LOGIN  ->  POST /users/login
  // ==========================================
  static Future<LoginResult> login(String mail, String contrasena,
      {bool rememberMe = false}) async {
    final normalizedMail = mail.trim().toLowerCase();

    final response = await ApiClient.post('/users/login', body: {
      'mail': normalizedMail,
      'contrasena': contrasena,
      'remember_me': rememberMe,
    });

    if (!response.success) {
      return LoginResult(
        LoginOutcome.failed,
        message: response.errorMessage('Correo o contraseña incorrectos'),
      );
    }

    final data = response.data;

    // Guardar el token de sesion y los datos del usuario, igual que en
    // Login.jsx. A partir de aca ApiClient ya manda el Bearer token.
    await Session.setToken(data['access_token'] as String?);
    await Session.setRememberMe(rememberMe);
    await Session.saveUser(data);

    // ==========================================
    // 2FA - CHECK  ->  POST /users/2fa/check
    // ==========================================
    final deviceId = Session.getDeviceId();

    final check = await ApiClient.post('/users/2fa/check', body: {
      'mail': normalizedMail,
      'device_id': deviceId,
    });

    // Si el check falla la web deja entrar igual; mantenemos ese criterio
    // para no dejar al usuario trabado por un endpoint secundario.
    if (!check.ok) {
      return LoginResult(LoginOutcome.authenticated, mail: normalizedMail);
    }

    // El backend puede devolver requires_2fa dentro de `data` o al nivel
    // de la raiz; Login.jsx contempla los dos casos (result.data || result).
    final checkData = check.data.isNotEmpty ? check.data : check.body;
    if (checkData['requires_2fa'] != true) {
      return LoginResult(LoginOutcome.authenticated, mail: normalizedMail);
    }

    // ==========================================
    // 2FA - SEND  ->  POST /users/2fa/send
    // ==========================================
    final send = await send2faCode(normalizedMail);
    if (!send.success) {
      return LoginResult(
        LoginOutcome.failed,
        message: send.errorMessage('No se pudo enviar el código de verificación'),
      );
    }

    return LoginResult(LoginOutcome.requires2fa, mail: normalizedMail);
  }

  // ==========================================
  // REGISTRO  ->  POST /register
  // ==========================================
  /// Replica el payload de RegisterSchema (backend/app/schemas/user_schema.py):
  /// mismos nombres de campo en snake_case, mismo endpoint que usa la web
  /// (frontend/src/screen/Login.jsx -> handleRegister).
  static Future<ApiResponse> register({
    required String razonSocial,
    required String representanteLegal,
    required String emailEmpresa,
    String? address,
    String? telephone,
    String? numberCellphone,
    required String document,
    required String idDocument,
    required String nombre,
    required String apellido,
    required String mail,
    required String msisdn,
    required String contrasena,
  }) {
    return ApiClient.post('/register', body: {
      'razon_social': razonSocial,
      'representante_legal': representanteLegal,
      'email_empresa': emailEmpresa.trim().toLowerCase(),
      'address': address,
      'telephone': telephone,
      'number_cellphone': numberCellphone,
      'document': document,
      'id_document': idDocument,
      'nombre': nombre,
      'apellido': apellido,
      'mail': mail.trim().toLowerCase(),
      'msisdn': msisdn,
      'contrasena': contrasena,
    });
  }

  // ==========================================
  // 2FA - ENVIAR / REENVIAR CODIGO
  // ==========================================
  static Future<ApiResponse> send2faCode(String mail) {
    return ApiClient.post('/users/2fa/send', body: {
      'mail': mail.trim().toLowerCase(),
      'device_id': Session.getDeviceId(),
    });
  }

  // ==========================================
  // 2FA - VERIFICAR CODIGO  ->  POST /users/2fa/verify
  // ==========================================
  static Future<LoginResult> verify2faCode(String mail, String codigo,
      {bool rememberMe = false}) async {
    final normalizedMail = mail.trim().toLowerCase();

    final response = await ApiClient.post('/users/2fa/verify', body: {
      'mail': normalizedMail,
      'codigo': codigo.trim(),
      'device_id': Session.getDeviceId(),
      'remember_me': rememberMe,
    });

    if (!response.success) {
      return LoginResult(
        LoginOutcome.failed,
        message: response.errorMessage('Código incorrecto o expirado'),
      );
    }

    // El backend reemite el token tras verificar el segundo factor.
    final data = response.data;
    await Session.setToken(data['access_token'] as String?);
    await Session.saveUser(data);

    return LoginResult(LoginOutcome.authenticated, mail: normalizedMail);
  }

  // ==========================================
  // RECUPERAR CONTRASENA (3 pasos, igual que ForgotPassword.jsx)
  // ==========================================
  static Future<ApiResponse> requestRecoveryCode(String mail) =>
      ApiClient.post('/users/recover-password',
          body: {'mail': mail.trim().toLowerCase()});

  static Future<ApiResponse> verifyRecoveryCode(String mail, String codigo) =>
      ApiClient.post('/users/verify-recovery-code',
          body: {'mail': mail.trim().toLowerCase(), 'codigo': codigo.trim()});

  static Future<ApiResponse> resetPassword(
          String mail, String codigo, String nuevaContrasena) =>
      ApiClient.post('/users/reset-password', body: {
        'mail': mail.trim().toLowerCase(),
        'codigo': codigo.trim(),
        'nueva_contrasena': nuevaContrasena,
      });

  /// Reglas de contrasena identicas a las de la web.
  static List<String> passwordRulesMissing(String password) {
    const special = '!@#\$%^&*()_+-=[]{};\':"\\|,.<>/?';
    return [
      if (password.length < 8) 'mínimo 8 caracteres',
      if (!RegExp(r'[a-z]').hasMatch(password)) 'una letra minúscula',
      if (!RegExp(r'[A-Z]').hasMatch(password)) 'una letra mayúscula',
      if (!RegExp(r'[0-9]').hasMatch(password)) 'un número',
      if (!password.split('').any(special.contains)) 'un carácter especial',
    ];
  }

  // ==========================================
  // COMPLETAR CUENTA INVITADA  ->  POST /users/complete-invitation
  // ==========================================
  static Future<ApiResponse> completeInvitation(Map<String, dynamic> body) async {
    final response = await ApiClient.post('/users/complete-invitation', body: body);
    if (response.success) {
      await Session.setNeedsProfileCompletion(false);
    }
    return response;
  }

  // ==========================================
  // LOGOUT
  // ==========================================
  static Future<void> logout() => Session.clear();
}