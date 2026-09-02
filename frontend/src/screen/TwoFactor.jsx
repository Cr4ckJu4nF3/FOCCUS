import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import FondoLogin from "../assets/FondoLogin.jpeg";
import Logo from "../assets/Logo.png";
import { apiFetch, getDeviceId, setToken } from "../api";
import "../desing/TwoFactor.css";

export default function TwoFactorScreen() {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const mail = location.state?.mail || "";

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const deviceId = getDeviceId();
      const response = await apiFetch("/users/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ mail, codigo, device_id: deviceId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const data = result.data;
        // El backend reemite el token tras verificar el segundo factor
        if (data?.access_token) {
          setToken(data.access_token);
        }
        navigate("/seleccion-proyecto");
      } else {
        setError(result.detail || result.message || result.error || "Código incorrecto o expirado");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setReenviado(false);

    try {
      const deviceId = getDeviceId();
      const response = await apiFetch("/users/2fa/send", {
        method: "POST",
        body: JSON.stringify({ mail, device_id: deviceId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setReenviado(true);
        setTimeout(() => setReenviado(false), 3000);
      } else {
        setError(result.message || result.error || "Error al reenviar el código");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="auth-page">
      {/* Fondo con imagen */}
      <div
        className="auth-page__bg"
        style={{ backgroundImage: `url(${FondoLogin})` }}
      />
      <div className="auth-page__overlay" />
      <div className="auth-card-wrapper">

        {/* Logo */}
        <div className="auth-logo">
          <img src={Logo} alt="Logo" className="auth-logo__img" />
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Header */}
          <div className="auth-card__header auth-card__header--blue-purple">
            <div className="auth-card__eyebrow-row">
              <Shield size={20} className="auth-card__eyebrow-icon" />
              <span className="auth-card__eyebrow">
                Verificación de seguridad
              </span>
            </div>
            <h1 className="auth-card__title">
              Doble Factor de Autenticación
            </h1>
            <p className="auth-card__subtitle">
              Hemos enviado un código de verificación a <span className="auth-card__subtitle-strong">{mail}</span>
            </p>
          </div>

          {/* Content */}
          <div className="auth-content">
            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {reenviado && (
              <div className="auth-success">
                Código reenviado exitosamente
              </div>
            )}

            <form onSubmit={handleVerify} className="auth-form">
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
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary btn-primary--purple"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Verificando...
                  </>
                ) : (
                  "Verificar"
                )}
              </button>
            </form>

            <div className="auth-footer-row">
              <button
                onClick={() => navigate("/")}
                className="auth-link"
              >
                <ArrowLeft size={16} />
                Volver al login
              </button>
              <button
                onClick={handleResend}
                className="auth-link auth-link--accent"
              >
                Reenviar código
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
