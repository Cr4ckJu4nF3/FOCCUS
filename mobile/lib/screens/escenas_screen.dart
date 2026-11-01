import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/session.dart';
import '../widgets/foccus_ui.dart';
import 'escena_detalle_screen.dart';

const List<String> kEstadosEscena = ['Pendiente', 'En Proceso', 'Finalizada'];
const List<String> _modoVista = ['Int', 'Ext', 'Int/Ext', 'Ext/Int'];
const List<String> _momentoDia = [
  'Día',
  'Noche',
  'Amanecer',
  'Atardecer',
  'Mañana',
  'Tarde'
];

const String kSinConexion = 'No se pudo conectar con el servidor';

Color colorEstadoEscena(String? estado) {
  final e = (estado ?? 'Pendiente').toLowerCase();
  if (e.contains('final')) return const Color(0xFF16A34A);
  if (e.contains('proceso')) return const Color(0xFFD97706);
  return const Color(0xFF64748B);
}

/// Pantalla principal: elige un guion y lista sus escenas.
class EscenasScreen extends StatefulWidget {
  const EscenasScreen(
      {super.key, required this.projectId, required this.projectName});

  final String projectId;
  final String projectName;

  @override
  State<EscenasScreen> createState() => _EscenasScreenState();
}

class _EscenasScreenState extends State<EscenasScreen> {
  List<Map<String, dynamic>> _guiones = [];
  List<Map<String, dynamic>> _escenas = [];
  String? _guionId;
  bool _loading = true;
  bool _loadingEscenas = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarGuiones();
  }

  List<Map<String, dynamic>> _maps(List<dynamic> l) =>
      l.whereType<Map<String, dynamic>>().toList();

  Future<void> _cargarGuiones() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res =
          await ApiClient.get('/guiones?id_project=${widget.projectId}');
      if (!mounted) return;
      if (!res.ok) {
        setState(() {
          _loading = false;
          _error = res.errorMessage('No se pudieron cargar los guiones');
        });
        return;
      }
      final guiones = _maps(res.list);
      setState(() {
        _guiones = guiones;
        _loading = false;
        if (guiones.isNotEmpty) {
          _guionId = guiones.first['id_guion'].toString();
        }
      });
      if (_guionId != null) await _cargarEscenas();
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = kSinConexion;
      });
    }
  }

  Future<void> _cargarEscenas() async {
    final id = _guionId;
    if (id == null) return;
    setState(() {
      _loadingEscenas = true;
      _error = null;
    });
    try {
      final res = await ApiClient.get('/guiones/$id/escenas');
      if (!mounted) return;
      setState(() {
        _loadingEscenas = false;
        if (res.ok) {
          _escenas = _maps(res.list);
        } else {
          _error = res.errorMessage('No se pudieron cargar las escenas');
        }
      });
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _loadingEscenas = false;
        _error = kSinConexion;
      });
    }
  }

  Future<void> _abrirFormulario([Map<String, dynamic>? escena]) async {
    final payload = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _EscenaForm(escena: escena),
    );
    if (payload == null || !mounted) return;
    try {
      final res = escena == null
          ? await ApiClient.post('/escenas',
              body: {...payload, 'id_guion': int.parse(_guionId!)})
          : await ApiClient.patch('/escenas/${escena['id_escena']}',
              body: payload);
      if (!mounted) return;
      if (res.ok) {
        showSnack(context, escena == null ? 'Escena creada' : 'Escena editada');
        _cargarEscenas();
      } else {
        showSnack(context, res.errorMessage('No se pudo guardar'), error: true);
      }
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, kSinConexion, error: true);
    }
  }

  Future<void> _eliminar(Map<String, dynamic> escena) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar escena'),
        content: Text('¿Eliminar la escena #${escena['numero_de_escena']}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Eliminar')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      final res = await ApiClient.delete('/escenas/${escena['id_escena']}');
      if (!mounted) return;
      if (res.ok) {
        showSnack(context, 'Escena eliminada');
        _cargarEscenas();
      } else {
        showSnack(context, res.errorMessage('No se pudo eliminar'),
            error: true);
      }
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, kSinConexion, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = Session.isProjectAdmin;
    return FoccusScaffold(
      title: 'Escenas',
      subtitle: widget.projectName,
      floatingActionButton: admin && _guionId != null
          ? FoccusFab(
              label: 'Nueva escena', onPressed: () => _abrirFormulario())
          : null,
      body: _buildBody(admin),
    );
  }

  Widget _buildBody(bool admin) => FoccusSwitcher(child: _stateBody(admin));

  Widget _stateBody(bool admin) {
    if (_loading) return const LoadingView(key: ValueKey('loading'));
    if (_error != null && _guiones.isEmpty) {
      return ErrorView(
          key: const ValueKey('error'),
          message: _error!,
          onRetry: _cargarGuiones);
    }
    if (_guiones.isEmpty) {
      return const EmptyView(
          key: ValueKey('empty'),
          message: 'Este proyecto aún no tiene guiones',
          icon: Icons.description_outlined);
    }
    return Column(
      key: const ValueKey('content'),
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: DropdownButtonFormField<String>(
            initialValue: _guionId,
            isExpanded: true,
            dropdownColor: context.fc.surface,
            style: GoogleFonts.inter(color: context.fc.text),
            decoration: foccusInput('Guion'),
            items: _guiones
                .map((g) => DropdownMenuItem(
                    value: g['id_guion'].toString(),
                    child: Text((g['nombre'] ?? 'Guion').toString())))
                .toList(),
            onChanged: (v) {
              setState(() => _guionId = v);
              _cargarEscenas();
            },
          ),
        ),
        Expanded(child: _buildLista(admin)),
      ],
    );
  }

  Widget _buildLista(bool admin) => FoccusSwitcher(child: _stateLista(admin));

  Widget _stateLista(bool admin) {
    if (_loadingEscenas) return const LoadingView(key: ValueKey('loading'));
    if (_error != null) {
      return ErrorView(
          key: const ValueKey('error'),
          message: _error!,
          onRetry: _cargarEscenas);
    }
    if (_escenas.isEmpty) {
      return RefreshIndicator(
        key: const ValueKey('empty'),
        onRefresh: _cargarEscenas,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(
              height: 320,
              child: EmptyView(
                  message: 'Este guion no tiene escenas',
                  icon: Icons.movie_creation_outlined),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      key: const ValueKey('content'),
      onRefresh: _cargarEscenas,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
        itemCount: _escenas.length,
        itemBuilder: (_, i) {
          final e = _escenas[i];
          final estado = (e['estado'] ?? 'Pendiente').toString();
          return FadeSlideIn(
              index: i,
              child: FoccusCard(
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) =>
                      EscenaDetalleScreen(idEscena: e['id_escena'].toString()),
                ),
              );
              if (mounted) _cargarEscenas();
            },
            child: Row(
              children: [
                Text('#${e['numero_de_escena']}',
                    style: GoogleFonts.inter(
                        color: context.fc.accentText,
                        fontWeight: FontWeight.w700,
                        fontSize: 16)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text((e['encabezado'] ?? '').toString(),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                              color: context.fc.text,
                              fontSize: 15,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      StatusChip(estado, color: colorEstadoEscena(estado)),
                    ],
                  ),
                ),
                if (admin)
                  PopupMenuButton<String>(
                    iconColor: context.fc.textMuted,
                    onSelected: (v) =>
                        v == 'editar' ? _abrirFormulario(e) : _eliminar(e),
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'editar', child: Text('Editar')),
                      PopupMenuItem(value: 'eliminar', child: Text('Eliminar')),
                    ],
                  ),
              ],
            ),
          ));
        },
      ),
    );
  }
}

