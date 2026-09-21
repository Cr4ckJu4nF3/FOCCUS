import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/session.dart';
import 'login_screen.dart' show LoginColors;

/// Destino despues del login, equivalente a /seleccion-proyecto en la web.
/// Por ahora es minima a proposito: la pantalla completa de seleccion de
/// proyecto todavia no esta portada a Flutter. Lo que si hace es llamar
/// al endpoint protegido GET /users/{id}/projects — el mismo que usa
/// ProjectSelection.jsx — para confirmar que el JWT guardado funciona.
class ProjectSelectionScreen extends StatefulWidget {
  const ProjectSelectionScreen({super.key});

  @override
  State<ProjectSelectionScreen> createState() => _ProjectSelectionScreenState();
}

class _ProjectSelectionScreenState extends State<ProjectSelectionScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _projects = const [];

  @override
  void initState() {
    super.initState();
    _loadProjects();
  }

  Future<void> _loadProjects() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final idUser = Session.idUser;
      final response = await ApiClient.get('/users/$idUser/projects');
      if (!mounted) return;

      if (response.success) {
        final data = response.body['data'];
        setState(() => _projects = data is List ? data : const []);
      } else {
        setState(() => _error = response.errorMessage('No se pudieron cargar los proyectos'));
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() => _error = 'No se pudo conectar con el servidor');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final nombre = [Session.nombre, Session.apellido]
        .where((p) => p != null && p.isNotEmpty)
        .join(' ');

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A12),
      appBar: AppBar(
        backgroundColor: LoginColors.tabsBg,
        title: Text('Mis proyectos', style: GoogleFonts.inter(fontSize: 17)),
        actions: [
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadProjects,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              nombre.isEmpty ? 'Sesión iniciada' : 'Hola, $nombre',
              style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              Session.mail ?? '',
              style: GoogleFonts.inter(fontSize: 14, color: LoginColors.textMuted),
            ),
            const SizedBox(height: 28),
            if (_loading)
              const Center(child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              ))
            else if (_error != null)
              Text(_error!, style: GoogleFonts.inter(color: LoginColors.errorText))
            else if (_projects.isEmpty)
              Text(
                'Todavía no tienes proyectos asignados.',
                style: GoogleFonts.inter(color: LoginColors.textMuted),
              )
            else
              ..._projects.map(_projectTile),
          ],
        ),
      ),
    );
  }

  Widget _projectTile(dynamic project) {
    final map = project is Map ? project : const {};
    final nombre = (map['nombre'] ?? map['name'] ?? map['id_project'] ?? 'Proyecto').toString();
    final id = (map['id_project'] ?? '').toString();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: LoginColors.cardBg,
        border: Border.all(color: LoginColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(nombre, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600)),
          if (id.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(id, style: GoogleFonts.inter(fontSize: 12, color: LoginColors.textMuted)),
          ],
        ],
      ),
    );
  }
}
