import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/guion.dart';
import '../services/guion_service.dart';
import '../widgets/foccus_ui.dart';
import 'guion_widgets.dart';

class GuionElementosSheet extends StatefulWidget {
  const GuionElementosSheet({super.key, required this.projectId});

  final String projectId;

  @override
  State<GuionElementosSheet> createState() => _GuionElementosSheetState();
}

class _GuionElementosSheetState extends State<GuionElementosSheet>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  final _nuevo = TextEditingController();
  List<GuionElemento> _personajes = const [];
  List<GuionElemento> _escenarios = const [];
  bool _cargando = true;
  bool _creando = false;
  String? _error;

  bool get _enPersonajes => _tabs.index == 0;

  @override
  void initState() {
    super.initState();
    _tabs.addListener(() => setState(() {}));
    _cargar();
  }

  @override
  void dispose() {
    _tabs.dispose();
    _nuevo.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    final results = await Future.wait([
      GuionService.personajes(widget.projectId),
      GuionService.escenarios(widget.projectId),
    ]);
    if (!mounted) return;
    final personajes = results[0];
    final escenarios = results[1];
    setState(() {
      _personajes = personajes.data ?? const [];
      _escenarios = escenarios.data ?? const [];
      _error = personajes.error ?? escenarios.error;
      _cargando = false;
    });
  }

  Future<void> _crear() async {
    final nombre = _nuevo.text.trim();
    if (nombre.isEmpty) return;
    setState(() => _creando = true);
    final result = _enPersonajes
        ? await GuionService.crearPersonaje(widget.projectId, nombre)
        : await GuionService.crearEscenario(widget.projectId, nombre);
    if (!mounted) return;
    setState(() {
      _creando = false;
      if (result.ok && result.data != null) {
        final lista = [
          if (_enPersonajes) ..._personajes else ..._escenarios,
          result.data!
        ]..sort((a, b) => a.nombre.compareTo(b.nombre));
        if (_enPersonajes) {
          _personajes = lista;
        } else {
          _escenarios = lista;
        }
        _nuevo.clear();
      } else {
        _error = result.error;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.75,
        child: Column(children: [
          const HojaEncabezado('Personajes y escenarios',
              icono: Icons.groups_2_outlined),
          TabBar(
            controller: _tabs,
            indicatorColor: context.fc.accent,
            labelColor: context.fc.accentText,
            unselectedLabelColor: context.fc.textMuted,
            tabs: [
              Tab(text: 'Personajes (${_personajes.length})'),
              Tab(text: 'Escenarios (${_escenarios.length})'),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _nuevo,
                  style: TextStyle(color: context.fc.text),
                  onSubmitted: (_) => _crear(),
                  decoration: foccusInput(_enPersonajes
                      ? 'Nombre del personaje'
                      : 'Nombre del escenario'),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _creando ? null : _crear,
                style:
                    IconButton.styleFrom(backgroundColor: context.fc.accent),
                tooltip: 'Agregar',
                icon: const Icon(Icons.add),
              ),
            ]),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_error!,
                  style: TextStyle(color: context.fc.error, fontSize: 12)),
            ),
          Expanded(
            child: _cargando
                ? const LoadingView()
                : TabBarView(controller: _tabs, children: [
                    _lista(_personajes, 'Aún no hay personajes',
                        (e) => '${e.nombre.toUpperCase()}\n'),
                    _lista(_escenarios, 'Aún no hay escenarios',
                        (e) => 'INT/EXT. ${e.nombre.toUpperCase()} - DÍA\n'),
                  ]),
          ),
        ]),
      ),
    );
  }

  Widget _lista(List<GuionElemento> items, String vacio,
      String Function(GuionElemento) texto) {
    if (items.isEmpty) return EmptyView(message: vacio);
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      itemCount: items.length,
      separatorBuilder: (_, __) =>
          Divider(height: 1, color: context.fc.border),
      itemBuilder: (context, i) => ListTile(
        title: Text(items[i].nombre,
            style: GoogleFonts.inter(color: context.fc.text)),
        trailing: Icon(Icons.input, color: context.fc.accentText, size: 18),
        onTap: () => Navigator.pop(context, texto(items[i])),
      ),
    );
  }
}
