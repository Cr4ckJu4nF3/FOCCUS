import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/session.dart';
import '../widgets/codigo_chip.dart';
import '../widgets/foccus_ui.dart';
import 'login_screen.dart' show LoginColors;

const _sinConexion = 'No se pudo conectar con el servidor';

const _departamentos = [
  'Elenco',
  'Extras / BG',
  'Bits',
  'Props',
  'Vestuario',
  'Maquillaje y Pelo',
  'Maquillaje FX',
  'Arte',
  'Cámara',
  'Sonido',
  'SFX',
  'VFX',
  'Stunts',
  'Vehículos',
  'Animales',
  'Armas',
  'Crew Adicional',
  'Notas',
];

/// Estado vacio que permite jalar para refrescar.
Widget _vacioRefresh(
    Future<void> Function() onRefresh, String msg, IconData icon) {
  return RefreshIndicator(
    onRefresh: onRefresh,
    child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(height: 320, child: EmptyView(message: msg, icon: icon)),
      ],
    ),
  );
}

String _txt(dynamic v) => v == null ? '' : v.toString();

List<Map<String, dynamic>> _mapas(dynamic v) => v is List
    ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
    : <Map<String, dynamic>>[];

// ---------------------------------------------------------------------------
// PANTALLA PRINCIPAL: elegir guion + lista de escenas
// ---------------------------------------------------------------------------
class DesgloseScreen extends StatefulWidget {
  const DesgloseScreen(
      {super.key, required this.projectId, required this.projectName});

  final String projectId;
  final String projectName;

  @override
  State<DesgloseScreen> createState() => _DesgloseScreenState();
}

