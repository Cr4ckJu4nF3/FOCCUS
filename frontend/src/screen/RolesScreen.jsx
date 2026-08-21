import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Users, Mail, X, CheckCircle } from "lucide-react";
import logo from "../assets/Logo_Negativo.png";
import API_URL from "../api";

const rolLabels = {
  1001: "Administrador",
  1002: "Director",
  1003: "Jefe de Departamento",
  1004: "Onset",
  1005: "Usuario",
};

const rolColors = {
  1001: "#7B5FCF",
  1002: "#0B4F8A",
  1003: "#E67E5C",
  1004: "#22c55e",
  1005: "#6B6B6B",
};

export default function RolesScreen() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [correos, setCorreos] = useState("");
  const [rolInvitado, setRolInvitado] = useState(1005);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const idProject = localStorage.getItem("projectId") || localStorage.getItem("id_project") || "";
  const idClient = localStorage.getItem("id_client") || "";

  // Cargar usuarios del proyecto
  const fetchUsuarios = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API_URL}/users/project/${idProject}`);
      if (response.ok) {
        const data = await response.json();
        setUsuarios(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      setError("No se pudo cargar los miembros del equipo");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Enviar invitaciones
  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoadingInvite(true);

    const listaCorreos = correos
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c !== "");

    if (listaCorreos.length === 0) {
      setError("Ingresa al menos un correo");
      setLoadingInvite(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correos: listaCorreos,
          id_project: idProject,
          id_client: Number(idClient),
          id_rol: Number(rolInvitado),
        }),
      });

      if (response.ok) {
        setSuccess(`Invitaciones enviadas exitosamente a ${listaCorreos.length} correo(s)`);
        setCorreos("");
        setRolInvitado(1005);
        setShowInviteModal(false);
        fetchUsuarios();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const errorData = await response.json();
        const mensaje = typeof errorData.detail === "string"
          ? errorData.detail
          : Array.isArray(errorData.detail)
            ? errorData.detail.map((e) => e.msg).join(", ")
            : errorData.message || "Error al enviar invitaciones";
        setError(mensaje);
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoadingInvite(false);
    }
  };

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
          <p className="text-[#6B6B6B] text-sm">{projectName}</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-8 py-12">
        {/* Título y botón invitar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[#7B5FCF]" />
            <h1 className="text-[#FAFAFA] text-2xl font-semibold">Roles y Equipo</h1>
          </div>
          <button
            onClick={() => { setShowInviteModal(true); setError(""); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7B5FCF] text-white rounded-lg hover:bg-[#6a4eb8] transition-colors shadow-lg shadow-[#7B5FCF]/20"
          >
            <UserPlus className="w-4 h-4" />
            Invitar Miembro
          </button>
        </div>

        {/* Mensajes */}
        {success && (
          <div className="mb-6 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}
        {error && !showInviteModal && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Lista de miembros */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
            <span className="text-[#FAFAFA] text-sm font-semibold">Miembros del proyecto</span>
            <span className="text-[#6B6B6B] text-xs">{usuarios.length} miembros</span>
          </div>

          {loadingUsers ? (
            <div className="p-8 text-center">
              <span className="w-6 h-6 border-2 border-[#7B5FCF]/30 border-t-[#7B5FCF] rounded-full animate-spin inline-block" />
              <p className="text-[#6B6B6B] text-sm mt-3">Cargando equipo...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
              <p className="text-[#6B6B6B] text-sm">No hay miembros en este proyecto. Invita a tu equipo.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
              {usuarios.map((user, index) => {
                const rol = user.id_rol || 1005;
                return (
                  <div key={user.id_user || index} className="px-6 py-4 flex items-center justify-between hover:bg-[#2A2A2A]/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: rolColors[rol] || "#6B6B6B" }}
                      >
                        {(user.nombre || "?")[0]}{(user.apellido || "?")[0]}
                      </div>
                      <div>
                        <p className="text-[#FAFAFA] font-medium text-sm">
                          {user.nombre} {user.apellido}
                        </p>
                        <p className="text-[#6B6B6B] text-xs">{user.mail}</p>
                      </div>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: (rolColors[rol] || "#6B6B6B") + "20",
                        color: rolColors[rol] || "#6B6B6B",
                        border: `1px solid ${(rolColors[rol] || "#6B6B6B")}40`,
                      }}
                    >
                      {rolLabels[rol] || "Sin rol"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Invitar */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowInviteModal(false)}
          />

          <div className="relative w-full max-w-lg bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#7B5FCF] to-[#0B4F8A] px-7 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-1">
                    Nuevo miembro
                  </p>
                  <h2 className="text-white text-lg font-semibold tracking-wide">
                    Invitar al Proyecto
                  </h2>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-7">
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-5">
                <div>
                  <label className="block mb-1.5 text-[#FAFAFA] text-sm font-medium">
                    Correos electrónicos
                  </label>
                  <textarea
                    value={correos}
                    onChange={(e) => setCorreos(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA] placeholder:text-[#4A4A4A] resize-none text-sm"
                    placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                    required
                  />
                  <p className="mt-1.5 text-[#6B6B6B] text-xs">
                    Separa los correos con comas para invitar a varias personas.
                  </p>
                </div>

                <div>
                  <label className="block mb-1.5 text-[#FAFAFA] text-sm font-medium">
                    Rol asignado
                  </label>
                  <select
                    value={rolInvitado}
                    onChange={(e) => setRolInvitado(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA] text-sm"
                  >
                    <option value={1001}>Administrador</option>
                    <option value={1002}>Director</option>
                    <option value={1003}>Jefe de Departamento</option>
                    <option value={1004}>Onset</option>
                    <option value={1005}>Usuario</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-6 py-2.5 rounded-lg border border-[#2A2A2A] text-[#6B6B6B] hover:text-[#FAFAFA] hover:border-[#6B6B6B] text-sm font-medium transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingInvite}
                    className="px-8 py-2.5 rounded-lg bg-[#7B5FCF] text-white hover:bg-[#6a4eb8] text-sm font-semibold tracking-wide transition-all shadow-lg shadow-[#7B5FCF]/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingInvite ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Enviar Invitaciones
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}