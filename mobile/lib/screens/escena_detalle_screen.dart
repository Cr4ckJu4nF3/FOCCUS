import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../services/api_client.dart';
import '../services/session.dart';
import '../widgets/codigo_chip.dart';
import '../widgets/foccus_ui.dart';
import 'escenas_screen.dart' show colorEstadoEscena, kSinConexion;

const List<String> _tipos = ['vestuario', 'objeto', 'espacio'];

/// Detalle de una escena: datos, versiones y fotos de continuidad.
class EscenaDetalleScreen extends StatefulWidget {
  const EscenaDetalleScreen({super.key, required this.idEscena});

  final String idEscena;

  @override
  State<EscenaDetalleScreen> createState() => _EscenaDetalleScreenState();
}

class _EscenaDetalleScreenState extends State<EscenaDetalleScreen> {
  Map<String, dynamic> _escena = {};
  List<Map<String, dynamic>> _versiones = [];
  List<Map<String, dynamic>> _fotos = [];
  String? _versionId;
  bool _loading = true;
  bool _loadingFotos = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  List<Map<String, dynamic>> _maps(List<dynamic> l) =>
      l.whereType<Map<String, dynamic>>().toList();

  Future<void> _cargar() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient.get('/escenas/${widget.idEscena}');
      if (!mounted) return;
      if (!res.ok) {
        setState(() {
          _loading = false;
          _error = res.errorMessage('No se pudo cargar la escena');
        });
        return;
      }
      _escena = res.data;
      await _cargarVersiones();
      if (!mounted) return;
      setState(() => _loading = false);
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = kSinConexion;
      });
    }
  }

  Future<void> _cargarVersiones({String? seleccionar}) async {
    final res = await ApiClient.get('/escenas/${widget.idEscena}/versiones');
    if (!mounted) return;
    final versiones = res.ok ? _maps(res.list) : <Map<String, dynamic>>[];
    setState(() {
      _versiones = versiones;
      _versionId = seleccionar ??
          (versiones.isNotEmpty
              ? versiones.first['id_escena_version'].toString()
              : null);
      _fotos = [];
    });
    if (_versionId != null) await _cargarFotos();
  }

  Future<void> _cargarFotos() async {
    final id = _versionId;
    if (id == null) return;
    setState(() => _loadingFotos = true);
    try {
      final res = await ApiClient.get('/escenas/versiones/$id/fotos');
      if (!mounted) return;
      setState(() {
        _loadingFotos = false;
        _fotos = res.ok ? _maps(res.list) : [];
      });
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() => _loadingFotos = false);
      showSnack(context, kSinConexion, error: true);
    }
  }

  Future<void> _crearVersion() async {
    final ctrl = TextEditingController(text: 'Nueva versión de continuidad');
    final comentario = await showFoccusSheet<String>(
      context,
      title: 'Nueva versión',
      builder: (ctx) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
              controller: ctrl,
              style: TextStyle(color: ctx.fc.text),
              decoration: foccusInput('Comentario')),
          const SizedBox(height: 16),
          FoccusButton(
              label: 'Crear',
              onPressed: () => Navigator.pop(ctx, ctrl.text.trim())),
        ],
      ),
    );
    if (comentario == null || !mounted) return;
    try {
      final res = await ApiClient.uploadFiles(
        '/escenas/${widget.idEscena}/versiones',
        fields: {'comentario_cambio': comentario},
      );
      if (!mounted) return;
      if (res.ok) {
        showSnack(context, 'Versión creada');
        await _cargarVersiones(
            seleccionar: res.data['id_escena_version']?.toString());
      } else {
        showSnack(context, res.errorMessage('No se pudo crear la versión'),
            error: true);
      }
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, kSinConexion, error: true);
    }
  }

  Future<void> _subirFotos() async {
    final id = _versionId;
    if (id == null) return;
    final data = await showModalBottomSheet<_SubidaData>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => const _SubidaSheet(),
    );
    if (data == null || !mounted) return;
    showSnack(context, 'Subiendo fotos...');
    try {
      final res = await ApiClient.uploadFiles(
        '/escenas/versiones/$id/fotos',
        files: data.rutas.map((r) => MapEntry('archivos', r)).toList(),
        fields: {
          'tipo': data.tipo,
          if (data.etiqueta.isNotEmpty) 'etiqueta': data.etiqueta,
          if (data.personaje.isNotEmpty) 'id_personaje': data.personaje,
          if (data.notas.isNotEmpty) 'notas': data.notas,
        },
      );
      if (!mounted) return;
      if (res.ok) {
        showSnack(context, 'Fotos subidas');
        await _cargarFotos();
      } else {
        showSnack(context, res.errorMessage('No se pudieron subir'),
            error: true);
      }
    } on ApiConnectionException {
      if (!mounted) return;
      showSnack(context, kSinConexion, error: true);
    }
  }

  String _fotoUrl(dynamic path) {
    final p = (path ?? '').toString();
    if (p.isEmpty || p.startsWith('/') || p.startsWith('http')) return p;
    return p.startsWith('assets/') ? '/$p' : '/assets/$p';
  }

  @override
  Widget build(BuildContext context) {
    final admin = Session.isProjectAdmin;
    return FoccusScaffold(
      title:
          _escena.isEmpty ? 'Escena' : 'Escena #${_escena['numero_de_escena']}',
      subtitle: (_escena['encabezado'] ?? '').toString(),
      body: FoccusSwitcher(
        child: _loading
            ? const LoadingView(key: ValueKey('loading'))
            : _error != null
                ? ErrorView(
                    key: const ValueKey('error'),
                    message: _error!,
                    onRetry: _cargar)
                : KeyedSubtree(
                    key: const ValueKey('content'), child: _contenido(admin)),
      ),
    );
  }

  Widget _dato(String label, dynamic v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
                width: 110,
                child: Text(label,
                    style: GoogleFonts.inter(
                        color: context.fc.textMuted, fontSize: 14))),
            Expanded(
                child: Text(
                    (v == null || v.toString().isEmpty) ? '-' : v.toString(),
                    style: GoogleFonts.inter(
                        color: context.fc.text, fontSize: 14))),
          ],
        ),
      );

  Widget _contenido(bool admin) {
    final estado = (_escena['estado'] ?? 'Pendiente').toString();
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: FoccusDims.list,
        children: [
          FoccusCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                StatusChip(estado, color: colorEstadoEscena(estado)),
                if (codigoDe(_escena['codigo']) != null) ...[
                  const SizedBox(height: 8),
                  CodigoChip(codigoDe(_escena['codigo'])),
                ],
                const SizedBox(height: 8),
                _dato('Modo de vista', _escena['modo_vista']),
                _dato('Momento', _escena['momento_dia']),
                _dato('Ciudad', _escena['ciudad']),
                _dato('Página', _escena['pagina']),
                _dato('Día dramático', _escena['dia_dramatico']),
                _dato('Grabación', _escena['fecha_de_grabacion']),
                _dato('Descripción', _escena['descripcion']),
              ],
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Text('Continuidad fotográfica',
                    style: GoogleFonts.inter(
                        color: context.fc.text,
                        fontSize: 16,
                        fontWeight: FontWeight.w700)),
              ),
              if (admin)
                TextButton.icon(
                    style:
                        TextButton.styleFrom(minimumSize: const Size(48, 48)),
                    onPressed: _crearVersion,
                    icon: const Icon(Icons.add),
                    label: const Text('Versión')),
            ],
          ),
          if (_versiones.isEmpty)
            const SizedBox(
                height: 160,
                child: EmptyView(
                    message: 'Aún no hay versiones de continuidad',
                    icon: Icons.photo_library_outlined))
          else ...[
            DropdownButtonFormField<String>(
              initialValue: _versionId,
              isExpanded: true,
              dropdownColor: context.fc.surface,
              style: GoogleFonts.inter(color: context.fc.text),
              decoration: foccusInput('Versión'),
              items: _versiones
                  .map((v) => DropdownMenuItem(
                      value: v['id_escena_version'].toString(),
                      child: Text(
                          'V${v['numero_version']} - ${v['comentario_cambio'] ?? ''}',
                          overflow: TextOverflow.ellipsis)))
                  .toList(),
              onChanged: (v) {
                setState(() => _versionId = v);
                _cargarFotos();
              },
            ),
            const SizedBox(height: 16),
            if (admin)
              FoccusButton(
                  outlined: true,
                  onPressed: _subirFotos,
                  icon: Icons.add_a_photo_outlined,
                  label: 'Subir fotos'),
            const SizedBox(height: 16),
            if (_loadingFotos)
              const SizedBox(height: 120, child: LoadingView())
            else if (_fotos.isEmpty)
              const SizedBox(
                  height: 140,
                  child: EmptyView(message: 'Esta versión no tiene fotos'))
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _fotos.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10),
                itemBuilder: (_, i) {
                  final f = _fotos[i];
                  final url = _fotoUrl(f['archivo_path']);
                  return FadeSlideIn(
                      index: i,
                      child: GestureDetector(
                    onTap: () => showDialog(
                      context: context,
                      builder: (_) => Dialog(
                        backgroundColor: Colors.black,
                        child: InteractiveViewer(
                            child:
                                FoccusNetworkImage(url, fit: BoxFit.contain)),
                      ),
                    ),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: FoccusNetworkImage(url)),
                        Positioned(
                          left: 6,
                          bottom: 6,
                          child: StatusChip(
                              (f['etiqueta'] ?? f['tipo'] ?? '').toString()),
                        ),
                      ],
                    ),
                  ));
                },
              ),
          ],
        ],
      ),
    );
  }
}

