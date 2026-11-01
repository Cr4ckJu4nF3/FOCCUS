import 'package:flutter_test/flutter_test.dart';
import 'package:foccus_mobile/config/api_config.dart';
import 'package:foccus_mobile/services/api_client.dart';
import 'package:foccus_mobile/services/session.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('ApiConfig.assetUrl', () {
    test('vacío cuando no hay ruta', () {
      expect(ApiConfig.assetUrl(null), '');
      expect(ApiConfig.assetUrl(''), '');
    });

    test('antepone /assets a rutas guardadas como uploads/...', () {
      expect(ApiConfig.assetUrl('uploads/galeria/a.jpg'),
          '${ApiConfig.baseUrl}/assets/uploads/galeria/a.jpg');
    });

    test('antepone la URL base a rutas relativas', () {
      expect(ApiConfig.assetUrl('/assets/uploads/a.jpg'),
          '${ApiConfig.baseUrl}/assets/uploads/a.jpg');
    });

    test('respeta URLs completas', () {
      expect(ApiConfig.assetUrl('https://x.com/a.jpg'), 'https://x.com/a.jpg');
    });
  });

  group('ApiResponse', () {
    test('list devuelve data cuando es una lista', () {
      final r = ApiResponse(statusCode: 200, body: {
        'success': true,
        'data': [1, 2]
      });
      expect(r.list, [1, 2]);
      expect(r.data, isEmpty);
    });

    test('errorMessage prioriza detail de FastAPI', () {
      final r = ApiResponse(statusCode: 422, body: {
        'detail': [
          {'msg': 'campo requerido'}
        ]
      });
      expect(r.errorMessage(), 'campo requerido');
    });
  });

  group('Session (proyecto activo)', () {
    setUp(() async {
      SharedPreferences.setMockInitialValues({'id_rol': '1002'});
      await Session.init();
    });

    test('usa el rol del proyecto activo', () async {
      await Session.setActiveProject(
          projectId: '5', projectName: 'Demo', role: 1001);
      expect(Session.projectId, '5');
      expect(Session.isProjectAdmin, isTrue);
    });

    test('limpia el proyecto activo', () async {
      await Session.setActiveProject(
          projectId: '5', projectName: 'Demo', role: 1001);
      await Session.clearActiveProject();
      expect(Session.projectId, isNull);
      expect(Session.isProjectAdmin, isFalse);
    });
  });
}
