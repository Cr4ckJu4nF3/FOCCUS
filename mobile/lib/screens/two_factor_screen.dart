import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/session.dart';
import 'login_screen.dart' show LoginColors;
import '../widgets/foccus_ui.dart';

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
        rememberMe: Session.rememberMe,
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
    return AuthBackground(
      showBack: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset('assets/login_logo.png', width: 96, height: 96),
          const SizedBox(height: 16),
          _card(),
        ],
      ),
    );
  }

  Widget _card() {
    return AuthCard(
      padding: EdgeInsets.zero,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(FoccusDims.radiusSheet),
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
      padding: const EdgeInsets.all(20),
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
    final fc = context.fc;
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AnimatedSize(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            alignment: Alignment.topCenter,
            child: FoccusSwitcher(
              child: Column(
                key: ValueKey('${_error}_$_reenviado'),
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_error != null) ...[
                    MessageBox(_error!),
                    const SizedBox(height: 16),
                  ],
                  if (_reenviado) ...[
                    const MessageBox('Código reenviado exitosamente',
                        isError: false),
                    const SizedBox(height: 16),
                  ],
                ],
              ),
            ),
          ),
          Text(
            'Código de Verificación',
            style: GoogleFonts.inter(fontSize: 14, color: fc.text),
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
              fontSize: 26,
              letterSpacing: 8,
              color: fc.text,
            ),
            decoration: InputDecoration(
              counterText: '',
              hintText: '000000',
              hintStyle: GoogleFonts.inter(
                fontSize: 26,
                letterSpacing: 8,
                color: fc.textMuted,
              ),
            ),
          ),
          const SizedBox(height: 20),
          FoccusButton(
            label: 'Verificar',
            loading: _loading,
            onPressed: _handleVerify,
          ),
          const SizedBox(height: 8),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TextButton.icon(
                onPressed: () => Navigator.of(context)
                    .pushNamedAndRemoveUntil('/login', (_) => false),
                icon: Icon(Icons.arrow_back, size: 18, color: fc.textMuted),
                label: Text(
                  'Volver al login',
                  style: GoogleFonts.inter(fontSize: 14, color: fc.textMuted),
                ),
              ),
              TextButton(
                onPressed: _handleResend,
                child: Text(
                  'Reenviar código',
                  style: GoogleFonts.inter(fontSize: 14, color: fc.accentText),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
