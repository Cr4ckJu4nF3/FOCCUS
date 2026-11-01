import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Guarda y notifica el modo de tema (sistema / claro / oscuro).
/// Por defecto es oscuro. Se carga con [ThemeController.init] en main().
class ThemeController {
  const ThemeController._();

  static const _kKey = 'theme_mode';

  static final ValueNotifier<ThemeMode> mode = ValueNotifier(ThemeMode.dark);

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    mode.value = _parse(prefs.getString(_kKey));
  }

  static Future<void> setMode(ThemeMode value) async {
    mode.value = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kKey, value.name);
  }

  /// Alterna claro/oscuro segun lo que se ve ahora (para el boton rapido).
  static Future<void> toggle(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return setMode(isDark ? ThemeMode.light : ThemeMode.dark);
  }

  static ThemeMode _parse(String? name) {
    for (final m in ThemeMode.values) {
      if (m.name == name) return m;
    }
    return ThemeMode.dark;
  }
}

/// Boton sol/luna para las AppBar.
class ThemeToggleButton extends StatelessWidget {
  const ThemeToggleButton({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return IconButton(
      tooltip: isDark ? 'Modo claro' : 'Modo oscuro',
      icon: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        transitionBuilder: (child, anim) =>
            RotationTransition(turns: Tween(begin: 0.75, end: 1.0).animate(anim),
                child: FadeTransition(opacity: anim, child: child)),
        child: Icon(
          isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
          key: ValueKey(isDark),
        ),
      ),
      onPressed: () => ThemeController.toggle(context),
    );
  }
}
