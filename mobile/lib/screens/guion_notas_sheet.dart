import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/guion.dart';
import '../services/guion_service.dart';
import '../widgets/foccus_ui.dart';
import 'guion_widgets.dart';

class GuionNotasSheet extends StatefulWidget {
  const GuionNotasSheet({super.key, required this.version});

  final GuionVersion version;

  @override
  State<GuionNotasSheet> createState() => _GuionNotasSheetState();
}

class _GuionNotasSheetState extends State<GuionNotasSheet> {
  final _nota = TextEditingController();
  List<GuionNota> _notas = const [];
  bool _cargando = true;
  bool _enviando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  @override
  void dispose() {
    _nota.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    final result = await GuionService.notas(widget.version.id);
    if (!mounted) return;
    setState(() {
      _notas = result.data ?? const [];
      _error = result.error;
      _cargando = false;
    });
  }

  Future<void> _enviar() async {
    final texto = _nota.text.trim();
    if (texto.isEmpty) return;
    setState(() => _enviando = true);
    final result = await GuionService.agregarNota(widget.version.id, texto);
    if (!mounted) return;
    if (result.ok) {
      _nota.clear();
      setState(() => _enviando = false);
      await _cargar();
    } else {
      setState(() {
        _enviando = false;
        _error = result.error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.75,
        child: Column(children: [
          HojaEncabezado('Notas · Versión ${widget.version.numero}',
              icono: Icons.sticky_note_2_outlined),
          Expanded(child: _contenido()),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _nota,
                  minLines: 1,
                  maxLines: 4,
                  style: TextStyle(color: context.fc.text),
                  decoration: foccusInput('Escribe una nota o comentario'),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _enviando ? null : _enviar,
                style:
                    IconButton.styleFrom(backgroundColor: context.fc.accent),
                tooltip: 'Agregar nota',
                icon: const Icon(Icons.send),
              ),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _contenido() {
    if (_cargando) return const LoadingView();
    if (_error != null && _notas.isEmpty) {
      return ErrorView(message: _error!, onRetry: _cargar);
    }
    if (_notas.isEmpty) {
      return const EmptyView(
          message: 'Esta versión aún no tiene notas.',
          icon: Icons.sticky_note_2_outlined);
    }
    return RefreshIndicator(
      onRefresh: _cargar,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _notas.length,
        itemBuilder: (context, i) {
          final n = _notas[i];
          return FoccusCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(n.contenido,
                  style: GoogleFonts.inter(color: context.fc.text, height: 1.4)),
              const SizedBox(height: 6),
              Text('Usuario #${n.idUser}  ·  ${n.fecha}',
                  style: GoogleFonts.inter(
                      fontSize: 11, color: context.fc.textMuted)),
            ]),
          );
        },
      ),
    );
  }
}
