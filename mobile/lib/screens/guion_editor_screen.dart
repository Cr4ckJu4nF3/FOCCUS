import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/guion.dart';
import '../services/guion_service.dart';
import '../widgets/foccus_ui.dart';
import 'guion_galeria_selector_sheet.dart';
import 'guion_escena_sheet.dart';
import 'guion_galeria_sheet.dart';
import 'guion_widgets.dart';

const _papel = Color(0xFFFFFDF8);
const _tinta = Color(0xFF111827);

/// Editor del guion: hoja a pantalla completa estilo procesador de texto.
class GuionEditorScreen extends StatefulWidget {
  const GuionEditorScreen.nuevoGuion({
    super.key,
    required this.projectId,
    this.nombreInicial = '',
    this.descripcionInicial = '',
  })  : guion = null,
        contenidoInicial = '',
        comentarioInicial = '',
        estadoInicial = 'Borrador';

  const GuionEditorScreen.nuevaVersion({
    super.key,
    required this.projectId,
    required Guion this.guion,
    this.contenidoInicial = '',
    this.comentarioInicial = '',
    this.estadoInicial = 'Borrador',
  })  : nombreInicial = '',
        descripcionInicial = '';

  final String projectId;
  final String nombreInicial;
  final String descripcionInicial;
  final Guion? guion;
  final String contenidoInicial;
  final String comentarioInicial;
  final String estadoInicial;

  @override
  State<GuionEditorScreen> createState() => _GuionEditorScreenState();
}

class _GuionEditorScreenState extends State<GuionEditorScreen> {
  final _nombre = TextEditingController();
  final _descripcion = TextEditingController();
  final _comentario = TextEditingController();
  final _contenido = TextEditingController();
  final _focus = FocusNode();
  final _undo = UndoHistoryController();
  late String _estado;
  late DateTime _fecha;
  TextAlign _alineacion = TextAlign.left;
  bool _guardando = false;
  bool _salidaPermitida = false;
  String _estadoBorrador = '';
  Timer? _debounce;

  // Los vínculos con la galería se guardan aparte para que no se vean en el texto.
  final List<GuionElementoVinculado> _vinculos = [];
  int _vinculosIniciales = 0;

  bool get _esVersion => widget.guion != null;

  String get _claveBorrador =>
      'guion_borrador_${widget.projectId}_${widget.guion?.id ?? 'nuevo'}';

  String get _marcadores => _vinculos.map((v) => v.marcador).join('\n');

  String get _contenidoFinal {
    final texto = _contenido.text.trimRight();
    return _vinculos.isEmpty ? texto : '$texto\n\n$_marcadores';
  }

  void _agregarVinculo(GuionElementoVinculado? v) {
    if (v == null) return;
    if (_vinculos.any((x) => x.marcador == v.marcador)) return;
    _vinculos.add(v);
  }

  bool get _sucio =>
      _vinculos.length != _vinculosIniciales ||
      _contenido.text != contenidoSinMarcadoresGaleria(widget.contenidoInicial) ||
      _comentario.text != widget.comentarioInicial ||
      _nombre.text != widget.nombreInicial ||
      _descripcion.text != widget.descripcionInicial;

  @override
  void initState() {
    super.initState();
    _contenido.text = contenidoSinMarcadoresGaleria(widget.contenidoInicial);
    _vinculos.addAll(elementosVinculados(widget.contenidoInicial));
    _vinculosIniciales = _vinculos.length;
    _comentario.text = widget.comentarioInicial;
    _nombre.text = widget.nombreInicial;
    _descripcion.text = widget.descripcionInicial;
    _estado = guionEstados.contains(widget.estadoInicial)
        ? widget.estadoInicial
        : 'Borrador';
    _fecha = DateTime.now();
    _contenido.addListener(_alCambiar);
    _nombre.addListener(_alCambiar);
    _descripcion.addListener(_alCambiar);
    WidgetsBinding.instance.addPostFrameCallback((_) => _ofrecerBorrador());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _nombre.dispose();
    _descripcion.dispose();
    _comentario.dispose();
    _contenido.dispose();
    _focus.dispose();
    _undo.dispose();
    super.dispose();
  }

