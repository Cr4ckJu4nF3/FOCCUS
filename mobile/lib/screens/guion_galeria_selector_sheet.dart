import 'dart:io';

import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../models/guion.dart';
import '../services/guion_service.dart';
import '../widgets/foccus_ui.dart';
import 'galeria_form.dart' show elegirFoto;

class GuionGaleriaSelectorSheet extends StatefulWidget {
  const GuionGaleriaSelectorSheet({
    super.key,
    required this.projectId,
    this.idGuion,
  });

  final String projectId;
  final int? idGuion;

  @override
  State<GuionGaleriaSelectorSheet> createState() =>
      _GuionGaleriaSelectorSheetState();
}

class _GuionGaleriaSelectorSheetState extends State<GuionGaleriaSelectorSheet> {
  List<GuionGaleriaElemento> _items = const [];
  bool _cargando = true;
  String? _error;
  String _tipo = 'todos';

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    final result = await GuionService.elementosGaleria(widget.projectId);
    if (!mounted) return;
    setState(() {
      _items = result.data ?? const [];
      _error = result.error;
      _cargando = false;
    });
  }

  Future<void> _elegir(GuionGaleriaElemento item) async {
    final elegido = await showModalBottomSheet<GuionElementoVinculado>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (_) => _VersionElementoSheet(
        projectId: widget.projectId,
        idGuion: widget.idGuion,
        elemento: item,
      ),
    );
    if (elegido != null && mounted) Navigator.pop(context, elegido);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colores = theme.colorScheme;
    final filtrados = _tipo == 'todos'
        ? _items
        : _items.where((item) => item.tipo == _tipo).toList();
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.86,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 12, 8),
            child: Row(children: [
              Expanded(
                child: Text('Elementos de la galer?a',
                    style: theme.textTheme.titleLarge),
              ),
              IconButton(
                tooltip: 'Actualizar',
                onPressed: _cargar,
                icon: const Icon(Icons.refresh),
              ),
            ]),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              for (final (label, tipo) in const [
                ('Todos', 'todos'),
                ('Personajes', 'personaje'),
                ('Lugares', 'lugar'),
                ('Objetos', 'objeto'),
              ]) ...[
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(label),
                    selected: _tipo == tipo,
                    onSelected: (_) => setState(() => _tipo = tipo),
                  ),
                ),
              ],
            ]),
          ),
          Expanded(
            child: _cargando
                ? const Center(child: CircularProgressIndicator())
                : _error != null && _items.isEmpty
                    ? ErrorView(message: _error!, onRetry: _cargar)
                    : filtrados.isEmpty
                        ? const EmptyView(
                            message: 'No hay elementos en esta categor?a.',
                            icon: Icons.photo_library_outlined,
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                            itemCount: filtrados.length,
                            separatorBuilder: (_, __) => const Divider(),
                            itemBuilder: (context, index) {
                              final item = filtrados[index];
                              final foto = ApiConfig.assetUrl(item.foto);
                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: colores.secondaryContainer,
                                  backgroundImage:
                                      foto.isEmpty ? null : NetworkImage(foto),
                                  child: foto.isEmpty
                                      ? Icon(_icono(item.tipo),
                                          color: colores.onSecondaryContainer)
                                      : null,
                                ),
                                title: Text(item.nombre),
                                subtitle: Text([
                                  _etiqueta(item.tipo),
                                  if (item.categoria.isNotEmpty) item.categoria,
                                ].join(' ? ')),
                                trailing: Icon(Icons.chevron_right,
                                    color: colores.primary),
                                onTap: () => _elegir(item),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}

class _VersionElementoSheet extends StatefulWidget {
  const _VersionElementoSheet({
    required this.projectId,
    required this.idGuion,
    required this.elemento,
  });

  final String projectId;
  final int? idGuion;
  final GuionGaleriaElemento elemento;

  @override
  State<_VersionElementoSheet> createState() => _VersionElementoSheetState();
}

class _VersionElementoSheetState extends State<_VersionElementoSheet> {
  List<GuionGaleriaVersion> _versiones = const [];
  bool _cargando = true;
  bool _creando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    final result = await GuionService.versionesElemento(
        widget.projectId, widget.elemento.id);
    if (!mounted) return;
    setState(() {
      _versiones = result.data ?? const [];
      _error = result.error;
      _cargando = false;
    });
  }

  GuionElementoVinculado _referencia(GuionGaleriaVersion? version) =>
      GuionElementoVinculado(
        idGaleria: widget.elemento.id,
        idVersion: version?.id,
        tipo: widget.elemento.tipo,
        nombre: widget.elemento.nombre,
        numeroVersion: version?.numero ?? 1,
        detalles: version?.detalles ?? widget.elemento.descripcion,
        foto: version?.foto.isNotEmpty == true
            ? version!.foto
            : widget.elemento.foto,
      );

  Future<void> _crearVersion() async {
    final detalle = TextEditingController();
    String? fotoPath;
    String? error;
    final datos = await showDialog<({String detalle, String? foto})>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: const Text('Nueva versi?n del elemento'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                controller: detalle,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Descripci?n del cambio',
                  hintText: 'Describe qu? cambi? en este elemento',
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () async {
                  final path = await elegirFoto(dialogContext);
                  if (path != null) setDialogState(() => fotoPath = path);
                },
                icon: const Icon(Icons.add_a_photo_outlined),
                label: Text(fotoPath == null
                    ? 'Agregar foto (opcional)'
                    : 'Cambiar foto'),
              ),
              if (fotoPath != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(File(fotoPath!),
                        height: 110, width: double.infinity, fit: BoxFit.cover),
                  ),
                ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(error!,
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.error)),
                ),
            ]),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () {
                if (detalle.text.trim().isEmpty) {
                  setDialogState(() =>
                      error = 'La descripci?n del cambio es obligatoria.');
                  return;
                }
                Navigator.pop(dialogContext,
                    (detalle: detalle.text.trim(), foto: fotoPath));
              },
              child: const Text('Crear versi?n'),
            ),
          ],
        ),
      ),
    );
    detalle.dispose();
    if (datos == null || !mounted) return;
    setState(() {
      _creando = true;
      _error = null;
    });
    final result = await GuionService.crearVersionElemento(
      projectId: widget.projectId,
      idGaleria: widget.elemento.id,
      detalles: datos.detalle,
      idGuion: widget.idGuion,
    );
    if (!mounted) return;
    if (!result.ok || result.data == null) {
      setState(() {
        _creando = false;
        _error = result.error ?? 'No se pudo crear la versi?n';
      });
      return;
    }
    String? fotoError;
    if (datos.foto != null) {
      final upload = await GuionService.subirFotoVersionElemento(
        projectId: widget.projectId,
        idGaleria: widget.elemento.id,
        idVersion: result.data!.id,
        filePath: datos.foto!,
      );
      fotoError = upload.error;
    }
    await _cargar();
    if (!mounted) return;
    setState(() {
      _creando = false;
      _error = fotoError;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colores = theme.colorScheme;
    final versiones = _versiones.isEmpty
        ? <GuionGaleriaVersion?>[null]
        : _versiones.cast<GuionGaleriaVersion?>();
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.78,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
          child: Row(children: [
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.elemento.nombre,
                        style: theme.textTheme.titleLarge),
                    Text('Elige la versi?n que se usar? en el guion',
                        style: theme.textTheme.bodySmall),
                  ]),
            ),
            IconButton(
                tooltip: 'Crear versi?n',
                onPressed: _creando ? null : _crearVersion,
                icon: const Icon(Icons.add_circle_outline)),
          ]),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(_error!, style: TextStyle(color: colores.error)),
          ),
        Expanded(
          child: _cargando || _creando
              ? const Center(child: CircularProgressIndicator())
              : _error != null && _versiones.isEmpty
                  ? Center(
                      child: TextButton.icon(
                        onPressed: _cargar,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Reintentar'),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                      itemCount: versiones.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final version = versiones[index];
                        final referencia = _referencia(version);
                        final foto = ApiConfig.assetUrl(referencia.foto);
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(children: [
                                    Expanded(
                                      child: Text(
                                        version == null
                                            ? 'Versi?n actual'
                                            : 'Versi?n ${version.numero}${index == 0 ? ' ? ?ltima' : ''}',
                                        style: theme.textTheme.titleMedium,
                                      ),
                                    ),
                                    if (index == 0)
                                      Chip(
                                          label: const Text('Predeterminada'),
                                          visualDensity: VisualDensity.compact,
                                          backgroundColor:
                                              colores.primaryContainer),
                                  ]),
                                  if (foto.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(foto,
                                            height: 150,
                                            width: double.infinity,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) =>
                                                const SizedBox.shrink()),
                                      ),
                                    ),
                                  Text(referencia.detalles.isEmpty
                                      ? 'Sin descripci?n disponible'
                                      : referencia.detalles),
                                  const SizedBox(height: 8),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: FilledButton(
                                      onPressed: () =>
                                          Navigator.pop(context, referencia),
                                      child: const Text('Usar esta versi?n'),
                                    ),
                                  ),
                                ]),
                          ),
                        );
                      },
                    ),
        ),
      ]),
    );
  }
}

String _etiqueta(String tipo) => switch (tipo) {
      'personaje' => 'Personaje',
      'lugar' => 'Lugar',
      'objeto' => 'Objeto',
      _ => tipo,
    };

IconData _icono(String tipo) => switch (tipo) {
      'personaje' => Icons.person_outline,
      'lugar' => Icons.location_on_outlined,
      _ => Icons.inventory_2_outlined,
    };