/// Formulario (bottom sheet) para crear/editar. Devuelve el payload.
class _EscenaForm extends StatefulWidget {
  const _EscenaForm({this.escena});
  final Map<String, dynamic>? escena;

  @override
  State<_EscenaForm> createState() => _EscenaFormState();
}

class _EscenaFormState extends State<_EscenaForm> {
  final _numero = TextEditingController();
  final _encabezado = TextEditingController();
  final _descripcion = TextEditingController();
  final _ciudad = TextEditingController();
  final _pagina = TextEditingController();
  final _dia = TextEditingController();
  String _modo = 'Int';
  String _momento = 'Día';
  String _estado = 'Pendiente';

  @override
  void initState() {
    super.initState();
    final e = widget.escena;
    if (e != null) {
      _numero.text = (e['numero_de_escena'] ?? '').toString();
      _encabezado.text = (e['encabezado'] ?? '').toString();
      _descripcion.text = (e['descripcion'] ?? '').toString();
      _ciudad.text = (e['ciudad'] ?? '').toString();
      _pagina.text = e['pagina']?.toString() ?? '';
      _dia.text = e['dia_dramatico']?.toString() ?? '';
      if (_modoVista.contains(e['modo_vista'])) _modo = e['modo_vista'];
      if (_momentoDia.contains(e['momento_dia'])) _momento = e['momento_dia'];
      if (kEstadosEscena.contains(e['estado'])) _estado = e['estado'];
    }
  }

