import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../widgets/codigo_chip.dart';
import '../widgets/foccus_ui.dart';
import 'escena_detalle_screen.dart';
import 'galeria_screen.dart';
import 'guion_screen.dart';
import 'rodaje_screen.dart';

/// Un resultado de GET /projects/{id}/buscar-codigo.
class ResultadoCodigo {
  const ResultadoCodigo({
    required this.tipo,
    required this.codigo,
    required this.nombre,
    this.idInterno,
  });

  final String tipo;
  final String codigo;
  final String nombre;
  final String? idInterno;

  /// Prefijo del código (ESC, PER, ...).
  String get prefijo => codigo.split('-').first.toUpperCase();

  factory ResultadoCodigo.fromJson(Map<String, dynamic> json) =>
      ResultadoCodigo(
        tipo: (json['tipo'] ?? '').toString(),
        codigo: (json['codigo'] ?? '').toString(),
        nombre: (json['nombre'] ?? '').toString(),
        idInterno: json['id_interno']?.toString(),
      );
}

/// Pantalla «Buscar código» (solo admin del proyecto).
class BuscarCodigoScreen extends StatefulWidget {
  const BuscarCodigoScreen({
    super.key,
    required this.projectId,
    required this.projectName,
  });

  final String projectId;
  final String projectName;

  @override
  State<BuscarCodigoScreen> createState() => _BuscarCodigoScreenState();
}

class _BuscarCodigoScreenState extends State<BuscarCodigoScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  List<ResultadoCodigo> _resultados = [];
  bool _cargando = false;
  String? _error;
  String _consulta = '';

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onCambio(String valor) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () => _buscar(valor));
  }

  Future<void> _buscar(String valor) async {
    final q = valor.trim().toUpperCase();
    if (q.length < 2) {
      setState(() {
        _consulta = '';
        _resultados = [];
        _error = null;
        _cargando = false;
      });
      return;
    }
    setState(() {
      _consulta = q;
      _cargando = true;
      _error = null;
    });
    try {
      final res = await ApiClient.get(
          '/projects/${widget.projectId}/buscar-codigo?q=${Uri.encodeQueryComponent(q)}');
      if (!mounted || q != _consulta) return;
      if (res.success) {
        setState(() {
          _resultados = res.list
              .whereType<Map<String, dynamic>>()
              .map(ResultadoCodigo.fromJson)
              .toList();
          _cargando = false;
        });
      } else {
        setState(() {
          _error = res.statusCode == 403
              ? 'Solo el administrador del proyecto puede buscar códigos'
              : res.errorMessage('No se pudo buscar el código');
          _cargando = false;
        });
      }
    } on ApiConnectionException {
      if (!mounted || q != _consulta) return;
      setState(() {
        _error = 'No se pudo conectar con el servidor';
        _cargando = false;
      });
    }
  }

  /// Abre la ficha cuando existe pantalla para ese tipo; si no, la lista del módulo.
  void _abrir(ResultadoCodigo r) {
    final id = widget.projectId;
    final nombre = widget.projectName;
    final Widget? pantalla = switch (r.prefijo) {
      'ESC' when r.idInterno != null =>
        EscenaDetalleScreen(idEscena: r.idInterno!),
      'PER' || 'LOC' || 'OBJ' || 'VES' =>
        GaleriaScreen(projectId: id, projectName: nombre),
      'DRO' => RodajeScreen(projectId: id, projectName: nombre),
      'GUI' || 'VGU' => GuionScreen(projectId: id, projectName: nombre),
      _ => null,
    };
    if (pantalla == null) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
            const SnackBar(content: Text('Este código no tiene pantalla propia')));
      return;
    }
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => pantalla));
  }

  Widget _contenido() {
    final fc = context.fc;
    if (_cargando) return const LoadingView(key: ValueKey('cargando'));
    if (_error != null) {
      return ErrorView(
          key: const ValueKey('error'),
          message: _error!,
          onRetry: () => _buscar(_controller.text));
    }
    if (_consulta.isEmpty) {
      return const EmptyView(
          key: ValueKey('inicio'),
          message: 'Escribe al menos 2 caracteres (ej. ESC-003)',
          icon: Icons.qr_code_2);
    }
    if (_resultados.isEmpty) {
      return EmptyView(
          key: const ValueKey('vacio'),
          message: 'Sin resultados para "$_consulta"',
          icon: Icons.search_off);
    }
    return ListView.builder(
      key: const ValueKey('resultados'),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      itemCount: _resultados.length,
      itemBuilder: (_, i) {
        final r = _resultados[i];
        return FoccusCard(
          onTap: () => _abrir(r),
          child: Row(children: [
            CodigoChip(r.codigo),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(r.nombre.isEmpty ? '(sin nombre)' : r.nombre,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: fc.text)),
                    Text(r.tipo,
                        style: GoogleFonts.inter(
                            fontSize: 12, color: fc.textMuted)),
                  ]),
            ),
            Icon(Icons.chevron_right, color: fc.textMuted),
          ]),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final fc = context.fc;
    return FoccusScaffold(
      title: 'Buscar código',
      subtitle: widget.projectName,
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _controller,
            autofocus: true,
            maxLength: 40,
            textCapitalization: TextCapitalization.characters,
            style: GoogleFonts.robotoMono(fontSize: 14, color: fc.text),
            onChanged: _onCambio,
            decoration: InputDecoration(
              counterText: '',
              hintText: 'Código, ej. ESC-003',
              hintStyle: TextStyle(fontSize: 14, color: fc.textMuted),
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _controller.text.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Limpiar',
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _controller.clear();
                        _buscar('');
                      }),
            ),
          ),
        ),
        Expanded(child: FoccusSwitcher(child: _contenido())),
      ]),
    );
  }
}
