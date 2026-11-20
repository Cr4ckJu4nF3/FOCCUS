import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:foccus_mobile/services/theme_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('por defecto es oscuro', () async {
    SharedPreferences.setMockInitialValues({});
    await ThemeController.init();
    expect(ThemeController.mode.value, ThemeMode.dark);
  });

  test('setMode guarda y init lo recupera', () async {
    SharedPreferences.setMockInitialValues({});
    await ThemeController.setMode(ThemeMode.light);
    expect(ThemeController.mode.value, ThemeMode.light);

    ThemeController.mode.value = ThemeMode.dark;
    await ThemeController.init();
    expect(ThemeController.mode.value, ThemeMode.light);

    await ThemeController.setMode(ThemeMode.system);
    await ThemeController.init();
    expect(ThemeController.mode.value, ThemeMode.system);
  });
}
