import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/api_config.dart';
import '../models/guion.dart';
import '../models/guion_formato.dart';
import '../widgets/foccus_ui.dart';

Color estadoColor(BuildContext context, String? estado) {
  final c = context.fc;
  switch (normalizarEstado(estado)) {
    case 'pendiente':
    case 'revision':
    case 'en-revision':
      return c.isDark ? const Color(0xFFF5B547) : const Color(0xFF9A6700);
    case 'aprobado':
    case 'completado':
    case 'finalizado':
      return c.success;
    case 'en-rodaje':
      return c.accentText;
    case 'archivado':
      return c.textMuted;
    default:
      return c.isDark ? const Color(0xFF9CC1FF) : const Color(0xFF1D4ED8);
  }
}

class EstadoChip extends StatelessWidget {
  const EstadoChip(this.estado, {super.key});
  final String? estado;

  @override
  Widget build(BuildContext context) {
    final text = (estado == null || estado!.isEmpty) ? 'Sin versión' : estado!;
    return StatusChip(text, color: estadoColor(context, estado));
  }
}

Future<bool> abrirArchivoGuion(String? stored) async {
  if (stored == null || stored.isEmpty) return false;
  var path = stored.startsWith('/') ? stored.substring(1) : stored;
  if (path.startsWith('assets/')) path = path.substring(7);
  return launchUrl(ApiConfig.resolve('/assets/$path'),
      mode: LaunchMode.externalApplication);
}

Future<bool> confirmar(
  BuildContext context, {
  required String titulo,
  required String mensaje,
  String accion = 'Confirmar',
  bool peligro = false,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      backgroundColor: context.fc.surface,
      title: Text(titulo, style: TextStyle(color: context.fc.text)),
      content: Text(mensaje, style: TextStyle(color: context.fc.textMuted)),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar')),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          style: FilledButton.styleFrom(
              backgroundColor:
                  peligro ? context.fc.error : context.fc.accent),
          child: Text(accion),
        ),
      ],
    ),
  );
  return result == true;
}

Future<T?> mostrarHoja<T>(BuildContext context, WidgetBuilder builder) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: context.fc.surface,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: builder,
  );
}

class HojaEncabezado extends StatelessWidget {
  const HojaEncabezado(this.titulo, {super.key, this.icono});
  final String titulo;
  final IconData? icono;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      const SizedBox(height: 10),
      Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
              color: context.fc.border, borderRadius: BorderRadius.circular(4))),
      Padding(
        padding: const EdgeInsets.fromLTRB(18, 14, 8, 8),
        child: Row(children: [
          if (icono != null) ...[
            Icon(icono, color: context.fc.accentText),
            const SizedBox(width: 9),
          ],
          Expanded(
              child: Text(titulo,
                  style: GoogleFonts.spaceGrotesk(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: context.fc.text))),
          IconButton(
              onPressed: () => Navigator.pop(context),
              icon: Icon(Icons.close, color: context.fc.textMuted)),
        ]),
      ),
    ]);
  }
}

class MensajeBanner extends StatelessWidget {
  const MensajeBanner(this.texto,
      {super.key, required this.exito, this.onClose});
  final String texto;
  final bool exito;
  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context) {
    final c = context.fc;
    final color = exito ? c.success : c.error;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
      decoration: BoxDecoration(
          color: exito ? c.successBg : c.errorBg,
          borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        Expanded(child: Text(texto, style: TextStyle(color: color))),
        if (onClose != null)
          IconButton(
              visualDensity: VisualDensity.compact,
              onPressed: onClose,
              icon: Icon(Icons.close, size: 16, color: color)),
      ]),
    );
  }
}

class ContenidoGuion extends StatefulWidget {
  const ContenidoGuion(this.texto, {super.key, this.maxLines});
  final String texto;
  final int? maxLines;

  @override
  State<ContenidoGuion> createState() => _ContenidoGuionState();
}

class _ContenidoGuionState extends State<ContenidoGuion> {
  double _tamano = 14;

  static final _inline = RegExp(r'\*\*(.+?)\*\*|__(.+?)__|_(.+?)_');

