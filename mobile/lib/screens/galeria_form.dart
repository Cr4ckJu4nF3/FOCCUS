import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../models/galeria_item.dart';
import '../services/api_client.dart';
import '../widgets/foccus_ui.dart';

const _sinConexion = 'No se pudo conectar con el servidor';

/// Pregunta camara o galeria y devuelve la ruta de la foto (o null).
Future<String?> elegirFoto(BuildContext context) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    backgroundColor: context.fc.surface,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: Icon(Icons.photo_camera, color: ctx.fc.text),
            title: Text('Tomar foto', style: TextStyle(color: ctx.fc.text)),
            onTap: () => Navigator.pop(ctx, ImageSource.camera),
          ),
          ListTile(
            leading: Icon(Icons.photo_library, color: ctx.fc.text),
            title: Text('Elegir de la galería',
                style: TextStyle(color: ctx.fc.text)),
            onTap: () => Navigator.pop(ctx, ImageSource.gallery),
          ),
        ],
      ),
    ),
  );
  if (source == null) return null;
  try {
    final file = await ImagePicker()
        .pickImage(source: source, imageQuality: 85, maxWidth: 2000);
    return file?.path;
  } catch (_) {
    if (context.mounted) {
      showSnack(context, 'No se pudo abrir la cámara o la galería',
          error: true);
    }
    return null;
  }
}

/// Abre el formulario para crear (item == null) o editar un elemento.
/// Devuelve true si se guardó.
Future<bool> mostrarFormularioGaleria(
  BuildContext context, {
  required String projectId,
  GaleriaItem? item,
  List<GaleriaItem> personajes = const [],
}) async {
  final result = await showFoccusSheet<bool>(
    context,
    title: item == null ? 'Nuevo elemento' : 'Editar elemento',
    builder: (_) => _GaleriaForm(
      projectId: projectId,
      item: item,
      personajes: personajes,
    ),
  );
  return result == true;
}

class _GaleriaForm extends StatefulWidget {
  const _GaleriaForm({
    required this.projectId,
    required this.item,
    required this.personajes,
  });

  final String projectId;
  final GaleriaItem? item;
  final List<GaleriaItem> personajes;

  @override
  State<_GaleriaForm> createState() => _GaleriaFormState();
}

class _GaleriaFormState extends State<_GaleriaForm> {
  final _nombre = TextEditingController();
  final _descripcion = TextEditingController();
  final _interpreteNombre = TextEditingController();
  final _interpreteDesc = TextEditingController();
  final _ubicacion = TextEditingController();
  final _objetos = TextEditingController();
  final _personajesTexto = TextEditingController();

  String _tipo = 'objeto';
  String? _categoria;
  String _estado = 'Disponible';
  String? _ultimoUso;
  String? _fotoPath;
  final Set<int> _vinculados = {};
  bool _saving = false;
  String? _error;

