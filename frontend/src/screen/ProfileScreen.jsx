import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Eye, EyeOff } from "lucide-react";
import logo from "../assets/Logo_Negativo.png";
import API_URL from "../api";

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
        const response = await fetch(`${API_URL}/users/${idUser}`);
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
      const response = await fetch(`${API_URL}/users/${idUser}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch(`${API_URL}/users/${idUser}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-[#0B4F8A]/30 border-t-[#0B4F8A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#FAFAFA]" />
            </button>
            <img src={logo} alt="Logo" className="h-15" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-[#1A1A1A] rounded-lg shadow-lg border border-[#2A2A2A] p-8">
          <h1 className="text-[#FAFAFA] mb-8">Perfil de Usuario</h1>

          {/* Mensajes */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Formulario de datos personales */}
          <form onSubmit={handleSave} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex justify-center mb-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-[#2A2A2A] border-2 border-[#0B4F8A] overflow-hidden flex items-center justify-center">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Foto de perfil" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-12 h-12 text-[#6B6B6B]" />
                  )}
                </div>
                <label className="cursor-pointer bg-[#0B4F8A] text-white px-4 py-2 rounded-lg hover:bg-[#094170] transition-colors flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Subir Foto
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-[#FAFAFA]">Nombres</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                  placeholder="Ingresa tus nombres"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Apellidos</label>
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                  placeholder="Ingresa tus apellidos"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Email</label>
                <input
                  type="email"
                  name="mail"
                  value={formData.mail}
                  disabled
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg bg-[#2A2A2A] text-[#6B6B6B] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Celular</label>
                <input
                  type="tel"
                  name="msisdn"
                  value={formData.msisdn}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                  placeholder="Número de celular"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Tipo de Identificación</label>
                <select
                  name="identificacion"
                  value={formData.identificacion}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                >
                  <option value="">Seleccione tipo</option>
                  {identificacionTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Número de Documento</label>
                <input
                  type="text"
                  name="id_identificacion"
                  value={formData.id_identificacion}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                  placeholder="Número de documento"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Dirección de Residencia</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                  placeholder="Dirección completa"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Fecha de Nacimiento</label>
                <input
                  type="date"
                  name="fecha_de_nacimiento"
                  value={formData.fecha_de_nacimiento}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Fecha de Creación del Perfil</label>
                <input
                  type="date"
                  name="fecha_de_creacion"
                  value={formData.fecha_de_creacion}
                  disabled
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg bg-[#2A2A2A] text-[#6B6B6B] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Nombre del Departamento</label>
                <input
                  type="text"
                  name="id_departamento"
                  value={formData.id_departamento}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                  placeholder="Departamento al que pertenece"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0B4F8A] text-white px-8 py-3 rounded-lg hover:bg-[#094170] transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>

          {/* Separador */}
          <div className="border-t border-[#2A2A2A] my-8"></div>

          {/* Cambio de Contraseña */}
          <div>
            <h2 className="text-[#FAFAFA] mb-6">Cambiar Contraseña</h2>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-[#FAFAFA]">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={verNueva ? "text" : "password"}
                      value={passwordData.nueva}
                      onChange={(e) => setPasswordData({ ...passwordData, nueva: e.target.value })}
                      className="w-full px-4 py-3 pr-12 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA]"
                      placeholder="Ingresa nueva contraseña"
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
                  <label className="block mb-2 text-[#FAFAFA]">Confirmar Contraseña</label>
                  <div className="relative">
                    <input
                      type={verConfirmar ? "text" : "password"}
                      value={passwordData.confirmar}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmar: e.target.value })}
                      className="w-full px-4 py-3 pr-12 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA]"
                      placeholder="Confirma nueva contraseña"
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
              </div>

              {/* Requisitos de contraseña */}
              {passwordData.nueva && (
                <div className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                  <p className="text-[#6B6B6B] text-xs mb-2 font-semibold">La contraseña debe tener:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {[
                      { label: "Mínimo 8 caracteres", valid: passwordData.nueva.length >= 8 },
                      { label: "Una letra minúscula", valid: /[a-z]/.test(passwordData.nueva) },
                      { label: "Una letra mayúscula", valid: /[A-Z]/.test(passwordData.nueva) },
                      { label: "Un número", valid: /[0-9]/.test(passwordData.nueva) },
                      { label: "Un carácter especial", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.nueva) },
                    ].map((regla) => (
                      <p key={regla.label} className={`text-xs flex items-center gap-1.5 ${regla.valid ? "text-green-400" : "text-[#6B6B6B]"}`}>
                        {regla.valid ? "✓" : "○"} {regla.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-[#7B5FCF] text-white px-8 py-3 rounded-lg hover:bg-[#6a4eb8] transition-colors disabled:opacity-50"
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