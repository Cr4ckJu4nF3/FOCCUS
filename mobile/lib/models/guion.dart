import 'dart:convert';

const guionEstados = [
  'Borrador',
  'Pendiente',
  'Revision',
  'En revisión',
  'Aprobado',
  'En Rodaje',
  'Completado',
  'Finalizado',
  'Archivado',
];

String normalizarEstado(String? estado) {
  if (estado == null || estado.isEmpty) return 'borrador';
  const accents = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'};
  var text = estado.toLowerCase();
  accents.forEach((k, v) => text = text.replaceAll(k, v));
  return text.trim().replaceAll(RegExp(r'\s+'), '-');
}

String _str(dynamic value) => value?.toString() ?? '';

/// `codigo` opcional: null si no viene o está vacío (no-admin).
String? _codigoOpcional(dynamic value) {
  final t = value?.toString().trim() ?? '';
  return t.isEmpty ? null : t;
}

class Guion {
  const Guion({
    required this.id,
    required this.nombre,
    required this.descripcion,
    this.idVersionActual,
    this.estadoActual,
    this.numeroVersionActual,
    this.origenActual,
    this.codigo,
  });

  final int id;
  final String nombre;
  final String descripcion;
  final int? idVersionActual;
  final String? estadoActual;
  final String? numeroVersionActual;
  final String? origenActual;
  /// Código legible (GUI-001). Solo llega si el usuario es admin.
  final String? codigo;

  factory Guion.fromJson(Map<String, dynamic> json) => Guion(
        id: (json['id_guion'] as num).toInt(),
        nombre: _str(json['nombre']),
        descripcion: _str(json['descripcion']),
        idVersionActual: (json['id_guion_version_actual'] as num?)?.toInt(),
        estadoActual: json['estado_actual']?.toString(),
        numeroVersionActual: json['numero_de_version_actual']?.toString(),
        origenActual: json['origen_actual']?.toString(),
        codigo: _codigoOpcional(json['codigo']),
      );

  Guion copyWith({String? nombre, String? descripcion}) => Guion(
        id: id,
        nombre: nombre ?? this.nombre,
        descripcion: descripcion ?? this.descripcion,
        idVersionActual: idVersionActual,
        estadoActual: estadoActual,
        numeroVersionActual: numeroVersionActual,
        origenActual: origenActual,
        codigo: codigo,
      );
}

class GuionVersion {
  const GuionVersion({
    required this.id,
    required this.numero,
    required this.fecha,
    required this.estado,
    required this.comentario,
    required this.fechaCreacion,
    this.archivo,
    this.contenido,
    this.codigo,
  });

  final int id;
  final String numero;
  final String fecha;
  final String estado;
  final String comentario;
  final String fechaCreacion;
  final String? archivo;
  final String? contenido;
  /// Código legible (VGU-001). Solo llega si el usuario es admin.
  final String? codigo;

  bool get esTexto => contenido != null && contenido!.isNotEmpty;
  bool get tieneArchivo => archivo != null && archivo!.isNotEmpty;

  factory GuionVersion.fromJson(Map<String, dynamic> json) => GuionVersion(
        id: (json['id_guion_version'] as num).toInt(),
        numero: _str(json['numero_de_version']),
        fecha: _str(json['fecha_de_emision']),
        estado:
            _str(json['estado']).isEmpty ? 'Borrador' : _str(json['estado']),
        comentario: _str(json['comentario_cambio']),
        fechaCreacion: _str(json['fecha_creacion']),
        archivo: json['archivo']?.toString(),
        contenido: json['contenido']?.toString(),
        codigo: _codigoOpcional(json['codigo']),
      );
}

class GuionNota {
  const GuionNota({
    required this.id,
    required this.idUser,
    required this.contenido,
    required this.fecha,
  });

  final int id;
  final String idUser;
  final String contenido;
  final String fecha;

  factory GuionNota.fromJson(Map<String, dynamic> json) => GuionNota(
        id: (json['id_nota'] as num?)?.toInt() ?? 0,
        idUser: _str(json['id_user']),
        contenido: _str(json['contenido']),
        fecha: _str(json['fecha_creacion']),
      );
}

class GuionElemento {
  const GuionElemento({required this.id, required this.nombre});

  final String id;
  final String nombre;

  factory GuionElemento.personaje(Map<String, dynamic> json) => GuionElemento(
        id: _str(json['id_personaje']),
        nombre: _str(json['nombre']),
      );

  factory GuionElemento.escenario(Map<String, dynamic> json) => GuionElemento(
        id: _str(json['id_escenario']),
        nombre: _str(json['nombre']),
      );
}

class GuionGaleriaElemento {
  const GuionGaleriaElemento({
    required this.id,
    required this.tipo,
    required this.nombre,
    required this.descripcion,
    required this.foto,
    required this.categoria,
  });