  bool get _editando => widget.item != null;

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    if (it != null) {
      _tipo = it.tipo;
      _categoria = it.categoria.isEmpty ? null : it.categoria;
      _estado = it.estado.isEmpty ? 'Disponible' : it.estado;
      _nombre.text = it.nombre;
      _descripcion.text = it.descripcion;
      _interpreteNombre.text = it.s('interprete_nombre');
      _interpreteDesc.text = it.s('interprete_descripcion');
      _ubicacion.text = it.s('lugar_detalle_ubicacion');
      _objetos.text = it.s('lugar_objetos');
      _personajesTexto.text = it.s('lugar_personajes');
      _ultimoUso = it.ultimoUso.isEmpty ? null : it.ultimoUso;
      for (final v in it.vinculados) {
        final id = (v['id_galeria'] as num?)?.toInt();
        if (id != null) _vinculados.add(id);
      }
    }
  }

  @override
  void dispose() {
    for (final c in [
      _nombre,
      _descripcion,
      _interpreteNombre,
      _interpreteDesc,
      _ubicacion,
      _objetos,
      _personajesTexto,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Campos de texto que cambian según el tipo (igual que la web).
  Map<String, Object?> _campos() {
    final desc = _descripcion.text.trim();
    return {
      'tipo': _tipo,
      'categoria': _categoria,
      'nombre': _nombre.text.trim(),
      'descripcion': desc,
      if (_tipo == 'personaje') ...{
        'personaje_sinopsis': desc,
        'interprete_nombre': _interpreteNombre.text.trim(),
        'interprete_descripcion': _interpreteDesc.text.trim(),
      },
      if (_tipo == 'lugar') ...{
        'lugar_apariencia': desc,
        'lugar_detalle_ubicacion': _ubicacion.text.trim(),
        'lugar_objetos': _objetos.text.trim(),
        'lugar_personajes': _personajesTexto.text.trim(),
        'personajes_vinculados': _vinculados.toList(),
      },
      'ultimo_uso': _ultimoUso,
      'estado': _estado,
    };
  }

  Future<void> _elegirFoto() async {
    final path = await elegirFoto(context);
    if (!mounted || path == null) return;
    setState(() => _fotoPath = path);
  }

  Future<void> _elegirFecha() async {
    final hoy = DateTime.now();
    final fecha = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_ultimoUso ?? '') ?? hoy,
      firstDate: DateTime(2000),
      lastDate: DateTime(hoy.year + 5),
    );
    if (!mounted || fecha == null) return;
    setState(() => _ultimoUso = fecha.toIso8601String().substring(0, 10));
  }

  Future<void> _guardar() async {
    if (_nombre.text.trim().isEmpty || _descripcion.text.trim().isEmpty) {
      setState(() => _error = 'El nombre y la descripción son obligatorios');
      return;
    }
    if (!_editando && _fotoPath == null) {
      setState(() => _error = 'La foto es obligatoria');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final base = '/projects/${widget.projectId}/galeria';
      final campos = _campos();
      ApiResponse res;
      if (_editando) {
        final body = <String, dynamic>{};
        campos.forEach((k, v) {
          if (v != null) body[k] = v;
        });
        res = await ApiClient.patch('$base/${widget.item!.id}', body: body);
        // Si además eligió una foto nueva, se sube aparte.
        if (res.success && _fotoPath != null) {
          res = await ApiClient.uploadFiles(
            '$base/${widget.item!.id}/foto',
            files: [MapEntry('foto', _fotoPath!)],
          );
        }
      } else {
        res = await ApiClient.uploadFiles(
          base,
          files: [MapEntry('foto', _fotoPath!)],
          fields: campos,
        );
      }
      if (!mounted) return;
      if (res.success) {
        Navigator.pop(context, true);
      } else {
        setState(() {
          _saving = false;
          _error = res.errorMessage('No se pudo guardar el elemento');
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

  Widget _gap() => const SizedBox(height: FoccusDims.gap);

  Widget _texto(TextEditingController c, String label, {int lines = 1}) =>
      TextField(
        controller: c,
        maxLines: lines,
        style: TextStyle(color: context.fc.text, fontSize: 14),
        decoration: foccusInput(label),
      );

  Widget _dropdown(String label, String? value, List<String> opciones,
      ValueChanged<String?> onChanged) {
    final lista = [...opciones];
    if (value != null && !lista.contains(value)) lista.add(value);
    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      dropdownColor: context.fc.surface,
      style: TextStyle(color: context.fc.text, fontSize: 14),
      decoration: foccusInput(label),
      items: [
        for (final o in lista) DropdownMenuItem(value: o, child: Text(o)),
      ],
      onChanged: onChanged,
    );
  }

  @override
  Widget build(BuildContext context) {
    final categorias = GaleriaItem.categorias[_tipo] ?? const <String>[];
    final fichas =
        widget.personajes.where((p) => p.id != widget.item?.id).toList();
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!_editando)
          Wrap(
            spacing: FoccusDims.gap,
            runSpacing: 8,
            children: [
              for (final e in GaleriaItem.tipos.entries)
                ChoiceChip(
                  label: Text(e.value),
                  labelStyle: const TextStyle(fontSize: 14),
                  selected: _tipo == e.key,
                  onSelected: (_) => setState(() {
                    _tipo = e.key;
                    _categoria = null;
                  }),
                ),
            ],
          ),
        _gap(),
        _texto(_nombre, 'Nombre'),
        _gap(),
        _dropdown('Categoría', _categoria, categorias,
            (v) => setState(() => _categoria = v)),
        _gap(),
        _texto(
            _descripcion,
            _tipo == 'personaje'
                ? 'Sinopsis y descripción'
                : _tipo == 'lugar'
                    ? 'Descripción y apariencia'
                    : 'Descripción y uso',
            lines: 4),
        if (_tipo == 'personaje') ...[
          _gap(),
          _texto(_interpreteNombre, 'Intérprete'),
          _gap(),
          _texto(_interpreteDesc, 'Descripción del intérprete', lines: 2),
        ],
        if (_tipo == 'lugar') ...[
          _gap(),
          _texto(_ubicacion, 'Detalle de ubicación'),
          _gap(),
          _texto(_objetos, 'Objetos del lugar', lines: 2),
          _gap(),
          _texto(_personajesTexto, 'Personajes (texto)', lines: 2),
          if (fichas.isNotEmpty) ...[
            _gap(),
            Text('Personajes vinculados',
                style: GoogleFonts.inter(
                    fontSize: 14, color: context.fc.textMuted)),
            Wrap(
              spacing: FoccusDims.gap,
              runSpacing: 8,
              children: [
                for (final p in fichas)
                  FilterChip(
                    label: Text(p.nombre),
                    labelStyle: const TextStyle(fontSize: 14),
                    selected: _vinculados.contains(p.id),
                    onSelected: (v) => setState(() {
                      v ? _vinculados.add(p.id) : _vinculados.remove(p.id);
                    }),
                  ),
              ],
            ),
          ],
        ],
        _gap(),
        _dropdown('Estado', _estado, GaleriaItem.estados,
            (v) => setState(() => _estado = v ?? 'Disponible')),
        _gap(),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(FoccusDims.buttonHeight)),
          onPressed: _elegirFecha,
          icon: const Icon(Icons.event),
          label: Text(_ultimoUso == null
              ? 'Último uso (opcional)'
              : 'Último uso: $_ultimoUso'),
        ),
        _gap(),
        if (_fotoPath != null)
          Padding(
            padding: const EdgeInsets.only(bottom: FoccusDims.gap),
            child: Text('Foto seleccionada ✔',
                style: GoogleFonts.inter(
                    fontSize: 14, color: context.fc.success)),
          ),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(FoccusDims.buttonHeight)),
          onPressed: _elegirFoto,
          icon: const Icon(Icons.add_a_photo),
          label: Text(_editando
              ? 'Cambiar foto principal'
              : 'Agregar foto (obligatoria)'),
        ),
        if (_error != null) ...[
          _gap(),
          Text(_error!,
              style:
                  GoogleFonts.inter(fontSize: 14, color: context.fc.error)),
        ],
        _gap(),
        FoccusButton(
          label: 'Guardar',
          icon: Icons.save_outlined,
          onPressed: _guardar,
          loading: _saving,
        ),
      ],
    );
  }
}
