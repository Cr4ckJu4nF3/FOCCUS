import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/guion.dart';
import '../services/guion_service.dart';
import '../widgets/foccus_ui.dart';
import 'guion_widgets.dart';

class _ArchivoPicker extends StatelessWidget {
  const _ArchivoPicker(
      {required this.nombre, required this.onPick, required this.etiqueta});

  final String? nombre;
  final VoidCallback onPick;
  final String etiqueta;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.fc.accent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: context.fc.accent.withValues(alpha: 0.45)),
      ),
      child: Row(children: [
        Icon(Icons.attach_file, color: context.fc.accentText),
        const SizedBox(width: 10),
        Expanded(
          child: Text(nombre ?? etiqueta,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(fontSize: 12, color: context.fc.textSubtle)),
        ),
        OutlinedButton.icon(
          onPressed: onPick,
          icon: const Icon(Icons.folder_open_outlined, size: 16),
          label: Text(nombre == null ? 'Seleccionar' : 'Cambiar'),
        ),
      ]),
    );
  }
}

Future<({String path, String name})?> _elegirArchivo(
    List<String> extensiones) async {
  final files = await FilePicker.pickFiles(
      type: FileType.custom, allowedExtensions: extensiones);
  if (files.isEmpty || files.first.path == null) return null;
  return (path: files.first.path!, name: files.first.name);
}

class _HojaFormulario extends StatelessWidget {
  const _HojaFormulario({
    required this.titulo,
    required this.icono,
    required this.error,
    required this.children,
  });

  final String titulo;
  final IconData icono;
  final String? error;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          HojaEncabezado(titulo, icono: icono),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 4, 18, 20),
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (error != null) MensajeBanner(error!, exito: false),
                  ...children,
                ]),
          ),
        ]),
      ),
    );
  }
}

Widget _boton(BuildContext context, String texto, IconData icono, bool ocupado,
        VoidCallback onTap) =>
    FilledButton.icon(
      onPressed: ocupado ? null : onTap,
      style: FilledButton.styleFrom(
          backgroundColor: context.fc.accent,
          padding: const EdgeInsets.symmetric(vertical: 14)),
      icon: ocupado
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Colors.white))
          : Icon(icono),
      label: Text(texto),
    );

class GuionElegirCreacionSheet extends StatelessWidget {
  const GuionElegirCreacionSheet({super.key});

  @override
  Widget build(BuildContext context) {
    Widget opcion(IconData icon, String titulo, String detalle, String valor) =>
        FoccusCard(
          onTap: () => Navigator.pop(context, valor),
          child: Row(children: [
            Icon(icon, size: 30, color: context.fc.accentText),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(titulo,
                        style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600, color: context.fc.text)),
                    const SizedBox(height: 2),
                    Text(detalle,
                        style: GoogleFonts.inter(
                            fontSize: 12, color: context.fc.textMuted)),
                  ]),
            ),
            Icon(Icons.chevron_right, color: context.fc.textMuted),
          ]),
        );
    return Column(mainAxisSize: MainAxisSize.min, children: [
      const HojaEncabezado('Crear guion', icono: Icons.add_circle_outline),
      Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 24),
        child: Column(children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text('¿Cómo quieres empezar este guion?',
                  style: GoogleFonts.inter(color: context.fc.textMuted)),
            ),
          ),
          opcion(Icons.cloud_upload_outlined, 'Subir guion',
              'Sube un PDF o Word ya escrito', 'subir'),
          opcion(Icons.auto_awesome_outlined, 'Crear desde cero',
              'Escríbelo directo en el sistema', 'cero'),
        ]),
      ),
    ]);
  }
}

class GuionSubirSheet extends StatefulWidget {
  const GuionSubirSheet({super.key, required this.projectId});
  final String projectId;

  @override
  State<GuionSubirSheet> createState() => _GuionSubirSheetState();
}

class _GuionSubirSheetState extends State<GuionSubirSheet> {
  final _nombre = TextEditingController();
  final _descripcion = TextEditingController();
  ({String path, String name})? _archivo;
  bool _subiendo = false;
  String? _error;

  @override
  void dispose() {
    _nombre.dispose();
    _descripcion.dispose();
    super.dispose();
  }

  Future<void> _subir() async {
    if (_nombre.text.trim().isEmpty) {
      setState(() => _error = 'El nombre del guion es obligatorio');
      return;
    }
    if (_archivo == null) {
      setState(() => _error = 'Debes adjuntar el archivo del guion');
      return;
    }
    setState(() {
      _subiendo = true;
      _error = null;
    });
    final result = await GuionService.subirArchivo(
      projectId: widget.projectId,
      nombre: _nombre.text.trim(),
      descripcion: _descripcion.text.trim(),
      filePath: _archivo!.path,
    );
    if (!mounted) return;
    if (result.ok) {
      Navigator.pop(context, true);
    } else {
      setState(() {
        _subiendo = false;
        _error = result.error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return _HojaFormulario(
      titulo: 'Subir guion',
      icono: Icons.cloud_upload_outlined,
      error: _error,
      children: [
        TextField(
            controller: _nombre,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Nombre del guion',
                hint: 'Ej. Episodio 01 - Opening')),
        const SizedBox(height: 12),
        TextField(
            controller: _descripcion,
            minLines: 2,
            maxLines: 4,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Descripción',
                hint: 'Resumen del guion, tono o notas del proyecto')),
        const SizedBox(height: 12),
        _ArchivoPicker(
          nombre: _archivo?.name,
          etiqueta: 'PDF, Word o FDX',
          onPick: () async {
            final file = await _elegirArchivo(['pdf', 'docx', 'fdx']);
            if (file != null && mounted) setState(() => _archivo = file);
          },
        ),
        const SizedBox(height: 16),
        _boton(context, _subiendo ? 'Subiendo...' : 'Subir guion',
            Icons.cloud_upload_outlined, _subiendo, _subir),
      ],
    );
  }
}

class GuionEditarSheet extends StatefulWidget {
  const GuionEditarSheet({super.key, required this.guion});
  final Guion guion;

