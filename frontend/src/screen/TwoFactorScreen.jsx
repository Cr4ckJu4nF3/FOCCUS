import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import claqueta from "../assets/claqueta.jpg";
import logo from "../assets/Isotipo_Color.png";
import API_URL, { getDeviceId } from "../api";

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
      const response = await fetch(`${API_URL}/users/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail, codigo, device_id: deviceId }),
      });

      if (response.ok) {
        navigate("/seleccion-proyecto");
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Código incorrecto o expirado");
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
      const response = await fetch(`${API_URL}/users/2fa/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail, device_id: deviceId }),
      });

      if (response.ok) {
        setReenviado(true);
        setTimeout(() => setReenviado(false), 3000);
      } else {
        setError("Error al reenviar el código");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    }
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

        {/* Card */}
        <div className="bg-[#1A1A1A] rounded-xl shadow-2xl border border-[#2A2A2A] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B4F8A] to-[#7B5FCF] px-8 py-6">
            <div className="flex items-center gap-3 mb-1">
              <Shield className="w-5 h-5 text-white/80" />
              <span className="text-white/60 text-xs font-semibold tracking-widest uppercase">
                Verificación de seguridad
              </span>
            </div>
            <h1 className="text-white text-xl font-semibold tracking-wide">
              Doble Factor de Autenticación
            </h1>
            <p className="text-white/70 text-sm mt-1 leading-relaxed">
              Hemos enviado un código de verificación a <span className="text-white font-medium">{mail}</span>
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {reenviado && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                Código reenviado exitosamente
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
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
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold tracking-wide transition-all flex items-center justify-center gap-2 bg-[#7B5FCF] text-white hover:bg-[#6a4eb8] shadow-lg shadow-[#7B5FCF]/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar"
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#2A2A2A] flex justify-between">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-[#6B6B6B] hover:text-[#FAFAFA] text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al login
              </button>
              <button
                onClick={handleResend}
                className="text-[#7B5FCF] hover:underline text-sm"
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