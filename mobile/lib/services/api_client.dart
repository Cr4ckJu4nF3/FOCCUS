import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'session.dart';

/// Key global del Navigator, para poder redirigir al login desde aca
/// cuando el backend responde 401 (el equivalente al
/// `window.location.href = "/"` de api.js).
final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

/// Respuesta ya parseada de la API. El backend siempre contesta con el
/// formato de app/utils/response.py:
///   { "success": bool, "message": str, "data": any, "error": str|null }
/// salvo los errores de validacion de FastAPI, que vienen como
///   { "detail": [...] }  (422)
class ApiResponse {
  ApiResponse({required this.statusCode, required this.body});

  final int statusCode;
  final Map<String, dynamic> body;

  bool get ok => statusCode >= 200 && statusCode < 300;
  bool get success => ok && body['success'] == true;

  Map<String, dynamic> get data {
    final d = body['data'];
    return d is Map<String, dynamic> ? d : <String, dynamic>{};
  }

  /// Arma el mensaje de error igual que lo hace Login.jsx: primero el
  /// `detail` de FastAPI (que puede ser lista de errores de validacion),
  /// despues el `message` / `error` del propio backend.
  String errorMessage([String fallback = 'Ocurrio un error inesperado']) {
    final detail = body['detail'];
    if (detail is List && detail.isNotEmpty) {
      return detail
          .map((item) =>
              item is Map ? (item['msg'] ?? '').toString() : item.toString())
          .where((msg) => msg.isNotEmpty)
          .join(', ');
    }
    if (detail is String && detail.isNotEmpty) return detail;

    final message = body['message'];
    if (message is String && message.isNotEmpty) return message;

    final error = body['error'];
    if (error is String && error.isNotEmpty) return error;

    return fallback;
  }
}

/// Se lanza cuando no hubo forma de hablar con el backend (server apagado,
/// IP equivocada, sin red). Las pantallas lo traducen al mismo texto que
/// usa la web: "No se pudo conectar con el servidor".
class ApiConnectionException implements Exception {
  ApiConnectionException(this.cause);
  final Object cause;

  @override
  String toString() => 'ApiConnectionException: $cause';
}

/// Equivalente de la funcion apiFetch() de frontend/src/api.js: agrega
/// automaticamente Content-Type y el header Authorization cuando hay
/// sesion activa, y limpia la sesion + manda al login si sale 401.
class ApiClient {
  const ApiClient._();

  static const Duration _timeout = Duration(seconds: 20);

  static Future<ApiResponse> post(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) {
    return _send(
      (uri, h) => http.post(uri, headers: h, body: json.encode(body ?? {})),
      path,
      headers,
    );
  }

  static Future<ApiResponse> patch(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) {
    return _send(
      (uri, h) => http.patch(uri, headers: h, body: json.encode(body ?? {})),
      path,
      headers,
    );
  }

  static Future<ApiResponse> delete(String path,
      {Map<String, String>? headers}) {
    return _send((uri, h) => http.delete(uri, headers: h), path, headers);
  }

  static Future<ApiResponse> uploadMultipart(
    String path, {
    required String filePath,
    required String fileField,
    Map<String, String> fields = const {},
  }) async {
    final request = http.MultipartRequest('POST', ApiConfig.resolve(path));
    final token = Session.getToken();
    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields.addAll(fields);
    request.files.add(await http.MultipartFile.fromPath(fileField, filePath));

    http.StreamedResponse streamedResponse;
    try {
      streamedResponse = await request.send().timeout(_timeout);
    } catch (e) {
      throw ApiConnectionException(e);
    }

    final response = await http.Response.fromStream(streamedResponse);
    if (response.statusCode == 401) {
      await Session.clear();
      appNavigatorKey.currentState
          ?.pushNamedAndRemoveUntil('/login', (_) => false);
    }

    return ApiResponse(
      statusCode: response.statusCode,
      body: _decode(response.body),
    );
  }

  static Future<ApiResponse> get(String path, {Map<String, String>? headers}) {
    return _send((uri, h) => http.get(uri, headers: h), path, headers);
  }

  static Future<ApiResponse> _send(
    Future<http.Response> Function(Uri uri, Map<String, String> headers)
        request,
    String path,
    Map<String, String>? extraHeaders,
  ) async {
    final token = Session.getToken();

    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (extraHeaders != null) ...extraHeaders,
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };

    http.Response response;
    try {
      response =
          await request(ApiConfig.resolve(path), headers).timeout(_timeout);
    } catch (e) {
      throw ApiConnectionException(e);
    }

    if (response.statusCode == 401) {
      await Session.clear();
      appNavigatorKey.currentState
          ?.pushNamedAndRemoveUntil('/login', (_) => false);
    }

    return ApiResponse(
      statusCode: response.statusCode,
      body: _decode(response.body),
    );
  }

  static Map<String, dynamic> _decode(String raw) {
    if (raw.isEmpty) return <String, dynamic>{};
    try {
      final decoded = json.decode(raw);
      return decoded is Map<String, dynamic> ? decoded : {'data': decoded};
    } catch (_) {
      return {'message': raw};
    }
  }
}
