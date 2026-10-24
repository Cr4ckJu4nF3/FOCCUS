import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, KeyRound, LogOut, Mail, UserRound } from "lucide-react";
import { apiFetch, clearSession } from "../api";
import "../desing/CompleteInvitation.css";

const tiposIdentificacion = ["CC", "NIT", "CE", "TI", "PA"];

const validarContrasena = (password) => {
  const reglas = [];
  const caracteresEspeciales = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?";
  if (password.length < 8) reglas.push("8 caracteres como mínimo");
  if (!/[a-z]/.test(password)) reglas.push("una letra minúscula");
  if (!/[A-Z]/.test(password)) reglas.push("una letra mayúscula");
  if (!/[0-9]/.test(password)) reglas.push("un número");
  if (![...caracteresEspeciales].some((character) => password.includes(character))) reglas.push("un carácter especial");
  return reglas;
};

export default function CompleteInvitationScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: localStorage.getItem("nombre") === "Pendiente" ? "" : localStorage.getItem("nombre") || "",
    apellido: localStorage.getItem("apellido") === "Pendiente" ? "" : localStorage.getItem("apellido") || "",
    identificacion: "CC",
    id_identificacion: "",
    msisdn: "",
    direccion: "",
    fecha_de_nacimiento: "",
    contrasena: "",
    confirmarContrasena: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const mail = localStorage.getItem("mail") || "";

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.contrasena !== form.confirmarContrasena) {
      setError("Las contraseñas no coinciden");
      return;
    }
    const reglasFaltantes = validarContrasena(form.contrasena);
    if (reglasFaltantes.length) {
      setError(`La contraseña debe tener ${reglasFaltantes.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/users/complete-invitation", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido,
          identificacion: form.identificacion,
          id_identificacion: form.id_identificacion,
          msisdn: form.msisdn,
          direccion: form.direccion,
          fecha_de_nacimiento: form.fecha_de_nacimiento,
          contrasena: form.contrasena,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const detail = typeof result.detail === "string"
          ? result.detail
          : Array.isArray(result.detail)
            ? result.detail.map((item) => item.msg).join(", ")
            : result.message || "No se pudo completar la cuenta";
        throw new Error(detail);
      }

      const user = result.data || {};
      localStorage.setItem("nombre", user.nombre || form.nombre);
      localStorage.setItem("apellido", user.apellido || form.apellido);
      localStorage.removeItem("needs_profile_completion");
      navigate("/seleccion-proyecto", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem("needs_profile_completion");
    navigate("/", { replace: true });
  };

  return (
    <main className="invite-setup-page">
      <div className="invite-setup-glow invite-setup-glow--one" />
      <div className="invite-setup-glow invite-setup-glow--two" />
      <section className="invite-setup-card">
        <header className="invite-setup-header">
          <div className="invite-setup-icon"><UserRound size={23} /></div>
          <p className="invite-setup-eyebrow">Invitación a FOCCUS</p>
          <h1>Completa tu perfil</h1>
          <p className="invite-setup-description">
            Ya haces parte del equipo. Completa tus datos para activar tu cuenta y entrar al proyecto.
          </p>
          <div className="invite-setup-email"><Mail size={16} />{mail}</div>
        </header>

        {error && <div className="invite-setup-error" role="alert">{error}</div>}

        <form className="invite-setup-form" onSubmit={handleSubmit}>
          <div className="invite-setup-grid">
            <label>
              Nombre
              <input name="nombre" value={form.nombre} onChange={handleChange} autoComplete="given-name" maxLength={255} required />
            </label>
            <label>
              Apellido
              <input name="apellido" value={form.apellido} onChange={handleChange} autoComplete="family-name" maxLength={255} required />
            </label>
            <label>
              Tipo de documento
              <select name="identificacion" value={form.identificacion} onChange={handleChange} required>
                {tiposIdentificacion.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </label>
            <label>
              Número de documento
              <input name="id_identificacion" value={form.id_identificacion} onChange={handleChange} maxLength={50} required />
            </label>
            <label>
              Celular
              <input name="msisdn" type="tel" value={form.msisdn} onChange={handleChange} autoComplete="tel" maxLength={20} required />
            </label>
            <label>
              Fecha de nacimiento
              <input name="fecha_de_nacimiento" type="date" value={form.fecha_de_nacimiento} onChange={handleChange} max={new Date().toISOString().slice(0, 10)} required />
            </label>
            <label className="invite-setup-grid__wide">
              Dirección
              <input name="direccion" value={form.direccion} onChange={handleChange} autoComplete="street-address" maxLength={150} required />
            </label>
            <label>
              Contraseña
              <input name="contrasena" type="password" value={form.contrasena} onChange={handleChange} autoComplete="new-password" required />
            </label>
            <label>
              Confirmar contraseña
              <input name="confirmarContrasena" type="password" value={form.confirmarContrasena} onChange={handleChange} autoComplete="new-password" required />
            </label>
          </div>
          <p className="invite-setup-hint"><KeyRound size={14} /> Usa 8 caracteres, mayúscula, minúscula, número y símbolo.</p>
          <button type="submit" className="invite-setup-submit" disabled={loading}>
            {loading ? "Activando cuenta..." : <><CheckCircle2 size={18} /> Activar cuenta y continuar</>}
          </button>
        </form>
        <button type="button" className="invite-setup-logout" onClick={handleLogout}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </section>
    </main>
  );
}
