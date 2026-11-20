import 'package:flutter_test/flutter_test.dart';
import 'package:foccus_mobile/models/guion_formato.dart';

void main() {
  const guion = 'INT. COCINA - NOCHE\n\n'
      'Marta sirve el café.\n\n'
      'MARTA\n(en voz baja)\nNo vuelvas tarde.\n\n'
      'CORTE A:\n';

  test('reconoce los bloques del formato estándar', () {
    final tipos = analizarGuion(guion).map((b) => b.tipo).toList();
    expect(tipos, [
      TipoBloque.escena,
      TipoBloque.accion,
      TipoBloque.personaje,
      TipoBloque.parentesis,
      TipoBloque.dialogo,
      TipoBloque.transicion,
    ]);
  });

  test('una frase en mayúsculas sin diálogo debajo es acción', () {
    final b = analizarGuion('SILENCIO\n\nElla mira por la ventana.');
    expect(b.first.tipo, TipoBloque.accion);
  });

  test('estima al menos un minuto si hay contenido', () {
    expect(minutosEstimados(analizarGuion(guion)), 1);
    expect(minutosEstimados([]), 0);
  });
}
