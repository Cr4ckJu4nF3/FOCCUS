import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/session.dart';
import '../widgets/codigo_chip.dart';
import '../widgets/foccus_ui.dart';
import 'login_screen.dart' show LoginColors;

const _estados = [
  'Pendiente',
  'Confirmado',
  'En Rodaje',
  'Finalizado',
  'Completado'
];
const _sinConexion = 'No se pudo conectar con el servidor';

Color _colorEstado(String? estado) {
  switch (estado) {
    case 'Confirmado':
      return const Color(0xFF2563EB);
    case 'En Rodaje':
      return const Color(0xFFD97706);
    case 'Finalizado':
    case 'Completado':
      return const Color(0xFF16A34A);
    default:
      return const Color(0xFF64748B);
  }
}

String _txt(dynamic v) => v == null ? '' : v.toString();

/// Campo de fecha: abre un selector y guarda el texto como AAAA-MM-DD.
class _DateField extends StatelessWidget {
  const _DateField({required this.controller, required this.label});
  final TextEditingController controller;
  final String label;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      readOnly: true,
      style: TextStyle(color: context.fc.text),
      decoration: foccusInput(label, hint: 'AAAA-MM-DD'),
      onTap: () async {
        final actual = DateTime.tryParse(controller.text) ?? DateTime.now();
        final f = await showDatePicker(
          context: context,
          initialDate: actual,
          firstDate: DateTime(2000),
          lastDate: DateTime(2100),
        );
        if (f != null) {
          controller.text =
              '${f.year}-${f.month.toString().padLeft(2, '0')}-${f.day.toString().padLeft(2, '0')}';
        }
      },
    );
  }
}

Widget _dropdownEstado(
    BuildContext context, String value, ValueChanged<String> onChanged) {
  return DropdownButtonFormField<String>(
    initialValue: _estados.contains(value) ? value : 'Pendiente',
    dropdownColor: context.fc.surface,
    style: TextStyle(color: context.fc.text),
    decoration: foccusInput('Estado'),
    items: _estados
        .map((e) => DropdownMenuItem(value: e, child: Text(e)))
        .toList(),
    onChanged: (v) {
      if (v != null) onChanged(v);
    },
  );
}

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

Future<bool> _confirmar(BuildContext context, String texto) async {
  final r = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: context.fc.surface,
      title: Text(texto, style: TextStyle(color: context.fc.text)),
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
  return r == true;
}

// ---------------------------------------------------------------------------
// LISTA DE RODAJES
// ---------------------------------------------------------------------------
class RodajeScreen extends StatefulWidget {
  const RodajeScreen(
      {super.key, required this.projectId, required this.projectName});

  final String projectId;
  final String projectName;

  @override
  State<RodajeScreen> createState() => _RodajeScreenState();
}