class _DesgloseScreenState extends State<DesgloseScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _guiones = [];
  String? _guionId;
  List<Map<String, dynamic>> _escenas = [];
  bool _loadingEscenas = false;

  @override
  void initState() {
    super.initState();
    _cargarGuiones();
  }

  Future<void> _cargarGuiones() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await ApiClient.get('/guiones?id_project=${widget.projectId}');
      if (!mounted) return;
      if (!r.success) {
        setState(() {
          _loading = false;
          _error = r.errorMessage('No se pudieron cargar los guiones');
        });
        return;
      }
      _guiones = _mapas(r.list);
      _guionId = _guiones.isEmpty ? null : _txt(_guiones.first['id_guion']);
      setState(() => _loading = false);
      if (_guionId != null) _cargarDesglose();
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _sinConexion;
      });
    }
  }

  Future<void> _cargarDesglose() async {
    if (_guionId == null) return;
    setState(() => _loadingEscenas = true);
    try {
      final r = await ApiClient.get('/guiones/$_guionId/desglose');
      if (!mounted) return;
      setState(() {
        _loadingEscenas = false;
        if (r.success) {
          _escenas = _mapas(r.list);
        } else {
          _escenas = [];
          showSnack(context, r.errorMessage('No se pudo cargar el desglose'),
              error: true);
        }
      });
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() => _loadingEscenas = false);
      showSnack(context, _sinConexion, error: true);
    }
  }

  Future<void> _importar() async {
    if (_guionId == null) return;
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );
    final path = files.isEmpty ? null : files.first.path;
    if (path == null || !mounted) return;
    try {
      final r = await ApiClient.uploadFiles(
        '/guiones/$_guionId/desglose/importar',
        files: [MapEntry('archivo', path)],
      );
      if (!mounted) return;
      if (r.success) {
        showSnack(
            context, r.body['message']?.toString() ?? 'Desglose importado');
        _cargarDesglose();
      } else {
        showSnack(context, r.errorMessage('No se pudo importar el PDF'),
            error: true);
      }
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, _sinConexion, error: true);
    }
  }

  Future<void> _abrirEscena(Map<String, dynamic> e) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _EscenaDesglose(
          projectId: widget.projectId,
          idEscena: _txt(e['id_escena']),
          titulo: 'Escena ${_txt(e['numero_de_escena'])}',
        ),
      ),
    );
    if (mounted) _cargarDesglose();
  }

  @override
  Widget build(BuildContext context) {
    return FoccusScaffold(
      title: 'Desglose',
      subtitle: widget.projectName,
      actions: [
        if (Session.isProjectAdmin && _guionId != null)
          IconButton(
            tooltip: 'Importar PDF',
            icon: const Icon(Icons.upload_file),
            onPressed: _importar,
          ),
      ],
      body: _body(),
    );
  }

  Widget _body() => FoccusSwitcher(child: _stateBody());

  Widget _stateBody() {
    if (_loading) return const LoadingView(key: ValueKey('loading'));
    if (_error != null) {
      return ErrorView(
          key: const ValueKey('error'),
          message: _error!,
          onRetry: _cargarGuiones);
    }
    if (_guiones.isEmpty) {
      return const EmptyView(
          key: ValueKey('empty'),
          message: 'Este proyecto no tiene guiones',
          icon: Icons.description_outlined);
    }
    return Column(
      key: const ValueKey('content'),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: DropdownButtonFormField<String>(
            initialValue: _guionId,
            isExpanded: true,
            dropdownColor: context.fc.surface,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Guion'),
            items: _guiones
                .map((g) => DropdownMenuItem(
                    value: _txt(g['id_guion']), child: Text(_txt(g['nombre']))))
                .toList(),
            onChanged: (v) {
              setState(() => _guionId = v);
              _cargarDesglose();
            },
          ),
        ),
        Expanded(
          child: FoccusSwitcher(
            child: _loadingEscenas
                ? const LoadingView(key: ValueKey('loading'))
                : _escenas.isEmpty
                    ? KeyedSubtree(
                        key: const ValueKey('empty'),
                        child: _vacioRefresh(_cargarDesglose,
                            'El guion no tiene escenas', Icons.theaters))
                    : RefreshIndicator(
                        key: const ValueKey('content'),
                        onRefresh: _cargarDesglose,
                        child: _listaAgrupada(),
                      ),
          ),
        ),
      ],
    );
  }

  /// Escenas agrupadas por dia dramatico.
  Widget _listaAgrupada() {
    final items = <Widget>[];
    String? diaActual;
    var n = 0;
    for (final e in _escenas) {
      final dia = _txt(e['dia_dramatico']).isEmpty
          ? 'Sin dia asignado'
          : 'Dia ${_txt(e['dia_dramatico'])}';
      if (dia != diaActual) {
        diaActual = dia;
        items.add(Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 8),
          child: Text(dia,
              style: GoogleFonts.inter(
                  color: context.fc.accentText,
                  fontSize: 15,
                  fontWeight: FontWeight.w700)),
        ));
      }
      items.add(FadeSlideIn(index: n++, child: _tarjetaEscena(e)));
    }
    return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: FoccusDims.list,
        children: items);
  }

  Widget _tarjetaEscena(Map<String, dynamic> e) {
    final resumen = _mapas(e['resumen_departamentos']);
    final galeria = _mapas(e['elementos_galeria']);
    return FoccusCard(
      onTap: () => _abrirEscena(e),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                    '#${_txt(e['numero_de_escena'])} ${_txt(e['encabezado'])}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                        color: context.fc.text, fontWeight: FontWeight.w700)),
              ),
              StatusChip('${e['total_requerimientos'] ?? 0} req.'),
            ],
          ),
          if (codigoDe(e['codigo']) != null) ...[
            const SizedBox(height: 6),
            CodigoChip(codigoDe(e['codigo'])),
          ],
          if (resumen.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final d in resumen)
                  StatusChip(
                      '${_txt(d['departamento'])}: ${_txt(d['cantidad'])}',
                      color: const Color(0xFF2563EB)),
              ],
            ),
          ],
          if (galeria.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final g in galeria)
                  StatusChip(_txt(g['nombre']), color: const Color(0xFF16A34A)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// DETALLE DE UNA ESCENA: pestañas Requerimientos / Galeria
// ---------------------------------------------------------------------------
class _EscenaDesglose extends StatefulWidget {
  const _EscenaDesglose(
      {required this.projectId, required this.idEscena, required this.titulo});
  final String projectId;
  final String idEscena;
  final String titulo;

  @override
  State<_EscenaDesglose> createState() => _EscenaDesgloseState();
}

class _EscenaDesgloseState extends State<_EscenaDesglose>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _reqs = [];
  List<Map<String, dynamic>> _galeria = [];

  @override
  void initState() {
    super.initState();
    _tabs.addListener(() => setState(() {}));
    _cargar();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await ApiClient.get('/escenas/${widget.idEscena}/desglose');
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (r.success) {
          _reqs = _mapas(r.data['requerimientos']);
          _galeria = _mapas(r.data['elementos_galeria']);
        } else {
          _error = r.errorMessage('No se pudo cargar el desglose');
        }
      });
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _sinConexion;
      });
    }
  }

  Future<void> _accion(Future<ApiResponse> Function() fn, String falla) async {
    try {
      final r = await fn();
      if (!mounted) return;
      if (r.success) {
        _cargar();
      } else {
        showSnack(context, r.errorMessage(falla), error: true);
      }
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, _sinConexion, error: true);
    }
  }

  Future<void> _formReq([Map<String, dynamic>? req]) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _ReqForm(idEscena: widget.idEscena, req: req),
    );
    if (ok == true) _cargar();
  }

  Future<void> _eliminarReq(Map<String, dynamic> req) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.fc.surface,
        title: Text('Eliminar requerimiento?',
            style: TextStyle(color: context.fc.text)),
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
    if (ok != true) return;
    await _accion(
        () => ApiClient.delete(
            '/desglose/requerimientos/${_txt(req['id_requerimiento'])}'),
        'No se pudo eliminar');
  }

  Future<void> _vincular() async {
    try {
      final r = await ApiClient.get('/projects/${widget.projectId}/galeria');
      if (!mounted) return;
      if (!r.success) {
        showSnack(context, r.errorMessage('No se pudo cargar la galeria'),
            error: true);
        return;
      }
      final yaVinculados = _galeria.map((g) => _txt(g['id_galeria'])).toSet();
      final libres = _mapas(r.list)
          .where((g) => !yaVinculados.contains(_txt(g['id_galeria'])))
          .toList();
      if (libres.isEmpty) {
        showSnack(context, 'No hay elementos de galeria para vincular');
        return;
      }
      final elegido = await showModalBottomSheet<String>(
        context: context,
        useSafeArea: true,
        showDragHandle: true,
        builder: (ctx) => ListView(
          padding: const EdgeInsets.only(bottom: 16),
          children: [
            for (final g in libres)
              ListTile(
                leading: SizedBox(
                  width: 44,
                  height: 44,
                  child: FoccusNetworkImage(g['archivo_path']?.toString()),
                ),
                title: Text(_txt(g['nombre']),
                    style: TextStyle(color: ctx.fc.text)),
                subtitle: Text(_txt(g['tipo']),
                    style: TextStyle(color: ctx.fc.textMuted)),
                onTap: () => Navigator.pop(ctx, _txt(g['id_galeria'])),
              ),
          ],
        ),
      );
      if (elegido == null) return;
      await _accion(
        () => ApiClient.post('/escenas/${widget.idEscena}/desglose/galeria',
            body: {'id_galeria': int.parse(elegido)}),
        'No se pudo vincular el elemento',
      );
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, _sinConexion, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = Session.isProjectAdmin;
    final fc = context.fc;
    return Scaffold(
      backgroundColor: fc.bg,
      appBar: AppBar(
        backgroundColor: fc.appBar,
        foregroundColor: fc.text,
        title: Text(widget.titulo,
            style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: LoginColors.accent,
          labelColor: fc.text,
          unselectedLabelColor: fc.textMuted,
          tabs: const [Tab(text: 'Requerimientos'), Tab(text: 'Galeria')],
        ),
      ),
      floatingActionButton: admin && !_loading && _error == null
          ? FoccusFab(
              icon: _tabs.index == 0 ? Icons.add : Icons.link,
              label: _tabs.index == 0 ? 'Requerimiento' : 'Vincular',
              onPressed: _tabs.index == 0 ? () => _formReq() : _vincular)
          : null,
      body: SafeArea(
        child: FoccusSwitcher(
          child: _loading
              ? const LoadingView(key: ValueKey('loading'))
              : _error != null
                  ? ErrorView(
                      key: const ValueKey('error'),
                      message: _error!,
                      onRetry: _cargar)
                  : TabBarView(
                      key: const ValueKey('content'),
                      controller: _tabs,
                      children: [_tabReqs(admin), _tabGaleria(admin)],
                    ),
        ),
      ),
    );
  }

  Widget _tabReqs(bool admin) {
    if (_reqs.isEmpty) {
      return _vacioRefresh(_cargar, 'Sin requerimientos', Icons.checklist_rtl);
    }
    // Agrupados por departamento
    final porDep = <String, List<Map<String, dynamic>>>{};
    for (final r in _reqs) {
      porDep.putIfAbsent(_txt(r['departamento']), () => []).add(r);
    }
    var n = 0;
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: FoccusDims.list,
        children: [
          for (final entry in porDep.entries) ...[
            Padding(
              padding: const EdgeInsets.only(top: 6, bottom: 8),
              child: Text(entry.key,
                  style: GoogleFonts.inter(
                      color: context.fc.accentText,
                      fontSize: 15,
                      fontWeight: FontWeight.w700)),
            ),
            for (final r in entry.value)
              FadeSlideIn(
                index: n++,
                child: FoccusCard(
                onTap: admin ? () => _formReq(r) : null,
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                              '${_txt(r['etiqueta']).isEmpty ? '(sin etiqueta)' : _txt(r['etiqueta'])}  x${_txt(r['cantidad'])}',
                              style: GoogleFonts.inter(color: context.fc.text)),
                          if (_txt(r['notas']).isNotEmpty)
                            Text(_txt(r['notas']),
                                style: GoogleFonts.inter(
                                    color: context.fc.textMuted)),
                        ],
                      ),
                    ),
                    if (admin)
                      IconButton(
                        icon: Icon(Icons.delete_outline,
                            color: context.fc.error),
                        onPressed: () => _eliminarReq(r),
                      ),
                  ],
                ),
              )),
          ],
        ],
      ),
    );
  }

  Widget _tabGaleria(bool admin) {
    if (_galeria.isEmpty) {
      return _vacioRefresh(_cargar, 'Sin elementos de galeria vinculados',
          Icons.photo_library_outlined);
    }
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: FoccusDims.list,
        itemCount: _galeria.length,
        itemBuilder: (_, i) {
          final g = _galeria[i];
          return FadeSlideIn(
              index: i,
              child: FoccusCard(
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: FoccusNetworkImage(g['archivo_path']?.toString(),
                      width: 60, height: 60),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_txt(g['nombre']),
                          style: GoogleFonts.inter(
                              color: context.fc.text,
                              fontWeight: FontWeight.w700)),
                      Text(
                          [_txt(g['tipo']), _txt(g['categoria'])]
                              .where((s) => s.isNotEmpty)
                              .join(' · '),
                          style: GoogleFonts.inter(color: context.fc.textSubtle)),
                      if (_txt(g['etiquetas']).isNotEmpty)
                        Text(_txt(g['etiquetas']),
                            style: GoogleFonts.inter(
                                color: context.fc.textMuted)),
                      if (_txt(g['notas']).isNotEmpty)
                        Text(_txt(g['notas']),
                            style: GoogleFonts.inter(
                                color: context.fc.textMuted)),
                    ],
                  ),
                ),
                if (admin)
                  IconButton(
                    icon: Icon(Icons.link_off, color: context.fc.error),
                    onPressed: () => _accion(
                        () => ApiClient.delete(
                            '/escenas/${widget.idEscena}/desglose/galeria/${_txt(g['id_galeria'])}'),
                        'No se pudo desvincular'),
                  ),
              ],
            ),
          ));
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// FORMULARIO REQUERIMIENTO
// ---------------------------------------------------------------------------
class _ReqForm extends StatefulWidget {
  const _ReqForm({required this.idEscena, this.req});
  final String idEscena;
  final Map<String, dynamic>? req;

