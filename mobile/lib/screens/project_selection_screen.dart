import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/session.dart';
import 'login_screen.dart' show LoginColors;
import 'project_home_screen.dart';

// Mismas listas fijas que usa ProjectSelection.jsx (formatOptions / genreOptions).
const _formatOptions = [
  'serie', 'miniserie', 'pelicula', 'largometraje', 'mediometraje', 'cortometraje',
  'documental', 'spot publicitario', 'video musical', 'video corporativo',
  'video educativo', 'micro-formato', 'mockumentary',
];

const _genreOptions = [
  'accion', 'comedia', 'aventura', 'drama', 'terror', 'ciencia ficcion',
  'fantasia', 'suspenso', 'musical', 'western', 'belico', 'romance',
  'crimen', 'misterio', 'animacion', 'biopic', 'documental', 'video',
  'artes marciales', 'thriller', 'historico', 'epoca', 'familiar',
  'deportivo', 'horror', 'paranormal', 'otro',
];

String _capitalize(String s) => s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';

/// Equivalente a ProjectSelectionScreen (/seleccion-proyecto en la web):
/// escoger un proyecto existente o crear uno nuevo (solo admin).
class ProjectSelectionScreen extends StatefulWidget {
  const ProjectSelectionScreen({super.key});

  @override
  State<ProjectSelectionScreen> createState() => _ProjectSelectionScreenState();
}

class _ProjectSelectionScreenState extends State<ProjectSelectionScreen> {
  bool _showProjectList = false;
  bool _loadingProjects = false;
  List<dynamic> _projects = const [];
  String? _error;

  bool get _esAdmin => Session.idRol == '1001';

  Future<void> _fetchProjects() async {
    setState(() {
      _loadingProjects = true;
      _error = null;
    });

    try {
      final idUser = Session.idUser;
      final response = await ApiClient.get('/users/$idUser/projects');
      if (!mounted) return;

      if (response.ok) {
        final data = response.body['data'] ?? response.body;
        setState(() => _projects = data is List ? data : const []);
      } else {
        setState(() => _error = 'Error al cargar los proyectos');
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() => _error = 'No se pudo conectar con el servidor');
    } finally {
      if (mounted) setState(() => _loadingProjects = false);
    }
  }

  void _toggleProjectList() {
    final opening = !_showProjectList;
    setState(() => _showProjectList = opening);
    if (opening) _fetchProjects();
  }

