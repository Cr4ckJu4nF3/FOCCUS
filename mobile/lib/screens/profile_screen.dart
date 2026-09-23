import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/session.dart';
import 'login_screen.dart' show LoginColors;

const _identificationTypes = ['CC', 'NIT', 'TI', 'PA', 'CE'];

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _mailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _documentController = TextEditingController();
  final _addressController = TextEditingController();
  final _birthDateController = TextEditingController();
  final _createdDateController = TextEditingController();
  final _departmentController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String _identificationType = '';
  String _createdDate = '';
  bool _loading = true;
  bool _saving = false;
  bool _savingPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  String? _error;
  String? _success;
  String? _passwordError;
  String? _passwordSuccess;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    for (final controller in [
      _nameController,
      _lastNameController,
      _mailController,
      _phoneController,
      _documentController,
      _addressController,
      _birthDateController,
      _createdDateController,
      _departmentController,
      _newPasswordController,
      _confirmPasswordController,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final response = await ApiClient.get('/users/${Session.idUser}');
      if (!mounted) return;
      if (!response.ok) {
        setState(() =>
            _error = response.errorMessage('No se pudo cargar el perfil'));
        return;
      }

      final data = response.data;
      _nameController.text = _value(data['nombre']);
      _lastNameController.text = _value(data['apellido']);
      _mailController.text = _value(data['mail']);
      _phoneController.text = _value(data['msisdn']);
      _identificationType = _value(data['identificacion']);
      _documentController.text = _value(data['id_identificacion']);
      _addressController.text = _value(data['direccion']);
      _birthDateController.text = _dateOnly(data['fecha_de_nacimiento']);
      _createdDate = _dateOnly(data['fecha_de_creacion']);
      _createdDateController.text = _createdDate;
      _departmentController.text = _value(data['id_departamento']);
    } on ApiConnectionException {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _value(dynamic value) => value?.toString() ?? '';

  String _dateOnly(dynamic value) {
    final text = _value(value);
    return text.length >= 10 ? text.substring(0, 10) : text;
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
      _success = null;
    });

    try {
      final response = await ApiClient.patch('/users/${Session.idUser}', body: {
        'nombre': _nameController.text.trim(),
        'apellido': _lastNameController.text.trim(),
        'msisdn': _phoneController.text.trim(),
        'identificacion': _identificationType,
        'id_identificacion': _documentController.text.trim(),
        'direccion': _addressController.text.trim().isEmpty
            ? null
            : _addressController.text.trim(),
        'fecha_de_nacimiento': _birthDateController.text.trim().isEmpty
            ? null
            : _birthDateController.text.trim(),
        'id_departamento': _departmentController.text.trim().isEmpty
            ? null
            : _departmentController.text.trim(),
      });

      if (!mounted) return;
      if (response.ok) {
        await Session.saveUser({
          'nombre': _nameController.text.trim(),
          'apellido': _lastNameController.text.trim(),
        });
        setState(() => _success = 'Perfil actualizado exitosamente');
      } else {
        setState(() =>
            _error = response.errorMessage('Error al guardar los cambios'));
      }
    } on ApiConnectionException {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  List<String> _passwordRules(String password) {
    final rules = <String>[];
    if (password.length < 8) rules.add('Mínimo 8 caracteres');
    if (!RegExp(r'[a-z]').hasMatch(password)) rules.add('Una letra minúscula');
    if (!RegExp(r'[A-Z]').hasMatch(password)) rules.add('Una letra mayúscula');
    if (!RegExp(r'[0-9]').hasMatch(password)) rules.add('Un número');
    if (!RegExp(r'''[!@#\$%^&*()_+\-=\[\]{};':"\\|,.<>/?]''')
        .hasMatch(password)) {
      rules.add('Un carácter especial');
    }
    return rules;
  }

  Future<void> _changePassword() async {
    final password = _newPasswordController.text;
    final rules = _passwordRules(password);
    setState(() {
      _passwordError = null;
      _passwordSuccess = null;
    });
    if (rules.isNotEmpty) {
      setState(() =>
          _passwordError = 'La contraseña debe tener: ${rules.join(', ')}');
      return;
    }
    if (password != _confirmPasswordController.text) {
      setState(() => _passwordError = 'Las contraseñas no coinciden');
      return;
    }

    setState(() => _savingPassword = true);
    try {
      final response = await ApiClient.patch('/users/${Session.idUser}',
          body: {'contrasena': password});
      if (!mounted) return;
      if (response.ok) {
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        setState(
            () => _passwordSuccess = 'Contraseña actualizada exitosamente');
      } else {
        setState(() => _passwordError =
            response.errorMessage('Error al cambiar la contraseña'));
      }
    } on ApiConnectionException {
      if (mounted) {
        setState(() => _passwordError = 'No se pudo conectar con el servidor');
      }
    } finally {
      if (mounted) setState(() => _savingPassword = false);
    }
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar cuenta'),
        content: const Text(
            'Perderás el acceso a tus proyectos. Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFB83D4B)),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      final response = await ApiClient.delete('/users/me/account');
      if (!mounted) return;
      if (response.ok && response.success) {
        await AuthService.logout();
        if (mounted) {
          Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
        }
      } else {
        setState(() =>
            _error = response.errorMessage('No se pudo eliminar la cuenta'));
      }
    } on ApiConnectionException {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF080A10),
      appBar: AppBar(
        backgroundColor: const Color(0xE60D1116),
        foregroundColor: Colors.white,
        title: Text('Perfil de usuario',
            style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w600)),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: LoginColors.accent))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 720),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_error != null) _message(_error!, false),
                      if (_success != null) _message(_success!, true),
                      _section('Datos personales', _buildPersonalForm()),
                      const SizedBox(height: 18),
                      _section('Cambiar contraseña', _buildPasswordForm()),
                      const SizedBox(height: 18),
                      _buildDangerZone(),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _section(String title, Widget child) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xE6111419),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: GoogleFonts.spaceGrotesk(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: Colors.white)),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildPersonalForm() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          _field('Nombres', _nameController, required: true),
          _field('Apellidos', _lastNameController, required: true),
          _field('Email', _mailController, enabled: false),
          _field('Celular', _phoneController,
              keyboardType: TextInputType.phone),
          DropdownButtonFormField<String>(
            initialValue:
                _identificationType.isEmpty ? null : _identificationType,
            decoration: _decoration('Tipo de identificación'),
            dropdownColor: const Color(0xFF1A1A1A),
            items: _identificationTypes
                .map((type) => DropdownMenuItem(value: type, child: Text(type)))
                .toList(),
            onChanged: (value) =>
                setState(() => _identificationType = value ?? ''),
          ),
          const SizedBox(height: 12),
          _field('Número de documento', _documentController, required: true),
          _field('Dirección de residencia', _addressController),
          _field('Fecha de nacimiento (AAAA-MM-DD)', _birthDateController,
              hint: '1990-01-31'),
          _field('Fecha de creación del perfil', _createdDateController,
              enabled: false),
          _field('Departamento', _departmentController),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: _saving ? null : _saveProfile,
              icon: _saving
                  ? const SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.save_outlined),
              label: Text(_saving ? 'Guardando...' : 'Guardar cambios'),
              style:
                  FilledButton.styleFrom(backgroundColor: LoginColors.accent),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordForm() {
    final rules = _newPasswordController.text.isEmpty
        ? const <String>[]
        : _passwordRules(_newPasswordController.text);
    return Column(
      children: [
        if (_passwordError != null) _message(_passwordError!, false),
        if (_passwordSuccess != null) _message(_passwordSuccess!, true),
        _passwordField(
            'Nueva contraseña',
            _newPasswordController,
            _showNewPassword,
            () => setState(() => _showNewPassword = !_showNewPassword)),
        _passwordField(
            'Confirmar contraseña',
            _confirmPasswordController,
            _showConfirmPassword,
            () => setState(() => _showConfirmPassword = !_showConfirmPassword)),
        if (rules.isNotEmpty)
          Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text('Falta: ${rules.join(' · ')}',
                  style: GoogleFonts.inter(
                      fontSize: 12, color: const Color(0xFFFF9A9A))),
            ),
          ),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.icon(
            onPressed: _savingPassword ? null : _changePassword,
            icon: _savingPassword
                ? const SizedBox.square(
                    dimension: 16,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.lock_reset_outlined),
            label:
                Text(_savingPassword ? 'Cambiando...' : 'Cambiar contraseña'),
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF0B4F8A)),
          ),
        ),
      ],
    );
  }

  Widget _buildDangerZone() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0x301F0C12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0x80B83D4B)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: Color(0xFFFF8A8A)),
          const SizedBox(width: 12),
          Expanded(
              child: Text('Eliminar cuenta es permanente.',
                  style: GoogleFonts.inter(color: Colors.white70))),
          TextButton(
              onPressed: _deleteAccount,
              child: const Text('Eliminar',
                  style: TextStyle(color: Color(0xFFFF8A8A)))),
        ],
      ),
    );
  }

  Widget _field(String label, TextEditingController controller,
      {bool enabled = true,
      bool required = false,
      TextInputType? keyboardType,
      String? hint}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        enabled: enabled,
        keyboardType: keyboardType,
        style: const TextStyle(color: Colors.white),
        validator: required
            ? (value) =>
                value == null || value.trim().isEmpty ? 'Campo requerido' : null
            : null,
        decoration: _decoration(label).copyWith(hintText: hint),
      ),
    );
  }

  Widget _passwordField(String label, TextEditingController controller,
      bool visible, VoidCallback toggle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: controller,
        obscureText: !visible,
        onChanged: (_) => setState(() {}),
        style: const TextStyle(color: Colors.white),
        decoration: _decoration(label).copyWith(
          suffixIcon: IconButton(
              onPressed: toggle,
              icon: Icon(visible ? Icons.visibility_off : Icons.visibility,
                  color: Colors.white60)),
        ),
      ),
    );
  }

  InputDecoration _decoration(String label) => InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white60),
        filled: true,
        fillColor: const Color(0x261A1A1A),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(9),
            borderSide:
                BorderSide(color: Colors.white.withValues(alpha: 0.16))),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(9),
            borderSide:
                BorderSide(color: Colors.white.withValues(alpha: 0.16))),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(9),
            borderSide: const BorderSide(color: LoginColors.accent)),
      );

  Widget _message(String text, bool success) => Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: (success ? Colors.green : Colors.red).withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(text,
            style: TextStyle(
                color: success ? Colors.greenAccent : Colors.redAccent)),
      );
}
