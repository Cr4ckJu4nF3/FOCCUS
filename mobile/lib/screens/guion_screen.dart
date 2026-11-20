import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/guion.dart';
import '../services/guion_service.dart';
import '../services/session.dart';
import '../widgets/codigo_chip.dart';
import '../widgets/foccus_ui.dart';
import 'guion_detail_screen.dart';
import 'guion_editor_screen.dart';
import 'guion_forms_sheets.dart';
import 'guion_widgets.dart';

class _DatosNuevoGuionDialog extends StatefulWidget {
  const _DatosNuevoGuionDialog();

  @override
  State<_DatosNuevoGuionDialog> createState() => _DatosNuevoGuionDialogState();
}

class _DatosNuevoGuionDialogState extends State<_DatosNuevoGuionDialog> {
  final _nombre = TextEditingController();
  final _descripcion = TextEditingController();
  final _formulario = GlobalKey<FormState>();

  @override
  void dispose() {
    _nombre.dispose();
    _descripcion.dispose();
    super.dispose();
  }

  void _continuar() {
    if (_formulario.currentState?.validate() != true) return;
    Navigator.pop(context, (_nombre.text.trim(), _descripcion.text.trim()));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Detalles del guion'),
      content: SingleChildScrollView(
        child: Form(
          key: _formulario,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextFormField(
              controller: _nombre,
              autofocus: true,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Nombre'),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'El nombre del guion es obligatorio'
                  : null,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descripcion,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Descripción'),
            ),
          ]),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _continuar, child: const Text('Continuar')),
      ],
    );
  }
}

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
  final _busqueda = TextEditingController();
  List<Guion> _guiones = const [];
  String? _filtroEstado;
  bool _cargando = true;
  String? _error;
  String? _exito;

  bool get _isAdmin => Session.isProjectAdmin;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  @override
  void dispose() {
    _busqueda.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    final result = await GuionService.listar(widget.projectId);
    if (!mounted) return;
    setState(() {
      _guiones = result.data ?? const [];
      _error = result.error;
      _cargando = false;
    });
  }

  List<Guion> get _visibles {
    final q = _busqueda.text.trim().toLowerCase();
    return _guiones.where((g) {
      if (_filtroEstado != null &&
          normalizarEstado(g.estadoActual) != normalizarEstado(_filtroEstado)) {
        return false;
      }
      return q.isEmpty ||
          g.nombre.toLowerCase().contains(q) ||
          g.descripcion.toLowerCase().contains(q);
    }).toList();
  }

  Future<void> _crear() async {
    final opcion = await mostrarHoja<String>(
        context, (_) => const GuionElegirCreacionSheet());
    if (opcion == null || !mounted) return;
    bool? ok;
    if (opcion == 'subir') {
      ok = await mostrarHoja<bool>(
          context, (_) => GuionSubirSheet(projectId: widget.projectId));
      if (ok == true) _avisar('Guion subido correctamente');
    } else {
      final datos = await _pedirDatosNuevoGuion();
      if (datos == null || !mounted) return;
      ok = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (_) => GuionEditorScreen.nuevoGuion(
            projectId: widget.projectId,
            nombreInicial: datos.$1,
            descripcionInicial: datos.$2,
          ),
        ),
      );
      if (ok == true) _avisar('Guion creado correctamente');
    }
    if (ok == true) await _cargar();
  }

  Future<(String, String)?> _pedirDatosNuevoGuion() {
    return showDialog<(String, String)>(
      context: context,
      builder: (_) => const _DatosNuevoGuionDialog(),
    );
  }

  void _avisar(String texto) {
    if (mounted) setState(() => _exito = texto);
  }

  Future<void> _abrir(Guion guion, {int tab = 0}) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => GuionDetailScreen(
            guion: guion, projectId: widget.projectId, tabInicial: tab),
      ),
    );
    if (mounted) await _cargar();
  }

  Future<void> _editar(Guion guion) async {
    final actualizado = await mostrarHoja<Guion>(
        context, (_) => GuionEditarSheet(guion: guion));
    if (actualizado != null) {
      _avisar('Guion actualizado correctamente');
      await _cargar();
    }
  }

  Future<void> _eliminar(Guion guion) async {
    if (!await confirmar(context,
        titulo: 'Eliminar guion',
        mensaje: '¿Eliminar "${guion.nombre}"? No se puede deshacer.',
        accion: 'Eliminar',
        peligro: true)) {
      return;
    }
    final result = await GuionService.eliminar(guion.id);
    if (!mounted) return;
    if (result.ok) {
      _avisar('Guion eliminado correctamente');
      await _cargar();
    } else {
      setState(() => _error = result.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FoccusScaffold(
      title: 'Guiones',
      subtitle: widget.projectName,
      actions: [
        IconButton(
            tooltip: 'Actualizar',
            onPressed: _cargar,
            icon: const Icon(Icons.refresh)),
      ],
      floatingActionButton: _isAdmin
          ? FloatingActionButton.extended(
              onPressed: _crear,
              backgroundColor: context.fc.accent,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Crear guion'),
            )
          : null,
      body: FoccusSwitcher(
        child: _cargando
            ? const LoadingView(key: ValueKey('cargando'))
            : _error != null && _guiones.isEmpty
                ? ErrorView(
                    key: const ValueKey('error'),
                    message: _error!,
                    onRetry: _cargar)
                : KeyedSubtree(key: const ValueKey('contenido'), child: _contenido()),
      ),
    );
  }

  Widget _contenido() {
    final visibles = _visibles;
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 96),
        children: [
          if (_error != null)
            MensajeBanner(_error!,
                exito: false, onClose: () => setState(() => _error = null)),
          if (_exito != null)
            MensajeBanner(_exito!,
                exito: true, onClose: () => setState(() => _exito = null)),
          Row(children: [
            Icon(Icons.folder_open, color: context.fc.accentText, size: 20),
            const SizedBox(width: 8),
            Expanded(
                child: Text('${_guiones.length} en proyecto',
                    style: GoogleFonts.inter(color: context.fc.textMuted))),
          ]),
          const SizedBox(height: 12),
          TextField(
            controller: _busqueda,
            onChanged: (_) => setState(() {}),
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Buscar guion').copyWith(
              prefixIcon: Icon(Icons.search, color: context.fc.textMuted),
              suffixIcon: _busqueda.text.isEmpty
                  ? null
                  : IconButton(
                      icon: Icon(Icons.close, color: context.fc.textMuted),
                      onPressed: () => setState(_busqueda.clear)),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 36,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              _filtro('Todos', null),
              ...guionEstados.map((e) => _filtro(e, e)),
            ]),
          ),
          const SizedBox(height: 14),
          if (_guiones.isEmpty)
            const Padding(
                padding: EdgeInsets.only(top: 60),
                child: EmptyView(
                    message: 'Aún no hay guiones en este proyecto.',
                    icon: Icons.description_outlined))
          else if (visibles.isEmpty)
            const Padding(
                padding: EdgeInsets.only(top: 60),
                child: EmptyView(
                    message: 'Ningún guion coincide con la búsqueda.',
                    icon: Icons.search_off))
          else
            ...visibles.indexed.map((e) => FadeSlideIn(
                key: ValueKey(e.$2.id), index: e.$1, child: _tarjeta(e.$2))),
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

  Widget _tarjeta(Guion g) {
    return FoccusCard(
      onTap: () => _abrir(g),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          EstadoChip(g.estadoActual),
          if (g.codigo != null) ...[
            const SizedBox(width: 8),
            CodigoChip(g.codigo),
          ],
          const Spacer(),
          if (_isAdmin)
            PopupMenuButton<String>(
              color: context.fc.surface,
              icon: Icon(Icons.more_vert, color: context.fc.textMuted, size: 20),
              onSelected: (v) => v == 'editar' ? _editar(g) : _eliminar(g),
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'editar', child: Text('Editar')),
                PopupMenuItem(value: 'eliminar', child: Text('Eliminar')),
              ],
            ),
        ]),
        const SizedBox(height: 8),
        Text(g.nombre,
            style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: context.fc.text)),
        if (g.descripcion.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(g.descripcion,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(fontSize: 12, color: context.fc.textMuted)),
        ],
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: Text(
                g.numeroVersionActual != null
                    ? 'Versión v${g.numeroVersionActual}'
                    : 'Sin versiones',
                style: GoogleFonts.inter(fontSize: 12, color: context.fc.textMuted)),
          ),
          TextButton.icon(
            onPressed: () => _abrir(g, tab: 1),
            style: TextButton.styleFrom(
                foregroundColor: context.fc.accentText,
                visualDensity: VisualDensity.compact),
            icon: const Icon(Icons.history, size: 16),
            label: const Text('Versiones', style: TextStyle(fontSize: 12)),
          ),
        ]),
      ]),
    );
  }
}

