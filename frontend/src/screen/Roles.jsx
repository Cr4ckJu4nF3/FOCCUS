import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Users, Mail, X, CheckCircle, Check, Plus } from "lucide-react";
import logo from "../assets/FoccusNB_White.png";
import { apiFetch, getActiveRole, setActiveProject } from "../api";
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
  const [invitados, setInvitados] = useState([{ mail: "", nombre: "", apellido: "" }]);
  const [rolInvitado, setRolInvitado] = useState(1005);
  const [departamentoInvitado, setDepartamentoInvitado] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edicion en linea de Area/Departamento y Rol (cargo)
  const [editingCell, setEditingCell] = useState(null); // { idUser, field } | null
  const [editValue, setEditValue] = useState("");
  const [savingRoleUserId, setSavingRoleUserId] = useState(null);
  const [activeRole, setActiveRole] = useState(getActiveRole());

  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const idProject = localStorage.getItem("projectId") || localStorage.getItem("id_project") || "";
  const idClient = localStorage.getItem("id_client") || "";
  const esAdmin = activeRole === 1001;

  // Cargar usuarios del proyecto
  const fetchUsuarios = useCallback(async () => {
    setLoadingUsers(true);
    setError("");
    try {
      const response = await apiFetch(`/users/project/${idProject}`);
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.detail || result.message || "No se pudo cargar los miembros del equipo");
      }
      const members = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
      setUsuarios(members);
      const currentUserId = Number(localStorage.getItem("id_user"));
      const currentMember = members.find((member) => member.id_user === currentUserId);
      if (!currentMember) {
        ["projectId", "id_project", "projectName", "project_role", "project_role_project_id"].forEach((key) =>
          localStorage.removeItem(key),
        );
        navigate("/seleccion-proyecto", { replace: true });
        return;
      }
      setActiveProject({
        id_project: idProject,
        project_name: projectName,
        id_rol: currentMember.id_rol,
      });
      setActiveRole(Number(currentMember.id_rol) || 0);
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar los miembros del equipo");
    } finally {
      setLoadingUsers(false);
    }
  }, [idProject, navigate, projectName]);

  const handleRemoveUser = async (idUser, nombreCompleto) => {
    if (!window.confirm(`¿Quitar a ${nombreCompleto} de este proyecto?`)) return;
    try {
      const response = await apiFetch(`/users/${idUser}/project/${idProject}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo remover al usuario");
      }
      setUsuarios((prev) => prev.filter((u) => u.id_user !== idUser));
    } catch (err) {
      setError(err.message || "No se pudo remover al usuario");
    }
  };

  useEffect(() => {
    // Starts the asynchronous member request for the active project.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsuarios();
    window.addEventListener("focus", fetchUsuarios);
    return () => window.removeEventListener("focus", fetchUsuarios);
  }, [fetchUsuarios]);

  // Edicion en linea: Area/Departamento y Rol (cargo)
  const startEdit = (idUser, field, valorActual) => {
    if (!esAdmin) return;
    setEditingCell({ idUser, field });
    setEditValue(valorActual || "");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { idUser, field } = editingCell;
    const valorAnterior = usuarios.find((u) => u.id_user === idUser)?.[field] || "";

    if (editValue.trim() === valorAnterior.trim()) {
      cancelEdit();
      return;
    }

    try {
      const response = await apiFetch(`/users/${idUser}/project/${idProject}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: editValue.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo actualizar");
      }
      setUsuarios((prev) =>
        prev.map((u) => (u.id_user === idUser ? { ...u, [field]: editValue.trim() } : u))
      );
    } catch (err) {
      setError(err.message || "No se pudo guardar el cambio");
    } finally {
      cancelEdit();
    }
  };

  const handleChangeRole = async (idUser, nextRole) => {
    const currentUserId = Number(localStorage.getItem("id_user"));
    if (!esAdmin || idUser === currentUserId || savingRoleUserId !== null) return;
    const numericRole = Number(nextRole);
    if (![1001, 1002, 1003, 1004, 1005].includes(numericRole)) return;
    const member = usuarios.find((user) => user.id_user === idUser);
    if (!member || member.id_rol === numericRole) return;
    if (numericRole === 1001 && !window.confirm(`¿Dar permisos de administrador a ${member.nombre} ${member.apellido}?`)) return;

    setError("");
    setSuccess("");
    setSavingRoleUserId(idUser);
    try {
      const response = await apiFetch(`/users/${idUser}/project/${idProject}`, {
        method: "PATCH",
        body: JSON.stringify({ id_rol: numericRole }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo actualizar el rol");
      }
      setUsuarios((current) => current.map((user) => (
        user.id_user === idUser ? { ...user, id_rol: data.data.id_rol } : user
      )));
      setSuccess(`Rol de ${member.nombre} ${member.apellido} actualizado a ${rolLabels[data.data.id_rol]}.`);
    } catch (roleError) {
      setError(roleError.message || "No se pudo actualizar el rol");
    } finally {
      setSavingRoleUserId(null);
    }
  };

  // Enviar invitaciones
  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoadingInvite(true);

    const listaInvitados = invitados.map((invitado) => ({
      mail: invitado.mail.trim().toLowerCase(),
      nombre: invitado.nombre.trim(),
      apellido: invitado.apellido.trim(),
    }));

    if (listaInvitados.some((invitado) => !invitado.mail || !invitado.nombre || !invitado.apellido)) {
      setError("Completa el correo, nombre y apellido de cada persona invitada");
      setLoadingInvite(false);
      return;
    }

    if (new Set(listaInvitados.map((invitado) => invitado.mail)).size !== listaInvitados.length) {
      setError("Hay correos repetidos en la lista de invitaciones");
      setLoadingInvite(false);
      return;
    }

    try {
      const response = await apiFetch("/users/invite", {
        method: "POST",
        body: JSON.stringify({
          correos: listaInvitados.map((invitado) => invitado.mail),
          nombres: Object.fromEntries(listaInvitados.map(({ mail, nombre, apellido }) => [
            mail,
            { nombre, apellido },
          ])),
          id_project: idProject,
          id_client: Number(idClient),
          id_rol: Number(rolInvitado),
          departamento: departamentoInvitado.trim() || null,
        }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        const data = result.data || {};
        const errores = data.errores || [];
        const procesados = data.usuarios_creados || [];
        const correosEnviados = procesados.filter((item) => item.invitacion_enviada).length;
        const fallosCorreo = procesados
          .filter((item) => !item.invitacion_enviada)
          .map((item) => `${item.mail}: no se pudo enviar el correo de invitación`);
        if (procesados.length === 0 && errores.length > 0) {
          setError(errores.map((item) => `${item.mail}: ${item.error}`).join(". "));
          return;
        }
        setSuccess(`Cuentas procesadas: ${procesados.length}; correos enviados: ${correosEnviados}.`);
        setError([...errores.map((item) => `${item.mail}: ${item.error}`), ...fallosCorreo].join(". "));
        setInvitados([{ mail: "", nombre: "", apellido: "" }]);
        setRolInvitado(1005);
        setDepartamentoInvitado("");
        setShowInviteModal(false);
        fetchUsuarios();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const mensaje = typeof result.detail === "string"
          ? result.detail
          : Array.isArray(result.detail)
            ? result.detail.map((e) => e.msg).join(", ")
            : result.message || "Error al enviar invitaciones";
        setError(mensaje);
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoadingInvite(false);
    }
  };

  return (
    <div className={`rs-page ${esAdmin ? "module-role-admin" : "module-role-user"}`}>
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
          {esAdmin && (
            <button
              onClick={() => { setShowInviteModal(true); setError(""); }}
              className="rs-invite-button"
            >
              <UserPlus className="rs-icon-sm" />
              Invitar Miembro
            </button>
          )}
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
            <>
              <div className="rs-table-head">
                <span>Nombre completo</span>
                <span>Área / Departamento</span>
                <span>Rol</span>
                <span>Estado</span>
                <span />
              </div>
              <div className="rs-list">
                {usuarios.map((user, index) => {
                  const rol = user.id_rol || 1005;
                  const esActivo = (user.estado || "").toLowerCase() === "activo";
                  const editandoDepartamento = editingCell?.idUser === user.id_user && editingCell?.field === "departamento";
                  const editandoCargo = editingCell?.idUser === user.id_user && editingCell?.field === "cargo";

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

                      <div className="rs-editable-cell" onClick={() => !editandoDepartamento && startEdit(user.id_user, "departamento", user.departamento)}>
                        {editandoDepartamento ? (
                          <div className="rs-editable-input-row">
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                              placeholder="Ej. Cámara y Fotografía"
                            />
                            <button type="button" onClick={saveEdit}><Check size={14} /></button>
                          </div>
                        ) : (
                          <span className={user.departamento ? "" : "rs-editable-cell--empty"}>
                            {user.departamento || (esAdmin ? "Asignar área" : "Sin asignar")}
                          </span>
                        )}
                      </div>

                      <div className="rs-editable-cell" onClick={() => !editandoCargo && startEdit(user.id_user, "cargo", user.cargo)}>
                        {editandoCargo ? (
                          <div className="rs-editable-input-row">
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                              placeholder="Ej. Director/a de Fotografía"
                            />
                            <button type="button" onClick={saveEdit}><Check size={14} /></button>
                          </div>
                        ) : (
                          <span className={user.cargo ? "" : "rs-editable-cell--empty"}>
                            {user.cargo || (esAdmin ? "Asignar rol" : "Sin asignar")}
                          </span>
                        )}
                      </div>

                      <span className={`rs-state-badge ${esActivo ? "rs-state-badge--activo" : "rs-state-badge--pendiente"}`}>
                        {esActivo ? "Activo" : "Pendiente"}
                      </span>

                      <div className="rs-list-item-right">
                        {esAdmin && user.id_user !== Number(localStorage.getItem("id_user")) ? (
                          <select
                            className="rs-role-select"
                            value={rol}
                            disabled={savingRoleUserId !== null}
                            onChange={(event) => handleChangeRole(user.id_user, event.target.value)}
                            aria-label={`Cambiar rol de ${user.nombre} ${user.apellido}`}
                          >
                            <option value={1001}>{rolLabels[1001]}</option>
                            <option value={1005}>{rolLabels[1005]}</option>
                            {![1001, 1005].includes(Number(user.id_rol)) && (
                              <option value={user.id_rol}>{rolLabels[user.id_rol]} (actual)</option>
                            )}
                          </select>
                        ) : (
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
                        )}
                        {esAdmin && user.id_user !== Number(localStorage.getItem("id_user")) && (
                          <button
                            type="button"
                            className="rs-remove-btn"
                            title="Quitar del proyecto"
                            onClick={() => handleRemoveUser(user.id_user, `${user.nombre} ${user.apellido}`)}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {esAdmin && (
                <p className="rs-list-footnote">Haz clic en el área o el rol de un miembro para editarlo directamente.</p>
              )}
            </>
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
                  <label className="rs-modal-label">Personas a invitar</label>
                  <div className="rs-invitee-list">
                    {invitados.map((invitado, index) => (
                      <div className="rs-invitee-row" key={index}>
                        <input
                          type="email"
                          value={invitado.mail}
                          onChange={(event) => setInvitados((actuales) => actuales.map((item, i) =>
                            i === index ? { ...item, mail: event.target.value } : item
                          ))}
                          className="rs-modal-select"
                          placeholder="Correo electrónico"
                          aria-label={`Correo de la persona ${index + 1}`}
                          required
                        />
                        <input
                          type="text"
                          value={invitado.nombre}
                          onChange={(event) => setInvitados((actuales) => actuales.map((item, i) =>
                            i === index ? { ...item, nombre: event.target.value } : item
                          ))}
                          className="rs-modal-select"
                          placeholder="Nombre"
                          aria-label={`Nombre de la persona ${index + 1}`}
                          maxLength={255}
                          required
                        />
                        <input
                          type="text"
                          value={invitado.apellido}
                          onChange={(event) => setInvitados((actuales) => actuales.map((item, i) =>
                            i === index ? { ...item, apellido: event.target.value } : item
                          ))}
                          className="rs-modal-select"
                          placeholder="Apellido"
                          aria-label={`Apellido de la persona ${index + 1}`}
                          maxLength={255}
                          required
                        />
                        {invitados.length > 1 && (
                          <button
                            type="button"
                            className="rs-invitee-remove"
                            onClick={() => setInvitados((actuales) => actuales.filter((_, i) => i !== index))}
                            aria-label={`Quitar persona ${index + 1}`}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="rs-invitee-add"
                    onClick={() => setInvitados((actuales) => [...actuales, { mail: "", nombre: "", apellido: "" }])}
                  >
                    <Plus size={15} />
                    Agregar otra persona
                  </button>
                  <p className="rs-modal-hint">
                    Para una cuenta nueva, el nombre aparecerá mientras la persona completa su perfil. Los datos de cuentas existentes no se modifican.
                  </p>
                </div>

                <div className="rs-modal-field">
                  <label className="rs-modal-label" htmlFor="invite-department">
                    Departamento
                  </label>
                  <input
                    id="invite-department"
                    type="text"
                    value={departamentoInvitado}
                    onChange={(e) => setDepartamentoInvitado(e.target.value)}
                    className="rs-modal-select"
                    placeholder="Ej. Dirección, Fotografía, Arte"
                    maxLength={80}
                  />
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
