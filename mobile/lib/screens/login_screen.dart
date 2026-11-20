import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../widgets/foccus_ui.dart';
import 'forgot_password_screen.dart';
import 'register_form.dart';
import 'two_factor_screen.dart';

/// Paleta del login (acento terracota). Se reutiliza en toda la app.
class LoginColors {
  static const overlayTop = Color(0xF0081220);
  static const overlayBottom = Color(0xDB111111);
  static const cardBg = Color(0xF6141B1C);
  static const cardBorder = Color(0x29FAFAFA);
  static const tabsBg = Color(0xFF0E1218);
  static const textMuted = Color(0xFF8A94A3);
  static const textPrimary = Color(0xFFFAFAFA);
  static const inputBg = Color(0xFF0C1015);
  static const inputBorder = Color(0xFF2A2F38);
  static const accent = Color(0xFFE67E5C); // terracota
  static const accentHover = Color(0xFFD86646);
  static const linkHover = Color(0xFF0B4F8A);
  static const errorBg = Color(0x33EF4444);
  static const errorBorder = Color(0x80EF4444);
  static const errorText = Color(0xFFF87171);
  static const successBg = Color(0x1F4ADE80);
  static const successBorder = Color(0x734ADE80);
  static const successText = Color(0xFF86EFAC);
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _activeTabIsLogin = true;
  bool _obscurePassword = true;
  bool _rememberMe = false;
  bool _loading = false;
  String? _errorMessage;
  // Mensaje de "¡Registro completado!" que se muestra en el tab de
  // Ingresar justo despues de registrarse.
  String? _registroExitoso;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Mismo flujo que handleLogin() en frontend/src/screen/Login.jsx:
  /// POST /users/login -> guardar token -> POST /users/2fa/check ->
  /// si pide segundo factor, POST /users/2fa/send y pasar a la pantalla
  /// de verificacion; si no, entrar a seleccion de proyecto.
  Future<void> _handleLogin() async {
    if (_loading) return;

    final mail = _emailController.text.trim();
    final contrasena = _passwordController.text;

    if (mail.isEmpty || contrasena.isEmpty) {
      setState(() => _errorMessage = 'Ingresa tu correo y tu contraseña');
      return;
    }

    setState(() {
      _errorMessage = null;
      _loading = true;
    });

    try {
      final result =
          await AuthService.login(mail, contrasena, rememberMe: _rememberMe);
      if (!mounted) return;

      if (result.outcome == LoginOutcome.requires2fa) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => TwoFactorScreen(mail: result.mail ?? mail),
          ),
        );
      } else if (result.outcome == LoginOutcome.authenticated) {
        Navigator.of(context)
            .pushNamedAndRemoveUntil('/seleccion-proyecto', (_) => false);
      } else {
        setState(() =>
            _errorMessage = result.message ?? 'Correo o contraseña incorrectos');
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() => _errorMessage = 'No se pudo conectar con el servidor');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthBackground(
      showBack: Navigator.of(context).canPop(),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset('assets/login_logo.png', width: 96, height: 96),
          const SizedBox(height: 8),
          Text(
            _activeTabIsLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta',
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Continuidad para producciones audiovisuales',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 14, color: LoginColors.textMuted),
          ),
          const SizedBox(height: 20),
          AuthCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildTabs(),
                const SizedBox(height: 20),
                AnimatedSize(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOut,
                  alignment: Alignment.topCenter,
                  child: FoccusSwitcher(
                    child: _activeTabIsLogin
                        ? KeyedSubtree(
                            key: const ValueKey('login'),
                            child: _buildLoginForm(),
                          )
                        : KeyedSubtree(
                            key: const ValueKey('registro'),
                            child: RegisterForm(onRegistered: _handleRegistered),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Segmento tipo "pill" Ingresar / Registrar.
  Widget _buildTabs() {
    final fc = context.fc;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: fc.surfaceAlt,
        borderRadius: BorderRadius.circular(FoccusDims.radiusField + 4),
      ),
      child: Row(
        children: [
          Expanded(child: _tabButton('Ingresar', true)),
          Expanded(child: _tabButton('Registrar', false)),
        ],
      ),
    );
  }

  Widget _tabButton(String label, bool isLoginTab) {
    final fc = context.fc;
    final isActive = _activeTabIsLogin == isLoginTab;
    return Semantics(
      button: true,
      selected: isActive,
      child: InkWell(
        borderRadius: BorderRadius.circular(FoccusDims.radiusField),
        onTap: () => setState(() {
          _activeTabIsLogin = isLoginTab;
          _errorMessage = null;
        }),
        child: AnimatedContainer(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 200),
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isActive ? LoginColors.accent : Colors.transparent,
            borderRadius: BorderRadius.circular(FoccusDims.radiusField),
          ),
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: isActive ? Colors.white : fc.textMuted,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoginForm() {
    final fc = context.fc;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AnimatedSize(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          alignment: Alignment.topCenter,
          child: FoccusSwitcher(
            child: Column(
              key: ValueKey('${_registroExitoso}_$_errorMessage'),
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_registroExitoso != null) ...[
                  MessageBox(_registroExitoso!, isError: false),
                  const SizedBox(height: 16),
                ],
                if (_errorMessage != null) ...[
                  MessageBox(_errorMessage!),
                  const SizedBox(height: 16),
                ],
              ],
            ),
          ),
        ),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          textInputAction: TextInputAction.next,
          style: GoogleFonts.inter(fontSize: 16, color: fc.text),
          decoration: authInput('Correo electrónico',
              icon: Icons.mail_outline, context: context),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _handleLogin(),
          style: GoogleFonts.inter(fontSize: 16, color: fc.text),
          decoration: authInput(
            'Contraseña',
            icon: Icons.lock_outline,
            context: context,
            suffix: IconButton(
              tooltip: _obscurePassword ? 'Mostrar contraseña' : 'Ocultar contraseña',
              icon: Icon(
                _obscurePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                color: fc.textMuted,
              ),
              onPressed: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          borderRadius: BorderRadius.circular(FoccusDims.radiusField),
          onTap: () => setState(() => _rememberMe = !_rememberMe),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Row(
              children: [
                Checkbox(
                  value: _rememberMe,
                  onChanged: (v) => setState(() => _rememberMe = v ?? false),
                  activeColor: LoginColors.accent,
                  side: BorderSide(color: fc.textMuted),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Mantener sesión iniciada',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: fc.text,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'En este dispositivo durante 30 días. No guardaremos tu contraseña.',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          height: 1.35,
                          color: fc.textSubtle,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        FoccusButton(
          label: 'Ingresar',
          loading: _loading,
          onPressed: _handleLogin,
        ),
        const SizedBox(height: 8),
        Center(
          child: TextButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
            ),
            icon: Icon(Icons.vpn_key_outlined, size: 18, color: fc.textMuted),
            label: Text(
              '¿Olvidaste tu contraseña o usuario?',
              style: GoogleFonts.inter(fontSize: 14, color: fc.textMuted),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: fc.surfaceAlt,
            borderRadius: BorderRadius.circular(FoccusDims.radiusField),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.group_add_outlined, size: 20, color: fc.textMuted),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '¿Te invitaron a un proyecto? Inicia sesión con el correo y '
                  'la contraseña que recibiste por email. No necesitas registrar una empresa.',
                  style: GoogleFonts.inter(
                      fontSize: 13, height: 1.45, color: fc.textMuted),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Se llama cuando RegisterForm termina un registro exitoso: precarga el
  /// correo, limpia la contraseña, muestra el exito y vuelve a Ingresar.
  void _handleRegistered(String mail) {
    setState(() {
      _emailController.text = mail;
      _passwordController.clear();
      _registroExitoso =
          '¡Registro completado! Ahora inicia sesión con tu correo y contraseña.';
      _activeTabIsLogin = true;
    });
  }
}
