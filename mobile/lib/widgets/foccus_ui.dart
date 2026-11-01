import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/api_config.dart';
import '../screens/login_screen.dart' show LoginColors;

/// Colores que cambian con el tema. Se leen con `context.fc`, por ejemplo
/// `context.fc.surface` o `context.fc.textMuted`. El acento terracota es
/// igual en ambos modos; usa `accentText` para texto pequeno sobre fondo claro.
@immutable
class FoccusColors extends ThemeExtension<FoccusColors> {
  const FoccusColors({
    required this.isDark,
    required this.bg,
    required this.surface,
    required this.surfaceAlt,
    required this.appBar,
    required this.border,
    required this.inputBg,
    required this.inputBorder,
    required this.text,
    required this.textMuted,
    required this.textSubtle,
    required this.accent,
    required this.accentText,
    required this.error,
    required this.errorBg,
    required this.errorBorder,
    required this.success,
    required this.successBg,
    required this.successBorder,
  });

  final bool isDark;
  final Color bg;
  final Color surface;
  final Color surfaceAlt;
  final Color appBar;
  final Color border;
  final Color inputBg;
  final Color inputBorder;
  final Color text;
  final Color textMuted;
  final Color textSubtle;
  final Color accent;
  final Color accentText;
  final Color error;
  final Color errorBg;
  final Color errorBorder;
  final Color success;
  final Color successBg;
  final Color successBorder;

  static const dark = FoccusColors(
    isDark: true,
    bg: Color(0xFF0B0B0F),
    surface: Color(0xFF14181F),
    surfaceAlt: Color(0xFF1A1F27),
    appBar: Color(0xFF0D1116),
    border: Color(0x29FAFAFA),
    inputBg: Color(0xFF0C1015),
    inputBorder: Color(0xFF2A2F38),
    text: Color(0xFFFAFAFA),
    textMuted: Color(0xFF8A94A3),
    textSubtle: Color(0xFF9AA3AF),
    accent: Color(0xFFE67E5C),
    accentText: Color(0xFFE67E5C),
    error: Color(0xFFF87171),
    errorBg: Color(0x33EF4444),
    errorBorder: Color(0x80EF4444),
    success: Color(0xFF86EFAC),
    successBg: Color(0x1F4ADE80),
    successBorder: Color(0x734ADE80),
  );

  static const light = FoccusColors(
    isDark: false,
    bg: Color(0xFFF6F4F1),
    surface: Color(0xFFFFFFFF),
    surfaceAlt: Color(0xFFEFEBE6),
    appBar: Color(0xFFFFFFFF),
    border: Color(0xFFE2DCD5),
    inputBg: Color(0xFFFFFFFF),
    inputBorder: Color(0xFFD0C8BF),
    text: Color(0xFF1B1B1F),
    textMuted: Color(0xFF5F6673),
    textSubtle: Color(0xFF6B7280),
    accent: Color(0xFFE67E5C),
    accentText: Color(0xFFB9502F),
    error: Color(0xFFB91C1C),
    errorBg: Color(0x1FEF4444),
    errorBorder: Color(0x80EF4444),
    success: Color(0xFF15803D),
    successBg: Color(0x1F22C55E),
    successBorder: Color(0x8022C55E),
  );

  @override
  FoccusColors copyWith() => this;

  @override
  FoccusColors lerp(ThemeExtension<FoccusColors>? other, double t) {
    if (other is! FoccusColors) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return FoccusColors(
      isDark: t < 0.5 ? isDark : other.isDark,
      bg: l(bg, other.bg),
      surface: l(surface, other.surface),
      surfaceAlt: l(surfaceAlt, other.surfaceAlt),
      appBar: l(appBar, other.appBar),
      border: l(border, other.border),
      inputBg: l(inputBg, other.inputBg),
      inputBorder: l(inputBorder, other.inputBorder),
      text: l(text, other.text),
      textMuted: l(textMuted, other.textMuted),
      textSubtle: l(textSubtle, other.textSubtle),
      accent: l(accent, other.accent),
      accentText: l(accentText, other.accentText),
      error: l(error, other.error),
      errorBg: l(errorBg, other.errorBg),
      errorBorder: l(errorBorder, other.errorBorder),
      success: l(success, other.success),
      successBg: l(successBg, other.successBg),
      successBorder: l(successBorder, other.successBorder),
    );
  }
}

extension FoccusColorsContext on BuildContext {
  FoccusColors get fc =>
      Theme.of(this).extension<FoccusColors>() ?? FoccusColors.dark;
}

/// Aparicion suave (fade + deslizamiento) con retraso escalonado por [index].
/// No anima si el sistema pide reducir animaciones.
class FadeSlideIn extends StatelessWidget {
  const FadeSlideIn({super.key, required this.child, this.index = 0});

