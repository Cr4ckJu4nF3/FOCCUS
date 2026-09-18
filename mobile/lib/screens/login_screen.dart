import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Colores exactos del Login web (Login.css). Ojo: son distintos a los
/// de landing_screen.dart — el Login usa un acento naranja/terracota,
/// no el violeta del resto de la app. Es intencional, así está en la web.
class LoginColors {
  static const overlayTop = Color(0xF0081220);
  static const overlayBottom = Color(0xDB111111);
  static const cardBg = Color(0xF6141B1C);
  static const cardBorder = Color(0x29FAFAFA);
  static const tabsBg = Color(0xFF0E1218);
  static const textMuted = Color(0xFF6B6B6B);
  static const textPrimary = Color(0xFFFAFAFA);
  static const inputBg = Color(0xFF0C1015);
  static const inputBorder = Color(0xFF2A2A2A);
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
  bool _loading = false;
  String? _errorMessage;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() {
      _errorMessage = null;
      _loading = true;
    });

    // TODO: conectar con POST /users/login (igual que api.js en la web)
    // y seguir el mismo flujo de check 2FA que hace Login.jsx.
    await Future.delayed(const Duration(milliseconds: 600));

    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LoginColors.overlayBottom,
      body: Stack(
        children: [
          // Fondo con imagen + degradado oscuro, igual que .login-page__bg / __overlay
          Positioned.fill(
            child: Image.asset('assets/login_background.jpeg', fit: BoxFit.cover),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [LoginColors.overlayTop, LoginColors.overlayBottom],
                ),
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 448),
                  child: Column(
                    children: [
                      _buildLogo(),
                      const SizedBox(height: 24),
                      _buildCard(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogo() {
    return Image.asset('assets/login_logo.png', width: 116, height: 116);
  }

  Widget _buildCard() {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        // Cuadrados decorativos detrás de la tarjeta (::before / ::after en CSS)
        Positioned(
          top: 92,
          left: -24,
          child: Container(
            width: 92,
            height: 92,
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0x47E67E5C)),
            ),
          ),
        ),
        Positioned(
          right: -14,
          bottom: 48,
          child: Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0x8C0B4F8A)),
            ),
          ),
        ),
        // Tarjeta principal con sombra dura desplazada (18px 18px 0), sin difuminar
        Container(
          decoration: BoxDecoration(
            color: LoginColors.cardBg,
            borderRadius: BorderRadius.circular(2),
            border: Border.all(color: LoginColors.cardBorder),
            boxShadow: [
              BoxShadow(
                color: const Color(0x73060B12),
                offset: const Offset(14, 14),
                blurRadius: 0,
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.35),
                offset: const Offset(0, 20),
                blurRadius: 50,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildTabs(),
                Padding(
                  padding: const EdgeInsets.all(26),
                  child: _activeTabIsLogin ? _buildLoginForm() : _buildRegisterPlaceholder(),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTabs() {
    return Container(
      decoration: BoxDecoration(
        color: LoginColors.tabsBg,
        border: const Border(bottom: BorderSide(color: Color(0x1FFAFAFA))),
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
    final isActive = _activeTabIsLogin == isLoginTab;
    return InkWell(
      onTap: () => setState(() {
        _activeTabIsLogin = isLoginTab;
        _errorMessage = null;
      }),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        color: isActive ? LoginColors.accent : Colors.transparent,
        alignment: Alignment.center,
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w500,
            color: isActive ? Colors.white : LoginColors.textMuted,
          ),
        ),
      ),
    );
  }

  Widget _buildLoginForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_errorMessage != null) ...[
          _messageBox(_errorMessage!, isError: true),
          const SizedBox(height: 16),
        ],
        _fieldLabel('E-mail'),
        const SizedBox(height: 8),
        _textField(
          controller: _emailController,
          hint: 'Ingresa tu correo',
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 24),
        _fieldLabel('Contraseña'),
        const SizedBox(height: 8),
        _textField(
          controller: _passwordController,
          hint: 'Ingresa tu contraseña',
          obscure: _obscurePassword,
          suffix: IconButton(
            icon: Icon(
              _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
              color: LoginColors.textMuted,
              size: 20,
            ),
            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 46,
          child: ElevatedButton(
            onPressed: _loading ? null : _handleLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: LoginColors.accent,
              disabledBackgroundColor: LoginColors.accent.withValues(alpha: 0.5),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
            ),
            child: Text(
              _loading ? 'Ingresando...' : 'Ingresar',
              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w500),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Center(
          child: TextButton.icon(
            onPressed: () {
              // TODO: navegar a la pantalla de recuperar acceso
            },
            icon: const Icon(Icons.vpn_key_outlined, size: 14, color: LoginColors.textMuted),
            label: Text(
              '¿Olvidaste tu contraseña o usuario?',
              style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textMuted),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.only(top: 12),
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: Color(0x26E5E5E5))),
          ),
          child: Text(
            '¿Te invitaron a un proyecto? Inicia sesión aquí mismo con el correo y '
            'la contraseña que recibiste por email. No necesitas registrar una empresa.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 12.5, height: 1.5, color: LoginColors.textMuted),
          ),
        ),
      ],
    );
  }

  Widget _buildRegisterPlaceholder() {
    // El registro real en la web es un wizard de 3 pasos (empresa, usuario,
    // seguridad). Se construye aparte en el siguiente paso — este placeholder
    // solo mantiene el tab visualmente completo mientras tanto.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Registro de empresa',
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: LoginColors.accent,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'El formulario de registro (empresa, usuario y seguridad en 3 pasos) '
          'se arma en el siguiente paso.',
          style: GoogleFonts.inter(fontSize: 13, height: 1.6, color: LoginColors.textMuted),
        ),
      ],
    );
  }

  Widget _messageBox(String message, {required bool isError}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError ? LoginColors.errorBg : LoginColors.successBg,
        border: Border.all(color: isError ? LoginColors.errorBorder : LoginColors.successBorder),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        message,
        style: GoogleFonts.inter(
          fontSize: 14,
          color: isError ? LoginColors.errorText : LoginColors.successText,
        ),
      ),
    );
  }

  Widget _fieldLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(fontSize: 14, color: LoginColors.textPrimary),
    );
  }

  Widget _textField({
    required TextEditingController controller,
    required String hint,
    bool obscure = false,
    TextInputType? keyboardType,
    Widget? suffix,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      style: GoogleFonts.inter(fontSize: 15, color: LoginColors.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(fontSize: 15, color: LoginColors.textMuted),
        filled: true,
        fillColor: LoginColors.inputBg,
        suffixIcon: suffix,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: LoginColors.inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: LoginColors.inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: LoginColors.accent, width: 1.5),
        ),
      ),
    );
  }
}