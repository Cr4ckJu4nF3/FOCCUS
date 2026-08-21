import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle, Shield, KeyRound, Eye, EyeOff } from "lucide-react";
import Logo from "../assets/Logo.png";
import claqueta from "../assets/claqueta.jpg";
import API_URL from "../api";
import "../desing/ForgotPassword.css";

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

    <div className="auth-page">
      {/* Fondo con imagen */}
      <div
        className="auth-page__bg"
        style={{ backgroundImage: `url(${claqueta})` }}
      />
      <div className="auth-page__overlay" />
      <div className="auth-card-wrapper">

        {/* Logo */}
        <div className="auth-logo">
          <img src={Logo} alt="Logo" className="auth-logo__img" />
        </div>

        {/* PASO 1: Ingresar correo */}
        {paso === 1 && (
          <div className="auth-card">
            <div className="auth-card__header auth-card__header--blue-purple">
              <div className="auth-card__eyebrow-row">
                <Shield size={20} className="auth-card__eyebrow-icon" />
                <span className="auth-card__eyebrow">
                  Seguridad de cuenta
                </span>
              </div>
              <h1 className="auth-card__title">
                Recuperación de Acceso
              </h1>
              <p className="auth-card__subtitle">
                Ingresa tu correo electrónico registrado y te enviaremos un código de verificación.
              </p>
            </div>

            <div className="auth-content">
              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleEnviarCodigo} className="auth-form">
                <div className="field">
                  <label className="field__label">
                    Correo Electrónico
                  </label>
                  <div className="field--icon-left">
                    <Mail size={16} className="field__icon-left" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="field__input field__input--icon-left"
                      placeholder="correo@dominio.com"
                      required
                    />
                  </div>
                  <p className="field__hint">
                    Debe coincidir con el correo asociado a tu cuenta en el sistema.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? (
                    <>
                      <span className="spinner" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Código"
                  )}
                </button>
              </form>

              <div className="auth-footer-center">
                <button
                  onClick={() => navigate("/")}
                  className="auth-link"
                >
                  <ArrowLeft size={16} />
                  Volver al inicio de sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: Ingresar código + nueva contraseña */}
        {paso === 2 && (
          <div className="auth-card">
            <div className="auth-card__header auth-card__header--purple-blue">
              <div className="auth-card__eyebrow-row">
                <KeyRound size={20} className="auth-card__eyebrow-icon" />
                <span className="auth-card__eyebrow">
                  Verificación
                </span>
              </div>
              <h1 className="auth-card__title">
                Restablecer Contraseña
              </h1>
              <p className="auth-card__subtitle">
                Ingresa el código que enviamos a <span className="auth-card__subtitle-strong">{email}</span> y tu nueva contraseña.
              </p>
            </div>

            <div className="auth-content">
              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="auth-form">
                <div className="field">
                  <label className="field__label">
                    Código de Verificación
                  </label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="field__input field__input--purple field__input--code"
                    placeholder="000000"
                    required
                  />
                </div>

                <div className="field">
                  <label className="field__label">Nueva Contraseña</label>
                  <div className="field--password">
                    <input
                      type={verNueva ? "text" : "password"}
                      value={nuevaContrasena}
                      onChange={(e) => setNuevaContrasena(e.target.value)}
                      className="field__input field__input--purple field__input--icon"
                      placeholder="Ingresa tu nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerNueva(!verNueva)}
                      className="field__toggle"
                    >
                      {verNueva ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label className="field__label">Confirmar Nueva Contraseña</label>
                  <div className="field--password">
                    <input
                      type={verConfirmar ? "text" : "password"}
                      value={confirmarContrasena}
                      onChange={(e) => setConfirmarContrasena(e.target.value)}
                      className="field__input field__input--purple field__input--icon"
                      placeholder="Confirma tu nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerConfirmar(!verConfirmar)}
                      className="field__toggle"
                    >
                      {verConfirmar ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Requisitos de contraseña */}
                {nuevaContrasena && (
                  <div className="password-requirements">
                    <p className="password-requirements__title">La contraseña debe tener:</p>
                    <div className="password-requirements__grid">
                      {[
                        { label: "Mínimo 8 caracteres", valid: nuevaContrasena.length >= 8 },
                        { label: "Una letra minúscula", valid: /[a-z]/.test(nuevaContrasena) },
                        { label: "Una letra mayúscula", valid: /[A-Z]/.test(nuevaContrasena) },
                        { label: "Un número", valid: /[0-9]/.test(nuevaContrasena) },
                        { label: "Un carácter especial", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(nuevaContrasena) },
                      ].map((regla) => (
                        <p key={regla.label} className={`requirement ${regla.valid ? "requirement--valid" : ""}`}>
                          {regla.valid ? "✓" : "○"} {regla.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary btn-primary--purple"
                >
                  {isLoading ? (
                    <>
                      <span className="spinner" />
                      Verificando...
                    </>
                  ) : (
                    "Restablecer Contraseña"
                  )}
                </button>
              </form>

              <div className="auth-footer-row">
                <button
                  onClick={() => { setPaso(1); setError(""); }}
                  className="auth-link"
                >
                  <ArrowLeft size={16} />
                  Cambiar correo
                </button>
                <button
                  onClick={handleEnviarCodigo}
                  className="auth-link auth-link--accent"
                >
                  Reenviar código
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: Éxito */}
        {paso === 3 && (
          <div className="auth-card">
            <div className="auth-card__header auth-card__header--green-blue">
              <div className="auth-card__eyebrow-row">
                <CheckCircle size={20} className="auth-card__eyebrow-icon--success" />
                <span className="auth-card__eyebrow">
                  Proceso completado
                </span>
              </div>
              <h1 className="auth-card__title">
                Contraseña Restablecida
              </h1>
            </div>

            <div className="auth-content">
              <div className="auth-success-icon-row">
                <div className="auth-success-icon">
                  <CheckCircle size={32} />
                </div>
              </div>

              <div className="auth-success-text">
                <p className="auth-success-text__title">
                  Tu contraseña ha sido actualizada exitosamente.
                </p>
                <p className="auth-success-text__subtitle">
                  Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
              </div>

              <button
                onClick={() => navigate("/")}
                className="btn-primary"
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
