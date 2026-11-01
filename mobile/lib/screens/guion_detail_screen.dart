import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/api_config.dart';
import '../models/guion.dart';
import '../services/guion_service.dart';
import '../services/session.dart';
import '../widgets/codigo_chip.dart';
import '../widgets/foccus_ui.dart';
import 'guion_compare_screen.dart';
import 'guion_editor_screen.dart';
import 'guion_forms_sheets.dart';
import 'guion_notas_sheet.dart';
import 'guion_widgets.dart';


class GuionDetailScreen extends StatefulWidget {
  const GuionDetailScreen({
    super.key,
    required this.guion,
    required this.projectId,
    this.tabInicial = 0,
  });

  final Guion guion;
  final String projectId;
  final int tabInicial;

  @override
  State<GuionDetailScreen> createState() => _GuionDetailScreenState();
}

class _GuionDetailScreenState extends State<GuionDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs =
      TabController(length: 2, vsync: this, initialIndex: widget.tabInicial);
  late Guion _guion = widget.guion;
  List<GuionVersion> _versiones = const [];
  int? _versionVista;
  final Set<int> _expandidas = {};
  String? _filtroEstado;
  bool _cargando = true;
  String? _error;
  String? _exito;

  bool get _isAdmin => Session.isProjectAdmin;

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
      _cargando = true;
      _error = null;
    });
    final result = await GuionService.versiones(_guion.id);
    if (!mounted) return;
    setState(() {
      _versiones = result.data ?? const [];
      _error = result.error;
      _cargando = false;
    });
  }

  GuionVersion? get _actual {
    if (_versiones.isEmpty) return null;
    final elegida = _versionVista ?? _guion.idVersionActual;
    return _versiones.firstWhere((v) => v.id == elegida,
        orElse: () => _versiones.first);
  }

  void _mensaje({String? error, String? exito}) => setState(() {
        _error = error;
        _exito = exito;
      });

  Future<void> _editarGuion() async {
    final actualizado = await mostrarHoja<Guion>(
        context, (_) => GuionEditarSheet(guion: _guion));
    if (actualizado != null && mounted) {
      setState(() => _guion = actualizado);
      _mensaje(exito: 'Guion actualizado correctamente');
    }
  }

  Future<void> _nuevaVersion() async {
    final tipo = await mostrarHoja<String>(
      context,
      (context) => Column(mainAxisSize: MainAxisSize.min, children: [
        const HojaEncabezado('Nueva versión', icono: Icons.add_circle_outline),
        ListTile(
          leading: Icon(Icons.edit_note, color: context.fc.accentText),
          title: Text('Escribir guion',
              style: TextStyle(color: context.fc.text)),
          subtitle: Text('Parte del contenido de la versión actual',
              style: TextStyle(color: context.fc.textMuted)),
          onTap: () => Navigator.pop(context, 'texto'),
        ),
        ListTile(
          leading: Icon(Icons.attach_file, color: context.fc.accentText),
          title: Text('Subir archivo',
              style: TextStyle(color: context.fc.text)),
          subtitle: Text('PDF, Word o FDX',
              style: TextStyle(color: context.fc.textMuted)),
          onTap: () => Navigator.pop(context, 'archivo'),
        ),
        const SizedBox(height: 16),
      ]),
    );
    if (tipo == null || !mounted) return;
    if (tipo == 'texto') {
      await _abrirEditor(contenido: _actual?.contenido ?? '');
    } else {
      final ok = await mostrarHoja<bool>(
          context, (_) => GuionVersionArchivoSheet(guion: _guion));
      if (ok == true) {
        _mensaje(exito: 'Versión subida correctamente');
        await _cargar();
      }
    }
  }

  Future<void> _abrirEditor({
    String contenido = '',
    String comentario = '',
    String estado = 'Borrador',
  }) async {
    final ok = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => GuionEditorScreen.nuevaVersion(
          projectId: widget.projectId,
          guion: _guion,
          contenidoInicial: contenido,
          comentarioInicial: comentario,
          estadoInicial: estado,
        ),
      ),
    );
    if (ok == true) {
      _mensaje(exito: 'Versión guardada correctamente');
      await _cargar();
    }
  }

  Future<void> _restaurar(GuionVersion v) async {
    if (!await confirmar(context,
        titulo: 'Restaurar versión',
        mensaje:
            'Se abrirá el editor con el contenido de la versión ${v.numero} para guardarlo como una nueva versión.',
        accion: 'Continuar')) {
      return;
    }
    await _abrirEditor(
      contenido: v.contenido ?? '',
      comentario: 'Restaurada desde la versión ${v.numero}',
      estado: guionEstados.contains(v.estado) ? v.estado : 'Borrador',
    );
  }

  Future<void> _cambiarEstado(GuionVersion v, String estado) async {
    if (estado == v.estado) return;
    _mensaje();
    final result = await GuionService.cambiarEstado(_guion.id, v.id, estado);
    if (!mounted) return;
    if (result.ok) {
      _mensaje(exito: 'Versión ${v.numero} actualizada a «$estado»');
      await _cargar();
    } else {
      _mensaje(error: result.error);
    }
  }

  Future<void> _copiar(GuionVersion v) async {
    await Clipboard.setData(
        ClipboardData(text: contenidoSinMarcadoresGaleria(v.contenido ?? '')));
    if (mounted) showSnack(context, 'Contenido copiado al portapapeles');
  }

  Future<void> _abrirArchivo(GuionVersion v) async {
    if (!await abrirArchivoGuion(v.archivo) && mounted) {
      _mensaje(error: 'No se pudo abrir el archivo');
    }
  }

  Future<void> _abrirNotas(GuionVersion v) =>
      mostrarHoja<void>(context, (_) => GuionNotasSheet(version: v));

  void _comparar([GuionVersion? v]) => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => GuionCompareScreen(
              guion: _guion, versiones: _versiones, inicial: v),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return FoccusScaffold(
      title: _guion.nombre,
      subtitle: _guion.descripcion.isEmpty ? null : _guion.descripcion,
      actions: [
        IconButton(
            tooltip: 'Comparar versiones',
            onPressed: _versiones.length > 1 ? () => _comparar() : null,
            icon: const Icon(Icons.compare_arrows)),
        if (_isAdmin)
          IconButton(
              tooltip: 'Editar guion',
              onPressed: _editarGuion,
              icon: const Icon(Icons.edit_outlined)),
      ],
      floatingActionButton: _isAdmin
          ? FloatingActionButton.extended(
              onPressed: _nuevaVersion,
              backgroundColor: context.fc.accent,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Nueva versión'),
            )
          : null,
      body: Column(children: [
        TabBar(
          controller: _tabs,
          indicatorColor: context.fc.accent,
          labelColor: context.fc.accentText,
          unselectedLabelColor: context.fc.textMuted,
          tabs: [
            const Tab(text: 'Contenido'),
            Tab(text: 'Versiones (${_versiones.length})'),
          ],
        ),
        if (_guion.codigo != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Align(
                alignment: Alignment.centerLeft,
                child: CodigoChip(_guion.codigo)),
          ),
        if (_error != null || _exito != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: MensajeBanner(_error ?? _exito!,
                exito: _error == null, onClose: () => _mensaje()),
          ),
        Expanded(
          child: FoccusSwitcher(
            child: _cargando
                ? const LoadingView(key: ValueKey('cargando'))
                : _error != null && _versiones.isEmpty
                    ? ErrorView(
                        key: const ValueKey('error'),
                        message: _error!,
                        onRetry: _cargar)
                    : TabBarView(
                        key: const ValueKey('contenido'),
                        controller: _tabs,
                        children: [
                          _tabContenido(),
                          _tabVersiones(),
                        ]),
          ),
        ),
      ]),
    );
  }

  Widget _contenidoVersion(GuionVersion version) {
    final contenido = version.contenido ?? '';
    final vinculados = elementosVinculados(contenido);
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (vinculados.isNotEmpty) ...[
          Text('Elementos vinculados', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          for (final elemento in vinculados) _tarjetaElemento(elemento),
          const SizedBox(height: 10),
        ],
        ContenidoGuion(contenidoSinMarcadoresGaleria(contenido)),
      ],
    );
  }

  Widget _tarjetaElemento(GuionElementoVinculado elemento) {
    final theme = Theme.of(context);
    final colores = theme.colorScheme;
    final foto = ApiConfig.assetUrl(elemento.foto);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(
              elemento.tipo == 'personaje'
                  ? Icons.person_outline
                  : elemento.tipo == 'lugar'
                      ? Icons.location_on_outlined
                      : Icons.inventory_2_outlined,
              color: colores.primary,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                  '${elemento.nombre} ? versi?n ${elemento.numeroVersion}',
                  style: theme.textTheme.titleSmall),
            ),
          ]),
          if (foto.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(foto,
                    height: 150,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink()),
              ),
            ),
          if (elemento.detalles.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(elemento.detalles),
            ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => _abrirHistorialElemento(elemento),
              icon: const Icon(Icons.history),
              label: const Text('Abrir historial'),
            ),
          ),
        ]),
      ),
    );
  }

  Future<void> _abrirHistorialElemento(GuionElementoVinculado elemento) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (_) => _HistorialElementoSheet(
        projectId: widget.projectId,
        elemento: elemento,
      ),
    );
  }

  Widget _tabContenido() {
    final v = _actual;
    if (v == null) {
      return const EmptyView(
          message: 'Este guion todavía no tiene versiones.',
          icon: Icons.description_outlined);
    }
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
        children: [
          DropdownButtonFormField<int>(
            initialValue: v.id,
            isExpanded: true,
            dropdownColor: context.fc.surface,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Versión'),
            items: _versiones
                .map((e) => DropdownMenuItem(
                    value: e.id,
                    child: Text(
                        'v${e.numero} · ${e.estado}${e.id == _guion.idVersionActual ? ' (actual)' : ''}',
                        overflow: TextOverflow.ellipsis)))
                .toList(),
            onChanged: (id) => setState(() => _versionVista = id),
          ),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 4, children: [
            EstadoChip(v.estado),
            if (v.fecha.isNotEmpty)
              Text(v.fecha,
                  style: GoogleFonts.inter(
                      fontSize: 12, color: context.fc.textMuted)),
          ]),
          const SizedBox(height: 12),
          if (v.esTexto) ...[
            _contenidoVersion(v),
            const SizedBox(height: 12),
            Wrap(spacing: 8, children: [
              OutlinedButton.icon(
                  onPressed: () => _copiar(v),
                  icon: const Icon(Icons.copy, size: 16),
                  label: const Text('Copiar texto')),
              OutlinedButton.icon(
                  onPressed: () => _abrirNotas(v),
                  icon: const Icon(Icons.sticky_note_2_outlined, size: 16),
                  label: const Text('Notas')),
              if (_isAdmin)
                OutlinedButton.icon(
                    onPressed: () => _abrirEditor(contenido: v.contenido!),
                    icon: const Icon(Icons.edit_note, size: 18),
                    label: const Text('Editar')),
            ]),
          ] else if (v.tieneArchivo)
            FoccusCard(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Icon(Icons.attach_file, color: context.fc.accentText),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text('Versión v${v.numero} — archivo subido',
                              style: GoogleFonts.inter(color: context.fc.text))),
                    ]),
                    const SizedBox(height: 12),
                    Wrap(spacing: 8, children: [
                      FilledButton.icon(
                          onPressed: () => _abrirArchivo(v),
                          style: FilledButton.styleFrom(
                              backgroundColor: context.fc.accent),
                          icon: const Icon(Icons.visibility_outlined, size: 18),
                          label: const Text('Ver / descargar')),
                      OutlinedButton.icon(
                          onPressed: () => _abrirNotas(v),
                          icon: const Icon(Icons.sticky_note_2_outlined,
                              size: 16),
                          label: const Text('Notas')),
                    ]),
                  ]),
            )
          else
            const EmptyView(message: 'Sin contenido disponible.'),
        ],
      ),
    );
  }

  Widget _tabVersiones() {
    final visibles = _filtroEstado == null
        ? _versiones
        : _versiones
            .where((v) =>
                normalizarEstado(v.estado) == normalizarEstado(_filtroEstado))
            .toList();
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
        children: [
          Text('${visibles.length} registros',
              style: GoogleFonts.inter(fontSize: 12, color: context.fc.textMuted)),
          const SizedBox(height: 8),
          SizedBox(
            height: 36,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              _filtro('Todas', null),
              ...guionEstados.map((e) => _filtro(e, e)),
            ]),
          ),
          const SizedBox(height: 12),
          if (_versiones.isEmpty)
            const Padding(
                padding: EdgeInsets.only(top: 40),
                child: EmptyView(message: 'Aún no hay versiones.'))
          else if (visibles.isEmpty)
            const Padding(
                padding: EdgeInsets.only(top: 40),
                child: EmptyView(message: 'No hay versiones con ese estado.'))
          else
            ...visibles.indexed.map((e) => FadeSlideIn(
                key: ValueKey(e.$2.id), index: e.$1, child: _versionCard(e.$2))),
        ],
      ),
    );
  }

  Widget _filtro(String label, String? valor) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: ChoiceChip(
          label: Text(label),
          selected: _filtroEstado == valor,
          selectedColor: context.fc.accent.withValues(alpha: 0.3),
          backgroundColor: context.fc.surface,
          labelStyle: TextStyle(color: context.fc.text, fontSize: 12),
          onSelected: (_) => setState(() => _filtroEstado = valor),
        ),
      );

  Widget _versionCard(GuionVersion v) {
    final expandida = _expandidas.contains(v.id);
    return FoccusCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
              child: Text(
                  'Versión ${v.numero}${v.id == _guion.idVersionActual ? ' · actual' : ''}',
                  style: GoogleFonts.inter(
                      fontWeight: FontWeight.w600, color: context.fc.text))),
          EstadoChip(v.estado),
        ]),
        if (v.codigo != null) ...[
          const SizedBox(height: 6),
          Align(alignment: Alignment.centerLeft, child: CodigoChip(v.codigo)),
        ],
        const SizedBox(height: 4),
        Text(v.fecha,
            style: GoogleFonts.inter(fontSize: 12, color: context.fc.textMuted)),
        if (v.comentario.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(v.comentario,
              style: GoogleFonts.inter(fontSize: 13, color: context.fc.textSubtle)),
        ],
        const SizedBox(height: 8),
        Row(children: [
          Icon(v.esTexto ? Icons.edit_note : Icons.attach_file,
              size: 15,
              color: v.esTexto ? const Color(0xFF7B5FCF) : context.fc.textMuted),
          const SizedBox(width: 5),
          Text(v.esTexto ? 'Escrito en el sistema' : 'Archivo subido',
              style: GoogleFonts.inter(fontSize: 12, color: context.fc.textMuted)),
          if (v.tieneArchivo) ...[
            const SizedBox(width: 10),
            Icon(Icons.check_circle_outline,
                size: 14, color: context.fc.success),
            const SizedBox(width: 4),
            Text('Disponible',
                style: GoogleFonts.inter(
                    fontSize: 12, color: context.fc.success)),
          ],
        ]),
        if (v.esTexto && expandida) ...[
          const SizedBox(height: 10),
          _contenidoVersion(v),
        ],
        const SizedBox(height: 6),
        Wrap(spacing: 4, children: [
          if (v.esTexto)
            _accion(expandida ? 'Ocultar contenido' : 'Ver contenido',
                expandida ? Icons.expand_less : Icons.expand_more, () {
              setState(() =>
                  expandida ? _expandidas.remove(v.id) : _expandidas.add(v.id));
            }),
          if (v.tieneArchivo)
            _accion('Ver archivo', Icons.visibility_outlined,
                () => _abrirArchivo(v)),
          _accion('Notas', Icons.sticky_note_2_outlined, () => _abrirNotas(v)),
          if (v.esTexto) _accion('Copiar', Icons.copy, () => _copiar(v)),
          if (v.esTexto && _versiones.where((e) => e.esTexto).length > 1)
            _accion('Comparar', Icons.compare_arrows, () => _comparar(v)),
          if (_isAdmin && v.esTexto)
            _accion('Restaurar', Icons.restore, () => _restaurar(v)),
          if (_isAdmin)
            PopupMenuButton<String>(
              tooltip: 'Cambiar estado',
              color: context.fc.surface,
              onSelected: (e) => _cambiarEstado(v, e),
              itemBuilder: (_) => guionEstados
                  .map((e) => PopupMenuItem(value: e, child: Text(e)))
                  .toList(),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.swap_vert,
                      size: 16, color: context.fc.accentText),
                  const SizedBox(width: 4),
                  Text('Cambiar estado',
                      style: GoogleFonts.inter(
                          fontSize: 12, color: context.fc.accentText)),
                ]),
              ),
            ),
        ]),
      ]),
    );
  }

  Widget _accion(String texto, IconData icono, VoidCallback onTap) =>
      TextButton.icon(
        onPressed: onTap,
        style: TextButton.styleFrom(
            foregroundColor: context.fc.accentText,
            visualDensity: VisualDensity.compact),
        icon: Icon(icono, size: 16),
        label: Text(texto, style: const TextStyle(fontSize: 12)),
      );
}

