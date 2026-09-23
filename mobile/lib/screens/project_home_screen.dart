import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/auth_service.dart';
import '../services/session.dart';
import 'guion_screen.dart';
import 'login_screen.dart' show LoginColors;
import 'profile_screen.dart';

const _moduleItems = [
  _ModuleItem('Guión', Icons.description_outlined, Color(0xFF0B4F8A)),
  _ModuleItem('Escenas', Icons.movie_outlined, Color(0xFF7B5FCF)),
  _ModuleItem('Plan de Rodaje', Icons.videocam_outlined, Color(0xFFE67E5C)),
  _ModuleItem('Desglose', Icons.table_rows_outlined, Color(0xFF6B6B6B)),
];

const _menuItems = [
  'Guión',
  'Crear Escenas',
  'Crear Personajes',
  'Crew List',
  'Plan de Rodaje',
  'Desglose',
  'Galería',
];

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

  bool get _isAdmin => Session.idRol == '1001';

  String get _fullName => [Session.nombre, Session.apellido]
      .whereType<String>()
      .where((value) => value.isNotEmpty)
      .join(' ');

  String get _roleLabel => _isAdmin ? 'Administrador' : 'Usuario';

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  void _showModuleMessage(String module) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
          SnackBar(content: Text('$module estará disponible próximamente')));
  }

  void _showMenuMessage(String item) {
    setState(() => _menuOpen = false);
    if (item == 'Guión') {
      _openGuion();
      return;
    }
    _showModuleMessage(item);
  }

  void _openGuion() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => GuionScreen(
          projectId: widget.projectId,
          projectName: widget.projectName,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF080A10),
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset('assets/landing.jpeg', fit: BoxFit.cover),
          ),
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xE6070A0F),
                    Color(0xD90F1116),
                    Color(0xF2080A10),
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                padding: EdgeInsets.symmetric(
                  horizontal: constraints.maxWidth >= 900 ? 32 : 18,
                  vertical: 14,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1280),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildHeader(),
                      const SizedBox(height: 30),
                      _buildProjectHeader(),
                      const SizedBox(height: 20),
                      _buildContent(constraints.maxWidth),
                      const SizedBox(height: 28),
                      _buildActivity(),
                      const SizedBox(height: 24),
                      _buildBackButton(),
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xD90D1116),
        border: Border(
            bottom:
                BorderSide(color: LoginColors.accent.withValues(alpha: 0.28))),
      ),
      child: Row(
        children: [
          Image.asset('assets/foccus_wordmark_white.png',
              height: 42, fit: BoxFit.contain),
          const Spacer(),
          if (_fullName.isNotEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_fullName,
                    style:
                        GoogleFonts.inter(fontSize: 13, color: Colors.white)),
                Text(
                  _roleLabel,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _isAdmin
                        ? const Color(0xFFB89DFF)
                        : const Color(0xFF65B7F2),
                  ),
                ),
              ],
            ),
          const SizedBox(width: 12),
          PopupMenuButton<String>(
            color: const Color(0xFF1A1A1A),
            icon: const Icon(Icons.account_circle_outlined,
                color: Colors.white, size: 30),
            onSelected: (value) {
              if (value == 'profile') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              }
              if (value == 'logout') _logout();
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'profile',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading:
                      const Icon(Icons.person_outline, color: Colors.white70),
                  title: Text('Perfil',
                      style: GoogleFonts.inter(color: Colors.white)),
                ),
              ),
              PopupMenuItem(
                value: 'logout',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.logout, color: Color(0xFFEF6B6B)),
                  title: Text('Salir',
                      style: GoogleFonts.inter(color: const Color(0xFFEF6B6B))),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProjectHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.projectName,
          style: GoogleFonts.spaceGrotesk(
            fontSize: 28,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => setState(() => _menuOpen = !_menuOpen),
          icon: Icon(_menuOpen ? Icons.close : Icons.menu, size: 19),
          label: const Text('Menú'),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.white,
            backgroundColor: const Color(0xD9111419),
            side: BorderSide(color: LoginColors.accent.withValues(alpha: 0.4)),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        ),
      ],
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
    final items = _isAdmin ? [..._menuItems, 'Roles'] : _menuItems;
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xE6111419),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        children: items
            .map(
              (item) => InkWell(
                onTap: () => _showMenuMessage(item),
                child: Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                  child: Text(
                    item,
                    style: GoogleFonts.inter(
                      color:
                          item == 'Roles' ? LoginColors.accent : Colors.white,
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
        ? 4
        : width >= 720
            ? 2
            : 1;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _moduleItems.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        mainAxisExtent: compact ? 205 : 270,
      ),
      itemBuilder: (context, index) {
        final module = _moduleItems[index];
        return InkWell(
          onTap: module.name == 'Guión'
              ? _openGuion
              : () => _showModuleMessage(module.name),
          borderRadius: BorderRadius.circular(15),
          child: Container(
            padding: EdgeInsets.all(compact ? 20 : 28),
            decoration: BoxDecoration(
              color: const Color(0xF21A1A1A),
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
              boxShadow: const [
                BoxShadow(
                    color: Colors.black45, blurRadius: 16, offset: Offset(0, 8))
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: compact ? 58 : 78,
                  height: compact ? 58 : 78,
                  decoration: BoxDecoration(
                      color: module.color, shape: BoxShape.circle),
                  child: Icon(module.icon,
                      color: Colors.white, size: compact ? 27 : 36),
                ),
                const SizedBox(height: 18),
                Text(
                  module.name,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.spaceGrotesk(
                    fontSize: compact ? 16 : 19,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: module.name == 'Guión'
                      ? _openGuion
                      : () => _showModuleMessage(module.name),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF0B4F8A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 22, vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Ver más'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildActivity() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xE6111419),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ACTIVIDAD RECIENTE',
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.4,
              color: LoginColors.accent,
            ),
          ),
          const SizedBox(height: 5),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Últimas actualizaciones',
                  style: GoogleFonts.spaceGrotesk(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
              Text('0 registros',
                  style:
                      GoogleFonts.inter(fontSize: 12, color: Colors.white60)),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.035),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              'Aún no hay actividad en el plan de rodaje.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: Colors.white60),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackButton() {
    return Align(
      alignment: Alignment.centerLeft,
      child: TextButton.icon(
        onPressed: () => Navigator.of(context).pop(),
        icon: const Icon(Icons.arrow_back, size: 17),
        label: const Text('Volver a Proyectos'),
        style: TextButton.styleFrom(foregroundColor: Colors.white70),
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
