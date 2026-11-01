import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/session.dart';
import '../services/theme_controller.dart';
import '../widgets/foccus_ui.dart';
import 'desglose_screen.dart';
import 'escenas_screen.dart';
import 'galeria_screen.dart';
import 'guion_screen.dart';
import 'login_screen.dart' show LoginColors;
import 'profile_screen.dart';
import 'rodaje_screen.dart';
import 'roles_screen.dart';

const _moduleItems = [
  _ModuleItem('Guión', Icons.description_outlined, Color(0xFF0B4F8A)),
  _ModuleItem('Escenas', Icons.movie_outlined, Color(0xFF7B5FCF)),
  _ModuleItem('Plan de Rodaje', Icons.videocam_outlined, Color(0xFFE67E5C)),
  _ModuleItem('Desglose', Icons.table_rows_outlined, Color(0xFF6B6B6B)),
  _ModuleItem('Galería', Icons.photo_library_outlined, Color(0xFF2E8B7A)),
];

// Mismo menú que ProjectDashboard.jsx (Roles solo para admin del proyecto).
const _menuItems = [
  'Guión',
  'Crear Escenas',
  'Plan de Rodaje',
  'Desglose',
  'Galería',
];

/// Normaliza el estado como normalizeUpdateStatus / statusProgress de la web.
double _statusProgress(dynamic value) {
  final status = (value ?? '')
      .toString()
      .toLowerCase()
      .replaceAll('á', 'a')
      .replaceAll('é', 'e')
      .replaceAll('í', 'i')
      .replaceAll('ó', 'o')
      .replaceAll('ú', 'u')
      .trim()
      .replaceAll(RegExp(r'[_\s]+'), '-');
  const done = [
    'finalizado',
    'finalizada',
    'completado',
    'completada',
    'aprobado',
    'aprobada',
    'terminado',
    'terminada',
  ];
  const half = [
    'en-progreso',
    'en-rodaje',
    'revision',
    'en-revision',
    'confirmado',
    'confirmada',
  ];
  if (done.contains(status)) return 1;
  if (half.contains(status)) return 0.5;
  return 0;
}

class _Area {
  _Area(this.name, this.icon, this.color, this.statuses);

  final String name;
  final IconData icon;
  final Color color;
  final List<dynamic> statuses;

  int get count => statuses.length;
  int get progress => statuses.isEmpty
      ? 0
      : (statuses.map(_statusProgress).reduce((a, b) => a + b) /
              statuses.length *
              100)
          .round();
}

class _Activity {
  _Activity(this.title, this.module, this.status, this.detail, this.date);

  final String title;
  final String module;
  final String status;
  final String detail;
  final String date;
}

class ProjectHomeScreen extends StatefulWidget {
  const ProjectHomeScreen({
    super.key,
    required this.projectId,
    required this.projectName,
  });

  final String projectId;
  final String projectName;

  @override
  State<ProjectHomeScreen> createState() => _ProjectHomeScreenState();
}

class _ProjectHomeScreenState extends State<ProjectHomeScreen> {
  bool _menuOpen = false;
  bool _loadingData = true;
  String? _dataError;
  List<_Area> _areas = const [];
  List<_Activity> _activity = const [];
  List<dynamic> _scripts = const [];
  List<dynamic> _scenes = const [];
  List<dynamic> _shootDays = const [];
  List<dynamic> _teamMembers = const [];
  List<dynamic> _breakdownScenes = const [];

  bool get _isAdmin => Session.isProjectAdmin;

  String get _fullName => [Session.nombre, Session.apellido]
      .whereType<String>()
      .where((value) => value.isNotEmpty)
      .join(' ');

  String get _roleLabel => _isAdmin ? 'Administrador' : 'Usuario';

  @override
  void initState() {
    super.initState();
    _refreshRoleAndData();
  }