class _HistorialElementoSheet extends StatefulWidget {
  const _HistorialElementoSheet({
    required this.projectId,
    required this.elemento,
  });

  final String projectId;
  final GuionElementoVinculado elemento;

  @override
  State<_HistorialElementoSheet> createState() =>
      _HistorialElementoSheetState();
}

class _HistorialElementoSheetState extends State<_HistorialElementoSheet> {
  List<GuionGaleriaVersion> _versiones = const [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final result = await GuionService.versionesElemento(
        widget.projectId, widget.elemento.idGaleria);
    if (!mounted) return;
    setState(() {
      _versiones = result.data ?? const [];
      _error = result.error;
      _cargando = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final vinculo = widget.elemento;
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.75,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(
                child: Text('Historial de ${vinculo.nombre}',
                    style: theme.textTheme.titleLarge)),
            IconButton(
                tooltip: 'Actualizar historial',
                onPressed: _cargar,
                icon: const Icon(Icons.refresh)),
          ]),
        ),
        Expanded(
          child: _cargando
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? ErrorView(message: _error!, onRetry: _cargar)
                  : _versiones.isEmpty
                      ? const EmptyView(
                          message:
                              'El elemento todav?a no tiene versiones de uso.',
                          icon: Icons.history,
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: _versiones.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final version = _versiones[index];
                            final url = ApiConfig.assetUrl(version.foto);
                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Versi?n ${version.numero}',
                                        style: theme.textTheme.titleMedium),
                                    if (version.fecha.isNotEmpty)
                                      Text(version.fecha,
                                          style: theme.textTheme.bodySmall),
                                    if (url.isNotEmpty)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 8),
                                        child: ClipRRect(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          child: Image.network(url,
                                              height: 150,
                                              width: double.infinity,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) =>
                                                  const SizedBox.shrink()),
                                        ),
                                      ),
                                    if (version.detalles.isNotEmpty)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 8),
                                        child: Text(version.detalles),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
        ),
      ]),
    );
  }
}
