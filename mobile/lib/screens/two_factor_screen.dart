import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';
import 'login_screen.dart' show LoginColors;

/// Equivalente movil de frontend/src/screen/TwoFactor.jsx.
/// Mismos endpoints (/users/2fa/verify y /users/2fa/send) y mismos
/// colores que TwoFactor.css (degradado azul -> terracota en el header).
class TwoFactorScreen extends StatefulWidget {
  const TwoFactorScreen({super.key, required this.mail});

  final String mail;

  @override
  State<TwoFactorScreen> createState() => _TwoFactorScreenState();
}

class _TwoFactorScreenState extends State<TwoFactorScreen> {
  final _codigoController = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _reenviado = false;

  @override
  void dispose() {
    _codigoController.dispose();
    super.dispose();
  }

  Future<void> _handleVerify() async {
    if (_loading) return;
    setState(() {
      _error = null;
      _loading = true;
    });

    try {
      final result = await AuthService.verify2faCode(
        widget.mail,
        _codigoController.text,
      );
      if (!mounted) return;

      if (result.outcome == LoginOutcome.authenticated) {
        Navigator.of(context)
            .pushNamedAndRemoveUntil('/seleccion-proyecto', (_) => false);
        return;
      }
      setState(() => _error = result.message ?? 'Código incorrecto o expirado');
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() => _error = 'No se pudo conectar con el servidor');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleResend() async {
    setState(() {
      _error = null;
      _reenviado = false;
    });

    try {
      final response = await AuthService.send2faCode(widget.mail);
      if (!mounted) return;

      if (response.success) {
        setState(() => _reenviado = true);
        await Future<void>.delayed(const Duration(seconds: 3));
        if (mounted) setState(() => _reenviado = false);
      } else {
        setState(() =>
            _error = response.errorMessage('Error al reenviar el código'));
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() => _error = 'No se pudo conectar con el servidor');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LoginColors.overlayBottom,
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset('assets/login_background.jpeg', fit: BoxFit.cover),
          ),
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
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
                      Image.asset('assets/login_logo.png', width: 116, height: 116),
                      const SizedBox(height: 24),
                      _card(),
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

  Widget _card() {
    return Container(
      decoration: BoxDecoration(
        color: LoginColors.cardBg,
        borderRadius: BorderRadius.circular(2),
        border: Border.all(color: LoginColors.cardBorder),
        boxShadow: [
          const BoxShadow(
            color: Color(0x73060B12),
            offset: Offset(14, 14),
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
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [_header(), _content()],
        ),
      ),
    );
  }

  Widget _header() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [LoginColors.linkHover, LoginColors.accent],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.shield_outlined, size: 20, color: Color(0xCCFFFFFF)),
              const SizedBox(width: 12),
              Text(
                'VERIFICACIÓN DE SEGURIDAD',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                  color: const Color(0x99FFFFFF),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Doble Factor de Autenticación',
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text.rich(
            TextSpan(
              text: 'Hemos enviado un código de verificación a ',
              children: [
                TextSpan(
                  text: widget.mail,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            style: GoogleFonts.inter(
              fontSize: 14,
              height: 1.6,
              color: const Color(0xB3FFFFFF),
            ),
          ),
        ],
      ),
    );
  }

  Widget _content() {
    return Padding(
      padding: const EdgeInsets.all(26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null) ...[
            _messageBox(_error!, isError: true),
            const SizedBox(height: 16),
          ],
          if (_reenviado) ...[
            _messageBox('Código reenviado exitosamente', isError: false),
            const SizedBox(height: 16),
          ],
          Text(
            'Código de Verificación',
            style: GoogleFonts.inter(fontSize: 14, color: LoginColors.textPrimary),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _codigoController,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            maxLength: 6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            onSubmitted: (_) => _handleVerify(),
            style: GoogleFonts.inter(
              fontSize: 24,
              letterSpacing: 7,
              color: LoginColors.textPrimary,
            ),
            decoration: InputDecoration(
              counterText: '',
              hintText: '000000',
              hintStyle: GoogleFonts.inter(
                fontSize: 24,
                letterSpacing: 7,
                color: LoginColors.textMuted,
              ),
              filled: true,
              fillColor: LoginColors.inputBg,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
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
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 46,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [LoginColors.accent, LoginColors.linkHover],
                ),
                borderRadius: BorderRadius.circular(2),
              ),
              child: ElevatedButton(
                onPressed: _loading ? null : _handleVerify,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  disabledBackgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                child: _loading
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Verificando...',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      )
                    : Text(
                        'Verificar',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton.icon(
                onPressed: () => Navigator.of(context)
                    .pushNamedAndRemoveUntil('/login', (_) => false),
                icon: const Icon(Icons.arrow_back, size: 16, color: LoginColors.textMuted),
                label: Text(
                  'Volver al login',
                  style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textMuted),
                ),
              ),
              TextButton(
                onPressed: _handleResend,
                child: Text(
                  'Reenviar código',
                  style: GoogleFonts.inter(fontSize: 13, color: LoginColors.accent),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _messageBox(String message, {required bool isError}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError ? LoginColors.errorBg : LoginColors.successBg,
        border: Border.all(
          color: isError ? LoginColors.errorBorder : LoginColors.successBorder,
        ),
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
}