  @override
  State<_ReqForm> createState() => _ReqFormState();
}

class _ReqFormState extends State<_ReqForm> {
  late final TextEditingController _etiqueta;
  late final TextEditingController _cantidad;
  late final TextEditingController _notas;
  String _dep = _departamentos.first;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final r = widget.req ?? {};
    _etiqueta = TextEditingController(text: _txt(r['etiqueta']));
    _cantidad = TextEditingController(
        text: _txt(r['cantidad']).isEmpty ? '1' : _txt(r['cantidad']));
    _notas = TextEditingController(text: _txt(r['notas']));
    if (_departamentos.contains(_txt(r['departamento']))) {
      _dep = _txt(r['departamento']);
    }
  }

  @override
  void dispose() {
    _etiqueta.dispose();
    _cantidad.dispose();
    _notas.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    final body = <String, dynamic>{
      'departamento': _dep,
      'etiqueta': _etiqueta.text.trim().isEmpty ? null : _etiqueta.text.trim(),
      'cantidad': int.tryParse(_cantidad.text.trim()) ?? 1,
      'notas': _notas.text.trim().isEmpty ? null : _notas.text.trim(),
    };
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final r = widget.req != null
          ? await ApiClient.patch(
              '/desglose/requerimientos/${widget.req!['id_requerimiento']}',
              body: body)
          : await ApiClient.post(
              '/escenas/${widget.idEscena}/desglose/requerimientos',
              body: body);
      if (!mounted) return;
      if (r.success) {
        Navigator.pop(context, true);
      } else {
        setState(() {
          _saving = false;
          _error = r.errorMessage('No se pudo guardar');
        });
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = _sinConexion;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
                widget.req == null
                    ? 'Nuevo requerimiento'
                    : 'Editar requerimiento',
                style: GoogleFonts.inter(
                    color: context.fc.text,
                    fontSize: 20,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _dep,
              isExpanded: true,
              dropdownColor: context.fc.surface,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Departamento'),
              items: _departamentos
                  .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                  .toList(),
              onChanged: (v) {
                if (v != null) setState(() => _dep = v);
              },
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _etiqueta,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Etiqueta'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _cantidad,
              keyboardType: TextInputType.number,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Cantidad'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _notas,
              maxLines: 2,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Notas'),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(_error!,
                    style: TextStyle(color: context.fc.error, fontSize: 14)),
              ),
            const SizedBox(height: 16),
            FoccusButton(
              label: 'Guardar',
              loading: _saving,
              onPressed: _guardar,
            ),
          ],
        ),
      ),
    );
  }
}
