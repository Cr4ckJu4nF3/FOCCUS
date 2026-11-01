import 'package:flutter_test/flutter_test.dart';
import 'package:foccus_mobile/models/galeria_item.dart';
import 'package:foccus_mobile/models/guion.dart';
import 'package:foccus_mobile/screens/buscar_codigo_screen.dart';

void main() {
  test('codigo es null si el backend no lo manda (no admin)', () {
    final g = Guion.fromJson({'id_guion': 1, 'nombre': 'A'});
    expect(g.codigo, isNull);
    expect(GaleriaItem({'id_galeria': 1}).codigo, isNull);
    expect(GaleriaItem({'codigo': ''}).codigo, isNull);
  });

  test('codigo se lee cuando viene (admin)', () {
    final g = Guion.fromJson({'id_guion': 1, 'nombre': 'A', 'codigo': 'GUI-001'});
    expect(g.codigo, 'GUI-001');
    expect(GaleriaItem({'codigo': 'PER-004'}).codigo, 'PER-004');
  });

  test('ResultadoCodigo parsea y calcula prefijo', () {
    final r = ResultadoCodigo.fromJson(
        {'tipo': 'Escena', 'codigo': 'ESC-003', 'nombre': 'x', 'id_interno': 7});
    expect(r.prefijo, 'ESC');
    expect(r.idInterno, '7');
  });
}