  TextSpan _spans(String texto, TextStyle base) {
    final hijos = <InlineSpan>[];
    var ultimo = 0;
    for (final m in _inline.allMatches(texto)) {
      if (m.start > ultimo) hijos.add(TextSpan(text: texto.substring(ultimo, m.start)));
      if (m.group(1) != null) {
        hijos.add(TextSpan(
            text: m.group(1), style: const TextStyle(fontWeight: FontWeight.w700)));
      } else if (m.group(2) != null) {
        hijos.add(TextSpan(
            text: m.group(2),
            style: const TextStyle(decoration: TextDecoration.underline)));
      } else {
        hijos.add(TextSpan(
            text: m.group(3), style: const TextStyle(fontStyle: FontStyle.italic)));
      }
      ultimo = m.end;
    }
    if (ultimo < texto.length) hijos.add(TextSpan(text: texto.substring(ultimo)));
    return TextSpan(style: base, children: hijos);
  }

  @override
  Widget build(BuildContext context) {
    final estilo = TextStyle(
        color: context.fc.text,
        fontFamily: 'CourierPrime',
        fontSize: _tamano,
        height: 1.35);
    final decoracion = BoxDecoration(
        color: context.fc.surfaceAlt,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: context.fc.border));

    if (widget.maxLines != null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: decoracion,
        child: Text(
            widget.texto.replaceAll(RegExp(r'\[/?alinear(:[a-z]+)?\]'), ''),
            maxLines: widget.maxLines,
            overflow: TextOverflow.ellipsis,
            style: estilo.copyWith(fontSize: 13)),
      );
    }

    final bloques = analizarGuion(widget.texto);
    final minutos = minutosEstimados(bloques);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
      decoration: decoracion,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.timer_outlined, size: 16, color: context.fc.textMuted),
          const SizedBox(width: 4),
          Text('≈ $minutos min',
              style: TextStyle(color: context.fc.textMuted, fontSize: 12)),
          const Spacer(),
          IconButton(
              tooltip: 'Letra más pequeña',
              visualDensity: VisualDensity.compact,
              onPressed:
                  _tamano > 10 ? () => setState(() => _tamano -= 1) : null,
              icon: const Icon(Icons.text_decrease, size: 20)),
          IconButton(
              tooltip: 'Letra más grande',
              visualDensity: VisualDensity.compact,
              onPressed:
                  _tamano < 22 ? () => setState(() => _tamano += 1) : null,
              icon: const Icon(Icons.text_increase, size: 20)),
        ]),
        for (final b in bloques) _bloque(b, estilo),
      ]),
    );
  }

  // Sangrías proporcionales al ancho (el estándar de 6" no cabe en un celular).
  Widget _bloque(BloqueGuion b, TextStyle estilo) {
    late final EdgeInsets margen;
    late final TextAlign alineacion;
    var base = estilo;
    var texto = b.texto;
    switch (b.tipo) {
      case TipoBloque.escena:
        margen = const EdgeInsets.only(top: 18, bottom: 6);
        alineacion = TextAlign.left;
        base = estilo.copyWith(fontWeight: FontWeight.w700);
      case TipoBloque.accion:
        margen = const EdgeInsets.only(top: 6, bottom: 6);
        alineacion = TextAlign.left;
      case TipoBloque.personaje:
        margen = EdgeInsets.only(
            top: 12, left: MediaQuery.sizeOf(context).width * 0.2);
        alineacion = TextAlign.left;
      case TipoBloque.parentesis:
        margen = EdgeInsets.only(
            left: MediaQuery.sizeOf(context).width * 0.16,
            right: MediaQuery.sizeOf(context).width * 0.1);
        alineacion = TextAlign.left;
      case TipoBloque.dialogo:
        margen = EdgeInsets.only(
            left: MediaQuery.sizeOf(context).width * 0.09,
            right: MediaQuery.sizeOf(context).width * 0.09);
        alineacion = TextAlign.left;
      case TipoBloque.transicion:
        margen = const EdgeInsets.only(top: 12, bottom: 6);
        alineacion = TextAlign.right;
    }
    if (b.tipo == TipoBloque.personaje || b.tipo == TipoBloque.transicion) {
      texto = texto.toUpperCase();
    }
    return Padding(
      padding: margen,
      child: SizedBox(
        width: double.infinity,
        child: SelectableText.rich(_spans(texto, base), textAlign: alineacion),
      ),
    );
  }
}

