import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/session.dart';
import '../services/theme_controller.dart';
import '../widgets/foccus_ui.dart';
import 'login_screen.dart' show LoginColors;
import 'project_home_screen.dart';

// Mismas listas fijas que usa ProjectSelection.jsx (formatOptions / genreOptions).
const _formatOptions = [
  'serie',
  'miniserie',
  'pelicula',
  'largometraje',
  'mediometraje',
  'cortometraje',
  'documental',
  'spot publicitario',
  'video musical',
  'video corporativo',
  'video educativo',
  'micro-formato',
  'mockumentary',
];

const _genreOptions = [
  'accion',
  'comedia',
  'aventura',
  'drama',
  'terror',
  'ciencia ficcion',
  'fantasia',
  'suspenso',
  'musical',
  'western',
  'belico',
  'romance',
  'crimen',
  'misterio',
  'animacion',
  'biopic',
  'documental',
  'video',
  'artes marciales',
  'thriller',
  'historico',
  'epoca',
  'familiar',
  'deportivo',
  'horror',
  'paranormal',
  'otro',
];

String _capitalize(String s) =>
    s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';

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

  Future<void> _selectProject(Map project) async {
    final id = (project['id_project'] ?? '').toString();
    final name = (project['project_name'] ?? '').toString();
    await Session.setActiveProject(
      projectId: id,
      projectName: name,
      role: int.tryParse((project['id_rol'] ?? '').toString()),
    );
    if (!mounted) return;
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
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _CreateProjectSheet(),
    );

    if (created != null && mounted) {
      final id = (created['id_project'] ?? '').toString();
      final name = (created['project_name'] ?? '').toString();
      // Quien crea el proyecto es su administrador (1001).
      await Session.setActiveProject(
          projectId: id, projectName: name, role: 1001);
      if (!mounted) return;
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
    final fc = context.fc;
    return Scaffold(
      backgroundColor: fc.bg,
      body: Stack(children: [
        Positioned.fill(
            child: Image.asset('assets/landing.jpeg', fit: BoxFit.cover)),
        Positioned.fill(
            child: DecoratedBox(
                decoration: BoxDecoration(
          gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                fc.bg.withValues(alpha: 0.93),
                fc.bg.withValues(alpha: 0.9),
                fc.bg.withValues(alpha: 0.96),
              ]),
        ))),
        SafeArea(
            child: RefreshIndicator(
                onRefresh: () async {
                  if (_showProjectList) await _fetchProjects();
                },
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  child: Center(
                      child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 760),
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildHeader(),
                                const SizedBox(height: 24),
                                _buildHeading(),
                                if (_error != null) ...[
                                  const SizedBox(height: 16),
                                  _errorBanner(_error!)
                                ],
                                const SizedBox(height: 24),
                                FadeSlideIn(
                                  index: 0,
                                  child: _buildActionCard(
                                      icon: Icons.folder_open_outlined,
                                      title: 'Escoger Proyecto',
                                      subtitle:
                                          'Acceder a un proyecto existente',
                                      active: _showProjectList,
                                      onTap: _toggleProjectList),
                                ),
                                if (_esAdmin) ...[
                                  const SizedBox(height: 12),
                                  FadeSlideIn(
                                    index: 1,
                                    child: _buildActionCard(
                                        icon: Icons.add_circle_outline,
                                        title: 'Crear Proyecto',
                                        subtitle: 'Registrar un nuevo proyecto',
                                        active: false,
                                        onTap: _openCreateSheet),
                                  ),
                                ],
                                if (_showProjectList) ...[
                                  const SizedBox(height: 24),
                                  FadeSlideIn(
                                      index: 2, child: _buildProjectList())
                                ],
                              ]))),
                ))),
      ]),
    );
  }

  Widget _buildHeader() {
    final fc = context.fc;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Image.asset('assets/foccus_wordmark_white.png',
            height: 38,
            fit: BoxFit.contain,
            color: fc.text,
            colorBlendMode: BlendMode.srcIn),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ThemeToggleButton(),
            TextButton.icon(
              onPressed: _logout,
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              icon: Icon(Icons.logout, size: 18, color: fc.textMuted),
              label: Text(
                'Cerrar sesión',
                style: GoogleFonts.inter(fontSize: 14, color: fc.textMuted),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHeading() {
    final fc = context.fc;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.theaters_outlined, color: fc.accentText, size: 30),
        const SizedBox(height: 10),
        Text(
          'Gestión de Proyectos',
          style: GoogleFonts.spaceGrotesk(
            fontSize: 24,
            fontWeight: FontWeight.w600,
            color: fc.text,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Consulta y administra tus proyectos.',
          style: GoogleFonts.inter(fontSize: 14, color: fc.textMuted),
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
    final fc = context.fc;
    return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            constraints: const BoxConstraints(minHeight: 72),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: active ? const Color(0x1FE67E5C) : fc.surface,
              borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
              border: Border.all(
                color: active ? LoginColors.accent : fc.border,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: fc.surfaceAlt,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: fc.text, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: fc.text,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: GoogleFonts.inter(
                            fontSize: 14, color: fc.textMuted),
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
        ));
  }

  Widget _buildProjectList() {
    final fc = context.fc;
    return Container(
      decoration: BoxDecoration(
        color: fc.surface,
        borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
        border: Border.all(color: fc.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Row(
              children: [
                Icon(Icons.movie_outlined, size: 18, color: fc.textMuted),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Proyectos disponibles',
                    style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: fc.text),
                  ),
                ),
                Text(
                  '${_projects.length} proyectos',
                  style: GoogleFonts.inter(fontSize: 13, color: fc.textMuted),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: fc.border),
          FoccusSwitcher(
            child: _loadingProjects
                ? const Padding(
                    key: ValueKey('loading'),
                    padding: EdgeInsets.all(28),
                    child: Center(
                        child: CircularProgressIndicator(
                            color: LoginColors.accent)),
                  )
                : _projects.isEmpty
                    ? Padding(
                        key: const ValueKey('empty'),
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'No hay proyectos disponibles. Crea uno nuevo.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                              fontSize: 14, color: fc.textMuted),
                        ),
                      )
                    : Column(
                        key: const ValueKey('list'),
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (var i = 0; i < _projects.length; i++)
                            FadeSlideIn(
                                index: i,
                                child: _projectTile(_projects[i] as Map)),
                        ],
                      ),
          ),
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

    final fc = context.fc;
    return InkWell(
      onTap: () => _selectProject(project),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0x1FE67E5C),
                borderRadius: BorderRadius.circular(9),
              ),
              child:
                  Icon(Icons.theaters_outlined, size: 18, color: fc.accentText),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    nombre,
                    style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: fc.text),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (meta.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      meta,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style:
                          GoogleFonts.inter(fontSize: 13, color: fc.textMuted),
                    ),
                  ],
                ],
              ),
            ),
            Icon(Icons.chevron_right, size: 20, color: fc.textMuted),
          ],
        ),
      ),
    );
  }

  Widget _errorBanner(String message) {
    final fc = context.fc;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: fc.errorBg,
        border: Border.all(color: fc.errorBorder),
        borderRadius: BorderRadius.circular(FoccusDims.radiusField),
      ),
      child: Text(message,
          style: GoogleFonts.inter(fontSize: 14, color: fc.error)),
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
        setState(
            () => _error = response.errorMessage('Error al crear el proyecto'));
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
    final fc = context.fc;
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: fc.surface.withValues(alpha: 1),
          borderRadius: const BorderRadius.vertical(
              top: Radius.circular(FoccusDims.radiusSheet)),
          border: Border(top: BorderSide(color: fc.border)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
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
                              fontSize: 13,
                              letterSpacing: 0.8,
                              color: fc.accentText,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            'Crear Proyecto',
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 19,
                              fontWeight: FontWeight.w600,
                              color: fc.text,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        tooltip: 'Cerrar',
                        icon: Icon(Icons.close, color: fc.textMuted),
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
                                color: fc.errorBg,
                                border: Border.all(color: fc.errorBorder),
                                borderRadius: BorderRadius.circular(
                                    FoccusDims.radiusField),
                              ),
                              child: Text(
                                _error!,
                                style: GoogleFonts.inter(
                                    fontSize: 14, color: fc.error),
                              ),
                            ),
                          ],
                          const SizedBox(height: 14),
                          _label('Nombre del Proyecto'),
                          const SizedBox(height: 6),
                          _textField(
                            controller: _nombreCtrl,
                            hint:
                                'Nombre de la serie, película u otro proyecto',
                            validator: (v) => (v == null || v.trim().isEmpty)
                                ? 'Requerido'
                                : null,
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
                            hint:
                                'Detalle de lo que trata el producto audiovisual',
                            maxLines: 3,
                          ),
                          const SizedBox(height: 16),
                          _label('Director'),
                          const SizedBox(height: 6),
                          _textField(
                            controller: _directorCtrl,
                            hint:
                                'Director o directores del producto audiovisual',
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
                            foregroundColor: fc.text,
                            side: BorderSide(color: fc.inputBorder),
                            minimumSize: const Size.fromHeight(52),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(
                                    FoccusDims.radiusField)),
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
                            disabledBackgroundColor:
                                LoginColors.accent.withValues(alpha: 0.5),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            minimumSize: const Size.fromHeight(52),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(
                                    FoccusDims.radiusField)),
                          ),
                          child:
                              Text(_loading ? 'Creando...' : 'Crear Proyecto'),
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
        style: GoogleFonts.inter(fontSize: 14, color: context.fc.text),
      );

  InputDecoration _fieldDecoration({String? hint, bool withError = false}) {
    final fc = context.fc;
    OutlineInputBorder border(Color color, [double width = 1]) =>
        OutlineInputBorder(
          borderRadius: BorderRadius.circular(FoccusDims.radiusField),
          borderSide: BorderSide(color: color, width: width),
        );
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(fontSize: 14, color: fc.textMuted),
      filled: true,
      fillColor: fc.inputBg,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      border: border(fc.inputBorder),
      enabledBorder: border(fc.inputBorder),
      focusedBorder: border(LoginColors.accent, 1.5),
      errorBorder: withError ? border(fc.errorBorder, 1.2) : null,
    );
  }

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
      style: GoogleFonts.inter(fontSize: 14, color: context.fc.text),
      decoration: _fieldDecoration(hint: hint, withError: true),
    );
  }

  Widget _dropdown({
    required String? value,
    required String hint,
    required List<String> options,
    required void Function(String?) onChanged,
  }) {
    final fc = context.fc;
    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      dropdownColor: fc.surfaceAlt,
      style: GoogleFonts.inter(fontSize: 14, color: fc.text),
      decoration: _fieldDecoration(),
      hint: Text(hint,
          style: GoogleFonts.inter(fontSize: 14, color: fc.textMuted)),
      items: options
          .map((o) => DropdownMenuItem(value: o, child: Text(_capitalize(o))))
          .toList(),
      onChanged: onChanged,
      validator: (v) => v == null ? 'Requerido' : null,
    );
  }
}
