import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/session.dart';
import '../widgets/foccus_ui.dart';
import 'login_screen.dart' show LoginColors;

/// Roles y equipo del proyecto (equivale a Roles.jsx). Solo admin.
class RolesScreen extends StatefulWidget {
  const RolesScreen(
      {super.key, required this.projectId, required this.projectName});

  final String projectId;
  final String projectName;

  @override
  State<RolesScreen> createState() => _RolesScreenState();
}

class _RolesScreenState extends State<RolesScreen> {
  // Roles de proyecto validos y nombres por defecto (como en la web).
  static const _defaultRoles = <int, String>{
    1001: 'Administrador',
    1002: 'Director',
    1003: 'Jefe de Departamento',
    1004: 'Onset',
    1005: 'Usuario',
  };

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _members = [];
  Map<int, String> _roles = Map.of(_defaultRoles);
  int? _savingUserId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient.get('/users/project/${widget.projectId}');
      final rolesRes = await ApiClient.get('/roles');
      if (!mounted) return;
      if (!res.ok) {
        setState(() {
          _error =
              res.errorMessage('No se pudo cargar los miembros del equipo');
          _loading = false;
        });
        return;
      }
      if (rolesRes.ok) {
        final map = <int, String>{};
        for (final r in rolesRes.list) {
          if (r is Map) {
            final id = int.tryParse('${r['id_rol']}');
            if (id != null && _defaultRoles.containsKey(id)) {
              map[id] = '${r['nombre']}';
            }
          }
        }
        if (map.isNotEmpty) _roles = map;
      }
      setState(() {
        _members = res.list.whereType<Map<String, dynamic>>().toList();
        _loading = false;
      });
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo conectar con el servidor';
        _loading = false;
      });
    }
  }

  String _roleName(int? id) => _roles[id] ?? _defaultRoles[id] ?? 'Sin rol';

  String _fullName(Map<String, dynamic> m) =>
      '${m['nombre'] ?? ''} ${m['apellido'] ?? ''}'.trim();

  bool _isMe(Map<String, dynamic> m) => '${m['id_user']}' == Session.idUser;

  Future<void> _changeRole(Map<String, dynamic> m, int newRole) async {
    final current = int.tryParse('${m['id_rol']}');
    if (newRole == current || _savingUserId != null) return;
    if (newRole == 1001) {
      final ok = await _confirm(
          '¿Dar permisos de administrador a ${_fullName(m)}?', 'Confirmar');
      if (!ok || !mounted) return;
    }
    setState(() => _savingUserId = m['id_user'] as int?);
    try {
      final res = await ApiClient.patch(
        '/users/${m['id_user']}/project/${widget.projectId}',
        body: {'id_rol': newRole},
      );
      if (!mounted) return;
      if (res.ok && res.body['success'] != false) {
        setState(() => m['id_rol'] = newRole);
        showSnack(context,
            'Rol de ${_fullName(m)} actualizado a ${_roleName(newRole)}');
      } else {
        showSnack(context, res.errorMessage('No se pudo actualizar el rol'),
            error: true);
      }
    } on ApiConnectionException {
      if (mounted) {
        showSnack(context, 'No se pudo conectar con el servidor', error: true);
      }
    }
    if (mounted) setState(() => _savingUserId = null);
  }

  Future<bool> _confirm(String text, String action) async {
    final r = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.fc.surface,
        content: Text(text, style: GoogleFonts.inter(color: context.fc.text)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true), child: Text(action)),
        ],
      ),
    );
    return r == true;
  }

  Future<void> _remove(Map<String, dynamic> m) async {
    final ok =
        await _confirm('¿Quitar a ${_fullName(m)} de este proyecto?', 'Quitar');
    if (!ok || !mounted) return;
    try {
      final res = await ApiClient.delete(
          '/users/${m['id_user']}/project/${widget.projectId}');
      if (!mounted) return;
      if (res.ok && res.body['success'] != false) {
        setState(() => _members.remove(m));
        showSnack(context, 'Miembro removido');
      } else {
        showSnack(context, res.errorMessage('No se pudo remover al usuario'),
            error: true);
      }
    } on ApiConnectionException {
      if (mounted) {
        showSnack(context, 'No se pudo conectar con el servidor', error: true);
      }
    }
  }

  Future<void> _openInvite() async {
    final invited = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: context.fc.surface,
      shape: const RoundedRectangleBorder(
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(FoccusDims.radiusSheet))),
      builder: (_) => _InviteSheet(projectId: widget.projectId, roles: _roles),
    );
    if (invited == true && mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    if (!Session.isProjectAdmin) {
      return FoccusScaffold(
        title: 'Roles y equipo',
        subtitle: widget.projectName,
        body: const EmptyView(
          message:
              'Solo los administradores del proyecto pueden gestionar el equipo.',
          icon: Icons.lock_outline,
        ),
      );
    }
    return FoccusScaffold(
      title: 'Roles y equipo',
      subtitle: widget.projectName,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: LoginColors.accent,
        foregroundColor: Colors.white,
        onPressed: _openInvite,
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('Invitar'),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() => FoccusSwitcher(child: _stateBody());

  Widget _stateBody() {
    if (_loading) return const LoadingView(key: ValueKey('loading'));
    if (_error != null) {
      return ErrorView(
          key: const ValueKey('error'), message: _error!, onRetry: _load);
    }
    if (_members.isEmpty) {
      return const EmptyView(
          key: ValueKey('empty'),
          message: 'Aún no hay miembros en este proyecto.',
          icon: Icons.group_outlined);
    }
    return RefreshIndicator(
      key: const ValueKey('content'),
      onRefresh: _load,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: FoccusDims.list,
        itemCount: _members.length + 1,
        itemBuilder: (_, i) => FadeSlideIn(
            index: i,
            child: i == 0 ? _membersHeader() : _memberCard(_members[i - 1])),
      ),
    );
  }

  Widget _membersHeader() => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: FoccusCard(
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFF7B5FCF).withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.groups_outlined,
                    color: context.fc.isDark
                        ? const Color(0xFF9D86EA)
                        : const Color(0xFF6D4FC2)),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Equipo del proyecto',
                        style: GoogleFonts.inter(
                            color: context.fc.text,
                            fontSize: 14,
                            fontWeight: FontWeight.w700)),
                    Text('Miembros y permisos',
                        style: GoogleFonts.inter(
                            color: context.fc.textMuted, fontSize: 13)),
                  ],
                ),
              ),
              Text('${_members.length}',
                  style: GoogleFonts.spaceGrotesk(
                      color: context.fc.text,
                      fontSize: 22,
                      fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      );

  Widget _memberCard(Map<String, dynamic> m) {
    final me = _isMe(m);
    final roleId = int.tryParse('${m['id_rol']}');
    final extra = [m['departamento'], m['cargo']]
        .where((e) => e != null && '$e'.trim().isNotEmpty)
        .join(' · ');
    return FoccusCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(_fullName(m) + (me ? ' (tú)' : ''),
                    style: GoogleFonts.inter(
                        color: context.fc.text,
                        fontWeight: FontWeight.w700,
                        fontSize: 15)),
              ),
              if (_savingUserId == m['id_user'])
                const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
              else
                StatusChip(_roleName(roleId)),
            ],
          ),
          const SizedBox(height: 4),
          Text('${m['mail'] ?? ''}',
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                  color: context.fc.textSubtle, fontSize: 14)),
          if (extra.isNotEmpty)
            Text(extra,
                style: GoogleFonts.inter(
                    color: context.fc.textMuted, fontSize: 13)),
          if (!me) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: DropdownButton<int>(
                    value: _roles.containsKey(roleId) ? roleId : null,
                    isExpanded: true,
                    dropdownColor: context.fc.surface,
                    hint: const Text('Cambiar rol'),
                    style: GoogleFonts.inter(color: context.fc.text),
                    items: _roles.entries
                        .map((e) => DropdownMenuItem(
                            value: e.key, child: Text(e.value)))
                        .toList(),
                    onChanged: _savingUserId != null
                        ? null
                        : (v) => v == null ? null : _changeRole(m, v),
                  ),
                ),
                IconButton(
                  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                  tooltip: 'Quitar del proyecto',
                  icon: Icon(Icons.person_remove_outlined,
                      color: context.fc.error),
                  onPressed: () => _remove(m),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// Hoja inferior para invitar a una persona por correo.
class _InviteSheet extends StatefulWidget {
  const _InviteSheet({required this.projectId, required this.roles});

  final String projectId;
  final Map<int, String> roles;

  @override
  State<_InviteSheet> createState() => _InviteSheetState();
}

class _InviteSheetState extends State<_InviteSheet> {
  final _mail = TextEditingController();
  final _nombre = TextEditingController();
  final _apellido = TextEditingController();
  final _depto = TextEditingController();
  int _rol = 1005;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _mail.dispose();
    _nombre.dispose();
    _apellido.dispose();
    _depto.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final mail = _mail.text.trim().toLowerCase();
    final nombre = _nombre.text.trim();
    final apellido = _apellido.text.trim();
    if (mail.isEmpty || nombre.isEmpty || apellido.isEmpty) {
      setState(() => _error = 'Completa el correo, nombre y apellido');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final depto = _depto.text.trim();
      final res = await ApiClient.post('/users/invite', body: {
        'correos': [mail],
        'nombres': {
          mail: {'nombre': nombre, 'apellido': apellido},
        },
        'id_project': widget.projectId,
        'id_client': int.tryParse(Session.idClient ?? '') ?? 0,
        'id_rol': _rol,
        'departamento': depto.isEmpty ? null : depto,
      });
      if (!mounted) return;
      if (res.ok && res.body['success'] == true) {
        final errores = res.data['errores'];
        final creados = res.data['usuarios_creados'];
        if (errores is List &&
            errores.isNotEmpty &&
            (creados is! List || creados.isEmpty)) {
          final txt = errores
              .map((e) => e is Map ? '${e['mail']}: ${e['error']}' : '$e')
              .join('. ');
          setState(() {
            _error = txt;
            _sending = false;
          });
          return;
        }
        showSnack(context, 'Invitación procesada');
        Navigator.pop(context, true);
      } else {
        setState(() {
          _error = res.errorMessage('Error al enviar invitaciones');
          _sending = false;
        });
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo conectar con el servidor';
        _sending = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 20, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Invitar al proyecto',
                style: GoogleFonts.inter(
                    color: context.fc.text,
                    fontSize: 18,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            if (_error != null) ...[
              Text(_error!,
                  style: GoogleFonts.inter(color: context.fc.error)),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: _mail,
              keyboardType: TextInputType.emailAddress,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Correo'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _nombre,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Nombre'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _apellido,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Apellido'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _depto,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Departamento (opcional)'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              initialValue: widget.roles.containsKey(_rol) ? _rol : null,
              dropdownColor: context.fc.surface,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Rol'),
              items: widget.roles.entries
                  .map((e) =>
                      DropdownMenuItem(value: e.key, child: Text(e.value)))
                  .toList(),
              onChanged: (v) => setState(() => _rol = v ?? 1005),
            ),
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(
                  backgroundColor: LoginColors.accent,
                  minimumSize: const Size.fromHeight(52)),
              onPressed: _sending ? null : _send,
              child: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Enviar invitación'),
            ),
          ],
        ),
      ),
    );
  }
}
