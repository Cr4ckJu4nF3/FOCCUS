import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/landing_screen.dart';
import 'screens/login_screen.dart' show LoginColors;
import 'screens/project_selection_screen.dart';
import 'services/api_client.dart';
import 'services/session.dart';
import 'services/theme_controller.dart';
import 'widgets/foccus_ui.dart'
    show FoccusColors, FoccusDims, FoccusPageTransitionsBuilder;

Future<void> main() async {
  // Necesario para poder usar SharedPreferences (Session.init) antes de
  // que corra runApp.
  WidgetsFlutterBinding.ensureInitialized();

  // Sin esto, cualquier pantalla que toque Session (login, register, 2FA,
  // project_selection...) explota con
  // "StateError: Session.init() no fue llamado antes de usar la sesion"
  // apenas el usuario presiona el boton, y la peticion nunca llega a
  // salir hacia el backend.
  await Session.init();
  await ThemeController.init();
  final sesionActiva = await Session.restoreSession();

  runApp(FoccusApp(sesionActiva: sesionActiva));
}

/// Tema movil unico de la app: campos grandes (>=52) con radio 12, botones
/// de 52 de alto, tarjetas y hojas inferiores redondeadas. Acento terracota.
ThemeData _buildTheme(Brightness brightness) {
  const accent = LoginColors.accent;
  final fc = brightness == Brightness.dark ? FoccusColors.dark : FoccusColors.light;
  final isDark = fc.isDark;
  final base = isDark ? ThemeData.dark() : ThemeData.light();
  final textTheme =
      GoogleFonts.interTextTheme(base.textTheme).apply(
    bodyColor: fc.text,
    displayColor: fc.text,
  );
  final fieldRadius = BorderRadius.circular(FoccusDims.radiusField);

  OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
        borderRadius: fieldRadius,
        borderSide: BorderSide(color: c, width: w),
      );

  final buttonShape = RoundedRectangleBorder(borderRadius: fieldRadius);
  final buttonText =
      GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600);

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: fc.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: accent,
      brightness: brightness,
      surface: fc.surface,
    ).copyWith(
      primary: isDark ? accent : fc.accentText,
      onPrimary: Colors.white,
      onSurface: fc.text,
      error: fc.error,
    ),
    extensions: [fc],
    textTheme: textTheme,
    visualDensity: VisualDensity.standard,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    pageTransitionsTheme: const PageTransitionsTheme(builders: {
      TargetPlatform.android: FoccusPageTransitionsBuilder(),
      TargetPlatform.iOS: FoccusPageTransitionsBuilder(),
      TargetPlatform.windows: FoccusPageTransitionsBuilder(),
      TargetPlatform.macOS: FoccusPageTransitionsBuilder(),
      TargetPlatform.linux: FoccusPageTransitionsBuilder(),
      TargetPlatform.fuchsia: FoccusPageTransitionsBuilder(),
    }),
    dividerColor: fc.border,
    appBarTheme: AppBarTheme(
      backgroundColor: fc.appBar,
      foregroundColor: fc.text,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.inter(
          fontSize: 18, fontWeight: FontWeight.w700, color: fc.text),
    ),
    cardTheme: CardThemeData(
      color: fc.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
        side: BorderSide(color: fc.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: fc.inputBg,
      isDense: false,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      hintStyle: GoogleFonts.inter(fontSize: 15, color: fc.textMuted),
      labelStyle: GoogleFonts.inter(fontSize: 15, color: fc.textMuted),
      errorStyle: GoogleFonts.inter(fontSize: 12.5, color: fc.error),
      border: border(fc.inputBorder),
      enabledBorder: border(fc.inputBorder),
      focusedBorder: border(accent, 1.5),
      errorBorder: border(fc.errorBorder),
      focusedErrorBorder: border(fc.error, 1.5),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: accent,
        foregroundColor: Colors.white,
        disabledBackgroundColor: accent.withValues(alpha: 0.45),
        disabledForegroundColor: Colors.white70,
        minimumSize: const Size(64, FoccusDims.buttonHeight),
        elevation: 0,
        shape: buttonShape,
        textStyle: buttonText,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: accent,
        foregroundColor: Colors.white,
        minimumSize: const Size(64, FoccusDims.buttonHeight),
        shape: buttonShape,
        textStyle: buttonText,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: fc.text,
        minimumSize: const Size(64, FoccusDims.buttonHeight),
        side: BorderSide(color: fc.inputBorder),
        shape: buttonShape,
        textStyle: buttonText,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: fc.accentText,
        minimumSize: const Size(48, 48),
        shape: buttonShape,
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: accent,
      foregroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: fc.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      dragHandleColor: fc.textMuted.withValues(alpha: 0.5),
      clipBehavior: Clip.antiAlias,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(FoccusDims.radiusSheet)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: fc.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(FoccusDims.radiusSheet),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: fieldRadius),
    ),
    listTileTheme: const ListTileThemeData(minVerticalPadding: 8),
    checkboxTheme: CheckboxThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
    ),
  );
}

class FoccusApp extends StatelessWidget {
  const FoccusApp({super.key, this.sesionActiva = false});

  final bool sesionActiva;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.mode,
      builder: (context, mode, _) => MaterialApp(
        navigatorKey: appNavigatorKey,
        title: 'FOCCUS',
        debugShowCheckedModeBanner: false,
        theme: _buildTheme(Brightness.light),
        darkTheme: _buildTheme(Brightness.dark),
        themeMode: mode,
        themeAnimationDuration: const Duration(milliseconds: 300),
        routes: {
          '/login': (_) => const LandingScreen(),
          '/seleccion-proyecto': (_) => const ProjectSelectionScreen(),
        },
        home: sesionActiva
            ? const ProjectSelectionScreen()
            : const LandingScreen(),
      ),
    );
  }
}