  // ---------- Borrador local ----------

  void _alCambiar() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(seconds: 2), _guardarBorrador);
    if (mounted) setState(() => _estadoBorrador = '');
  }

  Future<void> _guardarBorrador() async {
    if (!mounted || _guardando) return;
    final prefs = await SharedPreferences.getInstance();
    if (!_sucio) {
      await prefs.remove(_claveBorrador);
      return;
    }
    await prefs.setStringList(_claveBorrador, [
      _nombre.text,
      _descripcion.text,
      _comentario.text,
      _contenido.text,
      _marcadores,
    ]);
    if (mounted) setState(() => _estadoBorrador = 'Borrador local guardado');
  }

  Future<void> _borrarBorrador() async {
    _debounce?.cancel();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_claveBorrador);
  }

  Future<void> _ofrecerBorrador() async {
    final prefs = await SharedPreferences.getInstance();
    final borrador = prefs.getStringList(_claveBorrador);
    if (!mounted || borrador == null || borrador.length < 4) return;
    if (borrador[3] == contenidoSinMarcadoresGaleria(widget.contenidoInicial) &&
        borrador[0].isEmpty) {
      return;
    }
    final restaurar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Borrador sin guardar'),
        content: const Text(
            'Encontramos un borrador local de este guion. ¿Quieres recuperarlo?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Descartar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Recuperar')),
        ],
      ),
    );
    if (!mounted) return;
    if (restaurar == true) {
      _nombre.text = borrador[0];
      _descripcion.text = borrador[1];
      _comentario.text = borrador[2];
      _contenido.text = borrador[3];
      if (borrador.length > 4) {
        _vinculos
          ..clear()
          ..addAll(elementosVinculados(borrador[4]));
      }
    } else {
      await _borrarBorrador();
    }
  }

  // ---------- Edición ----------

  (int, int) get _rango {
    final sel = _contenido.selection;
    final len = _contenido.text.length;
    if (!sel.isValid) return (len, len);
    return (sel.start, sel.end);
  }

  void _envolver(String prefijo, [String sufijo = '']) {
    final (inicio, fin) = _rango;
    final texto = _contenido.text;
    final seleccion = inicio == fin ? 'texto' : texto.substring(inicio, fin);
    final cursor = inicio + prefijo.length;
    _contenido.value = TextEditingValue(
      text: texto.substring(0, inicio) +
          prefijo +
          seleccion +
          sufijo +
          texto.substring(fin),
      selection: TextSelection(
          baseOffset: cursor, extentOffset: cursor + seleccion.length),
    );
    _focus.requestFocus();
  }

  void _alinear(String tipo, TextAlign align) {
    _envolver('\n[alinear:$tipo]', '[/alinear]');
    setState(() => _alineacion = align);
  }

  void _insertar(String texto) {
    final (inicio, fin) = _rango;
    final actual = _contenido.text;
    final cursor = inicio + texto.length;
    _contenido.value = TextEditingValue(
      text: actual.substring(0, inicio) + texto + actual.substring(fin),
      selection: TextSelection.collapsed(offset: cursor),
    );
    _focus.requestFocus();
  }

  /// Inserta un bloque en una línea propia (agrega salto antes si hace falta).
  void _insertarBloque(String texto) {
    final (inicio, _) = _rango;
    final antes = _contenido.text.substring(0, inicio);
    final prefijo = antes.isEmpty || antes.endsWith('\n') ? '' : '\n';
    _insertar('$prefijo$texto');
  }

  Future<void> _abrirElementos() async {
    final vinculo = await mostrarHoja<GuionElementoVinculado>(
      context,
      (_) => GuionGaleriaSelectorSheet(
        projectId: widget.projectId,
        idGuion: widget.guion?.id,
      ),
    );
    if (vinculo == null || !mounted) return;
    switch (vinculo.tipo) {
      case 'personaje':
        _agregarVinculo(vinculo);
        _insertarBloque('${vinculo.nombre.toUpperCase()}\n');
      case 'lugar':
        await _insertarEscena(locacion: vinculo.nombre, vinculo: vinculo);
      default:
        _agregarVinculo(vinculo);
        _insertarBloque('[${vinculo.tipo.toUpperCase()}: ${vinculo.nombre}]\n');
    }
  }

  Future<void> _insertarEscena({
    String locacion = '',
    GuionElementoVinculado? vinculo,
  }) async {
    final texto = await mostrarEncabezadoEscena(context,
        projectId: widget.projectId, locacionInicial: locacion);
    if (texto != null) {
      _agregarVinculo(vinculo);
      _insertarBloque('$texto\n');
    }
  }

  Future<void> _crear(String tipo) async {
    final creado = await mostrarCrearElementoGuion(
      context,
      projectId: widget.projectId,
      tipoInicial: tipo,
      idGuion: widget.guion?.id,
    );
    if (!mounted || creado == null) return;
    final nombre = creado.nombre.toUpperCase();
    switch (creado.tipo) {
      case 'personaje':
        _insertarBloque('$nombre\n');
      case 'lugar':
        showSnack(context, '"${creado.nombre}" guardado en la galería');
        await _insertarEscena(locacion: creado.nombre);
        return;
      default:
        _insertar('**${creado.nombre}**');
    }
    if (mounted) {
      showSnack(context, '"${creado.nombre}" creado y guardado en la galería');
    }
  }

  Future<void> _menuInsertar() async {
    final accion = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: context.fc.surface,
      builder: (ctx) {
        Widget item(IconData i, String t, String v) => ListTile(
              leading: Icon(i, color: context.fc.accentText),
              title: Text(t, style: TextStyle(color: context.fc.text)),
              onTap: () => Navigator.pop(ctx, v),
            );
        return SafeArea(
          child: ListView(shrinkWrap: true, children: [
            item(Icons.movie_outlined, 'Encabezado de escena', 'escena'),
            item(Icons.groups_2_outlined, 'Personaje o escenario existente',
                'existente'),
            const Divider(height: 1),
            item(Icons.person_add_alt_1, 'Crear personaje (con foto)',
                'personaje'),
            item(Icons.add_location_alt_outlined,
                'Crear escenario / locación (con foto)', 'lugar'),
            item(Icons.checkroom_outlined,
                'Crear utilería / vestuario (con foto)', 'objeto'),
          ]),
        );
      },
    );
    if (!mounted || accion == null) return;
    switch (accion) {
      case 'escena':
        await _insertarEscena();
      case 'existente':
        await _abrirElementos();
      default:
        await _crear(accion);
    }
  }

  Future<void> _elegirFecha() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _fecha,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _fecha = picked);
  }

  Future<void> _editarDetalles() async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(
              _esVersion ? 'Detalles de la versión' : 'Detalles del guion'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              if (!_esVersion) ...[
                TextField(
                    controller: _nombre,
                    decoration:
                        const InputDecoration(labelText: 'Título del guion')),
                TextField(
                    controller: _descripcion,
                    decoration:
                        const InputDecoration(labelText: 'Descripción')),
              ] else ...[
                DropdownButtonFormField<String>(
                  initialValue: _estado,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Estado'),
                  items: guionEstados
                      .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                      .toList(),
                  onChanged: (v) {
                    setState(() => _estado = v ?? 'Borrador');
                  },
                ),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () async {
                    await _elegirFecha();
                    setLocal(() {});
                  },
                  child: InputDecorator(
                    decoration:
                        const InputDecoration(labelText: 'Fecha de emisión'),
                    child: Text(_fecha.toIso8601String().substring(0, 10)),
                  ),
                ),
                TextField(
                    controller: _comentario,
                    maxLines: 2,
                    decoration: const InputDecoration(
                        labelText: 'Comentario del cambio')),
              ],
            ]),
          ),
          actions: [
            FilledButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Listo')),
          ],
        ),
      ),
    );
  }

  // ---------- Guardado (misma lógica que antes) ----------

  Future<void> _guardar() async {
    if (_guardando) return;
    if (_contenido.text.trim().isEmpty) {
      showSnack(
          context,
          _esVersion
              ? 'Escribe el contenido del guion antes de guardar'
              : 'Escribe el contenido inicial del guion antes de crearlo',
          error: true);
      return;
    }
    if (!_esVersion && _nombre.text.trim().isEmpty) {
      showSnack(context, 'El título del guion es obligatorio', error: true);
      return;
    }
    setState(() => _guardando = true);
    final GuionResult<void> result;
    if (_esVersion) {
      result = await GuionService.crearVersionTexto(
        idGuion: widget.guion!.id,
        contenido: _contenidoFinal,
        fecha: _fecha.toIso8601String().substring(0, 10),
        estado: _estado,
        comentario: _comentario.text.trim(),
      );
    } else {
      result = await GuionService.crearDesdeTexto(
        projectId: widget.projectId,
        nombre: _nombre.text.trim(),
        descripcion: _descripcion.text.trim(),
        contenido: _contenidoFinal,
      );
    }
    if (!mounted) return;
    if (result.ok) {
      await _borrarBorrador();
      if (!mounted) return;
      setState(() => _salidaPermitida = true);
      Navigator.pop(context, true);
    } else {
      // El texto se conserva; solo avisamos del error.
      setState(() => _guardando = false);
      showSnack(context, result.error ?? 'No se pudo guardar', error: true);
    }
  }

  Future<void> _confirmarSalida() async {
    final accion = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cambios sin guardar'),
        content: const Text(
            'Tienes cambios sin guardar en el servidor. ¿Qué quieres hacer?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, 'seguir'),
              child: const Text('Seguir editando')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, 'descartar'),
              child: const Text('Descartar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, 'guardar'),
              child: const Text('Guardar')),
        ],
      ),
    );
    if (!mounted) return;
    if (accion == 'guardar') {
      await _guardar();
    } else if (accion == 'descartar') {
      await _borrarBorrador();
      if (!mounted) return;
      setState(() => _salidaPermitida = true);
      Navigator.pop(context);
    }
  }

  // ---------- UI ----------

  int get _palabras {
    final t = _contenido.text.trim();
    return t.isEmpty ? 0 : t.split(RegExp(r'\s+')).length;
  }

  @override
  Widget build(BuildContext context) {
    final palabras = _palabras;
    final paginas = palabras == 0 ? 0 : (palabras / 250).ceil();
    return PopScope(
      canPop: _salidaPermitida || !_sucio,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmarSalida();
      },
      child: Scaffold(
        backgroundColor: context.fc.bg,
        appBar: AppBar(
          backgroundColor: context.fc.appBar,
          foregroundColor: context.fc.text,
          elevation: 1,
          titleSpacing: 0,
          title: _esVersion
              ? Text(widget.guion!.nombre,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: context.fc.text, fontSize: 16))
              : TextField(
                  controller: _nombre,
                  style: TextStyle(color: context.fc.text, fontSize: 16),
                  decoration: InputDecoration(
                    hintText: 'Título del guion',
                    hintStyle: TextStyle(color: context.fc.textMuted),
                    border: InputBorder.none,
                    filled: false,
                  ),
                ),
          actions: [
            if (_estadoBorrador.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(right: 4),
                child: Tooltip(
                    message: 'Borrador local guardado',
                    child: Icon(Icons.cloud_done_outlined,
                        size: 18, color: context.fc.success)),
              ),
            _guardando
                ? const Padding(
                    padding: EdgeInsets.all(14),
                    child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2)))
                : IconButton(
                    tooltip: _esVersion ? 'Guardar versión' : 'Crear guion',
                    onPressed: _guardar,
                    icon: Icon(Icons.check_circle_outline,
                        color: context.fc.accentText),
                  ),
            PopupMenuButton<String>(
              onSelected: (v) {
                if (v == 'detalles') _editarDetalles();
                if (v == 'guardar') _guardar();
              },
              itemBuilder: (_) => [
                PopupMenuItem(
                    value: 'detalles',
                    child: Text(_esVersion
                        ? 'Estado, fecha y comentario'
                        : 'Descripción del guion')),
                PopupMenuItem(
                    value: 'guardar',
                    child:
                        Text(_esVersion ? 'Guardar versión' : 'Crear guion')),
              ],
            ),
          ],
        ),
        body: Column(children: [
          Expanded(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 820),
                child: Container(
                  width: double.infinity,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  color: _papel,
                  child: TextField(
                    controller: _contenido,
                    focusNode: _focus,
                    undoController: _undo,
                    textAlign: _alineacion,
                    expands: true,
                    maxLines: null,
                    minLines: null,
                    textAlignVertical: TextAlignVertical.top,
                    keyboardType: TextInputType.multiline,
                    textCapitalization: TextCapitalization.sentences,
                    cursorColor: context.fc.accent,
                    scrollPadding: const EdgeInsets.all(48),
                    style: const TextStyle(
                        color: _tinta,
                        fontFamily: 'monospace',
                        fontSize: 17,
                        height: 1.6),
                    decoration: const InputDecoration(
                      filled: false,
                      contentPadding: EdgeInsets.fromLTRB(20, 20, 20, 28),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      hintText:
                          'INT. CABAÑA - SALA PRINCIPAL - AMANECER\n\nEscribe la acción, el diálogo y las notas de tu escena...',
                      hintStyle: TextStyle(color: Color(0xFF9CA3AF)),
                    ),
                  ),
                ),
              ),
            ),
          ),
          _barraEstado(palabras, paginas),
          _toolbar(),
        ]),
      ),
    );
  }

  Widget _barraEstado(int palabras, int paginas) => Container(
        width: double.infinity,
        color: context.fc.surfaceAlt,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
        child: Text(
          '$palabras palabras · $paginas pág.'
          '${_estadoBorrador.isEmpty ? '' : ' · $_estadoBorrador'}',
          style: TextStyle(color: context.fc.textMuted, fontSize: 11),
        ),
      );

  Widget _toolbar() {
    Widget boton(IconData icon, String tip, VoidCallback? onTap) => IconButton(
          tooltip: tip,
          onPressed: onTap,
          icon: Icon(icon, size: 22),
          color: context.fc.textSubtle,
        );
    return Material(
      color: context.fc.surface,
      elevation: 8,
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: [
            ValueListenableBuilder<UndoHistoryValue>(
              valueListenable: _undo,
              builder: (_, v, __) => Row(children: [
                boton(Icons.undo, 'Deshacer', v.canUndo ? _undo.undo : null),
                boton(Icons.redo, 'Rehacer', v.canRedo ? _undo.redo : null),
              ]),
            ),
            boton(Icons.format_bold, 'Negrita', () => _envolver('**', '**')),
            boton(Icons.format_italic, 'Cursiva', () => _envolver('_', '_')),
            boton(Icons.format_underlined, 'Subrayado',
                () => _envolver('__', '__')),
            boton(Icons.title, 'Encabezado', () => _envolver('\n# ')),
            boton(Icons.format_list_bulleted, 'Lista', () => _envolver('\n- ')),
            boton(Icons.format_align_left, 'Alinear izquierda',
                () => _alinear('left', TextAlign.left)),
            boton(Icons.format_align_center, 'Centrar',
                () => _alinear('center', TextAlign.center)),
            boton(Icons.format_align_right, 'Alinear derecha',
                () => _alinear('right', TextAlign.right)),
            boton(Icons.movie_outlined, 'Encabezado de escena',
                () => _insertarEscena()),
            TextButton.icon(
              onPressed: _menuInsertar,
              icon: Icon(Icons.add_circle_outline,
                  size: 18, color: context.fc.accentText),
              label: Text('Insertar / crear',
                  style: TextStyle(color: context.fc.accentText, fontSize: 12)),
            ),
          ]),
        ),
      ),
    );
  }
}
