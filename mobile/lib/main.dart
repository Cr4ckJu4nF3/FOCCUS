import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/landing_screen.dart';
import 'screens/project_selection_screen.dart';
import 'services/api_client.dart';
import 'services/session.dart';

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

  runApp(const FoccusApp());
}

class FoccusApp extends StatelessWidget {
  const FoccusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: appNavigatorKey,
      title: 'FOCCUS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0B0F),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7B5FCF),
          brightness: Brightness.dark,
          surface: const Color(0xFF16161B),
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      ),
      routes: {
        '/login': (_) => const LandingScreen(),
        '/seleccion-proyecto': (_) => const ProjectSelectionScreen(),
      },
      home: const LandingScreen(),
    );
  }
}