  @override
  State<GuionEditarSheet> createState() => _GuionEditarSheetState();
}

class _GuionEditarSheetState extends State<GuionEditarSheet> {
  late final _nombre = TextEditingController(text: widget.guion.nombre);
  late final _descripcion =
      TextEditingController(text: widget.guion.descripcion);
  bool _guardando = false;
  String? _error;

  @override
  void dispose() {
    _nombre.dispose();
    _descripcion.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    if (_nombre.text.trim().isEmpty) {
      setState(() => _error = 'El nombre del guion es obligatorio');
      return;
    }
    setState(() {
      _guardando = true;
      _error = null;
    });
    final result = await GuionService.actualizar(
        widget.guion.id, _nombre.text.trim(), _descripcion.text.trim());
    if (!mounted) return;
    if (result.ok) {
      Navigator.pop(
          context,
          widget.guion.copyWith(
              nombre: _nombre.text.trim(),
              descripcion: _descripcion.text.trim()));
    } else {
      setState(() {
        _guardando = false;
        _error = result.error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return _HojaFormulario(
      titulo: 'Editar guion',
      icono: Icons.edit_outlined,
      error: _error,
      children: [
        TextField(
            controller: _nombre,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Título del guion')),
        const SizedBox(height: 12),
        TextField(
            controller: _descripcion,
            minLines: 2,
            maxLines: 4,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Descripción')),
        const SizedBox(height: 16),
        _boton(context, _guardando ? 'Guardando...' : 'Guardar cambios',
            Icons.save_outlined, _guardando, _guardar),
      ],
    );
  }
}

class GuionVersionArchivoSheet extends StatefulWidget {
  const GuionVersionArchivoSheet({super.key, required this.guion});
  final Guion guion;

  @override
  State<GuionVersionArchivoSheet> createState() =>
      _GuionVersionArchivoSheetState();
}

class _GuionVersionArchivoSheetState extends State<GuionVersionArchivoSheet> {
  final _comentario = TextEditingController();
  ({String path, String name})? _archivo;
  String _estado = 'Borrador';
  DateTime _fecha = DateTime.now();
  bool _subiendo = false;
  String? _error;

  @override
  void dispose() {
    _comentario.dispose();
    super.dispose();
  }

  Future<void> _subir() async {
    if (_archivo == null) {
      setState(() => _error = 'Debes adjuntar un archivo del guion');
      return;
    }
    setState(() {
      _subiendo = true;
      _error = null;
    });
    final result = await GuionService.subirVersion(
      idGuion: widget.guion.id,
      filePath: _archivo!.path,
      fecha: _fecha.toIso8601String().substring(0, 10),
      estado: _estado,
      comentario: _comentario.text.trim(),
    );
    if (!mounted) return;
    if (result.ok) {
      Navigator.pop(context, true);
    } else {
      setState(() {
        _subiendo = false;
        _error = result.error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return _HojaFormulario(
      titulo: 'Nueva versión (archivo)',
      icono: Icons.attach_file,
      error: _error,
      children: [
        Row(children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              initialValue: _estado,
              isExpanded: true,
              dropdownColor: context.fc.surface,
              style: TextStyle(color: context.fc.text),
              decoration: foccusInput('Estado'),
              items: guionEstados
                  .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                  .toList(),
              onChanged: (v) => setState(() => _estado = v ?? 'Borrador'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _fecha,
                  firstDate: DateTime(2000),
                  lastDate: DateTime(2100),
                );
                if (picked != null) setState(() => _fecha = picked);
              },
              child: InputDecorator(
                decoration: foccusInput('Fecha de emisión'),
                child: Text(_fecha.toIso8601String().substring(0, 10),
                    style: TextStyle(color: context.fc.text)),
              ),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        TextField(
            controller: _comentario,
            minLines: 2,
            maxLines: 4,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Comentario del cambio',
                hint: 'Describe la modificación realizada')),
        const SizedBox(height: 12),
        _ArchivoPicker(
          nombre: _archivo?.name,
          etiqueta: 'PDF, Word o FDX',
          onPick: () async {
            final file = await _elegirArchivo(['pdf', 'docx', 'fdx']);
            if (file != null && mounted) setState(() => _archivo = file);
          },
        ),
        const SizedBox(height: 16),
        _boton(context, _subiendo ? 'Subiendo...' : 'Guardar versión',
            Icons.cloud_upload_outlined, _subiendo, _subir),
      ],
    );
  }
}
