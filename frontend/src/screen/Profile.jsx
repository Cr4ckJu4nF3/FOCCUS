import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Eye, EyeOff } from "lucide-react";
import logo from "../assets/FoccusNB_White.png";
import { apiFetch } from "../api";
import "../desing/Profile.css";

const identificacionTypes = ["CC", "NIT", "TI", "PA", "CE"];

const validarContrasena = (password) => {
  const reglas = [];
  if (password.length < 8) reglas.push("Mínimo 8 caracteres");
  if (!/[a-z]/.test(password)) reglas.push("Una letra minúscula");
  if (!/[A-Z]/.test(password)) reglas.push("Una letra mayúscula");
  if (!/[0-9]/.test(password)) reglas.push("Un número");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) reglas.push("Un carácter especial");
  return reglas;
};

export default function ProfileScreen() {
  const navigate = useNavigate();
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    mail: "",
    msisdn: "",
    identificacion: "",
    id_identificacion: "",
    direccion: "",
    fecha_de_nacimiento: "",
    fecha_de_creacion: "",
    id_departamento: "",
  });

  // Estados para cambio de contraseña
  const [passwordData, setPasswordData] = useState({ nueva: "", confirmar: "" });
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);



  // Cargar datos del usuario
  useEffect(() => {
    const fetchUser = async () => {
      const idUser = localStorage.getItem("id_user");
      try {
        const response = await apiFetch(`/users/${idUser}`);
        if (response.ok) {
          const result = await response.json();
          const data = Array.isArray(result) ? result : result.data || result;
          setFormData({
            nombre: data.nombre || "",
            apellido: data.apellido || "",
            mail: data.mail || "",
            msisdn: data.msisdn || "",
            identificacion: data.identificacion || "",
            id_identificacion: data.id_identificacion || "",
            direccion: data.direccion || "",
            fecha_de_nacimiento: data.fecha_de_nacimiento ? data.fecha_de_nacimiento.split("T")[0] : "",
            fecha_de_creacion: data.fecha_de_creacion ? data.fecha_de_creacion.split("T")[0] : "",
            id_departamento: data.id_departamento || "",
          });
        }
      } catch (err) {
        setError("No se pudo cargar los datos del perfil");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfilePhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const idUser = localStorage.getItem("id_user");
      const response = await apiFetch(`/users/${idUser}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          msisdn: formData.msisdn,
          identificacion: formData.identificacion,
          id_identificacion: formData.id_identificacion,
          direccion: formData.direccion || null,
          fecha_de_nacimiento: formData.fecha_de_nacimiento || null,
          id_departamento: formData.id_departamento || null,
        }),
      });

      if (response.ok) {
        localStorage.setItem("nombre", formData.nombre);
        localStorage.setItem("apellido", formData.apellido);
        setSuccess("Perfil actualizado exitosamente");
        setTimeout(() => navigate(-1), 1000);
        
      } else {
        const errorData = await response.json();
        const mensaje = typeof errorData.detail === "string"
          ? errorData.detail
          : Array.isArray(errorData.detail)
            ? errorData.detail.map(e => e.msg).join(", ")
            : errorData.message || "Error al guardar los cambios";
        setError(mensaje);
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const reglasFaltantes = validarContrasena(passwordData.nueva);
    if (reglasFaltantes.length > 0) {
      setPasswordError("La contraseña debe tener: " + reglasFaltantes.join(", "));
      return;
    }

    if (passwordData.nueva !== passwordData.confirmar) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    setSavingPassword(true);

    try {
      const idUser = localStorage.getItem("id_user");
      const response = await apiFetch(`/users/${idUser}`, {
        method: "PATCH",
        body: JSON.stringify({ contrasena: passwordData.nueva }),
      });

      if (response.ok) {
        setPasswordSuccess("Contraseña actualizada exitosamente");
        setPasswordData({ nueva: "", confirmar: "" });
        setTimeout(() => navigate(-1), 1000);
      } else {
        const errorData = await response.json();
        const mensaje = typeof errorData.detail === "string"
          ? errorData.detail
          : Array.isArray(errorData.detail)
            ? errorData.detail.map(e => e.msg).join(", ")
            : errorData.message || "Error al cambiar la contraseña";
        setPasswordError(mensaje);
      }
    } catch (err) {
      setPasswordError("No se pudo conectar con el servidor");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="prf-loading-page">
        <span className="prf-spinner" />
      </div>
    );
  }

  return (
    <div className="prf-page">
      {/* Header */}
      <header className="prf-header">
        <div className="prf-header-inner">
          <div className="prf-header-left">
            <button
              onClick={() => navigate(-1)}
              className="prf-back-button"
            >
              <ArrowLeft className="prf-back-icon" />
            </button>
            <img src={logo} alt="Logo" className="prf-logo" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="prf-main">
        <div className="prf-card">
          <h1 className="prf-title">Perfil de Usuario</h1>

          {/* Mensajes */}
          {error && (
            <div className="prf-alert prf-alert--error">
              {error}
            </div>
          )}
          {success && (
            <div className="prf-alert prf-alert--success">
              {success}
            </div>
          )}

          {/* Formulario de datos personales */}
          <form onSubmit={handleSave} className="prf-form">
            {/* Profile Photo */}
            <div className="prf-photo-row">
              <div className="prf-photo-col">
                <div className="prf-photo-frame">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Foto de perfil" className="prf-photo-img" />
                  ) : (
                    <Upload className="prf-photo-placeholder" />
                  )}
                </div>
                <label className="prf-photo-upload-label">
                  <Upload className="prf-photo-upload-icon" />
                  Subir Foto
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="prf-photo-upload-input" />
                </label>
              </div>
            </div>

            <div className="prf-grid-2">
              <div className="prf-field">
                <label className="prf-label">Nombres</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="prf-input"
                  placeholder="Ingresa tus nombres"
                />
              </div>

              <div className="prf-field">
                <label className="prf-label">Apellidos</label>
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  className="prf-input"
                  placeholder="Ingresa tus apellidos"
                />
              </div>

              <div className="prf-field">
                <label className="prf-label">Email</label>
                <input
                  type="email"
                  name="mail"
                  value={formData.mail}
                  disabled
                  className="prf-input prf-input--disabled"
                />
              </div>

              <div className="prf-field">
                <label className="prf-label">Celular</label>
                <input
                  type="tel"
                  name="msisdn"
                  value={formData.msisdn}
                  onChange={handleChange}
                  className="prf-input"
                  placeholder="Número de celular"
                />
              </div>

              <div className="prf-field">
                <label className="prf-label">Tipo de Identificación</label>
                <select
                  name="identificacion"
                  value={formData.identificacion}
                  onChange={handleChange}
                  className="prf-select"
                >
                  <option value="">Seleccione tipo</option>
                  {identificacionTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="prf-field">
                <label className="prf-label">Número de Documento</label>
                <input
                  type="text"
                  name="id_identificacion"
                  value={formData.id_identificacion}
                  onChange={handleChange}
                  className="prf-input"
                  placeholder="Número de documento"
                />
              </div>

              <div className="prf-field">
                <label className="prf-label">Dirección de Residencia</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="prf-input"
                  placeholder="Dirección completa"
                />
              </div>

              <div className="prf-field">
                <label className="prf-label">Fecha de Nacimiento</label>
                <input
                  type="date"
                  name="fecha_de_nacimiento"
                  value={formData.fecha_de_nacimiento}
                  onChange={handleChange}
                  className="prf-input"
                />
              </div>

              <div className="prf-field">
                <label className="prf-label">Fecha de Creación del Perfil</label>
                <input
                  type="date"
                  name="fecha_de_creacion"
                  value={formData.fecha_de_creacion}
                  disabled
                  className="prf-input prf-input--disabled"
                />
              </div>

              <div className="prf-field">
                <label className="prf-label">Nombre del Departamento</label>
                <input
                  type="text"
                  name="id_departamento"
                  value={formData.id_departamento}
                  onChange={handleChange}
                  className="prf-input"
                  placeholder="Departamento al que pertenece"
                />
              </div>
            </div>

            <div className="prf-submit-row">
              <button
                type="submit"
                disabled={saving}
                className="prf-submit-button"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>

          {/* Separador */}
          <div className="prf-divider"></div>

          {/* Cambio de Contraseña */}
          <div>
            <h2 className="prf-section-title">Cambiar Contraseña</h2>

            {passwordError && (
              <div className="prf-alert prf-alert--error">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="prf-alert prf-alert--success">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="prf-form">
              <div className="prf-grid-2">
                <div className="prf-field">
                  <label className="prf-label">Nueva Contraseña</label>
                  <div className="prf-password-field">
                    <input
                      type={verNueva ? "text" : "password"}
                      value={passwordData.nueva}
                      onChange={(e) => setPasswordData({ ...passwordData, nueva: e.target.value })}
                      className="prf-password-input"
                      placeholder="Ingresa nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerNueva(!verNueva)}
                      className="prf-password-toggle"
                    >
                      {verNueva ? <EyeOff className="prf-password-toggle-icon" /> : <Eye className="prf-password-toggle-icon" />}
                    </button>
                  </div>
                </div>
                <div className="prf-field">
                  <label className="prf-label">Confirmar Contraseña</label>
                  <div className="prf-password-field">
                    <input
                      type={verConfirmar ? "text" : "password"}
                      value={passwordData.confirmar}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmar: e.target.value })}
                      className="prf-password-input"
                      placeholder="Confirma nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerConfirmar(!verConfirmar)}
                      className="prf-password-toggle"
                    >
                      {verConfirmar ? <EyeOff className="prf-password-toggle-icon" /> : <Eye className="prf-password-toggle-icon" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Requisitos de contraseña */}
              {passwordData.nueva && (
                <div className="prf-password-requirements">
                  <p className="prf-password-requirements-title">La contraseña debe tener:</p>
                  <div className="prf-password-requirements-grid">
                    {[
                      { label: "Mínimo 8 caracteres", valid: passwordData.nueva.length >= 8 },
                      { label: "Una letra minúscula", valid: /[a-z]/.test(passwordData.nueva) },
                      { label: "Una letra mayúscula", valid: /[A-Z]/.test(passwordData.nueva) },
                      { label: "Un número", valid: /[0-9]/.test(passwordData.nueva) },
                      { label: "Un carácter especial", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.nueva) },
                    ].map((regla) => (
                      <p key={regla.label} className={`prf-password-requirement ${regla.valid ? "prf-password-requirement--valid" : "prf-password-requirement--invalid"}`}>
                        {regla.valid ? "✓" : "○"} {regla.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="prf-password-submit-row">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="prf-password-submit-button"
                >
                  {savingPassword ? "Cambiando..." : "Cambiar Contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
