import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'login_screen.dart' show LoginColors;

/// Destino temporal despues de escoger/crear un proyecto, equivalente a
/// /proyecto-dashboard en la web. El dashboard completo (menu de Guion,
/// Escenas, Rodaje, Desglose, etc.) todavia no esta portado a Flutter -
/// esta pantalla solo confirma que la navegacion y el projectId llegaron
/// bien, como paso intermedio antes de construir el dashboard real.
class ProjectHomeScreen extends StatelessWidget {
  const ProjectHomeScreen({
    super.key,
    required this.projectId,
    required this.projectName,
  });

  final String projectId;
  final String projectName;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A12),
      appBar: AppBar(
        backgroundColor: LoginColors.tabsBg,
        title: Text(projectName, style: GoogleFonts.inter(fontSize: 17)),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.movie_creation_outlined, size: 48, color: LoginColors.accent),
              const SizedBox(height: 16),
              Text(
                projectName,
                textAlign: TextAlign.center,
                style: GoogleFonts.spaceGrotesk(fontSize: 20, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              Text(
                projectId,
                style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textMuted),
              ),
              const SizedBox(height: 20),
              Text(
                'Dashboard del proyecto — próximo paso a construir.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 14, color: LoginColors.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}