  /// Refresca el rol del usuario en este proyecto (como ProjectDashboard.jsx)
  /// y luego carga el resumen y la actividad reciente.
  Future<void> _refreshRoleAndData() async {
    try {
      final response = await ApiClient.get('/users/${Session.idUser}/projects');
      if (!mounted) return;
      if (response.ok) {
        final current = response.list.cast<dynamic>().firstWhere(
              (p) => p is Map && p['id_project'].toString() == widget.projectId,
              orElse: () => null,
            );
        if (current == null) {
          await Session.clearActiveProject();
          if (!mounted) return;
          Navigator.of(context).pop();
          return;
        }
        await Session.setActiveProject(
          projectId: widget.projectId,
          projectName: widget.projectName,
          role: int.tryParse(current['id_rol'].toString()),
        );
        if (mounted) setState(() {});
      }
    } on ApiConnectionException {
      // El error de conexion se muestra al cargar los datos.
    }
    await _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loadingData = true;
      _dataError = null;
    });
    try {
      final pid = Uri.encodeComponent(widget.projectId);
      final responses = await Future.wait<ApiResponse>([
        ApiClient.get('/guiones?id_project=$pid'),
        ApiClient.get('/projects/$pid/rodajes'),
        if (_isAdmin) ApiClient.get('/users/project/$pid'),
      ]);
      final scriptsRes = responses[0];
      final rodajesRes = responses[1];
      final membersRes = _isAdmin ? responses[2] : null;
      for (final response in responses) {
        if (!response.ok) {
          setState(() => _dataError = response
              .errorMessage('No se pudo cargar el resumen del proyecto'));
          return;
        }
      }
      final scripts = scriptsRes.list;
      final rodajes = rodajesRes.list;
      final members = membersRes?.list ?? const <dynamic>[];
      final relatedData = await Future.wait<List<ApiResponse>>(
        scripts.map((script) => Future.wait<ApiResponse>([
              ApiClient.get('/guiones/${script['id_guion']}/escenas'),
              ApiClient.get('/guiones/${script['id_guion']}/desglose'),
            ])),
      );
      final scenes = <dynamic>[];
      final breakdown = <dynamic>[];
      for (final pair in relatedData) {
        for (final response in pair) {
          if (!response.ok) {
            setState(() => _dataError = response.errorMessage(
                'No se pudieron cargar las estadísticas del proyecto'));
            return;
          }
        }
        scenes.addAll(pair[0].list);
        breakdown.addAll(pair[1].list);
      }
      final processResponses = await Future.wait<ApiResponse>(rodajes.map(
        (rodaje) => ApiClient.get('/rodajes/${rodaje['id_rodaje']}/procesos'),
      ));
      for (final response in processResponses) {
        if (!response.ok) {
          setState(() => _dataError =
              response.errorMessage('No se pudo cargar la actividad reciente'));
          return;
        }
      }
      final activity = <_Activity>[];
      if (_isAdmin) {
        activity.addAll(scripts.map((script) => _Activity(
              (script['nombre'] ?? 'Guion sin título').toString(),
              'Guión',
              (script['estado_actual'] ?? 'Pendiente').toString(),
              'Versión ${script['numero_de_version_actual'] ?? 0}',
              '',
            )));
        activity.addAll(scenes.map((scene) => _Activity(
              (scene['encabezado'] ??
                      'Escena ${scene['numero_de_escena'] ?? ''}')
                  .toString(),
              'Escenas',
              (scene['estado'] ?? 'Pendiente').toString(),
              (scene['fecha_de_grabacion'] ?? 'Sin fecha de grabación')
                  .toString(),
              (scene['fecha_de_grabacion'] ?? '').toString(),
            )));
      }
      for (var index = 0; index < rodajes.length; index++) {
        final rodaje = rodajes[index];
        activity.add(_Activity(
          (rodaje['nombre'] ?? 'Jornada de rodaje').toString(),
          'Plan de rodaje',
          (rodaje['estado'] ?? 'Pendiente').toString(),
          (rodaje['descripcion'] ??
                  '${rodaje['locacion'] ?? 'Sin locación'} · ${rodaje['fecha_inicio'] ?? 'Sin fecha'} a ${rodaje['fecha_fin'] ?? 'Sin fecha'}')
              .toString(),
          (rodaje['fecha_inicio'] ?? '').toString(),
        ));
        for (final proceso in processResponses[index].list) {
          final detail = [proceso['ubicacion'], proceso['encargado']]
              .where((value) => value != null && value.toString().isNotEmpty)
              .join(' · ');
          activity.add(_Activity(
            (proceso['nombre'] ?? 'Proceso de rodaje').toString(),
            'Proceso de rodaje',
            (proceso['estado'] ?? 'Pendiente').toString(),
            detail.isEmpty
                ? (proceso['descripcion'] ?? 'Sin detalles adicionales')
                    .toString()
                : detail,
            (proceso['fecha'] ?? '').toString(),
          ));
        }
      }
      activity.sort((a, b) => b.date.compareTo(a.date));
      if (!mounted) return;
      setState(() {
        _scripts = scripts;
        _scenes = scenes;
        _shootDays = rodajes;
        _teamMembers = members;
        _breakdownScenes = breakdown;
        _areas = [
          _Area('Guiones', Icons.description_outlined, const Color(0xFF3189C7),
              scripts.map((item) => item['estado_actual']).toList()),
          _Area('Escenas', Icons.movie_outlined, const Color(0xFF8763C6),
              scenes.map((item) => item['estado']).toList()),
          _Area(
              'Plan de rodaje',
              Icons.calendar_month_outlined,
              const Color(0xFFCA8051),
              rodajes.map((item) => item['estado']).toList()),
        ];
        _activity = activity.take(6).toList();
      });
    } on ApiConnectionException {
      if (mounted) {
        setState(() => _dataError = 'No se pudo conectar con el servidor');
      }
    } finally {
      if (mounted) setState(() => _loadingData = false);
    }
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  Future<void> _deleteProject() async {
    final controller = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: context.fc.surfaceAlt,
        title: const Text('Eliminar proyecto'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Se eliminarán definitivamente "${widget.projectName}", sus miembros, guiones, escenas, galería, rodajes y archivos. Escribe el nombre exacto del proyecto para confirmar.',
              style:
                  GoogleFonts.inter(fontSize: 14, color: context.fc.textMuted),
            ),
            const SizedBox(height: 12),
            TextField(controller: controller),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child:
                  Text('Eliminar', style: TextStyle(color: context.fc.error))),
        ],
      ),
    );
    final typed = controller.text;
    controller.dispose();
    if (confirmed != true) return;
    if (typed != widget.projectName) {
      _snack('El nombre no coincide, no se eliminó el proyecto');
      return;
    }
    try {
      final response = await ApiClient.delete('/projects/${widget.projectId}');
      if (!mounted) return;
      if (response.ok && response.success) {
        await Session.clearActiveProject();
        if (!mounted) return;
        Navigator.of(context).pop();
      } else {
        _snack(response.errorMessage('No se pudo eliminar el proyecto'));
      }
    } on ApiConnectionException {
      _snack('No se pudo conectar con el servidor');
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  void _showMenuMessage(String item) {
    setState(() => _menuOpen = false);
    _openModule(item);
  }

  void _openModule(String name) {
    final id = widget.projectId;
    final project = widget.projectName;
    final Widget? screen = switch (name) {
      'Guión' => GuionScreen(projectId: id, projectName: project),
      'Escenas' ||
      'Crear Escenas' =>
        EscenasScreen(projectId: id, projectName: project),
      'Plan de Rodaje' => RodajeScreen(projectId: id, projectName: project),
      'Desglose' => DesgloseScreen(projectId: id, projectName: project),
      'Galería' => GaleriaScreen(projectId: id, projectName: project),
      'Roles' => RolesScreen(projectId: id, projectName: project),
      _ => null,
    };
    if (screen == null) return;
    // Al volver se recarga el resumen por si hubo cambios.
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => screen))
        .then((_) {
      if (mounted) _loadData();
    });
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
            child: LayoutBuilder(
                builder: (context, constraints) => RefreshIndicator(
                    onRefresh: _loadData,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: EdgeInsets.fromLTRB(
                          constraints.maxWidth >= 900 ? 32 : 16,
                          12,
                          constraints.maxWidth >= 900 ? 32 : 16,
                          32),
                      child: Center(
                        child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 1120),
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _buildHeader(),
                                  const SizedBox(height: 24),
                                  FadeSlideIn(
                                      index: 0, child: _buildProjectHeader()),
                                  const SizedBox(height: 16),
                                  FadeSlideIn(
                                      index: 1,
                                      child:
                                          _buildContent(constraints.maxWidth)),
                                  const SizedBox(height: 24),
                                  FoccusSwitcher(
                                      child:
                                          _buildSummary(constraints.maxWidth)),
                                  const SizedBox(height: 16),
                                  FadeSlideIn(
                                      index: 3, child: _buildActivity()),
                                  if (_isAdmin) ...[
                                    const SizedBox(height: 16),
                                    FadeSlideIn(index: 4, child: _buildTeam())
                                  ],
                                  const SizedBox(height: 24),
                                  _buildBackButton(),
                                ])),
                      ),
                    )))),
      ]),
    );
  }

  Widget _buildHeader() {
    final fc = context.fc;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: fc.appBar,
        border: Border(
            bottom:
                BorderSide(color: LoginColors.accent.withValues(alpha: 0.28))),
      ),
      child: Row(
        children: [
          Image.asset('assets/foccus_wordmark_white.png',
              height: 36,
              fit: BoxFit.contain,
              color: fc.text,
              colorBlendMode: BlendMode.srcIn),
          const Spacer(),
          if (_fullName.isNotEmpty)
            Flexible(
                child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_fullName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 14, color: fc.text)),
                Text(
                  _roleLabel,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: fc.isDark
                        ? (_isAdmin
                            ? const Color(0xFFB89DFF)
                            : const Color(0xFF65B7F2))
                        : (_isAdmin
                            ? const Color(0xFF6D4BC4)
                            : const Color(0xFF1B6FB5)),
                  ),
                ),
              ],
            )),
          const SizedBox(width: 4),
          const ThemeToggleButton(),
          PopupMenuButton<String>(
            color: fc.surfaceAlt,
            tooltip: 'Cuenta',
            icon: Icon(Icons.account_circle_outlined, color: fc.text, size: 30),
            onSelected: (value) {
              if (value == 'profile') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              }
              if (value == 'logout') _logout();
              if (value == 'delete') _deleteProject();
            },
            itemBuilder: (context) => [
              if (_isAdmin)
                PopupMenuItem(
                  value: 'delete',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.delete_outline, color: fc.error),
                    title: Text('Eliminar proyecto',
                        style: GoogleFonts.inter(color: fc.error)),
                  ),
                ),
              PopupMenuItem(
                value: 'profile',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.person_outline, color: fc.textMuted),
                  title:
                      Text('Perfil', style: GoogleFonts.inter(color: fc.text)),
                ),
              ),
              PopupMenuItem(
                value: 'logout',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.logout, color: fc.error),
                  title:
                      Text('Salir', style: GoogleFonts.inter(color: fc.error)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProjectHeader() {
    final fc = context.fc;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: fc.surface,
          borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
          border: Border.all(color: fc.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(_isAdmin ? 'PANEL ADMINISTRATIVO' : 'ESPACIO DE TRABAJO',
            style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
                color: fc.accentText)),
        const SizedBox(height: 7),
        Text(widget.projectName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.spaceGrotesk(
                fontSize: 24,
                height: 1.15,
                fontWeight: FontWeight.w700,
                color: fc.text)),
        const SizedBox(height: 6),
        Text(
            _isAdmin
                ? 'Estado y avance del proyecto en un solo lugar.'
                : 'Tus herramientas y actividad de producción.',
            style: GoogleFonts.inter(fontSize: 14, color: fc.textMuted)),
        const SizedBox(height: 16),
        OutlinedButton.icon(
            onPressed: () => setState(() => _menuOpen = !_menuOpen),
            icon: Icon(_menuOpen ? Icons.close : Icons.menu, size: 18),
            label: Text(_menuOpen ? 'Cerrar menú' : 'Módulos'),
            style: OutlinedButton.styleFrom(
                foregroundColor: fc.text,
                backgroundColor: fc.surfaceAlt,
                minimumSize: const Size.fromHeight(52),
                side: BorderSide(color: fc.border),
                shape: RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(FoccusDims.radiusField)))),
      ]),
    );
  }

  Widget _buildContent(double width) {
    final showSideMenu = _menuOpen && width >= 720;
    final grid = _buildModulesGrid(width, compact: _menuOpen);

    if (!showSideMenu) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_menuOpen) ...[
            _buildMenu(),
            const SizedBox(height: 18),
          ],
          grid,
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 220, child: _buildMenu()),
        const SizedBox(width: 22),
        Expanded(child: grid),
      ],
    );
  }

  Widget _buildMenu() {
    final fc = context.fc;
    final items = _isAdmin ? [..._menuItems, 'Roles'] : _menuItems;
    return Container(
      decoration: BoxDecoration(
        color: fc.surface,
        borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
        border: Border.all(color: fc.border),
      ),
      clipBehavior: Clip.antiAlias,
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        children: items
            .map(
              (item) => InkWell(
                onTap: () => _showMenuMessage(item),
                child: Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(minHeight: 52),
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    item,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      color: item == 'Roles' ? fc.accentText : fc.text,
                      fontWeight:
                          item == 'Roles' ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildModulesGrid(double width, {required bool compact}) {
    final columns = width >= 1120
        ? 5
        : width >= 720
            ? 3
            : 2;
    final fc = context.fc;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _moduleItems.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          mainAxisExtent: compact ? 120 : 128),
      itemBuilder: (context, index) {
        final module = _moduleItems[index];
        return FadeSlideIn(
            index: index,
            child: Material(
                color: fc.surface,
                borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
                child: InkWell(
                  onTap: () => _openModule(module.name),
                  borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
                  child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                          borderRadius:
                              BorderRadius.circular(FoccusDims.radiusCard),
                          border: Border.all(color: fc.border)),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                          color: module.color
                                              .withValues(alpha: 0.2),
                                          borderRadius:
                                              BorderRadius.circular(11)),
                                      child: Icon(module.icon,
                                          color: module.color, size: 21)),
                                  Icon(Icons.arrow_forward_rounded,
                                      size: 17, color: fc.textSubtle),
                                ]),
                            Text(module.name,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.spaceGrotesk(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: fc.text)),
                          ])),
                )));
      },
    );
  }

  Widget _buildActivity() => _panel(
          child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeading('ACTIVIDAD RECIENTE', 'Últimas actualizaciones',
              trailing: '${_activity.length} registros'),
          const SizedBox(height: 16),
          FoccusSwitcher(
            child: _loadingData
                ? const Center(
                    key: ValueKey('loading'),
                    child: Padding(
                        padding: EdgeInsets.all(20),
                        child: CircularProgressIndicator(
                            color: LoginColors.accent)))
                : _dataError != null
                    ? KeyedSubtree(
                        key: const ValueKey('error'), child: _inlineError())
                    : _activity.isEmpty
                        ? KeyedSubtree(
                            key: const ValueKey('empty'),
                            child: _emptyMessage(
                                'Todavía no hay actividad registrada para mostrar.'))
                        : Column(
                            key: const ValueKey('list'),
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (var i = 0; i < _activity.length; i++)
                                FadeSlideIn(
                                    index: i,
                                    child: _buildActivityTile(_activity[i])),
                            ],
                          ),
          ),
        ],
      ));

  Widget _buildActivityTile(_Activity item) {
    final progress = _statusProgress(item.status);
    final fc = context.fc;
    final color = progress == 1
        ? const Color(0xFF52BE91)
        : progress == 0.5
            ? const Color(0xFFE6B450)
            : const Color(0xFF8A96A8);
    final statusColor = fc.isDark
        ? color
        : progress == 1
            ? const Color(0xFF2E8B6A)
            : progress == 0.5
                ? const Color(0xFF9A6B00)
                : const Color(0xFF5F6B7C);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: fc.surfaceAlt,
          borderRadius: BorderRadius.circular(11),
          border: Border(left: BorderSide(color: color, width: 3))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
              child: Text(item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: fc.text))),
          const SizedBox(width: 8),
          Flexible(
              child: Text(item.status,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.right,
                  style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: statusColor))),
        ]),
        if (item.detail.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(item.detail,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(fontSize: 14, color: fc.textMuted)),
        ],
        const SizedBox(height: 5),
        Text('${item.module}${item.date.isEmpty ? '' : ' · ${item.date}'}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(fontSize: 13, color: fc.textSubtle)),
      ]),
    );
  }

  Widget _buildSummary(double width) {
    if (_loadingData) {
      return KeyedSubtree(
          key: const ValueKey('loading'),
          child: _panel(
              child: const Padding(
                  padding: EdgeInsets.all(20),
                  child: Center(
                      child: CircularProgressIndicator(
                          color: LoginColors.accent)))));
    }
    if (_dataError != null) {
      return KeyedSubtree(
          key: const ValueKey('error'), child: _panel(child: _inlineError()));
    }

    final versions = _scripts.fold<int>(
        0,
        (total, script) =>
            total +
            (int.tryParse('${script['numero_de_version_actual']}') ?? 0));
    final completedScenes =
        _scenes.where((item) => _statusProgress(item['estado']) == 1).length;
    final completedDays =
        _shootDays.where((item) => _statusProgress(item['estado']) == 1).length;
    final statuses = [
      ..._scripts.map((item) => item['estado_actual']),
      ..._scenes.map((item) => item['estado']),
      ..._shootDays.map((item) => item['estado']),
    ];
    final total = statuses.length;
    final completed =
        statuses.where((item) => _statusProgress(item) == 1).length;
    final progress = total == 0
        ? 0
        : (statuses.fold<double>(
                    0, (sum, item) => sum + _statusProgress(item)) /
                total *
                100)
            .round();
    final requirements = _breakdownScenes.fold<int>(
        0,
        (sum, item) =>
            sum + (int.tryParse('${item['total_requerimientos']}') ?? 0));

    return Column(
        key: const ValueKey('content'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeading('RESUMEN DEL PROYECTO', 'Indicadores',
              trailing: '$completed de $total finalizados'),
          const SizedBox(height: 12),
          GridView.count(
              crossAxisCount: width >= 720 ? 3 : 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: width >= 720 ? 1.55 : 1.15,
              children: [
                _metricCard(
                    Icons.insights_outlined,
                    const Color(0xFF49A9EF),
                    'Avance general',
                    '$progress%',
                    '$completed de $total elementos'),
                _metricCard(
                    Icons.description_outlined,
                    const Color(0xFF3189C7),
                    'Versiones del guion',
                    '$versions',
                    'En ${_scripts.length} guiones'),
                _metricCard(
                    Icons.movie_outlined,
                    const Color(0xFF8763C6),
                    'Escenas',
                    '${_scenes.length}',
                    '$completedScenes finalizadas'),
                _metricCard(
                    Icons.calendar_month_outlined,
                    const Color(0xFFCA8051),
                    'Jornadas',
                    '${_shootDays.length}',
                    '$completedDays finalizadas'),
                if (_isAdmin)
                  _metricCard(
                      Icons.groups_2_outlined,
                      const Color(0xFF398B72),
                      'Personas',
                      '${_teamMembers.length}',
                      'Vinculadas al proyecto'),
                if (_isAdmin)
                  _metricCard(
                      Icons.checklist_outlined,
                      const Color(0xFF338B91),
                      'Desglose',
                      '$requirements',
                      'Requerimientos registrados'),
              ]),
          if (total == 0) ...[
            const SizedBox(height: 10),
            _emptyMessage(
                'Al crear guiones, escenas o jornadas aparecerá aquí el avance real.'),
          ],
          const SizedBox(height: 18),
          _panel(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                _sectionHeading('SEGUIMIENTO', 'Avance por área',
                    trailing: 'Según el estado actual'),
                const SizedBox(height: 17),
                ..._areas.map(_areaProgress),
                _statusDistribution(statuses),
              ])),
          if (_isAdmin) ...[
            const SizedBox(height: 18),
            _buildBreakdown(requirements)
          ],
        ]);
  }

  Widget _metricCard(
      IconData icon, Color color, String label, String value, String caption) {
    final fc = context.fc;
    return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: fc.surface,
            borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
            border: Border.all(color: fc.border)),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [
                Container(
                    width: 31,
                    height: 31,
                    decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.13),
                        borderRadius: BorderRadius.circular(9)),
                    child: Icon(icon, size: 17, color: color)),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(label,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: fc.textMuted))),
              ]),
              Text(value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.spaceGrotesk(
                      fontSize: 25,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      color: fc.text)),
              Text(caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(fontSize: 13, color: fc.textSubtle)),
            ]));
  }

  Widget _areaProgress(_Area area) {
    final fc = context.fc;
    final complete =
        area.statuses.where((status) => _statusProgress(status) == 1).length;
    return Padding(
        padding: const EdgeInsets.only(bottom: 17),
        child: Row(children: [
          Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                  color: area.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10)),
              child: Icon(area.icon, size: 18, color: area.color)),
          const SizedBox(width: 11),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Row(children: [
                  Expanded(
                      child: Text(area.name,
                          style: GoogleFonts.inter(
                              color: fc.text,
                              fontSize: 14,
                              fontWeight: FontWeight.w600))),
                  Text('$complete/${area.count} finalizados',
                      style:
                          GoogleFonts.inter(fontSize: 13, color: fc.textMuted)),
                ]),
                const SizedBox(height: 7),
                ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: TweenAnimationBuilder<double>(
                        tween: Tween(end: area.progress / 100),
                        duration: const Duration(milliseconds: 350),
                        builder: (context, value, _) => LinearProgressIndicator(
                            value: value,
                            minHeight: 6,
                            color: area.color,
                            backgroundColor: fc.border))),
              ])),
          const SizedBox(width: 10),
          SizedBox(
              width: 44,
              child: Text('${area.progress}%',
                  textAlign: TextAlign.end,
                  style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: fc.textMuted))),
        ]));
  }

  Widget _statusDistribution(List<dynamic> statuses) {
    final counts = [
      statuses.where((item) => _statusProgress(item) == 0).length,
      statuses.where((item) => _statusProgress(item) == 0.5).length,
      statuses.where((item) => _statusProgress(item) == 1).length,
    ];
    final fc = context.fc;
    const labels = ['Pendiente', 'En progreso', 'Finalizado'];
    final colors = fc.isDark
        ? const [Color(0xFF8A96A8), Color(0xFFE6B450), Color(0xFF52BE91)]
        : const [Color(0xFF5F6B7C), Color(0xFF9A6B00), Color(0xFF2E8B6A)];
    return Container(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
        decoration: BoxDecoration(
            color: fc.surfaceAlt, borderRadius: BorderRadius.circular(12)),
        child: Row(
            children: List.generate(
                3,
                (index) => Expanded(
                        child: Column(children: [
                      Text('${counts[index]}',
                          style: GoogleFonts.spaceGrotesk(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: colors[index])),
                      Text(labels[index],
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                              fontSize: 13, color: context.fc.textMuted)),
                    ])))));
  }

  Widget _buildBreakdown(int requirements) {
    final fc = context.fc;
    final covered = _breakdownScenes
        .where((item) =>
            (int.tryParse('${item['total_requerimientos']}') ?? 0) > 0)
        .length;
    final departments = <String, int>{};
    for (final scene in _breakdownScenes) {
      final summary = scene['resumen_departamentos'];
      if (summary is List) {
        for (final item in summary.whereType<Map>()) {
          final name = (item['departamento'] ?? 'Otro').toString();
          departments[name] = (departments[name] ?? 0) +
              (int.tryParse('${item['cantidad']}') ?? 0);
        }
      }
    }
    final rows = departments.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final departmentTotal =
        departments.values.fold<int>(0, (sum, value) => sum + value);
    return _panel(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _sectionHeading('ELEMENTOS DE PRODUCCIÓN', 'Estadísticas del desglose'),
      const SizedBox(height: 14),
      Row(children: [
        _breakdownStat('${_breakdownScenes.length}', 'Escenas revisadas'),
        _breakdownStat('$covered', 'Con requisitos'),
        _breakdownStat(
            '${_breakdownScenes.length - covered}', 'Sin requisitos'),
      ]),
      const SizedBox(height: 10),
      if (rows.isEmpty)
        _emptyMessage(requirements == 0
            ? 'Todavía no hay requerimientos por departamento.'
            : 'No hay categorías de desglose para mostrar.'),
      ...rows.take(5).map((row) {
        final percent = departmentTotal == 0
            ? 0
            : (row.value / departmentTotal * 100).round();
        return Padding(
            padding: const EdgeInsets.only(top: 11),
            child: Column(children: [
              Row(children: [
                Expanded(
                    child: Text(row.key,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: fc.text))),
                const SizedBox(width: 8),
                Text('${row.value} elementos · $percent%',
                    style:
                        GoogleFonts.inter(fontSize: 13, color: fc.textMuted)),
              ]),
              const SizedBox(height: 6),
              ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                      value: percent / 100,
                      minHeight: 5,
                      color: LoginColors.accent,
                      backgroundColor: fc.border)),
            ]));
      }),
      Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
              onPressed: () => _openModule('Desglose'),
              icon: const Icon(Icons.arrow_forward, size: 18),
              label: const Text('Ver desglose'),
              style: TextButton.styleFrom(
                  minimumSize: const Size(48, 48),
                  foregroundColor: fc.accentText))),
    ]));
  }

  Widget _breakdownStat(String value, String label) {
    final fc = context.fc;
    return Expanded(
        child: Container(
            margin: const EdgeInsets.only(right: 6),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
            decoration: BoxDecoration(
                color: fc.surfaceAlt, borderRadius: BorderRadius.circular(10)),
            child: Column(children: [
              Text(value,
                  style: GoogleFonts.spaceGrotesk(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: fc.text)),
              const SizedBox(height: 3),
              Text(label,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  style: GoogleFonts.inter(fontSize: 13, color: fc.textMuted)),
            ])));
  }

  Widget _buildTeam() {
    final fc = context.fc;
    return _panel(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _sectionHeading('PERSONAS', 'Equipo del proyecto',
          trailing: '${_teamMembers.length} personas'),
      const SizedBox(height: 14),
      if (_teamMembers.isEmpty)
        _emptyMessage('Todavía no hay miembros vinculados al proyecto.'),
      ..._teamMembers.take(5).map((member) {
        final name = [member['nombre'], member['apellido']]
            .where((part) => part != null && part.toString().trim().isNotEmpty)
            .join(' ');
        final displayName = name.isEmpty ? 'Miembro del equipo' : name;
        final role = switch (int.tryParse('${member['id_rol']}')) {
          1001 => 'Administrador',
          1002 => 'Director',
          1003 => 'Jefe de departamento',
          1004 => 'Onset',
          1005 => 'Usuario',
          _ => 'Equipo',
        };
        return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(children: [
              CircleAvatar(
                  radius: 19,
                  backgroundColor: fc.isDark
                      ? const Color(0xFF2D4560)
                      : const Color(0xFFD6E2F0),
                  child: Text(displayName[0].toUpperCase(),
                      style: GoogleFonts.spaceGrotesk(
                          fontWeight: FontWeight.w700, color: fc.text))),
              const SizedBox(width: 11),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: fc.text)),
                    Text(
                        (member['departamento'] ?? member['cargo'] ?? role)
                            .toString(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontSize: 13, color: fc.textSubtle)),
                  ])),
              const SizedBox(width: 8),
              Flexible(
                  child: Text(role,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: fc.isDark
                              ? const Color(0xFFB89DFF)
                              : const Color(0xFF6D4BC4)))),
            ]));
      }),
      if (_teamMembers.length > 5)
        Text('Y ${_teamMembers.length - 5} personas más',
            style: GoogleFonts.inter(fontSize: 13, color: fc.textSubtle)),
    ]));
  }

  Widget _panel({required Widget child}) {
    final fc = context.fc;
    return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: fc.surface,
            borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
            border: Border.all(color: fc.border)),
        child: child);
  }

  Widget _sectionHeading(String eyebrow, String title, {String? trailing}) {
    final fc = context.fc;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(eyebrow,
          style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
              color: fc.accentText)),
      const SizedBox(height: 4),
      Row(children: [
        Expanded(
            child: Text(title,
                style: GoogleFonts.spaceGrotesk(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: fc.text))),
        if (trailing != null)
          Flexible(
              child: Text(trailing,
                  textAlign: TextAlign.end,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style:
                      GoogleFonts.inter(fontSize: 13, color: fc.textSubtle))),
      ]),
    ]);
  }

  Widget _inlineError() => Column(children: [
        Text(_dataError!,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 14, color: context.fc.error)),
        TextButton.icon(
            onPressed: _loadData,
            style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('Reintentar')),
      ]);

  Widget _emptyMessage(String message) => Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 17, horizontal: 12),
      decoration: BoxDecoration(
          color: context.fc.surfaceAlt,
          borderRadius: BorderRadius.circular(10)),
      child: Text(message,
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 14, color: context.fc.textMuted)));

  Widget _buildBackButton() {
    return Align(
      alignment: Alignment.centerLeft,
      child: TextButton.icon(
        onPressed: () => Navigator.of(context).pop(),
        icon: const Icon(Icons.arrow_back, size: 18),
        label: const Text('Volver a Proyectos'),
        style: TextButton.styleFrom(
            minimumSize: const Size(48, 48),
            foregroundColor: context.fc.textMuted),
      ),
    );
  }
}

class _ModuleItem {
  const _ModuleItem(this.name, this.icon, this.color);

  final String name;
  final IconData icon;
  final Color color;
}
