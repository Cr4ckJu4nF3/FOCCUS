import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/galeria_item.dart';
import '../services/api_client.dart';
import '../widgets/foccus_ui.dart';
import 'galeria_form.dart' show elegirFoto;
import 'guion_widgets.dart';


/// Resultado de crear un elemento desde el editor del guion.
class ElementoCreado {
  const ElementoCreado({required this.tipo, required this.nombre});

  /// 'personaje', 'lugar' u 'objeto' (mismos valores que la galería).
  final String tipo;
  final String nombre;
}

/// Abre el formulario "crear y guardar en la galería" desde el editor.
///
/// El backend (POST /projects/{id}/galeria) ya crea —o reutiliza— el
/// personaje o escenario del proyecto cuando el tipo es `personaje`/`lugar`,
/// así que con una sola petición se crea la entidad, se guarda la foto en la
/// galería y se vincula al guion (id_guion) cuando existe.
Future<ElementoCreado?> mostrarCrearElementoGuion(
  BuildContext context, {
  required String projectId,
  required String tipoInicial,
  int? idGuion,
}) {
  return mostrarHoja<ElementoCreado>(
    context,
    (_) => _CrearElementoForm(
      projectId: projectId,
      tipoInicial: tipoInicial,
      idGuion: idGuion,
    ),
  );
}

class _CrearElementoForm extends StatefulWidget {
  const _CrearElementoForm({
    required this.projectId,
    required this.tipoInicial,
    required this.idGuion,
  });

  final String projectId;
  final String tipoInicial;
  final int? idGuion;

  @override
  State<_CrearElementoForm> createState() => _CrearElementoFormState();
}

class _CrearElementoFormState extends State<_CrearElementoForm> {
  final _nombre = TextEditingController();
  final _descripcion = TextEditingController();
  late String _tipo = GaleriaItem.tipos.containsKey(widget.tipoInicial)
      ? widget.tipoInicial
      : 'objeto';
  String? _categoria;
  String? _fotoPath;
  bool _guardando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _categoria = _categoriaPorDefecto(_tipo);
  }

  @override
  void dispose() {
    _nombre.dispose();
    _descripcion.dispose();
    super.dispose();
  }

  String? _categoriaPorDefecto(String tipo) => switch (tipo) {
        'objeto' => 'Utilería',
        'lugar' => 'Interior',
        'personaje' => 'Personaje principal',
        _ => null,
      };

  Future<void> _tomarFoto() async {
    final path = await elegirFoto(context);
    if (!mounted || path == null) return;
    setState(() => _fotoPath = path);
  }

  Future<void> _guardar() async {
    final nombre = _nombre.text.trim();
    final desc = _descripcion.text.trim();
    if (nombre.isEmpty || desc.isEmpty) {
      setState(() => _error = 'El nombre y la descripción son obligatorios');
      return;
    }
    if (_fotoPath == null) {
      setState(() => _error = 'La foto es obligatoria para la galería');
      return;
    }
    setState(() {
      _guardando = true;
      _error = null;
    });
    try {
      final res = await ApiClient.uploadFiles(
        '/projects/${widget.projectId}/galeria',
        files: [MapEntry('foto', _fotoPath!)],
        fields: {
          'tipo': _tipo,
          'nombre': nombre,
          'descripcion': desc,
          'categoria': _categoria,
          if (_tipo == 'personaje') 'personaje_sinopsis': desc,
          if (_tipo == 'lugar') 'lugar_apariencia': desc,
          'estado': 'Disponible',
          if (widget.idGuion != null) 'id_guion': widget.idGuion,
        },
      );
      if (!mounted) return;
      if (res.success) {
        Navigator.pop(context, ElementoCreado(tipo: _tipo, nombre: nombre));
      } else {
        setState(() {
          _guardando = false;
          _error = res.errorMessage('No se pudo guardar en la galería');
        });
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() {
        _guardando = false;
        _error = 'No se pudo conectar con el servidor';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final categorias = GaleriaItem.categorias[_tipo] ?? const <String>[];
    final etiquetaNombre = switch (_tipo) {
      'personaje' => 'Nombre del personaje',
      'lugar' => 'Nombre de la locación',
      _ => 'Nombre del elemento',
    };
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [
          const HojaEncabezado('Crear y guardar en la galería',
              icono: Icons.add_photo_alternate_outlined),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            for (final e in GaleriaItem.tipos.entries)
              ChoiceChip(
                label: Text(e.key == 'objeto'
                    ? 'Utilería / vestuario'
                    : e.key == 'lugar'
                        ? 'Escenario / locación'
                        : e.value),
                selected: _tipo == e.key,
                onSelected: _guardando
                    ? null
                    : (_) => setState(() {
                          _tipo = e.key;
                          _categoria = _categoriaPorDefecto(e.key);
                        }),
              ),
          ]),
          const SizedBox(height: 12),
          TextField(
            controller: _nombre,
            enabled: !_guardando,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput(etiquetaNombre),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            key: ValueKey(_tipo),
            initialValue: _categoria,
            isExpanded: true,
            dropdownColor: context.fc.surface,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Categoría'),
            items: [
              for (final c in categorias)
                DropdownMenuItem(value: c, child: Text(c)),
            ],
            onChanged: _guardando ? null : (v) => setState(() => _categoria = v),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descripcion,
            enabled: !_guardando,
            maxLines: 3,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput(switch (_tipo) {
              'personaje' => 'Sinopsis y descripción',
              'lugar' => 'Descripción y apariencia',
              _ => 'Descripción y uso',
            }),
          ),
          const SizedBox(height: 12),
          if (_fotoPath != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.file(File(_fotoPath!),
                    height: 160,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Text('Foto seleccionada ✔',
                        style: GoogleFonts.inter(color: context.fc.success))),
              ),
            ),
          OutlinedButton.icon(
            onPressed: _guardando ? null : _tomarFoto,
            icon: const Icon(Icons.add_a_photo_outlined),
            label: Text(
                _fotoPath == null ? 'Agregar foto (cámara o galería)' : 'Cambiar foto'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!,
                style: GoogleFonts.inter(color: context.fc.error)),
          ],
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: _guardando ? null : _guardar,
            style: FilledButton.styleFrom(
                backgroundColor: context.fc.accent,
                padding: const EdgeInsets.symmetric(vertical: 14)),
            icon: _guardando
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save_outlined),
            label: Text(_guardando ? 'Guardando...' : 'Guardar e insertar'),
          ),
        ],
      ),
    );
  }
}
