import 'package:flutter/material.dart';

import '../models/guion.dart';
import '../services/guion_service.dart';
import '../widgets/foccus_ui.dart';
import 'guion_widgets.dart';

const momentosDelDia = [
  'DÍA',
  'NOCHE',
  'AMANECER',
  'ATARDECER',
  'TARDE',
  'CONTINUO',
];

/// Pide INT/EXT, locación y momento del día; devuelve la línea de
/// encabezado de escena (p. ej. `INT. CABAÑA - NOCHE`) o null si se cancela.
Future<String?> mostrarEncabezadoEscena(
  BuildContext context, {
  required String projectId,
  String locacionInicial = '',
}) {
  return mostrarHoja<String>(
    context,
    (_) => _EncabezadoEscenaForm(
        projectId: projectId, locacionInicial: locacionInicial),
  );
}

class _EncabezadoEscenaForm extends StatefulWidget {
  const _EncabezadoEscenaForm(
      {required this.projectId, required this.locacionInicial});

  final String projectId;
  final String locacionInicial;

  @override
  State<_EncabezadoEscenaForm> createState() => _EncabezadoEscenaFormState();
}

class _EncabezadoEscenaFormState extends State<_EncabezadoEscenaForm> {
  late final _locacion = TextEditingController(text: widget.locacionInicial);
  String _lugar = 'INT.';
  String _momento = 'DÍA';
  List<GuionElemento> _escenarios = const [];

  @override
  void initState() {
    super.initState();
    GuionService.escenarios(widget.projectId).then((r) {
      if (mounted && r.ok) setState(() => _escenarios = r.data ?? const []);
    });
  }

  @override
  void dispose() {
    _locacion.dispose();
    super.dispose();
  }

  void _insertar() {
    final loc = _locacion.text.trim().toUpperCase();
    if (loc.isEmpty) {
      showSnack(context, 'Escribe o elige una locación', error: true);
      return;
    }
    Navigator.pop(context, '$_lugar $loc - $_momento\n');
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [
          const HojaEncabezado('Encabezado de escena', icono: Icons.movie_outlined),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            for (final l in const ['INT.', 'EXT.', 'INT./EXT.'])
              ChoiceChip(
                label: Text(l),
                selected: _lugar == l,
                onSelected: (_) => setState(() => _lugar = l),
              ),
          ]),
          const SizedBox(height: 12),
          TextField(
            controller: _locacion,
            textCapitalization: TextCapitalization.characters,
            style: TextStyle(color: context.fc.text),
            decoration: foccusInput('Locación', hint: 'CABAÑA - SALA PRINCIPAL'),
          ),
          if (_escenarios.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(spacing: 6, children: [
              for (final e in _escenarios.take(12))
                ActionChip(
                  label: Text(e.nombre),
                  onPressed: () =>
                      setState(() => _locacion.text = e.nombre.toUpperCase()),
                ),
            ]),
          ],
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            for (final m in momentosDelDia)
              ChoiceChip(
                label: Text(m),
                selected: _momento == m,
                onSelected: (_) => setState(() => _momento = m),
              ),
          ]),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: _insertar,
            style: FilledButton.styleFrom(
                backgroundColor: context.fc.accent,
                padding: const EdgeInsets.symmetric(vertical: 14)),
            icon: const Icon(Icons.input),
            label: const Text('Insertar encabezado'),
          ),
        ],
      ),
    );
  }
}
