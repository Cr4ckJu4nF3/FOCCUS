import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_client.dart';
import '../services/auth_service.dart';
import 'login_screen.dart' show LoginColors;

/// Equivalente movil del wizard de 3 pasos ("Empresa", "Usuario",
/// "Seguridad") de frontend/src/screen/Login.jsx (handleRegister +
/// registroPaso). Mismos campos, mismo endpoint (POST /register), mismas
/// reglas de contraseña.
///
/// Se muestra dentro de la misma tarjeta del login, en el tab "Registrar",
/// tal como en la web.
class RegisterForm extends StatefulWidget {
  const RegisterForm({super.key, required this.onRegistered});

  /// Se llama con el correo ya registrado cuando el registro termina bien,
  /// para que LoginScreen vuelva al tab de "Ingresar" con ese correo
  /// precargado, igual que hace Login.jsx.
  final void Function(String mail) onRegistered;

  @override
  State<RegisterForm> createState() => _RegisterFormState();
}

class _RegisterFormState extends State<RegisterForm> {
  int _paso = 1; // 1: Empresa, 2: Usuario, 3: Seguridad

  final _formKeyPaso1 = GlobalKey<FormState>();
  final _formKeyPaso2 = GlobalKey<FormState>();
  final _formKeyPaso3 = GlobalKey<FormState>();

  // Paso 1 - Empresa
  final _razonSocial = TextEditingController();
  final _representanteLegal = TextEditingController();
  String _document = '';
  final _idDocument = TextEditingController();
  final _emailEmpresa = TextEditingController();
  final _address = TextEditingController();
  final _telephone = TextEditingController();
  final _numberCellphone = TextEditingController();

  // Paso 2 - Usuario
  final _nombre = TextEditingController();
  final _apellido = TextEditingController();
  final _mail = TextEditingController();
  final _msisdn = TextEditingController();

  // Paso 3 - Seguridad
  final _contrasena = TextEditingController();
  final _confirmarContrasena = TextEditingController();
  bool _verContrasena = false;
  bool _verConfirmar = false;
  bool _aceptaTerminos = false;

  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [
      _razonSocial,
      _representanteLegal,
      _idDocument,
      _emailEmpresa,
      _address,
      _telephone,
      _numberCellphone,
      _nombre,
      _apellido,
      _mail,
      _msisdn,
      _contrasena,
      _confirmarContrasena,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  // ==========================================
  // VALIDACION DE CONTRASEÑA (igual que validarContrasena en Login.jsx)
  // ==========================================
  List<String> _reglasFaltantes(String password) {
    final reglas = <String>[];
    if (password.length < 8) reglas.add('Mínimo 8 caracteres');
    if (!RegExp(r'[a-z]').hasMatch(password)) reglas.add('Una letra minúscula');
    if (!RegExp(r'[A-Z]').hasMatch(password)) reglas.add('Una letra mayúscula');
    if (!RegExp(r'[0-9]').hasMatch(password)) reglas.add('Un número');
    if (!RegExp(r'''[!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>/?]''').hasMatch(password)) {
      reglas.add('Un carácter especial');
    }
    return reglas;
  }

  void _cambiarPaso(int siguiente) {
    if (siguiente > _paso) {
      final formKey = _paso == 1 ? _formKeyPaso1 : _formKeyPaso2;
      if (!(formKey.currentState?.validate() ?? false)) return;
    }
    setState(() {
      _error = null;
      _paso = siguiente;
    });
  }

  Future<void> _handleRegister() async {
    if (_loading) return;

    if (!(_formKeyPaso3.currentState?.validate() ?? false)) return;

    if (_contrasena.text != _confirmarContrasena.text) {
      setState(() => _error = 'Las contraseñas no coinciden');
      return;
    }

    final faltantes = _reglasFaltantes(_contrasena.text);
    if (faltantes.isNotEmpty) {
      setState(() => _error = 'La contraseña debe tener: ${faltantes.join(', ')}');
      return;
    }

    if (!_aceptaTerminos) {
      setState(() => _error = 'Debes aceptar los términos y condiciones');
      return;
    }

    setState(() {
      _error = null;
      _loading = true;
    });

    try {
      final response = await AuthService.register(
        razonSocial: _razonSocial.text.trim(),
        representanteLegal: _representanteLegal.text.trim(),
        emailEmpresa: _emailEmpresa.text.trim(),
        address: _address.text.trim().isEmpty ? null : _address.text.trim(),
        telephone: _telephone.text.trim().isEmpty ? null : _telephone.text.trim(),
        numberCellphone: _numberCellphone.text.trim().isEmpty
            ? null
            : _numberCellphone.text.trim(),
        document: _document,
        idDocument: _idDocument.text.trim(),
        nombre: _nombre.text.trim(),
        apellido: _apellido.text.trim(),
        mail: _mail.text.trim(),
        msisdn: _msisdn.text.trim(),
        contrasena: _contrasena.text,
      );

      if (!mounted) return;

      if (response.success) {
        widget.onRegistered(_mail.text.trim());
      } else {
        setState(() => _error = response.errorMessage('Error al registrar'));
      }
    } on ApiConnectionException {
      if (!mounted) return;
      setState(() => _error = 'No se pudo conectar con el servidor');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _progress(),
        const SizedBox(height: 20),
        if (_error != null) ...[
          _messageBox(_error!),
          const SizedBox(height: 16),
        ],
        if (_paso == 1) _paso1(),
        if (_paso == 2) _paso2(),
        if (_paso == 3) _paso3(),
        const SizedBox(height: 20),
        _actions(),
      ],
    );
  }

