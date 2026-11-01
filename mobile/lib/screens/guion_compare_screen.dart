import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/guion.dart';
import '../widgets/foccus_ui.dart';

class GuionCompareScreen extends StatefulWidget {
  const GuionCompareScreen({
    super.key,
    required this.guion,
    required this.versiones,
    this.inicial,
  });

  final Guion guion;
  final List<GuionVersion> versiones;
  final GuionVersion? inicial;

  @override
  State<GuionCompareScreen> createState() => _GuionCompareScreenState();
}

class _GuionCompareScreenState extends State<GuionCompareScreen> {
  late final List<GuionVersion> _comparables =
      widget.versiones.where((v) => v.esTexto).toList();
  GuionVersion? _a;
  GuionVersion? _b;

  @override
  void initState() {
    super.initState();
    if (_comparables.length >= 2) {
      final nueva = widget.inicial != null &&
              _comparables.any((v) => v.id == widget.inicial!.id)
          ? widget.inicial!
          : _comparables.first;
      _b = nueva;
      final index = _comparables.indexWhere((v) => v.id == nueva.id);
      _a =
          _comparables[index + 1 < _comparables.length ? index + 1 : index - 1];
    }
  }

  @override
  Widget build(BuildContext context) {
    return FoccusScaffold(
      title: 'Comparar versiones',
      subtitle: widget.guion.nombre,
      body: _comparables.length < 2
          ? const EmptyView(
              message:
                  'Necesitas al menos dos versiones escritas en el sistema para compararlas.',
              icon: Icons.compare_arrows)
          : _contenido(),
    );
  }

  Widget _contenido() {
    final diff = compararTextos(
      contenidoSinMarcadoresGaleria(_a!.contenido!),
      contenidoSinMarcadoresGaleria(_b!.contenido!),
    );
    final agregadas = diff.where((l) => l.tipo == LineaDiff.agregada).length;
    final quitadas = diff.where((l) => l.tipo == LineaDiff.quitada).length;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(children: [
          Expanded(
              child: _selector('Base', _a!, (v) => setState(() => _a = v))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Icon(Icons.arrow_forward, color: context.fc.textMuted),
          ),
          Expanded(
              child: _selector('Nueva', _b!, (v) => setState(() => _b = v))),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          StatusChip('+$agregadas líneas',           color: context.fc.success),
          const SizedBox(width: 8),
                    StatusChip('-$quitadas líneas', color: context.fc.error),
        ]),
        const SizedBox(height: 12),
        if (agregadas == 0 && quitadas == 0)
          const EmptyView(
              message: 'Las dos versiones tienen el mismo contenido.',
              icon: Icons.check_circle_outline)
        else
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
                color: context.fc.surfaceAlt,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: context.fc.border)),
            child: Column(children: diff.map(_linea).toList()),
          ),
      ],
    );
  }

  Widget _selector(
      String label, GuionVersion actual, ValueChanged<GuionVersion> onChanged) {
    return DropdownButtonFormField<int>(
      initialValue: actual.id,
      isExpanded: true,
      dropdownColor: context.fc.surface,
      style: TextStyle(color: context.fc.text),
      decoration: foccusInput(label),
      items: _comparables
          .map(
              (v) => DropdownMenuItem(value: v.id, child: Text('v${v.numero}')))
          .toList(),
      onChanged: (id) {
        if (id != null) onChanged(_comparables.firstWhere((v) => v.id == id));
      },
    );
  }

  Widget _linea(DiffLinea linea) {
    final (color, marca) = switch (linea.tipo) {
      LineaDiff.agregada => (context.fc.success, '+'),
      LineaDiff.quitada => (context.fc.error, '-'),
      LineaDiff.igual => (context.fc.textMuted, ' '),
    };
    return Container(
      width: double.infinity,
      color:
          linea.tipo == LineaDiff.igual ? null : color.withValues(alpha: 0.12),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      child: Text('$marca ${linea.texto}',
          style: GoogleFonts.robotoMono(
              fontSize: 12,
              color: linea.tipo == LineaDiff.igual ? context.fc.text : color)),
    );
  }
}
