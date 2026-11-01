import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/galeria_item.dart';
import '../services/api_client.dart';
import '../services/session.dart';
import '../widgets/codigo_chip.dart';
import '../widgets/foccus_ui.dart';
import 'galeria_form.dart';

const _sinConexion = 'No se pudo conectar con el servidor';

class GaleriaDetalleScreen extends StatefulWidget {
  const GaleriaDetalleScreen({
    super.key,
    required this.projectId,
    required this.item,
    this.personajes = const [],
  });

  final String projectId;
  final GaleriaItem item;
  final List<GaleriaItem> personajes;

  @override
  State<GaleriaDetalleScreen> createState() => _GaleriaDetalleScreenState();
}

class _GaleriaDetalleScreenState extends State<GaleriaDetalleScreen> {
  List<Map<String, dynamic>> _versiones = [];
  bool _loading = true;
  String? _error;
  bool _changed = false;

  String get _base => '/projects/${widget.projectId}/galeria/${widget.item.id}';

  @override
  void initState() {
    super.initState();
    _cargarVersiones();
  }

  Future<void> _cargarVersiones() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient.get('$_base/versiones');
      if (!mounted) return;
      if (res.success) {
        setState(() {
          _versiones = res.list.whereType<Map<String, dynamic>>().toList();
          _loading = false;
        });
      } else {
        setState(() {
          _error = res.errorMessage('No se pudieron cargar las versiones');
          _loading = false;
        });
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _error = _sinConexion;
        _loading = false;
      });
    }
  }

  /// Ejecuta una petición, muestra mensaje y recarga versiones si salió bien.
  Future<bool> _ejecutar(
      Future<ApiResponse> Function() accion, String exito) async {
    try {
      final res = await accion();
      if (!mounted) return false;
      if (res.success) {
        showSnack(context, exito);
        _changed = true;
        return true;
      }
      showSnack(context, res.errorMessage('No se pudo completar la acción'),
          error: true);
    } on ApiConnectionException {
      if (!mounted) return false;
      showSnack(context, _sinConexion, error: true);
    }
    return false;
  }

  Future<void> _editar() async {
    final ok = await mostrarFormularioGaleria(
      context,
      projectId: widget.projectId,
      item: widget.item,
      personajes: widget.personajes,
    );
    if (!mounted || !ok) return;
    Navigator.pop(context, true); // la lista se recarga
  }

  Future<void> _eliminar() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar elemento'),
        content:
            Text('¿Eliminar "${widget.item.nombre}"? No se puede deshacer.'),
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
    final hecho =
        await _ejecutar(() => ApiClient.delete(_base), 'Elemento eliminado');
    if (!mounted || !hecho) return;
    Navigator.pop(context, true);
  }

  Future<void> _cambiarFoto() async {
    final path = await elegirFoto(context);
    if (!mounted || path == null) return;
    final hecho = await _ejecutar(
      () =>
          ApiClient.uploadFiles('$_base/foto', files: [MapEntry('foto', path)]),
      'Foto actualizada',
    );
    if (!mounted || !hecho) return;
    Navigator.pop(context, true);
  }

  Future<void> _registrarUso() async {
    final hecho =
        await _ejecutar(() => ApiClient.post('$_base/uso'), 'Uso registrado');
    if (!mounted || !hecho) return;
    Navigator.pop(context, true);
  }

  Future<void> _nuevaVersion() async {
    final texto = TextEditingController();
    final detalles = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nueva versión'),
        content: TextField(
          controller: texto,
          maxLines: 4,
          decoration:
              const InputDecoration(hintText: 'Describe cómo quedó o se usó'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, texto.text.trim()),
              child: const Text('Crear')),
        ],
      ),
    );
    texto.dispose();
    if (detalles == null || !mounted) return;
    if (detalles.isEmpty) {
      showSnack(context, 'Describe cómo quedó o se usó el elemento',
          error: true);
      return;
    }
    final hecho = await _ejecutar(
      () =>
          ApiClient.post('$_base/versiones', body: {'detalles_uso': detalles}),
      'Versión creada',
    );
    if (!mounted || !hecho) return;
    _cargarVersiones();
  }

  Future<void> _fotoVersion(int idVersion) async {
    final path = await elegirFoto(context);
    if (!mounted || path == null) return;
    final hecho = await _ejecutar(
      () => ApiClient.uploadFiles('$_base/versiones/$idVersion/foto',
          files: [MapEntry('foto', path)]),
      'Foto de la versión guardada',
    );
    if (!mounted || !hecho) return;
    _cargarVersiones();
  }

  Widget _chip(String label, {Color? color}) {
    color ??= context.fc.accentText;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.inter(
              fontSize: 13, fontWeight: FontWeight.w600, color: color)),
    );
  }

  Widget _dato(String label, String valor) {
    if (valor.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: FoccusDims.gap),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: GoogleFonts.inter(
                  fontSize: 14, color: context.fc.textMuted)),
          Text(valor, style: GoogleFonts.inter(color: context.fc.text)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final it = widget.item;
    final admin = Session.isProjectAdmin;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.pop(context, _changed);
      },
      child: FoccusScaffold(
        title: it.nombre,
        subtitle: it.tipoLabel,
        actions: [
          if (admin) ...[
            IconButton(onPressed: _editar, icon: const Icon(Icons.edit)),
            IconButton(onPressed: _eliminar, icon: const Icon(Icons.delete)),
          ],
        ],
        body: RefreshIndicator(
          onRefresh: _cargarVersiones,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
                child: Hero(
                  tag: 'galeria-${it.id}',
                  child: FoccusNetworkImage(it.foto, height: 240),
                ),
              ),
              const SizedBox(height: FoccusDims.gap),
              Wrap(
                  spacing: FoccusDims.gap,
                  runSpacing: FoccusDims.gap,
                  children: [
                    if (it.codigo != null) CodigoChip(it.codigo),
                    _chip(it.tipoLabel),
                    if (it.categoria.isNotEmpty)
                      _chip(it.categoria,
                          color: context.fc.isDark
                              ? Colors.blueAccent
                              : const Color(0xFF1D4ED8)),
                    if (it.estado.isNotEmpty)
                      _chip(it.estado,
                          color: context.fc.isDark
                              ? Colors.greenAccent
                              : const Color(0xFF15803D)),
                  ]),
              const SizedBox(height: 12),
              _dato('Descripción', it.descripcion),
              _dato('Intérprete', it.s('interprete_nombre')),
              _dato(
                  'Descripción del intérprete', it.s('interprete_descripcion')),
              _dato('Ubicación', it.s('lugar_detalle_ubicacion')),
              _dato('Objetos', it.s('lugar_objetos')),
              _dato('Personajes', it.s('lugar_personajes')),
              _dato('Personajes vinculados',
                  it.vinculados.map((v) => v['nombre']).join(', ')),
              _dato('Último uso', it.ultimoUso),
              if (admin) ...[
                const SizedBox(height: 4),
                Wrap(
                    spacing: FoccusDims.gap,
                    runSpacing: FoccusDims.gap,
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                            minimumSize: const Size(48, 48)),
                        onPressed: _cambiarFoto,
                        icon: const Icon(Icons.add_a_photo),
                        label: const Text('Cambiar foto'),
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                            minimumSize: const Size(48, 48)),
                        onPressed: _registrarUso,
                        icon: const Icon(Icons.check),
                        label: const Text('Registrar uso'),
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                            minimumSize: const Size(48, 48)),
                        onPressed: _nuevaVersion,
                        icon: const Icon(Icons.add),
                        label: const Text('Nueva versión'),
                      ),
                    ]),
              ],
              const SizedBox(height: 16),
              Text('Versiones',
                  style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: context.fc.text)),
              const SizedBox(height: FoccusDims.gap),
              if (_loading)
                const SizedBox(height: 80, child: LoadingView())
              else if (_error != null)
                SizedBox(
                    height: 160,
                    child:
                        ErrorView(message: _error!, onRetry: _cargarVersiones))
              else if (_versiones.isEmpty)
                const SizedBox(
                    height: 120,
                    child: EmptyView(message: 'Aún no hay versiones'))
              else ...[
                for (var k = 0; k < _versiones.length; k++)
                  FadeSlideIn(index: k, child: _versionCard(_versiones[k], admin)),
                const SizedBox(height: 4),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _versionCard(Map<String, dynamic> v, bool admin) {
    final foto = (v['archivo_path'] ?? '').toString();
    final idVersion = (v['id_version'] as num?)?.toInt() ?? 0;
    return FoccusCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Versión ${v['numero_version'] ?? ''}',
              style: GoogleFonts.inter(
                  fontWeight: FontWeight.w700, color: context.fc.text)),
          const SizedBox(height: 6),
          if (foto.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
              child:
                  FoccusNetworkImage(foto, height: 160, width: double.infinity),
            ),
          const SizedBox(height: 6),
          Text((v['detalles_uso'] ?? '').toString(),
              style: GoogleFonts.inter(color: context.fc.textSubtle)),
          if ((v['guion_nombre'] ?? '').toString().isNotEmpty)
            Text('Guion: ${v['guion_nombre']}',
                style: GoogleFonts.inter(
                    fontSize: 14, color: context.fc.textMuted)),
          if (foto.isEmpty && admin)
            TextButton.icon(
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: () => _fotoVersion(idVersion),
              icon: const Icon(Icons.add_a_photo),
              label: const Text('Agregar foto'),
            ),
        ],
      ),
    );
  }
}
