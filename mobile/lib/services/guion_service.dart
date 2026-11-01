import '../models/guion.dart';
import 'api_client.dart';

class GuionResult<T> {
  const GuionResult.ok(this.data) : error = null;
  const GuionResult.fail(this.error) : data = null;

  final T? data;
  final String? error;

  bool get ok => error == null;
}

class GuionService {
  const GuionService._();

  static const _sinConexion = 'No se pudo conectar con el servidor';

  static Future<GuionResult<T>> _run<T>(
    Future<ApiResponse> Function() call,
    T Function(ApiResponse response) parse,
    String fallback, {
    bool mutation = false,
  }) async {
    try {
      final response = await call();
      final valid = mutation ? response.success : response.ok;
      if (!valid) return GuionResult.fail(response.errorMessage(fallback));
      return GuionResult.ok(parse(response));
    } on ApiConnectionException {
      return const GuionResult.fail(_sinConexion);
    }
  }

  static List<T> _items<T>(
      ApiResponse r, T Function(Map<String, dynamic>) build) {
    return r.list.whereType<Map<String, dynamic>>().map(build).toList();
  }

  static Future<GuionResult<List<Guion>>> listar(String projectId) => _run(
        () => ApiClient.get('/guiones?id_project=$projectId'),
        (r) => _items(r, Guion.fromJson),
        'No se pudieron cargar los guiones',
      );

  static Future<GuionResult<List<GuionVersion>>> versiones(int idGuion) => _run(
        () => ApiClient.get('/guiones/$idGuion/versiones'),
        (r) => _items(r, GuionVersion.fromJson),
        'No se pudieron cargar las versiones',
      );

  static Future<GuionResult<List<GuionElemento>>> personajes(
          String projectId) =>
      _run(
        () => ApiClient.get('/projects/$projectId/personajes'),
        (r) => _items(r, GuionElemento.personaje),
        'No se pudieron cargar los personajes',
      );

  static Future<GuionResult<List<GuionElemento>>> escenarios(
          String projectId) =>
      _run(
        () => ApiClient.get('/projects/$projectId/escenarios'),
        (r) => _items(r, GuionElemento.escenario),
        'No se pudieron cargar los escenarios',
      );

  static Future<GuionResult<GuionElemento>> crearPersonaje(
          String projectId, String nombre) =>
      _run(
        () => ApiClient.post('/personajes',
            body: {'nombre': nombre, 'id_project': projectId}),
        (r) => GuionElemento.personaje(r.data),
        'No se pudo crear el personaje',
        mutation: true,
      );

  static Future<GuionResult<GuionElemento>> crearEscenario(
          String projectId, String nombre) =>
      _run(
        () => ApiClient.post('/escenarios',
            body: {'nombre': nombre, 'id_project': projectId}),
        (r) => GuionElemento.escenario(r.data),
        'No se pudo crear el escenario',
        mutation: true,
      );

  static Future<GuionResult<List<GuionGaleriaElemento>>> elementosGaleria(
          String projectId) =>
      _run(
        () => ApiClient.get('/projects/$projectId/galeria'),
        (r) => _items(r, GuionGaleriaElemento.fromJson),
        'No se pudieron cargar los elementos de la galer?a',
      );

  static Future<GuionResult<List<GuionGaleriaVersion>>> versionesElemento(
          String projectId, int idGaleria) =>
      _run(
        () =>
            ApiClient.get('/projects/$projectId/galeria/$idGaleria/versiones'),
        (r) => _items(r, GuionGaleriaVersion.fromJson),
        'No se pudo cargar el historial del elemento',
      );

  static Future<GuionResult<GuionGaleriaVersion>> crearVersionElemento({
    required String projectId,
    required int idGaleria,
    required String detalles,
    int? idGuion,
  }) =>
      _run(
        () => ApiClient.post(
          '/projects/$projectId/galeria/$idGaleria/versiones',
          body: {
            'detalles_uso': detalles,
            if (idGuion != null) 'id_guion': idGuion,
          },
        ),
        (r) => GuionGaleriaVersion.fromJson(r.data),
        'No se pudo crear la versi?n del elemento',
        mutation: true,
      );