class _RodajeScreenState extends State<RodajeScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _rodajes = [];

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await ApiClient.get('/projects/${widget.projectId}/rodajes');
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (r.success) {
          _rodajes = r.list;
        } else {
          _error = r.errorMessage('No se pudieron cargar los rodajes');
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

  Future<void> _formulario([Map<String, dynamic>? rodaje]) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _RodajeForm(projectId: widget.projectId, rodaje: rodaje),
    );
    if (ok == true) _cargar();
  }

  Future<void> _importar() async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );
    final path = files.isEmpty ? null : files.first.path;
    if (path == null || !mounted) return;
    try {
      final r = await ApiClient.uploadFiles(
        '/projects/${widget.projectId}/rodajes/importar',
        files: [MapEntry('archivo', path)],
      );
      if (!mounted) return;
      if (r.success) {
        showSnack(
            context, r.body['message']?.toString() ?? 'Cronograma importado');
        _cargar();
      } else {
        showSnack(context, r.errorMessage('No se pudo importar el PDF'),
            error: true);
      }
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, _sinConexion, error: true);
    }
  }

  Future<void> _abrir(Map<String, dynamic> r) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _RodajeDetalle(
          projectId: widget.projectId,
          idRodaje: _txt(r['id_rodaje']),
          titulo: _txt(r['nombre']),
        ),
      ),
    );
    if (mounted) _cargar();
  }

  @override
  Widget build(BuildContext context) {
    final admin = Session.isProjectAdmin;
    return FoccusScaffold(
      title: 'Plan de rodaje',
      subtitle: widget.projectName,
      actions: [
        if (admin)
          IconButton(
            tooltip: 'Importar PDF',
            icon: const Icon(Icons.upload_file),
            onPressed: _importar,
          ),
      ],
      floatingActionButton: admin
          ? FoccusFab(label: 'Nuevo día', onPressed: () => _formulario())
          : null,
      body: _body(),
    );
  }

  Widget _body() => FoccusSwitcher(child: _stateBody());

  Widget _stateBody() {
    if (_loading) return const LoadingView(key: ValueKey('loading'));
    if (_error != null) {
      return ErrorView(
          key: const ValueKey('error'), message: _error!, onRetry: _cargar);
    }
    if (_rodajes.isEmpty) {
      return KeyedSubtree(
          key: const ValueKey('empty'),
          child: _vacioRefresh(
              _cargar, 'Aun no hay dias de rodaje', Icons.movie_outlined));
    }
    return RefreshIndicator(
      key: const ValueKey('content'),
      onRefresh: _cargar,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: FoccusDims.list,
        itemCount: _rodajes.length,
        itemBuilder: (_, i) {
          final r = Map<String, dynamic>.from(_rodajes[i] as Map);
          final estado =
              _txt(r['estado']).isEmpty ? 'Pendiente' : _txt(r['estado']);
          final fechas = _txt(r['fecha_fin']).isEmpty
              ? _txt(r['fecha_inicio'])
              : '${_txt(r['fecha_inicio'])} → ${_txt(r['fecha_fin'])}';
          return FadeSlideIn(
              index: i,
              child: FoccusCard(
            onTap: () => _abrir(r),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(_txt(r['nombre']),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                              color: context.fc.text,
                              fontWeight: FontWeight.w700,
                              fontSize: 16)),
                    ),
                    StatusChip(estado, color: _colorEstado(estado)),
                  ],
                ),
                const SizedBox(height: 8),
                if (codigoDe(r['codigo']) != null) ...[
                  CodigoChip(codigoDe(r['codigo'])),
                  const SizedBox(height: 6),
                ],
                Text(fechas,
                    style: GoogleFonts.inter(color: context.fc.textMuted)),
                if (_txt(r['locacion']).isNotEmpty)
                  Text('📍 ${_txt(r['locacion'])}',
                      style: GoogleFonts.inter(color: context.fc.textSubtle)),
              ],
            ),
          ));
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// FORMULARIO CREAR / EDITAR RODAJE
// ---------------------------------------------------------------------------
class _RodajeForm extends StatefulWidget {
  const _RodajeForm({required this.projectId, this.rodaje});
  final String projectId;
  final Map<String, dynamic>? rodaje;

  @override
  State<_RodajeForm> createState() => _RodajeFormState();
}

