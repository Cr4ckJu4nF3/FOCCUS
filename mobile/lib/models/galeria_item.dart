/// Elemento de la galeria (objeto, personaje o lugar).
class GaleriaItem {
  GaleriaItem(this.json);

  final Map<String, dynamic> json;

  static const tipos = {
    'objeto': 'Objeto',
    'personaje': 'Personaje',
    'lugar': 'Lugar',
  };

  static const estados = ['Disponible', 'En uso', 'Reservado', 'No disponible'];

  static const categorias = {
    'objeto': [
      'Vestuario',
      'Maquillaje',
      'Utilería',
      'Accesorio',
      'Mobiliario',
      'Vehículo',
      'Arma de utilería',
      'Equipo técnico',
      'Decoración',
      'Alimento y bebida',
      'Documento o elemento gráfico',
      'Efectos especiales',
      'Otro',
    ],
    'personaje': [
      'Personaje principal',
      'Personaje secundario',
      'Antagonista',
      'Extra / figuración',
      'Episódico',
      'Cameo',
      'Narrador',
      'Personaje colectivo',
      'Otro',
    ],
    'lugar': [
      'Interior',
      'Exterior',
      'Set / estudio',
      'Locación real',
      'Locación ficticia',
      'Espacio público',
      'Residencial',
      'Comercial',
      'Natural',
      'Histórico',
      'Otro',
    ],
  };

  String s(String key) => (json[key] ?? '').toString();

  int get id => (json['id_galeria'] as num?)?.toInt() ?? 0;
  /// Código legible (PER-004, LOC-002...). Solo llega si el usuario es admin.
  String? get codigo {
    final c = s('codigo').trim();
    return c.isEmpty ? null : c;
  }

  String get tipo => s('tipo');
  String get tipoLabel => tipos[tipo] ?? tipo;
  String get categoria => s('categoria');
  String get nombre => s('nombre');
  String get estado => s('estado');
  String get foto => s('archivo_path');
  String get ultimoUso => s('ultimo_uso');
  int get totalVersiones => (json['total_versiones'] as num?)?.toInt() ?? 0;

  /// Igual que getDescription() de Galeria.jsx.
  String get descripcion {
    if (tipo == 'personaje' && s('personaje_sinopsis').isNotEmpty) {
      return s('personaje_sinopsis');
    }
    if (tipo == 'lugar' && s('lugar_apariencia').isNotEmpty) {
      return s('lugar_apariencia');
    }
    return s('descripcion');
  }

  /// Personajes vinculados a un lugar: lista de {id_galeria, nombre}.
  List<Map<String, dynamic>> get vinculados {
    final v = json['personajes_vinculados'];
    if (v is! List) return [];
    return v.whereType<Map<String, dynamic>>().toList();
  }
}