  static Future<GuionResult<void>> subirFotoVersionElemento({
    required String projectId,
    required int idGaleria,
    required int idVersion,
    required String filePath,
  }) =>
      _run(
        () => ApiClient.uploadFiles(
          '/projects/$projectId/galeria/$idGaleria/versiones/$idVersion/foto',
          files: [MapEntry('foto', filePath)],
        ),
        (_) {},
        'No se pudo subir la foto de la versi?n',
        mutation: true,
      );

  static Future<GuionResult<void>> crearDesdeTexto({
    required String projectId,
    required String nombre,
    required String descripcion,
    required String contenido,
  }) =>
      _run(
        () => ApiClient.post('/guiones/texto', body: {
          'nombre': nombre,
          'descripcion': descripcion,
          'id_project': projectId,
          'contenido': contenido,
          'fecha_de_emision': hoy(),
          'estado': 'Borrador',
        }),
        (_) {},
        'No se pudo crear el guion',
        mutation: true,
      );

  static Future<GuionResult<void>> subirArchivo({
    required String projectId,
    required String nombre,
    required String descripcion,
    required String filePath,
  }) =>
      _run(
        () => ApiClient.uploadFiles(
          '/guiones/archivo',
          files: [MapEntry('archivo', filePath)],
          fields: {
            'nombre': nombre,
            'descripcion': descripcion,
            'id_project': projectId,
          },
        ),
        (_) {},
        'No se pudo subir el guion',
        mutation: true,
      );

  static Future<GuionResult<void>> actualizar(
          int idGuion, String nombre, String descripcion) =>
      _run(
        () => ApiClient.patch('/guiones/$idGuion',
            body: {'nombre': nombre, 'descripcion': descripcion}),
        (_) {},
        'No se pudo actualizar el guion',
        mutation: true,
      );

  static Future<GuionResult<void>> eliminar(int idGuion) => _run(
        () => ApiClient.delete('/guiones/$idGuion'),
        (_) {},
        'No se pudo eliminar el guion',
        mutation: true,
      );

  static Future<GuionResult<void>> crearVersionTexto({
    required int idGuion,
    required String contenido,
    required String fecha,
    required String estado,
    required String comentario,
  }) =>
      _run(
        () => ApiClient.post('/guiones/$idGuion/versiones/texto', body: {
          'contenido': contenido,
          'fecha_de_emision': fecha,
          'estado': estado,
          'comentario_cambio': comentario,
        }),
        (_) {},
        'No se pudo guardar la versión',
        mutation: true,
      );

  static Future<GuionResult<void>> subirVersion({
    required int idGuion,
    required String filePath,
    required String fecha,
    required String estado,
    required String comentario,
  }) =>
      _run(
        () => ApiClient.uploadFiles(
          '/guiones/$idGuion/versiones',
          files: [MapEntry('archivo', filePath)],
          fields: {
            'fecha_de_emision': fecha,
            'estado': estado,
            'comentario_cambio': comentario,
          },
        ),
        (_) {},
        'No se pudo subir la versión',
        mutation: true,
      );

  static Future<GuionResult<void>> cambiarEstado(
          int idGuion, int idVersion, String estado) =>
      _run(
        () => ApiClient.patch('/guiones/$idGuion/versiones/$idVersion/estado',
            body: {'estado': estado}),
        (_) {},
        'No se pudo actualizar el estado de la versión',
        mutation: true,
      );

  static Future<GuionResult<List<GuionNota>>> notas(int idVersion) => _run(
        () => ApiClient.get('/guiones/versiones/$idVersion/notas'),
        (r) => _items(r, GuionNota.fromJson),
        'No se pudieron cargar las notas',
      );

  static Future<GuionResult<void>> agregarNota(
          int idVersion, String contenido) =>
      _run(
        () => ApiClient.post('/guiones/versiones/$idVersion/notas',
            body: {'contenido': contenido}),
        (_) {},
        'No se pudo agregar la nota',
        mutation: true,
      );

  static String hoy() => DateTime.now().toIso8601String().substring(0, 10);
}
