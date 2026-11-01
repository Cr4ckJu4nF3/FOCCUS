import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import 'foccus_ui.dart';

/// Lee el campo opcional `codigo` (solo llega si el usuario es admin del
/// proyecto). Devuelve null si no viene o está vacío.
String? codigoDe(dynamic valor) {
  final texto = valor?.toString().trim() ?? '';
  return texto.isEmpty ? null : texto;
}

/// Etiqueta pequeña monoespaciada con el código (ej. ESC-003).
/// Al tocarla se copia al portapapeles. Si [codigo] es null no muestra nada.
class CodigoChip extends StatelessWidget {
  const CodigoChip(this.codigo, {super.key});

  final String? codigo;

  @override
  Widget build(BuildContext context) {
    final valor = codigo;
    if (valor == null || valor.isEmpty) return const SizedBox.shrink();
    final fc = context.fc;
    return Tooltip(
      message: 'Copiar código',
      child: InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: () async {
          await Clipboard.setData(ClipboardData(text: valor));
          if (!context.mounted) return;
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(SnackBar(content: Text('Código $valor copiado')));
        },
        child: Container(
          constraints: const BoxConstraints(minHeight: 28),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: fc.surfaceAlt,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: fc.border),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(valor,
                style: GoogleFonts.robotoMono(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: fc.accentText)),
            const SizedBox(width: 4),
            Icon(Icons.copy, size: 12, color: fc.textMuted),
          ]),
        ),
      ),
    );
  }
}