class _RodajeFormState extends State<_RodajeForm> {
  late final TextEditingController _nombre;
  late final TextEditingController _desc;
  late final TextEditingController _inicio;
  late final TextEditingController _fin;
  late final TextEditingController _llamado;
  late final TextEditingController _locacion;
  late final TextEditingController _dia;
  late final TextEditingController _semana;
  String _estado = 'Pendiente';
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final r = widget.rodaje ?? {};
    _nombre = TextEditingController(text: _txt(r['nombre']));
    _desc = TextEditingController(text: _txt(r['descripcion']));
    _inicio = TextEditingController(text: _txt(r['fecha_inicio']));
    _fin = TextEditingController(text: _txt(r['fecha_fin']));
    _llamado = TextEditingController(text: _txt(r['llamado']));
    _locacion = TextEditingController(text: _txt(r['locacion']));
    _dia = TextEditingController(text: _txt(r['dia_dramatico']));
    _semana = TextEditingController(text: _txt(r['semana']));
    if (_txt(r['estado']).isNotEmpty) _estado = _txt(r['estado']);
  }

  @override
  void dispose() {
    for (final c in [
      _nombre,
      _desc,
      _inicio,
      _fin,
      _llamado,
      _locacion,
      _dia,
      _semana
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _guardar() async {
    if (_nombre.text.trim().isEmpty || _inicio.text.trim().isEmpty) {
      setState(() => _error = 'Nombre y fecha de inicio son obligatorios');
      return;
    }
    String? vacio(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    final body = <String, dynamic>{
      'nombre': _nombre.text.trim(),
      'descripcion': vacio(_desc),
      'fecha_inicio': _inicio.text.trim(),
      'fecha_fin': vacio(_fin),
      'dia_dramatico': int.tryParse(_dia.text.trim()),
      'semana': int.tryParse(_semana.text.trim()),
      'llamado': vacio(_llamado),
      'locacion': vacio(_locacion),
      'estado': _estado,
    };
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final editando = widget.rodaje != null;
      final r = editando
          ? await ApiClient.patch('/rodajes/${widget.rodaje!['id_rodaje']}',
              body: body)
          : await ApiClient.post('/rodajes',
              body: {...body, 'id_project': widget.projectId});
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

  Widget _campo(TextEditingController c, String label,
      {TextInputType? type, int lines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextField(
        controller: c,
        keyboardType: type,
        maxLines: lines,
        style: TextStyle(color: context.fc.text),
        decoration: foccusInput(label),
      ),
    );
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
                widget.rodaje == null ? 'Nuevo dia de rodaje' : 'Editar rodaje',
                style: GoogleFonts.inter(
                    color: context.fc.text,
                    fontSize: 20,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            _campo(_nombre, 'Nombre'),
            _campo(_desc, 'Descripcion', lines: 2),
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _DateField(controller: _inicio, label: 'Fecha inicio')),
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _DateField(controller: _fin, label: 'Fecha fin')),
            _campo(_locacion, 'Locacion'),
            _campo(_llamado, 'Llamado'),
            _campo(_dia, 'Dia dramatico', type: TextInputType.number),
            _campo(_semana, 'Semana', type: TextInputType.number),
            _dropdownEstado(
                context, _estado, (v) => setState(() => _estado = v)),
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

// ---------------------------------------------------------------------------
// DETALLE: pestañas Escenas / Procesos
// ---------------------------------------------------------------------------
class _RodajeDetalle extends StatefulWidget {
  const _RodajeDetalle(
      {required this.projectId, required this.idRodaje, required this.titulo});
  final String projectId;
  final String idRodaje;
  final String titulo;

  @override
  State<_RodajeDetalle> createState() => _RodajeDetalleState();
}

class _RodajeDetalleState extends State<_RodajeDetalle>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _rodaje = {};
  List<dynamic> _procesos = [];

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
      final r = await ApiClient.get('/rodajes/${widget.idRodaje}');
      final p = await ApiClient.get('/rodajes/${widget.idRodaje}/procesos');
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (r.success) {
          _rodaje = r.data;
          _procesos = p.success ? p.list : [];
        } else {
          _error = r.errorMessage('No se pudo cargar el rodaje');
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

  /// Ejecuta una llamada, muestra error si falla y recarga si sale bien.
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

  Future<void> _editar() async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _RodajeForm(projectId: widget.projectId, rodaje: _rodaje),
    );
    if (ok == true) _cargar();
  }

  Future<void> _eliminar() async {
    if (!await _confirmar(context, 'Eliminar este dia de rodaje?')) return;
    if (!mounted) return;
    try {
      final r = await ApiClient.delete('/rodajes/${widget.idRodaje}');
      if (!mounted) return;
      if (r.success) {
        Navigator.pop(context);
      } else {
        showSnack(context, r.errorMessage('No se pudo eliminar'), error: true);
      }
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, _sinConexion, error: true);
    }
  }

  Future<void> _agregarEscena() async {
    try {
      final r = await ApiClient.get(
          '/projects/${widget.projectId}/escenas-disponibles');
      if (!mounted) return;
      if (!r.success) {
        showSnack(context, r.errorMessage('No se pudieron cargar las escenas'),
            error: true);
        return;
      }
      final disponibles = r.list;
      if (disponibles.isEmpty) {
        showSnack(context, 'No hay escenas disponibles');
        return;
      }
      final elegida = await showModalBottomSheet<String>(
        context: context,
        useSafeArea: true,
        showDragHandle: true,
        builder: (ctx) => ListView(
          padding: const EdgeInsets.only(bottom: 16),
          children: [
            for (final e in disponibles)
              ListTile(
                title: Text(
                    '#${_txt(e['numero_de_escena'])} ${_txt(e['encabezado'])}',
                    style: TextStyle(color: ctx.fc.text)),
                onTap: () => Navigator.pop(ctx, _txt(e['id_escena'])),
              ),
          ],
        ),
      );
      if (elegida == null) return;
      await _accion(
          () => ApiClient.post('/rodajes/${widget.idRodaje}/escenas/$elegida'),
          'No se pudo agregar la escena');
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, _sinConexion, error: true);
    }
  }

  Future<void> _formProceso([Map<String, dynamic>? proceso]) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _ProcesoForm(idRodaje: widget.idRodaje, proceso: proceso),
    );
    if (ok == true) _cargar();
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
        actions: [
          if (admin && !_loading && _error == null) ...[
            IconButton(
                icon: const Icon(Icons.edit_outlined), onPressed: _editar),
            IconButton(
                icon: const Icon(Icons.delete_outline), onPressed: _eliminar),
          ],
        ],
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: LoginColors.accent,
          labelColor: fc.text,
          unselectedLabelColor: fc.textMuted,
          tabs: const [Tab(text: 'Escenas'), Tab(text: 'Procesos')],
        ),
      ),
      floatingActionButton: admin && !_loading && _error == null
          ? FoccusFab(
              label: _tabs.index == 0 ? 'Agregar escena' : 'Nuevo proceso',
              onPressed:
                  _tabs.index == 0 ? _agregarEscena : () => _formProceso())
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
                  : Column(
                      key: const ValueKey('content'),
                      children: [
                        _resumen(),
                        Expanded(
                          child: TabBarView(
                            controller: _tabs,
                            children: [
                              _listaEscenas(admin),
                              _listaProcesos(admin)
                            ],
                          ),
                        ),
                      ],
                    ),
        ),
      ),
    );
  }

  Widget _resumen() {
    final estado =
        _txt(_rodaje['estado']).isEmpty ? 'Pendiente' : _txt(_rodaje['estado']);
    final fin = _txt(_rodaje['fecha_fin']);
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (codigoDe(_rodaje['codigo']) != null) ...[
                  CodigoChip(codigoDe(_rodaje['codigo'])),
                  const SizedBox(height: 6),
                ],
                Text(
                    fin.isEmpty
                        ? _txt(_rodaje['fecha_inicio'])
                        : '${_txt(_rodaje['fecha_inicio'])} → $fin',
                    style: GoogleFonts.inter(color: context.fc.text)),
                if (_txt(_rodaje['locacion']).isNotEmpty)
                  Text('📍 ${_txt(_rodaje['locacion'])}',
                      style: GoogleFonts.inter(color: context.fc.textSubtle)),
                if (_txt(_rodaje['llamado']).isNotEmpty)
                  Text('Llamado: ${_txt(_rodaje['llamado'])}',
                      style: GoogleFonts.inter(color: context.fc.textMuted)),
                if (_txt(_rodaje['descripcion']).isNotEmpty)
                  Text(_txt(_rodaje['descripcion']),
                      style: GoogleFonts.inter(color: context.fc.textMuted)),
              ],
            ),
          ),
          StatusChip(estado, color: _colorEstado(estado)),
        ],
      ),
    );
  }

  Widget _listaEscenas(bool admin) {
    final escenas =
        (_rodaje['escenas'] is List) ? _rodaje['escenas'] as List : [];
    if (escenas.isEmpty) {
      return _vacioRefresh(
          _cargar, 'Este dia no tiene escenas', Icons.theaters);
    }
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: FoccusDims.list,
        itemCount: escenas.length,
        itemBuilder: (_, i) {
          final e = Map<String, dynamic>.from(escenas[i] as Map);
          final estado = _txt(e['estado']);
          return FadeSlideIn(
              index: i,
              child: FoccusCard(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Escena ${_txt(e['numero_de_escena'])}',
                          style: GoogleFonts.inter(
                              color: context.fc.text,
                              fontWeight: FontWeight.w700)),
                      Text(_txt(e['encabezado']),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(color: context.fc.textSubtle)),
                      if (codigoDe(e['codigo']) != null) ...[
                        const SizedBox(height: 6),
                        CodigoChip(codigoDe(e['codigo'])),
                      ],
                      const SizedBox(height: 6),
                      if (estado.isNotEmpty)
                        StatusChip(estado, color: _colorEstado(estado)),
                    ],
                  ),
                ),
                if (admin)
                  IconButton(
                    icon: Icon(Icons.remove_circle_outline,
                        color: context.fc.error),
                    onPressed: () => _accion(
                        () => ApiClient.delete(
                            '/rodajes/${widget.idRodaje}/escenas/${_txt(e['id_escena'])}'),
                        'No se pudo quitar la escena'),
                  ),
              ],
            ),
          ));
        },
      ),
    );
  }

  Widget _listaProcesos(bool admin) {
    if (_procesos.isEmpty) {
      return _vacioRefresh(_cargar, 'Sin procesos', Icons.checklist);
    }
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: FoccusDims.list,
        itemCount: _procesos.length,
        itemBuilder: (_, i) {
          final p = Map<String, dynamic>.from(_procesos[i] as Map);
          final estado =
              _txt(p['estado']).isEmpty ? 'Pendiente' : _txt(p['estado']);
          return FadeSlideIn(
              index: i,
              child: FoccusCard(
            onTap: admin ? () => _formProceso(p) : null,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_txt(p['nombre']),
                          style: GoogleFonts.inter(
                              color: context.fc.text,
                              fontWeight: FontWeight.w700)),
                      Text('${_txt(p['fecha'])} · ${_txt(p['ubicacion'])}',
                          style: GoogleFonts.inter(color: context.fc.textSubtle)),
                      if (_txt(p['encargado']).isNotEmpty)
                        Text('Encargado: ${_txt(p['encargado'])}',
                            style: GoogleFonts.inter(
                                color: context.fc.textMuted)),
                      const SizedBox(height: 6),
                      StatusChip(estado, color: _colorEstado(estado)),
                    ],
                  ),
                ),
                if (admin)
                  IconButton(
                    icon: Icon(Icons.delete_outline, color: context.fc.error),
                    onPressed: () async {
                      if (!await _confirmar(context, 'Eliminar este proceso?')) {
                        return;
                      }
                      await _accion(
                          () => ApiClient.delete(
                              '/rodajes/procesos/${_txt(p['id_proceso'])}'),
                          'No se pudo eliminar el proceso');
                    },
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
// FORMULARIO PROCESO
// ---------------------------------------------------------------------------
class _ProcesoForm extends StatefulWidget {
  const _ProcesoForm({required this.idRodaje, this.proceso});
  final String idRodaje;
  final Map<String, dynamic>? proceso;

  @override
  State<_ProcesoForm> createState() => _ProcesoFormState();
}

class _ProcesoFormState extends State<_ProcesoForm> {
  late final TextEditingController _nombre;
  late final TextEditingController _ubicacion;
  late final TextEditingController _fecha;
  late final TextEditingController _encargado;
  late final TextEditingController _desc;
  String _estado = 'Pendiente';
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final p = widget.proceso ?? {};
    _nombre = TextEditingController(text: _txt(p['nombre']));
    _ubicacion = TextEditingController(text: _txt(p['ubicacion']));
    _fecha = TextEditingController(text: _txt(p['fecha']));
    _encargado = TextEditingController(text: _txt(p['encargado']));
    _desc = TextEditingController(text: _txt(p['descripcion']));
    if (_txt(p['estado']).isNotEmpty) _estado = _txt(p['estado']);
  }

  @override
  void dispose() {
    for (final c in [_nombre, _ubicacion, _fecha, _encargado, _desc]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _guardar() async {
    if (_nombre.text.trim().isEmpty ||
        _ubicacion.text.trim().isEmpty ||
        _fecha.text.trim().isEmpty) {
      setState(() => _error = 'Nombre, ubicacion y fecha son obligatorios');
      return;
    }
    final body = <String, dynamic>{
      'nombre': _nombre.text.trim(),
      'ubicacion': _ubicacion.text.trim(),
      'fecha': _fecha.text.trim(),
      'encargado':
          _encargado.text.trim().isEmpty ? null : _encargado.text.trim(),
      'descripcion': _desc.text.trim().isEmpty ? null : _desc.text.trim(),
      'estado': _estado,
    };
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final r = widget.proceso != null
          ? await ApiClient.patch(
              '/rodajes/procesos/${widget.proceso!['id_proceso']}',
              body: body)
          : await ApiClient.post('/rodajes/${widget.idRodaje}/procesos',
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

  Widget _campo(TextEditingController c, String label, {int lines = 1}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: TextField(
          controller: c,
          maxLines: lines,
          style: TextStyle(color: context.fc.text),
          decoration: foccusInput(label),
        ),
      );

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
            Text(widget.proceso == null ? 'Nuevo proceso' : 'Editar proceso',
                style: GoogleFonts.inter(
                    color: context.fc.text,
                    fontSize: 20,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            _campo(_nombre, 'Nombre'),
            _campo(_ubicacion, 'Ubicacion'),
            Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _DateField(controller: _fecha, label: 'Fecha')),
            _campo(_encargado, 'Encargado'),
            _campo(_desc, 'Descripcion', lines: 2),
            _dropdownEstado(
                context, _estado, (v) => setState(() => _estado = v)),
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