  // ==========================================
  // BARRA DE PROGRESO
  // ==========================================
  Widget _progress() {
    const nombres = ['Empresa', 'Usuario', 'Seguridad'];
    return Row(
      children: List.generate(3, (i) {
        final numero = i + 1;
        final activo = numero <= _paso;
        return Expanded(
          child: Column(
            children: [
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: activo ? LoginColors.accent : LoginColors.inputBg,
                  border: Border.all(
                    color: activo ? LoginColors.accent : LoginColors.inputBorder,
                  ),
                ),
                child: Text(
                  '$numero',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: activo ? Colors.white : LoginColors.textMuted,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                nombres[i],
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: activo ? LoginColors.textPrimary : LoginColors.textMuted,
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  // ==========================================
  // PASO 1: EMPRESA
  // ==========================================
  Widget _paso1() {
    return Form(
      key: _formKeyPaso1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Información de la empresa',
            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(
            'Cuéntanos quién estará detrás de la producción.',
            style: GoogleFonts.inter(fontSize: 12.5, color: LoginColors.textMuted),
          ),
          const SizedBox(height: 16),
          _field(_razonSocial, 'Razón Social', 'Nombre de la empresa'),
          const SizedBox(height: 14),
          _field(_representanteLegal, 'Representante Legal', 'Nombre del representante'),
          const SizedBox(height: 14),
          _dropdown(),
          const SizedBox(height: 14),
          _field(_idDocument, 'Nº Documento', 'Número de documento'),
          const SizedBox(height: 14),
          _field(_emailEmpresa, 'Email Empresa', 'correo@empresa.com',
              keyboardType: TextInputType.emailAddress),
          const SizedBox(height: 14),
          _field(_address, 'Dirección', 'Dirección de la empresa', required: false),
          const SizedBox(height: 14),
          _field(_telephone, 'Teléfono', 'Teléfono fijo',
              keyboardType: TextInputType.phone, required: false),
          const SizedBox(height: 14),
          _field(_numberCellphone, 'Celular Empresa', 'Celular de la empresa',
              keyboardType: TextInputType.phone, required: false),
        ],
      ),
    );
  }

  Widget _dropdown() {
    const opciones = ['CC', 'TI', 'NIT', 'CE', 'PA'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Documento', style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textPrimary)),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          initialValue: _document.isEmpty ? null : _document,
          dropdownColor: LoginColors.inputBg,
          style: GoogleFonts.inter(fontSize: 15, color: LoginColors.textPrimary),
          decoration: _inputDecoration('Selecciona tipo'),
          items: opciones
              .map((o) => DropdownMenuItem(value: o, child: Text(o)))
              .toList(),
          validator: (v) => (v == null || v.isEmpty) ? 'Selecciona un tipo de documento' : null,
          onChanged: (v) => setState(() => _document = v ?? ''),
        ),
      ],
    );
  }

  // ==========================================
  // PASO 2: USUARIO
  // ==========================================
  Widget _paso2() {
    return Form(
      key: _formKeyPaso2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Información de usuario',
            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(
            'Estos serán los datos de acceso del administrador.',
            style: GoogleFonts.inter(fontSize: 12.5, color: LoginColors.textMuted),
          ),
          const SizedBox(height: 16),
          _field(_nombre, 'Nombres', 'Ingresa tus nombres'),
          const SizedBox(height: 14),
          _field(_apellido, 'Apellidos', 'Ingresa tus apellidos'),
          const SizedBox(height: 14),
          _field(_mail, 'Email Personal', 'tu@correo.com',
              keyboardType: TextInputType.emailAddress),
          const SizedBox(height: 14),
          _field(_msisdn, 'Celular', 'Tu número de celular',
              keyboardType: TextInputType.phone),
        ],
      ),
    );
  }

  // ==========================================
  // PASO 3: SEGURIDAD
  // ==========================================
  Widget _paso3() {
    final pass = _contrasena.text;
    final reglas = [
      ('Mínimo 8 caracteres', pass.length >= 8),
      ('Una letra minúscula', RegExp(r'[a-z]').hasMatch(pass)),
      ('Una letra mayúscula', RegExp(r'[A-Z]').hasMatch(pass)),
      ('Un número', RegExp(r'[0-9]').hasMatch(pass)),
      (
        'Un carácter especial',
        RegExp(r'''[!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>/?]''').hasMatch(pass)
      ),
    ];

    return Form(
      key: _formKeyPaso3,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Seguridad y confirmación',
            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(
            'Protege tu cuenta y revisa las condiciones de uso.',
            style: GoogleFonts.inter(fontSize: 12.5, color: LoginColors.textMuted),
          ),
          const SizedBox(height: 16),
          _passwordField(
            _contrasena,
            'Contraseña',
            'Crea una contraseña',
            _verContrasena,
            () => setState(() => _verContrasena = !_verContrasena),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 14),
          _passwordField(
            _confirmarContrasena,
            'Confirmar Contraseña',
            'Confirma tu contraseña',
            _verConfirmar,
            () => setState(() => _verConfirmar = !_verConfirmar),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: LoginColors.inputBg,
              border: Border.all(color: LoginColors.inputBorder),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'La contraseña debe tener:',
                  style: GoogleFonts.inter(fontSize: 12.5, color: LoginColors.textMuted),
                ),
                const SizedBox(height: 6),
                for (final (label, valid) in reglas)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text(
                      '${valid ? '✓' : '○'} $label',
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        color: valid ? LoginColors.successText : LoginColors.textMuted,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Checkbox(
                value: _aceptaTerminos,
                activeColor: LoginColors.accent,
                onChanged: (v) => setState(() => _aceptaTerminos = v ?? false),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    'Acepto los Términos y Condiciones y autorizo el tratamiento de mis '
                    'datos personales conforme a la Política de Privacidad.',
                    style: GoogleFonts.inter(fontSize: 12.5, color: LoginColors.textMuted),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================
  // BOTONES DE NAVEGACION DEL WIZARD
  // ==========================================
  Widget _actions() {
    return Row(
      children: [
        if (_paso > 1)
          Expanded(
            child: OutlinedButton(
              onPressed: () => _cambiarPaso(_paso - 1),
              style: OutlinedButton.styleFrom(
                foregroundColor: LoginColors.textPrimary,
                side: const BorderSide(color: LoginColors.inputBorder),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
              ),
              child: Text('Atrás', style: GoogleFonts.inter(fontSize: 15)),
            ),
          ),
        if (_paso > 1) const SizedBox(width: 12),
        Expanded(
          child: SizedBox(
            height: 46,
            child: ElevatedButton(
              onPressed: _loading
                  ? null
                  : (_paso < 3 ? () => _cambiarPaso(_paso + 1) : _handleRegister),
              style: ElevatedButton.styleFrom(
                backgroundColor: LoginColors.accent,
                disabledBackgroundColor: LoginColors.accent.withValues(alpha: 0.5),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
              ),
              child: Text(
                _paso < 3
                    ? 'Continuar'
                    : (_loading ? 'Registrando...' : 'Crear cuenta'),
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w500),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // HELPERS DE UI
  // ==========================================
  InputDecoration _inputDecoration(String hint, {Widget? suffix}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(fontSize: 15, color: LoginColors.textMuted),
      filled: true,
      fillColor: LoginColors.inputBg,
      suffixIcon: suffix,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(2),
        borderSide: const BorderSide(color: LoginColors.inputBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(2),
        borderSide: const BorderSide(color: LoginColors.inputBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(2),
        borderSide: const BorderSide(color: LoginColors.accent, width: 1.5),
      ),
      errorStyle: GoogleFonts.inter(fontSize: 11.5, color: LoginColors.errorText),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label,
    String hint, {
    TextInputType? keyboardType,
    bool required = true,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textPrimary)),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          style: GoogleFonts.inter(fontSize: 15, color: LoginColors.textPrimary),
          decoration: _inputDecoration(hint),
          validator: required
              ? (v) => (v == null || v.trim().isEmpty) ? 'Este campo es obligatorio' : null
              : null,
        ),
      ],
    );
  }

  Widget _passwordField(
    TextEditingController controller,
    String label,
    String hint,
    bool visible,
    VoidCallback onToggle, {
    void Function(String)? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 13, color: LoginColors.textPrimary)),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          obscureText: !visible,
          onChanged: onChanged,
          style: GoogleFonts.inter(fontSize: 15, color: LoginColors.textPrimary),
          decoration: _inputDecoration(
            hint,
            suffix: IconButton(
              icon: Icon(
                visible ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                color: LoginColors.textMuted,
                size: 20,
              ),
              onPressed: onToggle,
            ),
          ),
          validator: (v) => (v == null || v.isEmpty) ? 'Este campo es obligatorio' : null,
        ),
      ],
    );
  }

  Widget _messageBox(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: LoginColors.errorBg,
        border: Border.all(color: LoginColors.errorBorder),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        message,
        style: GoogleFonts.inter(fontSize: 13.5, color: LoginColors.errorText),
      ),
    );
  }
}