  final int id;
  final String tipo;
  final String nombre;
  final String descripcion;
  final String foto;
  final String categoria;

  factory GuionGaleriaElemento.fromJson(Map<String, dynamic> json) {
    final tipo = _str(json['tipo']);
    final descripcion =
        tipo == 'personaje' && _str(json['personaje_sinopsis']).isNotEmpty
            ? _str(json['personaje_sinopsis'])
            : tipo == 'lugar' && _str(json['lugar_apariencia']).isNotEmpty
                ? _str(json['lugar_apariencia'])
                : _str(json['descripcion']);
    return GuionGaleriaElemento(
      id: (json['id_galeria'] as num).toInt(),
      tipo: tipo,
      nombre: _str(json['nombre']),
      descripcion: descripcion,
      foto: _str(json['archivo_path']),
      categoria: _str(json['categoria']),
    );
  }
}

class GuionGaleriaVersion {
  const GuionGaleriaVersion({
    required this.id,
    required this.numero,
    required this.detalles,
    required this.foto,
    required this.fecha,
  });

  final int id;
  final int numero;
  final String detalles;
  final String foto;
  final String fecha;

  factory GuionGaleriaVersion.fromJson(Map<String, dynamic> json) =>
      GuionGaleriaVersion(
        id: (json['id_version'] as num).toInt(),
        numero: (json['numero_version'] as num?)?.toInt() ?? 1,
        detalles: _str(json['detalles_uso']),
        foto: _str(json['archivo_path']),
        fecha: _str(json['fecha_creacion']),
      );
}

class GuionElementoVinculado {
  const GuionElementoVinculado({
    required this.idGaleria,
    required this.idVersion,
    required this.tipo,
    required this.nombre,
    required this.numeroVersion,
    required this.detalles,
    required this.foto,
  });

  final int idGaleria;
  final int? idVersion;
  final String tipo;
  final String nombre;
  final int numeroVersion;
  final String detalles;
  final String foto;

  String get marcador => '<!--FOCCUS_GALERIA:${jsonEncode({
            'id_galeria': idGaleria,
            'id_version': idVersion,
            'tipo': tipo,
            'nombre': nombre,
            'numero_version': numeroVersion,
            'detalles_uso': detalles,
            'archivo_path': foto,
          })}-->';

  factory GuionElementoVinculado.fromJson(Map<String, dynamic> json) =>
      GuionElementoVinculado(
        idGaleria: (json['id_galeria'] as num).toInt(),
        idVersion: (json['id_version'] as num?)?.toInt(),
        tipo: _str(json['tipo']),
        nombre: _str(json['nombre']),
        numeroVersion: (json['numero_version'] as num?)?.toInt() ?? 1,
        detalles: _str(json['detalles_uso']),
        foto: _str(json['archivo_path']),
      );
}

final _marcadorGaleria = RegExp(r'<!--FOCCUS_GALERIA:(.*?)-->', dotAll: true);

List<GuionElementoVinculado> elementosVinculados(String contenido) =>
    _marcadorGaleria
        .allMatches(contenido)
        .map((match) {
          try {
            final decoded = jsonDecode(match.group(1)!);
            return GuionElementoVinculado.fromJson(
                Map<String, dynamic>.from(decoded as Map));
          } catch (_) {
            return null;
          }
        })
        .whereType<GuionElementoVinculado>()
        .toList();

String contenidoSinMarcadoresGaleria(String contenido) =>
    contenido.replaceAll(_marcadorGaleria, '').trim();

enum LineaDiff { igual, agregada, quitada }

class DiffLinea {
  const DiffLinea(this.tipo, this.texto);
  final LineaDiff tipo;
  final String texto;
}

List<DiffLinea> compararTextos(String antes, String despues) {
  final a = antes.split('\n');
  final b = despues.split('\n');
  final lcs = List.generate(a.length + 1, (_) => List.filled(b.length + 1, 0));
  for (var i = a.length - 1; i >= 0; i--) {
    for (var j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] == b[j]
          ? lcs[i + 1][j + 1] + 1
          : (lcs[i + 1][j] >= lcs[i][j + 1] ? lcs[i + 1][j] : lcs[i][j + 1]);
    }
  }
  final result = <DiffLinea>[];
  var i = 0;
  var j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] == b[j]) {
      result.add(DiffLinea(LineaDiff.igual, a[i]));
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      result.add(DiffLinea(LineaDiff.quitada, a[i++]));
    } else {
      result.add(DiffLinea(LineaDiff.agregada, b[j++]));
    }
  }
  while (i < a.length) {
    result.add(DiffLinea(LineaDiff.quitada, a[i++]));
  }
  while (j < b.length) {
    result.add(DiffLinea(LineaDiff.agregada, b[j++]));
  }
  return result;
}
