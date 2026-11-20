/// Reconoce los bloques de un guion según el formato estándar de la industria
/// (ver docs/agentes/investigacion/2026-11-01-formato-guion.md).
enum TipoBloque { escena, accion, personaje, parentesis, dialogo, transicion }

class BloqueGuion {
  const BloqueGuion(this.tipo, this.texto);
  final TipoBloque tipo;
  final String texto;
}

final _etiquetaAlinear = RegExp(r'\[/?alinear(:[a-z]+)?\]');
final _escenaRegex =
    RegExp(r'^(INT|EXT|INT\.?/EXT|EXT\.?/INT|I/E)\b\.?', caseSensitive: false);

String _limpiar(String linea) => linea.replaceAll(_etiquetaAlinear, '').trim();

bool _esMayusculas(String t) =>
    t.contains(RegExp(r'[A-ZÁÉÍÓÚÑ]')) && t == t.toUpperCase();

bool _esEscena(String t) => _escenaRegex.hasMatch(t) && _esMayusculas(t);

bool _esTransicion(String t) =>
    _esMayusculas(t) && (t.endsWith(':') || t.startsWith('>')) && t.length < 40;

List<BloqueGuion> analizarGuion(String texto) {
  final bloques = <BloqueGuion>[];
  final lineas = texto.split('\n').map(_limpiar).toList();
  var i = 0;
  while (i < lineas.length) {
    final linea = lineas[i];
    if (linea.isEmpty) {
      i++;
      continue;
    }
    if (_esEscena(linea)) {
      bloques.add(BloqueGuion(TipoBloque.escena, linea));
      i++;
    } else if (_esTransicion(linea)) {
      bloques.add(BloqueGuion(
          TipoBloque.transicion, linea.replaceFirst(RegExp(r'^>\s*'), '')));
      i++;
    } else if (_esPersonaje(lineas, i)) {
      bloques.add(BloqueGuion(TipoBloque.personaje, linea));
      i++;
      while (i < lineas.length && lineas[i].isNotEmpty) {
        final l = lineas[i];
        bloques.add(BloqueGuion(
            l.startsWith('(') ? TipoBloque.parentesis : TipoBloque.dialogo, l));
        i++;
      }
    } else {
      final acciones = <String>[linea];
      i++;
      while (i < lineas.length &&
          lineas[i].isNotEmpty &&
          !_esEscena(lineas[i]) &&
          !_esTransicion(lineas[i]) &&
          !_esPersonaje(lineas, i)) {
        acciones.add(lineas[i]);
        i++;
      }
      bloques.add(BloqueGuion(TipoBloque.accion, acciones.join(' ')));
    }
  }
  return bloques;
}

// Un personaje es una línea corta en mayúsculas seguida de diálogo.
bool _esPersonaje(List<String> lineas, int i) {
  final l = lineas[i];
  if (l.length > 40 || !_esMayusculas(l) || l.startsWith('[')) return false;
  if (_esEscena(l) || _esTransicion(l)) return false;
  return i + 1 < lineas.length && lineas[i + 1].isNotEmpty;
}

/// Regla de la industria: una página ≈ un minuto (unas 55 líneas de 60 columnas).
int minutosEstimados(List<BloqueGuion> bloques) {
  var lineas = 0.0;
  for (final b in bloques) {
    final ancho = switch (b.tipo) {
      TipoBloque.dialogo => 35,
      TipoBloque.parentesis => 25,
      TipoBloque.personaje || TipoBloque.transicion => 60,
      _ => 60,
    };
    lineas += (b.texto.length / ancho).ceil().clamp(1, 1000);
    if (b.tipo != TipoBloque.dialogo && b.tipo != TipoBloque.parentesis) {
      lineas += 1;
    }
  }
  return lineas == 0 ? 0 : (lineas / 55).ceil();
}
