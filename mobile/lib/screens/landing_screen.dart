import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'login_screen.dart';

class FoccusColors {
  static const background = Color(0xFF0A0A12);
  static const surface = Color(0xFF151520);
  static const border = Color(0x2AFFFFFF);
  static const muted = Color(0xB3FFFFFF);
  static const violet = Color(0xFF6A4FCF);
  static const blue = Color(0xFF3B8BEB);
}

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final _scrollController = ScrollController();
  final _homeKey = GlobalKey();
  final _aboutKey = GlobalKey();
  final _servicesKey = GlobalKey();
  final _contactKey = GlobalKey();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _goTo(GlobalKey key) {
    final context = key.currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 550),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _goToLogin() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FoccusColors.background,
      body: Stack(
        children: [
          SingleChildScrollView(
            controller: _scrollController,
            child: Column(
              children: [
                _hero(),
                _heroIntro(),
                _about(),
                _services(),
                _contact(),
                _footer(),
              ],
            ),
          ),
          _navigation(),
        ],
      ),
    );
  }

  Widget _navigation() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Image.asset('assets/foccus_wordmark_white.png', width: 92),
            DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.42),
                border: Border.all(color: FoccusColors.border),
                borderRadius: BorderRadius.circular(30),
              ),
              child: PopupMenuButton<String>(
                icon: const Icon(Icons.menu_rounded, color: Colors.white),
                color: FoccusColors.surface,
                onSelected: (value) {
                  final targets = {
                    'Inicio': _homeKey,
                    'Nosotros': _aboutKey,
                    'Servicios': _servicesKey,
                    'Contacto': _contactKey,
                  };
                  _goTo(targets[value]!);
                },
                itemBuilder: (_) => [
                  for (final label in ['Inicio', 'Nosotros', 'Servicios', 'Contacto'])
                    PopupMenuItem(value: label, child: Text(label)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _hero() {
    final heroHeight = MediaQuery.sizeOf(context).height;

    return Container(
      key: _homeKey,
      height: heroHeight,
      width: double.infinity,
      decoration: const BoxDecoration(
        image: DecorationImage(
          image: AssetImage('assets/landing.jpeg'),
          fit: BoxFit.cover,
          alignment: Alignment.center,
        ),
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 110, 24, 72),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x44101018), Color(0xF20A0A12)],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SizedBox(
              height: heroHeight * 0.52,
              child: Image.asset('assets/foccus_logo_white.png', fit: BoxFit.contain),
            ),
          ],
        ),
      ),
    );
  }

  Widget _heroIntro() {
    return Container(
      width: double.infinity,
      color: FoccusColors.background,
      padding: const EdgeInsets.fromLTRB(24, 56, 24, 70),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'PLATAFORMA DE CONTINUIDAD CINEMATOGRÁFICA',
            style: GoogleFonts.inter(
              fontSize: 10,
              letterSpacing: 2,
              color: FoccusColors.muted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'La plataforma profesional para montar, gestionar y mantener la continuidad de cada proyecto cinematográfico.',
            style: GoogleFonts.inter(
              fontSize: 19,
              height: 1.5,
              color: Colors.white,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 26),
          _gradientButton('Comenzar gratis', _goToLogin),
        ],
      ),
    );
  }

  Widget _about() {
    return _section(
      key: _aboutKey,
      title: 'Quiénes somos',
      subtitle: 'Revolucionando la producción audiovisual en Latinoamérica',
      children: [
        _bodyText('Somos FOCCUS, la plataforma integral que conecta la creatividad con la eficiencia. Visualiza guiones, organiza el desglose y conserva la continuidad visual en una sola herramienta.'),
        const SizedBox(height: 28),
        Row(
          children: [
            Expanded(child: _valueCard('01', 'Precisión con propósito', 'Cada frame cuenta, cada detalle importa.')),
            const SizedBox(width: 12),
            Expanded(child: _valueCard('02', 'Innovación', 'Complejidad técnica, simplicidad de uso.')),
          ],
        ),
      ],
    );
  }

  Widget _services() {
    return _section(
      key: _servicesKey,
      dark: true,
      title: 'Nuestros servicios',
      subtitle: 'Todo el ciclo de producción, en un solo lugar.',
      children: [
        _serviceCard('01', 'Visualización de guiones', 'Formato profesional, versiones y biblioteca de personajes.'),
        _serviceCard('02', 'Desglose de producción', 'Personajes, locaciones, utilería y necesidades técnicas conectadas.'),
        _serviceCard('03', 'Continuidad visual', 'Fotos, notas y comparaciones para mantener cada detalle entre tomas.'),
      ],
    );
  }

  Widget _contact() {
    return _section(
      key: _contactKey,
      title: 'Hablemos',
      subtitle: '¿Listo para revolucionar tu flujo de producción?',
      children: [
        _bodyText('Conoce cómo FOCCUS puede acompañar a tu equipo desde el guion hasta el rodaje.'),
        const SizedBox(height: 22),
        _gradientButton('Empezar ahora', _goToLogin),
      ],
    );
  }

  Widget _section({Key? key, required String title, required String subtitle, required List<Widget> children, bool dark = false}) {
    return Container(
      key: key,
      width: double.infinity,
      color: dark ? const Color(0xFF0D0D16) : FoccusColors.background,
      padding: const EdgeInsets.fromLTRB(24, 70, 24, 70),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.spaceGrotesk(fontSize: 30, fontWeight: FontWeight.w500, color: Colors.white)),
          const SizedBox(height: 10),
          Text(subtitle, style: GoogleFonts.inter(fontSize: 15, height: 1.5, color: FoccusColors.muted)),
          const SizedBox(height: 32),
          ...children,
        ],
      ),
    );
  }

  Widget _valueCard(String number, String title, String description) {
    return _outlinedBox(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _number(number),
        const SizedBox(height: 14),
        Text(title, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
        const SizedBox(height: 8),
        Text(description, style: GoogleFonts.inter(fontSize: 12, height: 1.45, color: FoccusColors.muted)),
      ]),
    );
  }

  Widget _serviceCard(String number, String title, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: _outlinedBox(
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _number(number),
          const SizedBox(width: 18),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
            const SizedBox(height: 8),
            Text(description, style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: FoccusColors.muted)),
          ])),
        ]),
      ),
    );
  }

  Widget _outlinedBox({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.035),
        border: Border.all(color: FoccusColors.border),
        borderRadius: BorderRadius.circular(16),
      ),
      child: child,
    );
  }

  Widget _number(String value) {
    return ShaderMask(
      shaderCallback: (bounds) => const LinearGradient(colors: [FoccusColors.blue, FoccusColors.violet]).createShader(bounds),
      child: Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Colors.white)),
    );
  }

  Widget _bodyText(String text) => Text(text, style: GoogleFonts.inter(fontSize: 15, height: 1.75, color: FoccusColors.muted));

  Widget _gradientButton(String label, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [FoccusColors.blue, FoccusColors.violet]),
          borderRadius: BorderRadius.circular(30),
        ),
        child: ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(backgroundColor: Colors.transparent, shadowColor: Colors.transparent, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 15), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
          child: Text(label, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }

  Widget _footer() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 34, 24, 42),
      child: Column(children: [
        Image.asset('assets/foccus_wordmark_white.png', width: 118),
        const SizedBox(height: 18),
        Text('Hecho en Colombia · © 2026 FOCCUS', style: GoogleFonts.inter(fontSize: 11, color: FoccusColors.muted)),
      ]),
    );
  }
}