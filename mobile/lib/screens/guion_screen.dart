import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/session.dart';
import 'login_screen.dart' show LoginColors;

const _versionStates = [
  'Borrador',
  'Revision',
  'Aprobado',
  'En Rodaje',
  'Archivado'
];

class GuionScreen extends StatefulWidget {
  const GuionScreen({
    super.key,
    required this.projectId,
    required this.projectName,
  });

  final String projectId;
  final String projectName;

  @override
  State<GuionScreen> createState() => _GuionScreenState();
}

class _GuionScreenState extends State<GuionScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _contentController = TextEditingController();
  final _versionContentController = TextEditingController();
  final _commentController = TextEditingController();

  List<dynamic> _scripts = const [];
  List<dynamic> _versions = const [];
  Map<String, dynamic>? _activeScript;
  bool _loading = true;
  bool _loadingVersions = false;
  bool _saving = false;
  bool _creatingVersion = false;
  String? _error;
  String? _success;
  String _view = 'list';
  String _versionState = 'Borrador';

  bool get _isAdmin => Session.idRol == '1001';

  @override
  void initState() {
    super.initState();
    _loadScripts();
  }

  @override
  void dispose() {
    for (final controller in [
      _titleController,
      _descriptionController,
      _contentController,
      _versionContentController,
      _commentController,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadScripts() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response =
          await ApiClient.get('/guiones?id_project=${widget.projectId}');
      if (!mounted) return;
      if (response.ok) {
        final data = response.body['data'];
        setState(() => _scripts = data is List ? data : const []);
      } else {
        setState(() => _error =
            response.errorMessage('No se pudieron cargar los guiones'));
      }
    } on ApiConnectionException {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openScript(Map<String, dynamic> script) async {
    setState(() {
      _activeScript = script;
      _view = 'detail';
      _versions = const [];
      _error = null;
    });
    await _loadVersions(script['id_guion']);
  }

  Future<void> _loadVersions(dynamic scriptId) async {
    setState(() => _loadingVersions = true);
    try {
      final response = await ApiClient.get('/guiones/$scriptId/versiones');
      if (!mounted) return;
      if (response.ok) {
        final data = response.body['data'];
        setState(() => _versions = data is List ? data : const []);
      } else {
        setState(() => _error =
            response.errorMessage('No se pudieron cargar las versiones'));
      }
    } on ApiConnectionException {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor');
      }
    } finally {
      if (mounted) setState(() => _loadingVersions = false);
    }
  }

  Future<void> _createScript() async {
    if (_titleController.text.trim().isEmpty ||
        _contentController.text.trim().isEmpty) {
      setState(
          () => _error = 'El título y el contenido del guion son obligatorios');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
      _success = null;
    });
    try {
      final response = await ApiClient.post('/guiones/texto', body: {
        'nombre': _titleController.text.trim(),
        'descripcion': _descriptionController.text.trim(),
        'id_project': widget.projectId,
        'contenido': _contentController.text,
        'fecha_de_emision': _today(),
        'estado': 'Borrador',
      });
      if (!mounted) return;
      if (response.ok && response.success) {
        _clearComposer();
        setState(() {
          _view = 'list';
          _success = 'Guion creado correctamente';
        });
        await _loadScripts();
      } else {
        setState(
            () => _error = response.errorMessage('No se pudo crear el guion'));
      }
    } on ApiConnectionException {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _createVersion() async {
    final scriptId = _activeScript?['id_guion'];
    if (scriptId == null || _versionContentController.text.trim().isEmpty) {
      setState(() => _error = 'Escribe el contenido de la nueva versión');
      return;
    }
    setState(() {
      _creatingVersion = true;
      _error = null;
      _success = null;
    });
    try {
      final response =
          await ApiClient.post('/guiones/$scriptId/versiones/texto', body: {
        'contenido': _versionContentController.text,
        'fecha_de_emision': _today(),
        'estado': _versionState,
        'comentario_cambio': _commentController.text.trim(),
      });
      if (!mounted) return;
      if (response.ok && response.success) {
        _versionContentController.clear();
        _commentController.clear();
        setState(() => _success = 'Versión guardada correctamente');
        await _loadVersions(scriptId);
        await _loadScripts();
      } else {
        setState(() =>
            _error = response.errorMessage('No se pudo guardar la versión'));
      }
    } on ApiConnectionException {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor');
      }
    } finally {
      if (mounted) setState(() => _creatingVersion = false);
    }
  }

  Future<void> _deleteScript(Map<String, dynamic> script) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar guion'),
        content: Text(
            '¿Eliminar "${script['nombre'] ?? 'este guion'}"? No se puede deshacer.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFB83D4B)),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final response = await ApiClient.delete('/guiones/${script['id_guion']}');
    if (!mounted) return;
    if (response.ok && response.success) {
      setState(() => _success = 'Guion eliminado correctamente');
      await _loadScripts();
    } else {
      setState(
          () => _error = response.errorMessage('No se pudo eliminar el guion'));
    }
  }

  String _today() => DateTime.now().toIso8601String().substring(0, 10);

  void _clearComposer() {
    _titleController.clear();
    _descriptionController.clear();
    _contentController.clear();
  }

  void _backToList() {
    setState(() {
      _view = 'list';
      _activeScript = null;
      _error = null;
    });
    _loadScripts();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF080A10),
      body: Stack(
        children: [
          Positioned.fill(
              child: Image.asset('assets/landing.jpeg', fit: BoxFit.cover)),
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xE6070A0F),
                    Color(0xD90F1116),
                    Color(0xF2080A10)
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 32),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildHeader(),
                      const SizedBox(height: 22),
                      if (_error != null) _message(_error!, false),
                      if (_success != null) _message(_success!, true),
                      if (_view == 'list') _buildList(),
                      if (_view == 'create') _buildComposer(),
                      if (_view == 'detail') _buildDetail(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xD90D1116),
        border: Border(
            bottom:
                BorderSide(color: LoginColors.accent.withValues(alpha: 0.28))),
      ),
      child: Row(
        children: [
          IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back, color: Colors.white)),
          const SizedBox(width: 4),
          const Icon(Icons.description_outlined, color: LoginColors.accent),
          const SizedBox(width: 8),
          Expanded(
              child: Text(widget.projectName,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.spaceGrotesk(
                      fontWeight: FontWeight.w600, color: Colors.white))),
          if (_isAdmin)
            IconButton(
              tooltip: 'Crear guion',
              onPressed: () => setState(() {
                _view = 'create';
                _error = null;
                _success = null;
              }),
              icon: const Icon(Icons.add, color: Colors.white),
            ),
          PopupMenuButton<String>(
            color: const Color(0xFF1A1A1A),
            icon: const Icon(Icons.more_vert, color: Colors.white),
            onSelected: (value) {
              if (value == 'create') {
                setState(() => _view = 'create');
              }
              if (value == 'list') _backToList();
            },
            itemBuilder: (context) => [
              if (_isAdmin)
                const PopupMenuItem(
                    value: 'create', child: Text('Crear desde cero')),
              const PopupMenuItem(
                  value: 'list', child: Text('Lista de guiones')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text('Guiones',
                  style: GoogleFonts.spaceGrotesk(
                      fontSize: 28,
                      fontWeight: FontWeight.w600,
                      color: Colors.white)),
            ),
            Text('${_scripts.length} registros',
                style: GoogleFonts.inter(fontSize: 12, color: Colors.white60)),
          ],
        ),
        const SizedBox(height: 8),
        Text('Administra las versiones y el contenido de tu proyecto.',
            style: GoogleFonts.inter(color: Colors.white60)),
        const SizedBox(height: 18),
        if (_loading)
          const Padding(
              padding: EdgeInsets.all(36),
              child: Center(
                  child: CircularProgressIndicator(color: LoginColors.accent)))
        else if (_scripts.isEmpty)
          _emptyState()
        else
          ..._scripts.map((item) => _scriptCard(item as Map<String, dynamic>)),
      ],
    );
  }

  Widget _scriptCard(Map<String, dynamic> script) {
    final state = (script['estado_actual'] ?? 'Sin versión').toString();
    final version = script['numero_de_version_actual']?.toString();
    return InkWell(
      onTap: () => _openScript(script),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xE6111419),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                  color: const Color(0x263D83C6),
                  borderRadius: BorderRadius.circular(10)),
              child:
                  const Icon(Icons.article_outlined, color: Color(0xFF9CC1FF)),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(script['nombre']?.toString() ?? 'Guion',
                      style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white)),
                  const SizedBox(height: 5),
                  Text(
                      script['descripcion']?.toString().isNotEmpty == true
                          ? script['descripcion'].toString()
                          : 'Sin descripción',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                          fontSize: 12, color: Colors.white60)),
                  const SizedBox(height: 8),
                  Row(children: [
                    _pill(state),
                    if (version != null) ...[
                      const SizedBox(width: 8),
                      Text('Versión $version',
                          style: GoogleFonts.inter(
                              fontSize: 11, color: Colors.white54))
                    ],
                  ]),
                ],
              ),
            ),
            if (_isAdmin)
              IconButton(
                  onPressed: () => _deleteScript(script),
                  icon:
                      const Icon(Icons.delete_outline, color: Colors.white54)),
            const Icon(Icons.chevron_right, color: Colors.white54),
          ],
        ),
      ),
    );
  }

  Widget _buildComposer() {
    return _panel(
      title: 'Crear guion desde cero',
      icon: Icons.edit_note_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _field('Título del guion', _titleController),
          _field('Descripción', _descriptionController, maxLines: 2),
          const SizedBox(height: 8),
          Text('Contenido inicial',
              style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.white)),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(10)),
            child: TextField(
              controller: _contentController,
              minLines: 14,
              maxLines: 24,
              style: const TextStyle(
                  color: Color(0xFF111827),
                  fontFamily: 'monospace',
                  height: 1.5),
              decoration: const InputDecoration(
                  contentPadding: EdgeInsets.all(18),
                  border: InputBorder.none,
                  hintText: 'Escribe aquí el contenido del guion...'),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton(
                  onPressed: _saving ? null : _backToList,
                  child: const Text('Cancelar')),
              const SizedBox(width: 10),
              FilledButton.icon(
                  onPressed: _saving ? null : _createScript,
                  icon: const Icon(Icons.save_outlined),
                  label: Text(_saving ? 'Guardando...' : 'Crear guion')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetail() {
    final script = _activeScript;
    if (script == null) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            IconButton(
                onPressed: _backToList,
                icon: const Icon(Icons.arrow_back, color: Colors.white)),
            Expanded(
                child: Text(script['nombre']?.toString() ?? 'Guion',
                    style: GoogleFonts.spaceGrotesk(
                        fontSize: 25,
                        fontWeight: FontWeight.w600,
                        color: Colors.white))),
          ],
        ),
        if (script['descripcion'] != null)
          Text(script['descripcion'].toString(),
              style: GoogleFonts.inter(color: Colors.white60)),
        const SizedBox(height: 18),
        _panel(
          title: 'Versiones',
          icon: Icons.history,
          child: _loadingVersions
              ? const Center(
                  child: Padding(
                      padding: EdgeInsets.all(24),
                      child:
                          CircularProgressIndicator(color: LoginColors.accent)))
              : _versions.isEmpty
                  ? Text('Este guion todavía no tiene versiones.',
                      style: GoogleFonts.inter(color: Colors.white60))
                  : Column(
                      children: _versions
                          .map((version) =>
                              _versionCard(version as Map<String, dynamic>))
                          .toList()),
        ),
        if (_isAdmin) ...[
          const SizedBox(height: 18),
          _panel(
              title: 'Nueva versión escrita',
              icon: Icons.add_circle_outline,
              child: _versionComposer()),
        ],
      ],
    );
  }

  Widget _versionComposer() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue: _versionState,
          dropdownColor: const Color(0xFF1A1A1A),
          decoration: _decoration('Estado'),
          items: _versionStates
              .map(
                  (state) => DropdownMenuItem(value: state, child: Text(state)))
              .toList(),
          onChanged: (value) =>
              setState(() => _versionState = value ?? 'Borrador'),
        ),
        const SizedBox(height: 12),
        _field('Comentario del cambio', _commentController, maxLines: 2),
        Container(
          decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(10)),
          child: TextField(
            controller: _versionContentController,
            minLines: 10,
            maxLines: 18,
            style: const TextStyle(
                color: Color(0xFF111827), fontFamily: 'monospace', height: 1.5),
            decoration: const InputDecoration(
                contentPadding: EdgeInsets.all(18),
                border: InputBorder.none,
                hintText: 'Escribe el contenido de la nueva versión...'),
          ),
        ),
        const SizedBox(height: 14),
        Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
                onPressed: _creatingVersion ? null : _createVersion,
                icon: const Icon(Icons.save_outlined),
                label: Text(
                    _creatingVersion ? 'Guardando...' : 'Guardar versión'))),
      ],
    );
  }

  Widget _versionCard(Map<String, dynamic> version) {
    final content = version['contenido']?.toString();
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: const Color(0xCC080C11),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
                child: Text('Versión ${version['numero_de_version'] ?? '-'}',
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600, color: Colors.white))),
            _pill(version['estado']?.toString() ?? 'Borrador')
          ]),
          const SizedBox(height: 6),
          Text(
              '${version['fecha_de_emision'] ?? ''}  ·  ${version['comentario_cambio'] ?? 'Sin comentario'}',
              style: GoogleFonts.inter(fontSize: 11, color: Colors.white54)),
          if (content != null && content.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                color: const Color(0xFF0A0A0A),
                child: Text(content,
                    maxLines: 8,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white70,
                        fontFamily: 'monospace',
                        fontSize: 12))),
          ] else if (version['archivo'] != null) ...[
            const SizedBox(height: 10),
            Text('Versión cargada desde archivo',
                style: GoogleFonts.inter(fontSize: 12, color: Colors.white60)),
          ],
        ],
      ),
    );
  }

  Widget _panel(
      {required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
          color: const Color(0xE6111419),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.12))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: LoginColors.accent),
          const SizedBox(width: 9),
          Text(title,
              style: GoogleFonts.spaceGrotesk(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.white))
        ]),
        const SizedBox(height: 16),
        child,
      ]),
    );
  }

  Widget _field(String label, TextEditingController controller,
          {int maxLines = 1}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
            controller: controller,
            maxLines: maxLines,
            style: const TextStyle(color: Colors.white),
            decoration: _decoration(label)),
      );

  InputDecoration _decoration(String label) => InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white60),
        filled: true,
        fillColor: const Color(0x261A1A1A),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(9),
            borderSide:
                BorderSide(color: Colors.white.withValues(alpha: 0.16))),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(9),
            borderSide:
                BorderSide(color: Colors.white.withValues(alpha: 0.16))),
        focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(9)),
            borderSide: BorderSide(color: LoginColors.accent)),
      );

  Widget _pill(String text) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
          color: const Color(0x2E0B4F8A),
          borderRadius: BorderRadius.circular(20)),
      child: Text(text,
          style: GoogleFonts.inter(
              fontSize: 10,
              color: const Color(0xFFB8D7FF),
              fontWeight: FontWeight.w600)));

  Widget _emptyState() => _panel(
      title: 'Sin guiones',
      icon: Icons.folder_open_outlined,
      child: Column(children: [
        Text('Aún no hay guiones en este proyecto.',
            style: GoogleFonts.inter(color: Colors.white60)),
        if (_isAdmin) ...[
          const SizedBox(height: 14),
          FilledButton.icon(
              onPressed: () => setState(() => _view = 'create'),
              icon: const Icon(Icons.add),
              label: const Text('Crear desde cero'))
        ]
      ]));

  Widget _message(String text, bool success) => Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: (success ? Colors.green : Colors.red).withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(8)),
      child: Text(text,
          style: TextStyle(
              color: success ? Colors.greenAccent : Colors.redAccent)));
}
