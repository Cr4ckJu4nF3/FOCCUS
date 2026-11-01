import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../widgets/foccus_ui.dart';

/// Recuperar acceso en 3 pasos (equivale a ForgotPassword.jsx):
/// 1) correo, 2) código, 3) nueva contraseña, 4) listo.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  int _paso = 1;
  bool _loading = false;
  bool _verNueva = false;
  bool _verConfirmar = false;
  String? _error;
  String _email = '';

  final _emailCtrl = TextEditingController();
  final _codigoCtrl = TextEditingController();
  final _nuevaCtrl = TextEditingController();
  final _confirmarCtrl = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _codigoCtrl.dispose();
    _nuevaCtrl.dispose();
    _confirmarCtrl.dispose();
    super.dispose();
  }

  /// Mismas reglas que validarContrasena() de la web.
  List<String> _reglasFaltantes(String p) {
    final r = <String>[];
    if (p.length < 8) r.add('Mínimo 8 caracteres');
    if (!RegExp(r'[a-z]').hasMatch(p)) r.add('Una letra minúscula');
    if (!RegExp(r'[A-Z]').hasMatch(p)) r.add('Una letra mayúscula');
    if (!RegExp(r'[0-9]').hasMatch(p)) r.add('Un número');
    if (!p.split('').any((c) => '!@#\$%^&*()_+-=[]{};\':"\\|,.<>/?'.contains(c))) {
      r.add('Un carácter especial');
    }
    return r;
  }

  /// Hace el POST, y si sale bien llama [onOk]; si no, muestra el error.
  Future<void> _call(String path, Map<String, dynamic> body, String fallback,
      VoidCallback onOk) async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final res = await ApiClient.post(path, body: body);
      if (!mounted) return;
      if (res.ok && res.body['success'] == true) {
        setState(() => _loading = false);
        onOk();
      } else {
        setState(() {
          _error = res.errorMessage(fallback);
          _loading = false;
        });
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo conectar con el servidor';
        _loading = false;
      });
    }
  }

  void _enviarCorreo() {
    final mail = _emailCtrl.text.trim().toLowerCase();
    if (mail.isEmpty) {
      setState(() => _error = 'Ingresa tu correo');
      return;
    }
    _call('/users/recover-password', {'mail': mail},
        'No se encontró una cuenta con ese correo', () {
      setState(() {
        _email = mail;
        _codigoCtrl.clear();
        _paso = 2;
      });
    });
  }

  void _verificarCodigo() {
    final codigo = _codigoCtrl.text.trim();
    if (codigo.isEmpty) {
      setState(() => _error = 'Ingresa el código');
      return;
    }
    _call('/users/verify-recovery-code', {'mail': _email, 'codigo': codigo},
        'Código inválido o expirado', () {
      setState(() {
        _nuevaCtrl.clear();
        _confirmarCtrl.clear();
        _paso = 3;
      });
    });
  }

  void _cambiarContrasena() {
    if (_nuevaCtrl.text != _confirmarCtrl.text) {
      setState(() => _error = 'Las contraseñas no coinciden');
      return;
    }
    final faltan = _reglasFaltantes(_nuevaCtrl.text);
    if (faltan.isNotEmpty) {
      setState(() => _error = 'La contraseña debe tener: ${faltan.join(', ')}');
      return;
    }
    _call(
      '/users/reset-password',
      {
        'mail': _email,
        'codigo': _codigoCtrl.text.trim(),
        'nueva_contrasena': _nuevaCtrl.text,
      },
      'Código inválido o expirado',
      () => setState(() => _paso = 4),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AuthBackground(
      showBack: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset('assets/login_logo.png', width: 88, height: 88),
          const SizedBox(height: 16),
          _card(),
        ],
      ),
    );
  }

  Widget _card() {
    final fc = context.fc;
    return AuthCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(_titulo(),
              style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: fc.text)),
          const SizedBox(height: 6),
          Text(_descripcion(),
              style: GoogleFonts.inter(fontSize: 14, color: fc.textMuted)),
          const SizedBox(height: 20),
          AnimatedSize(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            alignment: Alignment.topCenter,
            child: FoccusSwitcher(
              child: _error == null
                  ? const SizedBox(key: ValueKey('sin-error'), width: double.infinity)
                  : Padding(
                      key: ValueKey(_error),
                      padding: const EdgeInsets.only(bottom: 16),
                      child: MessageBox(_error!),
                    ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOut,
            alignment: Alignment.topCenter,
            child: FoccusSwitcher(
              child: Column(
                key: ValueKey('paso$_paso'),
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: _contenido(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _titulo() => switch (_paso) {
        1 => 'Recuperar acceso',
        2 => 'Verifica tu código',
        3 => 'Nueva contraseña',
        _ => '¡Contraseña actualizada!',
      };

  String _descripcion() => switch (_paso) {
        1 => 'Ingresa tu correo y te enviaremos un código.',
        2 => 'Revisa $_email e ingresa el código recibido.',
        3 => 'Crea una contraseña segura.',
        _ => 'Ya puedes iniciar sesión con tu nueva contraseña.',
      };

  InputDecoration _dec(String label, {Widget? suffix, IconData? icon}) =>
      authInput(label, icon: icon, suffix: suffix, context: context);

  Widget _boton(String texto, VoidCallback onPressed) =>
      FoccusButton(label: texto, loading: _loading, onPressed: onPressed);

  List<Widget> _contenido() {
    final fc = context.fc;
    final style = TextStyle(color: fc.text, fontSize: 16);
    switch (_paso) {
      case 1:
        return [
          TextField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            style: style,
            decoration: _dec('Correo electrónico', icon: Icons.mail_outline),
          ),
          const SizedBox(height: 16),
          _boton('Enviar código', _enviarCorreo),
        ];
      case 2:
        return [
          TextField(
            controller: _codigoCtrl,
            keyboardType: TextInputType.number,
            style: style,
            decoration: _dec('Código de verificación', icon: Icons.pin_outlined),
          ),
          const SizedBox(height: 16),
          _boton('Verificar código', _verificarCodigo),
          const SizedBox(height: 4),
          TextButton(
            onPressed: _loading
                ? null
                : () => setState(() {
                      _paso = 1;
                      _error = null;
                    }),
            child: const Text('Usar otro correo'),
          ),
        ];
      case 3:
        return [
          TextField(
            controller: _nuevaCtrl,
            obscureText: !_verNueva,
            style: style,
            decoration: _dec(
              'Nueva contraseña',
              icon: Icons.lock_outline,
              suffix: IconButton(
                icon: Icon(_verNueva ? Icons.visibility_off : Icons.visibility,
                    color: fc.textMuted),
                onPressed: () => setState(() => _verNueva = !_verNueva),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmarCtrl,
            obscureText: !_verConfirmar,
            style: style,
            decoration: _dec(
              'Confirmar contraseña',
              icon: Icons.lock_outline,
              suffix: IconButton(
                icon: Icon(_verConfirmar ? Icons.visibility_off : Icons.visibility,
                    color: fc.textMuted),
                onPressed: () => setState(() => _verConfirmar = !_verConfirmar),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.',
            style: GoogleFonts.inter(fontSize: 13, color: fc.textMuted),
          ),
          const SizedBox(height: 16),
          _boton('Cambiar contraseña', _cambiarContrasena),
        ];
      default:
        return [
          _boton('Volver al inicio de sesión', () => Navigator.maybePop(context)),
        ];
    }
  }
}
