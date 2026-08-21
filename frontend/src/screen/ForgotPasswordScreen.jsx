import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle, Shield, KeyRound, Eye, EyeOff } from "lucide-react";
import logo from "../assets/Isotipo_Color.png";
import claqueta from "../assets/claqueta.jpg";
import API_URL from "../api";


export default function ForgotPasswordScreen() {
  const [paso, setPaso] = useState(1);
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Paso 1: Enviar correo para recibir código
  const handleEnviarCodigo = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/recover-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail: email }),
      });

      if (response.ok) {
        setPaso(2);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "No se encontró una cuenta con ese correo");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 2: Enviar código + nueva contraseña
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (nuevaContrasena !== confirmarContrasena) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mail: email,
          codigo: codigo,
          nueva_contrasena: nuevaContrasena,
        }),
      });

      if (response.ok) {
        setPaso(3);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Código inválido o expirado");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };
  // Para poder ver la contraseña que estoy escribiendo
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);

  const validarContrasena = (password) => {
  const reglas = [];
  if (password.length < 8) reglas.push("Mínimo 8 caracteres");
  if (!/[a-z]/.test(password)) reglas.push("Una letra minúscula");
  if (!/[A-Z]/.test(password)) reglas.push("Una letra mayúscula");
  if (!/[0-9]/.test(password)) reglas.push("Un número");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) reglas.push("Un carácter especial");
  return reglas;
};

  return (

    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Fondo con imagen */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${claqueta})` }}
      />
      <div className="absolute inset-0 bg-[#0A0A0A]/85" />
      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Logo" className="w-35 h-35 opacity-90" />
        </div>

        {/* PASO 1: Ingresar correo */}
        {paso === 1 && (
          <div className="bg-[#1A1A1A] rounded-xl shadow-2xl border border-[#2A2A2A] overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B4F8A] to-[#7B5FCF] px-8 py-6">
              <div className="flex items-center gap-3 mb-1">
                <Shield className="w-5 h-5 text-white/80" />
                <span className="text-white/60 text-xs font-semibold tracking-widest uppercase">
                  Seguridad de cuenta
                </span>
              </div>
              <h1 className="text-white text-xl font-semibold tracking-wide">
                Recuperación de Acceso
              </h1>
              <p className="text-white/70 text-sm mt-1 leading-relaxed">
                Ingresa tu correo electrónico registrado y te enviaremos un código de verificación.
              </p>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleEnviarCodigo} className="space-y-6">
                <div>
                  <label className="block mb-2 text-[#FAFAFA] text-sm font-medium tracking-wide">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA] placeholder:text-[#4A4A4A] transition-all"
                      placeholder="correo@dominio.com"
                      required
                    />
                  </div>
                  <p className="mt-2 text-[#6B6B6B] text-xs leading-relaxed">
                    Debe coincidir con el correo asociado a tu cuenta en el sistema.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg font-semibold tracking-wide transition-all flex items-center justify-center gap-2 bg-[#0B4F8A] text-white hover:bg-[#094170] shadow-lg shadow-[#0B4F8A]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Código"
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 text-[#6B6B6B] hover:text-[#FAFAFA] text-sm transition-colors mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: Ingresar código + nueva contraseña */}
        {paso === 2 && (
          <div className="bg-[#1A1A1A] rounded-xl shadow-2xl border border-[#2A2A2A] overflow-hidden">
            <div className="bg-gradient-to-r from-[#7B5FCF] to-[#0B4F8A] px-8 py-6">
              <div className="flex items-center gap-3 mb-1">
                <KeyRound className="w-5 h-5 text-white/80" />
                <span className="text-white/60 text-xs font-semibold tracking-widest uppercase">
                  Verificación
                </span>
              </div>
              <h1 className="text-white text-xl font-semibold tracking-wide">
                Restablecer Contraseña
              </h1>
              <p className="text-white/70 text-sm mt-1 leading-relaxed">
                Ingresa el código que enviamos a <span className="text-white font-medium">{email}</span> y tu nueva contraseña.
              </p>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block mb-2 text-[#FAFAFA] text-sm font-medium">
                    Código de Verificación
                  </label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA] text-center text-2xl tracking-widest"
                    placeholder="000000"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-[#FAFAFA] text-sm font-medium">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={verNueva ? "text" : "password"}
                      value={nuevaContrasena}
                      onChange={(e) => setNuevaContrasena(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA]"
                      placeholder="Ingresa tu nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerNueva(!verNueva)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#FAFAFA] transition-colors"
                    >
                      {verNueva ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-[#FAFAFA] text-sm font-medium">Confirmar Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={verConfirmar ? "text" : "password"}
                      value={confirmarContrasena}
                      onChange={(e) => setConfirmarContrasena(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA]"
                      placeholder="Confirma tu nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerConfirmar(!verConfirmar)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#FAFAFA] transition-colors"
                    >
                      {verConfirmar ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Requisitos de contraseña */}
                {nuevaContrasena && (
                  <div className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                    <p className="text-[#6B6B6B] text-xs mb-2 font-semibold">La contraseña debe tener:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {[
                        { label: "Mínimo 8 caracteres", valid: nuevaContrasena.length >= 8 },
                        { label: "Una letra minúscula", valid: /[a-z]/.test(nuevaContrasena) },
                        { label: "Una letra mayúscula", valid: /[A-Z]/.test(nuevaContrasena) },
                        { label: "Un número", valid: /[0-9]/.test(nuevaContrasena) },
                        { label: "Un carácter especial", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(nuevaContrasena) },
                      ].map((regla) => (
                        <p key={regla.label} className={`text-xs flex items-center gap-1.5 ${regla.valid ? "text-green-400" : "text-[#6B6B6B]"}`}>
                          {regla.valid ? "✓" : "○"} {regla.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg font-semibold tracking-wide transition-all flex items-center justify-center gap-2 bg-[#7B5FCF] text-white hover:bg-[#6a4eb8] shadow-lg shadow-[#7B5FCF]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Restablecer Contraseña"
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[#2A2A2A] flex justify-between">
                <button
                  onClick={() => { setPaso(1); setError(""); }}
                  className="flex items-center gap-2 text-[#6B6B6B] hover:text-[#FAFAFA] text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cambiar correo
                </button>
                <button
                  onClick={handleEnviarCodigo}
                  className="text-[#7B5FCF] hover:underline text-sm"
                >
                  Reenviar código
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: Éxito */}
        {paso === 3 && (
          <div className="bg-[#1A1A1A] rounded-xl shadow-2xl border border-[#2A2A2A] overflow-hidden">
            <div className="bg-gradient-to-r from-[#1a4a2e] to-[#0B4F8A] px-8 py-6">
              <div className="flex items-center gap-3 mb-1">
                <CheckCircle className="w-5 h-5 text-[#3d9970]" />
                <span className="text-white/60 text-xs font-semibold tracking-widest uppercase">
                  Proceso completado
                </span>
              </div>
              <h1 className="text-white text-xl font-semibold tracking-wide">
                Contraseña Restablecida
              </h1>
            </div>

            <div className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#3d9970]/15 border border-[#3d9970]/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-[#3d9970]" />
                </div>
              </div>

              <div className="text-center space-y-3 mb-8">
                <p className="text-[#FAFAFA] font-medium">
                  Tu contraseña ha sido actualizada exitosamente.
                </p>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">
                  Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
              </div>

              <button
                onClick={() => navigate("/")}
                className="w-full py-3 rounded-lg bg-[#0B4F8A] text-white hover:bg-[#094170] font-semibold tracking-wide transition-all shadow-lg shadow-[#0B4F8A]/20"
              >
                Ir al Inicio de Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}