  void _selectProject(Map project) {
    final id = (project['id_project'] ?? '').toString();
    final name = (project['project_name'] ?? '').toString();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProjectHomeScreen(projectId: id, projectName: name),
      ),
    );
  }

  Future<void> _openCreateSheet() async {
    final created = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _CreateProjectSheet(),
    );

    if (created != null && mounted) {
      final id = (created['id_project'] ?? '').toString();
      final name = (created['project_name'] ?? '').toString();
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ProjectHomeScreen(projectId: id, projectName: name),
        ),
      );
    }
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A12),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: 28),
              _buildHeading(),
              if (_error != null) ...[
                const SizedBox(height: 16),
                _errorBanner(_error!),
              ],
              const SizedBox(height: 24),
              _buildActionCard(
                icon: Icons.folder_open_outlined,
                title: 'Escoger Proyecto',
                subtitle: 'Acceder a un proyecto existente',
                active: _showProjectList,
                onTap: _toggleProjectList,
              ),
              if (_esAdmin) ...[
                const SizedBox(height: 12),
                _buildActionCard(
                  icon: Icons.add_circle_outline,
                  title: 'Crear Proyecto',
                  subtitle: 'Registrar un nuevo proyecto',
                  active: false,
                  onTap: _openCreateSheet,
                ),
              ],
              if (_showProjectList) ...[
                const SizedBox(height: 24),
                _buildProjectList(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'FOCCUS',
          style: GoogleFonts.spaceGrotesk(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
            color: LoginColors.textPrimary,
          ),
        ),
        TextButton.icon(
          onPressed: _logout,
          icon: const Icon(Icons.logout, size: 16, color: LoginColors.textMuted),
          label: Text(
            'Cerrar sesión',
            style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textMuted),
          ),
        ),
      ],
    );
  }

  Widget _buildHeading() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.theaters_outlined, color: LoginColors.accent, size: 30),
        const SizedBox(height: 10),
        Text(
          'Gestión de Proyectos',
          style: GoogleFonts.spaceGrotesk(
            fontSize: 24,
            fontWeight: FontWeight.w600,
            color: LoginColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Consulte tus proyectos.',
          style: GoogleFonts.inter(fontSize: 14, color: LoginColors.textMuted),
        ),
      ],
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool active,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: active
              ? const Color(0x1FE67E5C)
              : const Color(0xE0111419),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: active ? LoginColors.accent : const Color(0x1FFAFAFA),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0x14FAFAFA),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: LoginColors.textPrimary, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: LoginColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(fontSize: 12.5, color: LoginColors.textMuted),
                  ),
                ],
              ),
            ),
            if (active)
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: LoginColors.accent,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildProjectList() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xE0111419),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x1FFAFAFA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Row(
              children: [
                const Icon(Icons.movie_outlined, size: 18, color: LoginColors.textMuted),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Proyectos disponibles',
                    style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600),
                  ),
                ),
                Text(
                  '${_projects.length} proyectos',
                  style: GoogleFonts.inter(fontSize: 12, color: LoginColors.textMuted),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0x1FFAFAFA)),
          if (_loadingProjects)
            const Padding(
              padding: EdgeInsets.all(28),
              child: Center(child: CircularProgressIndicator(color: LoginColors.accent)),
            )
          else if (_projects.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'No hay proyectos disponibles. Crea uno nuevo.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textMuted),
              ),
            )
          else
            ..._projects.map((p) => _projectTile(p as Map)),
        ],
      ),
    );
  }

  Widget _projectTile(Map project) {
    final nombre = (project['project_name'] ?? 'Proyecto').toString();
    final formato = (project['formato_de_produccion'] ?? '').toString();
    final genero = (project['genero'] ?? '').toString();
    final director = (project['director'] ?? '').toString();

    final meta = [
      if (formato.isNotEmpty) _capitalize(formato),
      if (genero.isNotEmpty) _capitalize(genero),
      if (director.isNotEmpty) 'Dir. $director',
    ].join(' · ');

    return InkWell(
      onTap: () => _selectProject(project),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: const Color(0x1FE67E5C),
                borderRadius: BorderRadius.circular(9),
              ),
              child: const Icon(Icons.theaters_outlined, size: 18, color: LoginColors.accent),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    nombre,
                    style: GoogleFonts.inter(fontSize: 14.5, fontWeight: FontWeight.w600),
                  ),
                  if (meta.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      meta,
                      style: GoogleFonts.inter(fontSize: 12, color: LoginColors.textMuted),
                    ),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 20, color: LoginColors.textMuted),
          ],
        ),
      ),
    );
  }

  Widget _errorBanner(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: LoginColors.errorBg,
        border: Border.all(color: LoginColors.errorBorder),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(message, style: GoogleFonts.inter(fontSize: 13.5, color: LoginColors.errorText)),
    );
  }
}

// ==========================================
// HOJA PARA CREAR PROYECTO (equivalente al modal pss-modal de la web)
// ==========================================
class _CreateProjectSheet extends StatefulWidget {
  const _CreateProjectSheet();

  @override
  State<_CreateProjectSheet> createState() => _CreateProjectSheetState();
}