  final Widget child;
  final int index;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    final delay = (index.clamp(0, 8)) * 40;
    final total = 300 + delay;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: total),
      curve: Interval(delay / total, 1, curve: Curves.easeOutCubic),
      builder: (context, v, child) => Opacity(
        opacity: v,
        child: Transform.translate(offset: Offset(0, 16 * (1 - v)), child: child),
      ),
      child: child,
    );
  }
}

/// Reduce un poco el tamano al presionar (feedback tactil). No intercepta
/// los toques: solo escucha el puntero.
class PressScale extends StatefulWidget {
  const PressScale({super.key, required this.child, this.enabled = true});

  final Widget child;
  final bool enabled;

  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
  bool _down = false;

  void _set(bool v) {
    if (widget.enabled && _down != v) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    final animate = !MediaQuery.disableAnimationsOf(context);
    return Listener(
      onPointerDown: (_) => _set(true),
      onPointerUp: (_) => _set(false),
      onPointerCancel: (_) => _set(false),
      child: AnimatedScale(
        scale: _down && animate ? 0.97 : 1,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}

/// Cambia con fade entre estados (cargando / contenido / error / vacio).
/// Cada estado debe tener una `key` distinta.
class FoccusSwitcher extends StatelessWidget {
  const FoccusSwitcher({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final off = MediaQuery.disableAnimationsOf(context);
    return AnimatedSwitcher(
      duration: off ? Duration.zero : const Duration(milliseconds: 250),
      switchInCurve: Curves.easeOut,
      switchOutCurve: Curves.easeIn,
      child: child,
    );
  }
}

/// Transicion de pagina: desvanecido + deslizamiento corto.
class FoccusPageTransitionsBuilder extends PageTransitionsBuilder {
  const FoccusPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
    return FadeTransition(
      opacity: curved,
      child: SlideTransition(
        position: Tween(begin: const Offset(0.06, 0), end: Offset.zero)
            .animate(curved),
        child: child,
      ),
    );
  }
}

/// Medidas compartidas para que toda la app use los mismos radios y
/// espaciados (estilo movil: esquinas redondeadas, zonas tactiles >= 48dp).
class FoccusDims {
  static const double radiusField = 12; // campos y botones
  static const double radiusCard = 16; // tarjetas
  static const double radiusSheet = 24; // hojas inferiores / tarjeta login
  static const double gap = 16; // espaciado base
  static const double buttonHeight = 52;
  static const double fieldHeight = 52;
  static const EdgeInsets page = EdgeInsets.all(16);

  /// Padding para listas: 16 en los lados y espacio extra abajo para que
  /// el FAB y la barra de gestos no tapen el ultimo elemento.
  static const EdgeInsets list = EdgeInsets.fromLTRB(16, 16, 16, 96);
}

/// Boton principal ancho (alto 52, radio 12), con estado de carga.
class FoccusButton extends StatelessWidget {
  const FoccusButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.outlined = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final child = loading
        ? const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
              Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          );
    final action = (loading) ? null : onPressed;
    return PressScale(
      enabled: action != null,
      child: SizedBox(
        width: double.infinity,
        height: FoccusDims.buttonHeight,
        child: outlined
            ? OutlinedButton(onPressed: action, child: child)
            : ElevatedButton(onPressed: action, child: child),
      ),
    );
  }
}

/// Boton flotante "crear" extendido (>= 48dp de alto).
class FoccusFab extends StatelessWidget {
  const FoccusFab({super.key, required this.label, required this.onPressed, this.icon = Icons.add});

  final String label;
  final VoidCallback onPressed;
  final IconData icon;

  @override
  Widget build(BuildContext context) => FloatingActionButton.extended(
        onPressed: onPressed,
        backgroundColor: LoginColors.accent,
        foregroundColor: Colors.white,
        icon: Icon(icon),
        label: Text(label,
            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
      );
}

/// Abre una hoja inferior con bordes redondeados que sube con el teclado.
/// [builder] devuelve el contenido; se envuelve en scroll + padding del
/// teclado para que los campos nunca queden tapados.
Future<T?> showFoccusSheet<T>(
  BuildContext context, {
  required String title,
  required WidgetBuilder builder,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title,
                style: GoogleFonts.inter(
                    fontSize: 20, fontWeight: FontWeight.w700, color: ctx.fc.text)),
            const SizedBox(height: 16),
            builder(ctx),
          ],
        ),
      ),
    ),
  );
}

/// Fondo de pantalla completa (imagen + degradado oscuro) para las
/// pantallas de autenticacion. Scroll + SafeArea para que el teclado no
/// tape los campos.
class AuthBackground extends StatelessWidget {
  const AuthBackground({super.key, required this.child, this.showBack = false});

  final Widget child;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LoginColors.overlayBottom,
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset('assets/login_background.jpeg', fit: BoxFit.cover),
          ),
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xCC081220), Color(0xF2090D12)],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                if (showBack)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      tooltip: 'Volver',
                      icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                      onPressed: () => Navigator.maybePop(context),
                    ),
                  ),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) => SingleChildScrollView(
                      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: constraints.maxHeight - 36),
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 480),
                            child: child,
                          ),
                        ),
                      ),
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
}

