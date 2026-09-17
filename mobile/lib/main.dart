import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/landing_screen.dart';

void main() {
  runApp(const FoccusApp());
}

class FoccusApp extends StatelessWidget {
  const FoccusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
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
      home: const LandingScreen(),
    );
  }
}