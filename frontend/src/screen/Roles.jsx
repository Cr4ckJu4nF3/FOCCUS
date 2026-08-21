import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Users, Mail, X, CheckCircle } from "lucide-react";
import logo from "../assets/FoccusNB_White.png";
import API_URL from "../api";
import "../desing/Roles.css";

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
    <div className="rs-page">
      {/* Header */}
      <header className="rs-header">
        <div className="rs-header-inner">
          <div className="rs-header-left">
            <button
              onClick={() => navigate(-1)}
              className="rs-back-button"
            >
              <ArrowLeft className="rs-back-icon" />
            </button>
            <img src={logo} alt="Logo" className="rs-logo" />
          </div>
          <p className="rs-header-project-name">{projectName}</p>
        </div>
      </header>

      {/* Content */}
      <main className="rs-main">
        {/* Título y botón invitar */}
        <div className="rs-title-row">
          <div className="rs-title-left">
            <Users className="rs-title-icon" />
            <h1 className="rs-title">Roles y Equipo</h1>
          </div>
          <button
            onClick={() => { setShowInviteModal(true); setError(""); }}
            className="rs-invite-button"
          >
            <UserPlus className="rs-icon-sm" />
            Invitar Miembro
          </button>
        </div>

        {/* Mensajes */}
        {success && (
          <div className="rs-alert rs-alert--success">
            <CheckCircle className="rs-icon-sm" />
            {success}
          </div>
        )}
        {error && !showInviteModal && (
          <div className="rs-alert rs-alert--error">
            {error}
          </div>
        )}

        {/* Lista de miembros */}
        <div className="rs-list-card">
          <div className="rs-list-header">
            <span className="rs-list-header-title">Miembros del proyecto</span>
            <span className="rs-list-header-count">{usuarios.length} miembros</span>
          </div>

          {loadingUsers ? (
            <div className="rs-list-state">
              <span className="rs-spinner" />
              <p className="rs-list-state-text">Cargando equipo...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="rs-list-state">
              <Users className="rs-list-state-icon" />
              <p className="rs-list-state-text">No hay miembros en este proyecto. Invita a tu equipo.</p>
            </div>
          ) : (
            <div className="rs-list">
              {usuarios.map((user, index) => {
                const rol = user.id_rol || 1005;
                return (
                  <div key={user.id_user || index} className="rs-list-item">
                    <div className="rs-list-item-left">
                      <div className="rs-avatar"
                        style={{ backgroundColor: rolColors[rol] || "#6B6B6B" }}
                      >
                        {(user.nombre || "?")[0]}{(user.apellido || "?")[0]}
                      </div>
                      <div>
                        <p className="rs-user-name">
                          {user.nombre} {user.apellido}
                        </p>
                        <p className="rs-user-mail">{user.mail}</p>
                      </div>
                    </div>
                    <span
                      className="rs-role-badge"
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
        <div className="rs-modal-overlay">
          <div
            className="rs-modal-backdrop"
            onClick={() => setShowInviteModal(false)}
          />

          <div className="rs-modal">
            {/* Modal Header */}
            <div className="rs-modal-header">
              <div className="rs-modal-header-row">
                <div>
                  <p className="rs-modal-header-eyebrow">
                    Nuevo miembro
                  </p>
                  <h2 className="rs-modal-header-title">
                    Invitar al Proyecto
                  </h2>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="rs-modal-close"
                >
                  <X className="rs-modal-close-icon" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="rs-modal-body">
              {error && (
                <div className="rs-modal-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleInvite} className="rs-modal-form">
                <div className="rs-modal-field">
                  <label className="rs-modal-label">
                    Correos electrónicos
                  </label>
                  <textarea
                    value={correos}
                    onChange={(e) => setCorreos(e.target.value)}
                    rows={3}
                    className="rs-modal-textarea"
                    placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                    required
                  />
                  <p className="rs-modal-hint">
                    Separa los correos con comas para invitar a varias personas.
                  </p>
                </div>

                <div className="rs-modal-field">
                  <label className="rs-modal-label">
                    Rol asignado
                  </label>
                  <select
                    value={rolInvitado}
                    onChange={(e) => setRolInvitado(Number(e.target.value))}
                    className="rs-modal-select"
                  >
                    <option value={1001}>Administrador</option>
                    <option value={1002}>Director</option>
                    <option value={1003}>Jefe de Departamento</option>
                    <option value={1004}>Onset</option>
                    <option value={1005}>Usuario</option>
                  </select>
                </div>

                <div className="rs-modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="rs-modal-cancel"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingInvite}
                    className="rs-modal-submit"
                  >
                    {loadingInvite ? (
                      <>
                        <span className="rs-modal-submit-spinner" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="rs-icon-sm" />
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