/// Tarjeta/hoja redondeada (radio 24) donde van los formularios de auth.
class AuthCard extends StatelessWidget {
  const AuthCard({super.key, required this.child, this.padding = const EdgeInsets.all(20)});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final fc = context.fc;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: fc.isDark ? LoginColors.cardBg : const Color(0xF7FFFFFF),
        borderRadius: BorderRadius.circular(FoccusDims.radiusSheet),
        border: Border.all(color: fc.isDark ? LoginColors.cardBorder : fc.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: fc.isDark ? 0.35 : 0.18),
            offset: const Offset(0, 12),
            blurRadius: 32,
          ),
        ],
      ),
      child: child,
    );
  }
}

/// Mensaje de error / exito con esquinas redondeadas.
class MessageBox extends StatelessWidget {
  const MessageBox(this.message, {super.key, this.isError = true});

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final fc = context.fc;
    final fg = isError ? fc.error : fc.success;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError ? fc.errorBg : fc.successBg,
        border: Border.all(color: isError ? fc.errorBorder : fc.successBorder),
        borderRadius: BorderRadius.circular(FoccusDims.radiusField),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(isError ? Icons.error_outline : Icons.check_circle_outline,
              size: 20, color: fg),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style: GoogleFonts.inter(fontSize: 14, color: fg)),
          ),
        ],
      ),
    );
  }
}

/// Decoracion de campo para auth: icono prefijo, radio 12, alto >= 52.
/// Requiere [context] para tomar el color del tema.
InputDecoration authInput(String hint,
        {IconData? icon, Widget? suffix, BuildContext? context}) =>
    InputDecoration(
      hintText: hint,
      prefixIcon: icon == null
          ? null
          : Icon(icon,
              color: context == null ? LoginColors.textMuted : context.fc.textMuted),
      suffixIcon: suffix,
    );

/// Widgets compartidos por las pantallas de los modulos del proyecto
/// (escenas, galeria, rodaje, desglose, roles) para que se vean igual.
class FoccusScaffold extends StatelessWidget {
  const FoccusScaffold({
    super.key,
    required this.title,
    this.subtitle,
    required this.body,
    this.actions,
    this.floatingActionButton,
  });

  final String title;
  final String? subtitle;
  final Widget body;
  final List<Widget>? actions;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.fc.bg,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                    fontSize: 18, fontWeight: FontWeight.w700)),
            if (subtitle != null && subtitle!.isNotEmpty)
              Text(subtitle!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                      fontSize: 13, color: context.fc.textSubtle)),
          ],
        ),
        actions: actions,
      ),
      floatingActionButton: floatingActionButton,
      body: SafeArea(top: false, child: body),
    );
  }
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) => const Center(
        child: CircularProgressIndicator(color: LoginColors.accent),
      );
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, color: context.fc.error, size: 40),
            const SizedBox(height: 12),
            Text(message,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: context.fc.textMuted)),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Reintentar'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
  });

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: context.fc.textMuted, size: 44),
            const SizedBox(height: 12),
            Text(message,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: context.fc.textMuted)),
          ],
        ),
      ),
    );
  }
}

class FoccusCard extends StatelessWidget {
  const FoccusCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final fc = context.fc;
    return PressScale(
      enabled: onTap != null,
      child: Card(
        color: fc.surface,
        margin: const EdgeInsets.only(bottom: 12),
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
          side: BorderSide(color: fc.border),
        ),
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip(this.label, {super.key, this.color});

  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? LoginColors.accent;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: c.withValues(alpha: 0.5)),
      ),
      child: Text(label,
          style: GoogleFonts.inter(
              fontSize: 12, fontWeight: FontWeight.w600, color: c)),
    );
  }
}

/// Imagen guardada en el backend (ruta relativa /assets/uploads/...).
class FoccusNetworkImage extends StatelessWidget {
  const FoccusNetworkImage(
    this.path, {
    super.key,
    this.height,
    this.width,
    this.fit = BoxFit.cover,
  });

  final String? path;
  final double? height;
  final double? width;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final url = ApiConfig.assetUrl(path);
    final placeholder = Container(
      height: height,
      width: width,
      color: context.fc.surfaceAlt,
      child: Icon(Icons.image_not_supported_outlined,
          color: context.fc.textMuted),
    );
    if (url.isEmpty) return placeholder;
    return Image.network(
      url,
      height: height,
      width: width,
      fit: fit,
      errorBuilder: (_, __, ___) => placeholder,
      loadingBuilder: (context, child, progress) =>
          progress == null ? child : placeholder,
    );
  }
}

void showSnack(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error ? const Color(0xFFB91C1C) : null,
    ));
}

/// Los bordes, relleno y alto vienen del inputDecorationTheme de main.dart.
InputDecoration foccusInput(String label, {String? hint, IconData? icon}) =>
    InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: icon == null ? null : Icon(icon, color: LoginColors.textMuted),
    );