class _SubidaData {
  _SubidaData(this.tipo, this.etiqueta, this.personaje, this.notas, this.rutas);
  final String tipo, etiqueta, personaje, notas;
  final List<String> rutas;
}

/// Bottom sheet para elegir fotos (cámara/galería) y sus datos.
class _SubidaSheet extends StatefulWidget {
  const _SubidaSheet();

  @override
  State<_SubidaSheet> createState() => _SubidaSheetState();
}

class _SubidaSheetState extends State<_SubidaSheet> {
  final _picker = ImagePicker();
  final _etiqueta = TextEditingController();
  final _personaje = TextEditingController();
  final _notas = TextEditingController();
  final List<String> _rutas = [];
  String _tipo = 'vestuario';

  @override
  void dispose() {
    _etiqueta.dispose();
    _personaje.dispose();
    _notas.dispose();
    super.dispose();
  }

  Future<void> _camara() async {
    final x = await _picker.pickImage(source: ImageSource.camera);
    if (x == null || !mounted) return;
    setState(() => _rutas.add(x.path));
  }

  Future<void> _galeria() async {
    final xs = await _picker.pickMultiImage();
    if (!mounted) return;
    setState(() => _rutas.addAll(xs.map((x) => x.path)));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Subir fotos de continuidad',
                style: GoogleFonts.inter(
                    color: context.fc.text,
                    fontSize: 20,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _tipo,
              dropdownColor: context.fc.surface,
              style: GoogleFonts.inter(color: context.fc.text),
              decoration: foccusInput('Tipo'),
              items: _tipos
                  .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                  .toList(),
              onChanged: (v) => setState(() => _tipo = v ?? _tipo),
            ),
            const SizedBox(height: 16),
            TextField(
                controller: _etiqueta,
                style: TextStyle(color: context.fc.text),
                decoration: foccusInput('Etiqueta')),
            const SizedBox(height: 16),
            TextField(
                controller: _personaje,
                style: TextStyle(color: context.fc.text),
                decoration: foccusInput('ID personaje (opcional)')),
            const SizedBox(height: 16),
            TextField(
                controller: _notas,
                maxLines: 2,
                style: TextStyle(color: context.fc.text),
                decoration: foccusInput('Notas')),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                    child: OutlinedButton.icon(
                        onPressed: _camara,
                        icon: const Icon(Icons.photo_camera_outlined),
                        label: const Text('Cámara'))),
                const SizedBox(width: 10),
                Expanded(
                    child: OutlinedButton.icon(
                        onPressed: _galeria,
                        icon: const Icon(Icons.photo_library_outlined),
                        label: const Text('Galería'))),
              ],
            ),
            const SizedBox(height: 8),
            Text('${_rutas.length} foto(s) seleccionada(s)',
                style: GoogleFonts.inter(color: context.fc.textMuted)),
            const SizedBox(height: 8),
            FoccusButton(
              label: 'Subir',
              onPressed: _rutas.isEmpty
                  ? null
                  : () => Navigator.pop(
                      context,
                      _SubidaData(_tipo, _etiqueta.text.trim(),
                          _personaje.text.trim(), _notas.text.trim(), _rutas)),
            ),
          ],
        ),
      ),
    );
  }
}