  @override
  void dispose() {
    for (final c in [
      _numero,
      _encabezado,
      _descripcion,
      _ciudad,
      _pagina,
      _dia
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _guardar() {
    if (_numero.text.trim().isEmpty || _encabezado.text.trim().isEmpty) {
      showSnack(context, 'Número y encabezado son obligatorios', error: true);
      return;
    }
    Navigator.pop(context, {
      'numero_de_escena': _numero.text.trim(),
      'encabezado': _encabezado.text.trim(),
      'descripcion':
          _descripcion.text.trim().isEmpty ? null : _descripcion.text.trim(),
      'modo_vista': _modo,
      'momento_dia': _momento,
      'ciudad': _ciudad.text.trim().isEmpty ? null : _ciudad.text.trim(),
      'pagina': int.tryParse(_pagina.text.trim()),
      'dia_dramatico': int.tryParse(_dia.text.trim()),
      'estado': _estado,
    });
  }

  Widget _drop(String label, String value, List<String> items,
      void Function(String) onChanged) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      dropdownColor: context.fc.surface,
      style: GoogleFonts.inter(color: context.fc.text),
      decoration: foccusInput(label),
      items:
          items.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
      onChanged: (v) => onChanged(v ?? value),
    );
  }

  Widget _field(String label, TextEditingController c,
      {bool number = false, int lines = 1}) {
    return TextField(
      controller: c,
      maxLines: lines,
      keyboardType: number ? TextInputType.number : TextInputType.text,
      style: TextStyle(color: context.fc.text),
      decoration: foccusInput(label),
    );
  }

  @override
  Widget build(BuildContext context) {
    const gap = SizedBox(height: 16);
    return Padding(
      padding: EdgeInsets.fromLTRB(
          16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.escena == null ? 'Nueva escena' : 'Editar escena',
                style: GoogleFonts.inter(
                    color: context.fc.text,
                    fontSize: 20,
                    fontWeight: FontWeight.w700)),
            gap,
            _field('Número de escena *', _numero),
            gap,
            _field('Encabezado *', _encabezado),
            gap,
            _field('Descripción', _descripcion, lines: 3),
            gap,
            _drop('Modo de vista', _modo, _modoVista,
                (v) => setState(() => _modo = v)),
            gap,
            _drop('Momento del día', _momento, _momentoDia,
                (v) => setState(() => _momento = v)),
            gap,
            _field('Ciudad', _ciudad),
            gap,
            _field('Página', _pagina, number: true),
            gap,
            _field('Día dramático', _dia, number: true),
            gap,
            _drop('Estado', _estado, kEstadosEscena,
                (v) => setState(() => _estado = v)),
            gap,
            FoccusButton(label: 'Guardar', onPressed: _guardar),
          ],
        ),
      ),
    );
  }
}
