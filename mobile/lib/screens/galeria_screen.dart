import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/galeria_item.dart';
import '../services/api_client.dart';
import '../services/session.dart';
import '../widgets/codigo_chip.dart';
import '../widgets/foccus_ui.dart';
import 'galeria_detalle_screen.dart';
import 'galeria_form.dart';

class GaleriaScreen extends StatefulWidget {
  const GaleriaScreen({
    super.key,
    required this.projectId,
    required this.projectName,
  });

  final String projectId;
  final String projectName;

  @override
  State<GaleriaScreen> createState() => _GaleriaScreenState();
}

class _GaleriaScreenState extends State<GaleriaScreen> {
  List<GaleriaItem> _items = [];
  bool _loading = true;
  String? _error;

  String _busqueda = '';
  String? _tipo; // null = todos
  String? _categoria;
  String? _estado;

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
      final res = await ApiClient.get('/projects/${widget.projectId}/galeria');
      if (!mounted) return;
      if (res.success) {
        setState(() {
          _items = res.list
              .whereType<Map<String, dynamic>>()
              .map(GaleriaItem.new)
              .toList();
          _loading = false;
        });
      } else {
        setState(() {
          _error = res.errorMessage('No se pudo cargar la galería');
          _loading = false;
        });
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo conectar con el servidor';
        _loading = false;
      });
    }
  }

  List<GaleriaItem> get _filtrados {
    final q = _busqueda.trim().toLowerCase();
    return _items.where((i) {
      if (_tipo != null && i.tipo != _tipo) return false;
      if (_categoria != null && i.categoria != _categoria) return false;
      if (_estado != null && i.estado != _estado) return false;
      if (q.isEmpty) return true;
      return i.nombre.toLowerCase().contains(q) ||
          i.descripcion.toLowerCase().contains(q) ||
          i.categoria.toLowerCase().contains(q);
    }).toList();
  }

  List<GaleriaItem> get _personajes =>
      _items.where((i) => i.tipo == 'personaje').toList();

  Future<void> _crear() async {
    final ok = await mostrarFormularioGaleria(
      context,
      projectId: widget.projectId,
      personajes: _personajes,
    );
    if (!mounted || !ok) return;
    showSnack(context, 'Elemento creado');
    _cargar();
  }

  Future<void> _abrir(GaleriaItem item) async {
    final cambio = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => GaleriaDetalleScreen(
          projectId: widget.projectId,
          item: item,
          personajes: _personajes,
        ),
      ),
    );
    if (!mounted || cambio != true) return;
    _cargar();
  }

  Widget _chips<T>({
    required String todos,
    required Iterable<String> opciones,
    required String? actual,
    required ValueChanged<String?> onChange,
  }) {
    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(todos),
              selected: actual == null,
              labelStyle: const TextStyle(fontSize: 14),
              onSelected: (_) => onChange(null),
            ),
          ),
          for (final o in opciones)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(GaleriaItem.tipos[o] ?? o),
                selected: actual == o,
                labelStyle: const TextStyle(fontSize: 14),
                onSelected: (_) => onChange(actual == o ? null : o),
              ),
            ),
        ],
      ),
    );
  }

  Widget _filtros() {
    final categorias = _tipo != null
        ? (GaleriaItem.categorias[_tipo] ?? const <String>[])
        : (_items
            .map((i) => i.categoria)
            .where((c) => c.isNotEmpty)
            .toSet()
            .toList()
          ..sort());
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        children: [
          TextField(
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Buscar').copyWith(
                prefixIcon: Icon(Icons.search, color: context.fc.textMuted)),
            onChanged: (v) => setState(() => _busqueda = v),
          ),
          const SizedBox(height: 16),
          _chips<void>(
            todos: 'Todos',
            opciones: GaleriaItem.tipos.keys,
            actual: _tipo,
            onChange: (v) => setState(() {
              _tipo = v;
              _categoria = null;
            }),
          ),
          if (categorias.isNotEmpty)
            _chips<void>(
              todos: 'Toda categoría',
              opciones: categorias,
              actual: _categoria,
              onChange: (v) => setState(() => _categoria = v),
            ),
          _chips<void>(
            todos: 'Todo estado',
            opciones: GaleriaItem.estados,
            actual: _estado,
            onChange: (v) => setState(() => _estado = v),
          ),
        ],
      ),
    );
  }

  Widget _tarjeta(GaleriaItem i) {
    return InkWell(
      onTap: () => _abrir(i),
      borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
      child: Container(
        decoration: BoxDecoration(
          color: context.fc.surface,
          borderRadius: BorderRadius.circular(FoccusDims.radiusCard),
          border: Border.all(color: context.fc.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(FoccusDims.radiusCard)),
                    child: Hero(
                      tag: 'galeria-${i.id}',
                      child: FoccusNetworkImage(i.foto,
                          width: double.infinity, height: double.infinity),
                    ),
                  ),
                ),
                if (i.codigo != null)
                  Positioned(top: 6, left: 6, child: CodigoChip(i.codigo)),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(i.nombre,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: context.fc.text)),
                  const SizedBox(height: 4),
                  Text(
                      '${i.tipoLabel}${i.categoria.isEmpty ? '' : ' · ${i.categoria}'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                          fontSize: 14, color: context.fc.textMuted)),
                  const SizedBox(height: 6),
                  Row(children: [
                    if (i.estado.isNotEmpty)
                      Flexible(
                          child: _estadoChip(i.estado,
                              color: context.fc.isDark
                                  ? Colors.greenAccent
                                  : const Color(0xFF15803D))),
                    if (i.totalVersiones > 0) ...[
                      const SizedBox(width: 6),
                      Text('v${i.totalVersiones}',
                          style: GoogleFonts.inter(
                              fontSize: 14, color: context.fc.textMuted)),
                    ],
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _estadoChip(String label, {required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: GoogleFonts.inter(
            fontSize: 13, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }

  Widget _contenido() => FoccusSwitcher(child: _estadoContenido());

  Widget _estadoContenido() {
    if (_loading) return const LoadingView(key: ValueKey('loading'));
    if (_error != null) {
      return ErrorView(
          key: const ValueKey('error'), message: _error!, onRetry: _cargar);
    }
    final lista = _filtrados;
    return Column(
      key: const ValueKey('content'),
      children: [
        _filtros(),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _cargar,
            child: lista.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: FoccusDims.list,
                    children: [
                        const SizedBox(height: 80),
                        EmptyView(
                          message: _items.isEmpty
                              ? 'La galería está vacía'
                              : 'No hay elementos con esos filtros',
                          icon: Icons.photo_library_outlined,
                        ),
                      ])
                : LayoutBuilder(
                    builder: (context, constraints) {
                      final columns = constraints.maxWidth < 340
                          ? 1
                          : constraints.maxWidth < 600
                              ? 2
                              : 3;
                      return GridView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: FoccusDims.list,
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: columns,
                          crossAxisSpacing: FoccusDims.gap,
                          mainAxisSpacing: FoccusDims.gap,
                          childAspectRatio: columns == 2 ? 0.65 : 0.72,
                        ),
                        itemCount: lista.length,
                        itemBuilder: (_, k) =>
                            FadeSlideIn(index: k, child: _tarjeta(lista[k])),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return FoccusScaffold(
      title: 'Galería',
      subtitle: widget.projectName,
      floatingActionButton: Session.isProjectAdmin
          ? FoccusFab(label: 'Crear elemento', onPressed: _crear)
          : null,
      body: _contenido(),
    );
  }
}