class _CreateProjectSheetState extends State<_CreateProjectSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nombreCtrl = TextEditingController();
  final _sinopsisCtrl = TextEditingController();
  final _directorCtrl = TextEditingController();
  String? _formato;
  String? _genero;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _sinopsisCtrl.dispose();
    _directorCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final idClient = int.tryParse(Session.idClient ?? '') ?? 1;
      final idUser = int.tryParse(Session.idUser ?? '') ?? 0;

      final response = await ApiClient.post('/projects/create', body: {
        'project_name': _nombreCtrl.text.trim(),
        'formato_de_produccion': _formato,
        'genero': _genero,
        'sinopsis': _sinopsisCtrl.text.trim(),
        'director': _directorCtrl.text.trim(),
        'id_client': idClient,
        'id_user': idUser,
      });

      if (!mounted) return;

      if (response.ok) {
        final data = response.body['data'];
        final result = <String, dynamic>{
          'id_project': data is Map ? data['id_project'] : null,
          'project_name': _nombreCtrl.text.trim(),
        };
        Navigator.of(context).pop(result);
      } else {
        setState(() => _error = response.errorMessage('Error al crear el proyecto'));
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() => _error = 'No se pudo conectar con el servidor');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF14171B),
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          border: Border(top: BorderSide(color: Color(0x29FAFAFA))),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'NUEVO REGISTRO',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              letterSpacing: 0.8,
                              color: LoginColors.accent,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            'Crear Proyecto',
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 19,
                              fontWeight: FontWeight.w600,
                              color: LoginColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close, color: LoginColors.textMuted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.6,
                    ),
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (_error != null) ...[
                            const SizedBox(height: 8),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: LoginColors.errorBg,
                                border: Border.all(color: LoginColors.errorBorder),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                _error!,
                                style: GoogleFonts.inter(fontSize: 13, color: LoginColors.errorText),
                              ),
                            ),
                          ],
                          const SizedBox(height: 14),
                          _label('Nombre del Proyecto'),
                          const SizedBox(height: 6),
                          _textField(
                            controller: _nombreCtrl,
                            hint: 'Nombre de la serie, película u otro proyecto',
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                          ),
                          const SizedBox(height: 16),
                          _label('Formato'),
                          const SizedBox(height: 6),
                          _dropdown(
                            value: _formato,
                            hint: 'Selecciona formato',
                            options: _formatOptions,
                            onChanged: (v) => setState(() => _formato = v),
                          ),
                          const SizedBox(height: 16),
                          _label('Género'),
                          const SizedBox(height: 6),
                          _dropdown(
                            value: _genero,
                            hint: 'Selecciona género',
                            options: _genreOptions,
                            onChanged: (v) => setState(() => _genero = v),
                          ),
                          const SizedBox(height: 16),
                          _label('Sinopsis'),
                          const SizedBox(height: 6),
                          _textField(
                            controller: _sinopsisCtrl,
                            hint: 'Detalle de lo que trata el producto audiovisual',
                            maxLines: 3,
                          ),
                          const SizedBox(height: 16),
                          _label('Director'),
                          const SizedBox(height: 6),
                          _textField(
                            controller: _directorCtrl,
                            hint: 'Director o directores del producto audiovisual',
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.of(context).pop(),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: LoginColors.textPrimary,
                            side: const BorderSide(color: LoginColors.inputBorder),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
                          ),
                          child: const Text('Cancelar'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _loading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: LoginColors.accent,
                            disabledBackgroundColor: LoginColors.accent.withValues(alpha: 0.5),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
                          ),
                          child: Text(_loading ? 'Creando...' : 'Crear Proyecto'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
        text,
        style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textPrimary),
      );

  Widget _textField({
    required TextEditingController controller,
    required String hint,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validator,
      style: GoogleFonts.inter(fontSize: 14, color: LoginColors.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(fontSize: 13, color: LoginColors.textMuted),
        filled: true,
        fillColor: LoginColors.inputBg,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: LoginColors.errorBorder, width: 1.2),
        ),
      ),
    );
  }

  Widget _dropdown({
    required String? value,
    required String hint,
    required List<String> options,
    required void Function(String?) onChanged,
  }) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      dropdownColor: const Color(0xFF14171B),
      style: GoogleFonts.inter(fontSize: 14, color: LoginColors.textPrimary),
      decoration: InputDecoration(
        filled: true,
        fillColor: LoginColors.inputBg,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
      hint: Text(hint, style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textMuted)),
      items: options
          .map((o) => DropdownMenuItem(value: o, child: Text(_capitalize(o))))
          .toList(),
      onChanged: onChanged,
      validator: (v) => v == null ? 'Requerido' : null,
    );
  }
}