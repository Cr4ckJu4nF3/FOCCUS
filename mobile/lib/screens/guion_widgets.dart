import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/api_config.dart';
import '../models/guion.dart';
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

class ContenidoGuion extends StatelessWidget {
  const ContenidoGuion(this.texto, {super.key, this.maxLines});
  final String texto;
  final int? maxLines;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: context.fc.surfaceAlt,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: context.fc.border)),
      child: maxLines == null
          ? SelectableText(texto, style: _estilo(context))
          : Text(texto,
              maxLines: maxLines,
              overflow: TextOverflow.ellipsis,
              style: _estilo(context)),
    );
  }

  TextStyle _estilo(BuildContext context) => TextStyle(
      color: context.fc.text,
      fontFamily: 'monospace',
      fontSize: 13,
      height: 1.5);
}
