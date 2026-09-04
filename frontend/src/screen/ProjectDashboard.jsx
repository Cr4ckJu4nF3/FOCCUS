import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, User, LogOut, Trash2 } from "lucide-react";
import logo from "../assets/FoccusNB_White.png";
import { apiFetch } from "../api";
import "../desing/ProjectDashboard.css";

const modules = [
  { name: "Guión", color: "#0B4F8A" },
  { name: "Escenas", color: "#7B5FCF" },
  { name: "Plan de Rodaje", color: "#E67E5C" },
  { name: "Desglose", color: "#6B6B6B" },
];

const normalizeUpdateStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (normalizedStatus === "en progreso" || normalizedStatus === "en-progreso") return "en-progreso";
  if (normalizedStatus === "finalizado") return "finalizado";
  return "pendiente";
};

export default function ProjectDashboardScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const projectName = location.state?.projectName || localStorage.getItem("projectName") || "Proyecto";
  const projectId = location.state?.projectId || localStorage.getItem("projectId") || "";

  const nombre = localStorage.getItem("nombre") || "";
  const apellido = localStorage.getItem("apellido") || "";
  const idRol = parseInt(localStorage.getItem("id_rol")) || 0;
  const esAdmin = idRol === 1001;
  const rolLabel = esAdmin ? "Administrador" : "Usuario";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [latestUpdates, setLatestUpdates] = useState([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updatesError, setUpdatesError] = useState("");
  const menuRef = useRef(null);
  const profileRef = useRef(null);

  // Guardar datos del proyecto en localStorage
  useEffect(() => {
    if (location.state?.projectName) {
      localStorage.setItem("projectName", location.state.projectName);
    }
    if (location.state?.projectId) {
      localStorage.setItem("projectId", location.state.projectId);
    }
  }, [location.state]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const fetchRecentActivity = async () => {
      if (!projectId) {
        setLatestUpdates([]);
        return;
      }

      setUpdatesLoading(true);
      setUpdatesError("");

      try {
        const rodajesResponse = await apiFetch(`/projects/${projectId}/rodajes`);
        const rodajesData = await rodajesResponse.json();

        if (!rodajesResponse.ok) {
          throw new Error(rodajesData.detail || rodajesData.message || "No se pudo cargar la actividad");
        }

        const rodajes = Array.isArray(rodajesData.data) ? rodajesData.data : [];
        const procesosPorRodaje = await Promise.all(
          rodajes.map(async (rodaje) => {
            const procesosResponse = await apiFetch(`/rodajes/${rodaje.id_rodaje}/procesos`);
            const procesosData = await procesosResponse.json();

            if (!procesosResponse.ok) {
              throw new Error(procesosData.detail || procesosData.message || "No se pudo cargar un proceso");
            }

            return { rodaje, procesos: Array.isArray(procesosData.data) ? procesosData.data : [] };
          }),
        );

        const activities = procesosPorRodaje.flatMap(({ rodaje, procesos }) => [
          {
            title: rodaje.nombre,
            module: "Plan de Rodaje",
            status: normalizeUpdateStatus(rodaje.estado),
            detail: rodaje.descripcion || `${rodaje.locacion || "Sin locación"} · ${rodaje.fecha_inicio} a ${rodaje.fecha_fin}`,
            date: rodaje.fecha_inicio,
          },
          ...procesos.map((proceso) => ({
            title: proceso.nombre,
            module: "Proceso de rodaje",
            status: normalizeUpdateStatus(proceso.estado),
            detail: [proceso.ubicacion, proceso.encargado].filter(Boolean).join(" · ") || proceso.descripcion || "Sin detalles adicionales",
            date: proceso.fecha,
          })),
        ]);

        if (isCurrent) {
          setLatestUpdates(activities.sort((first, second) => String(second.date).localeCompare(String(first.date))));
        }
      } catch (err) {
        if (isCurrent) {
          setLatestUpdates([]);
          setUpdatesError(err.message || "No se pudo cargar la actividad");
        }
      } finally {
        if (isCurrent) setUpdatesLoading(false);
      }
    };

    fetchRecentActivity();
    return () => {
      isCurrent = false;
    };
  }, [projectId]);

  // Opciones del menú — Roles solo para admin
  const menuOptions = [
    "Guión",
    "Crear Escenas",
    "Crear Personajes",
    "Crew List",
    "Plan de Rodaje",
    "Desglose",
    "Galería",
    ...(esAdmin ? ["Roles"] : []),
  ];

  const handleMenuOption = (option) => {
    setIsMenuOpen(false);
    if (option === "Roles") {
      navigate("/roles", { state: { projectName, projectId } });
      return;
    }

    if (option === "Guión") {
      navigate("/guion", { state: { projectName, projectId } });
      return;
    }

    if (option === "Escenas" || option === "Crear Escenas") {
      navigate("/escenas", { state: { projectName, projectId } });
      return;
    }

    if (option === "Plan de Rodaje") {
      navigate("/rodaje", { state: { projectName, projectId } });
    }
  };

  const handleLogout = () => {
  localStorage.clear();
  navigate("/", { replace: true });
  window.history.pushState(null, "", "/");
  };

  const handleDeleteProject = async () => {
    if (!esAdmin) {
      alert("Solo un administrador puede eliminar este proyecto.");
      return;
    }

    if (!projectId) {
      alert("No hay un proyecto activo para eliminar.");
      navigate("/seleccion-proyecto", { replace: true });
      return;
    }

    if (!window.confirm(`¿Eliminar el proyecto "${projectName}"? Borra todo su contenido y no se puede deshacer.`)) return;

    try {
      const response = await apiFetch(`/projects/${projectId}/delete`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo eliminar el proyecto");
      }
      localStorage.removeItem("projectId");
      localStorage.removeItem("projectName");
      navigate("/seleccion-proyecto", { replace: true });
    } catch (err) {
      alert(err.message || "No se pudo eliminar el proyecto");
    }
  };

  const updateStatusOrder = [
    { key: "pendiente", label: "Pendiente" },
    { key: "en-progreso", label: "En progreso" },
    { key: "finalizado", label: "Finalizado" },
  ];

  return (
    <div className="pds-page">
      {/* Header */}
      <header className="pds-header">
        <div className="pds-header-inner">
          <div className="pds-header-left">
            <img src={logo} alt="Logo" className="pds-logo" />
          </div>

          <div className="pds-header-right">
            {/* Nombre y rol */}
            <div className="pds-user-info">
              <p className="pds-user-name">{nombre} {apellido}</p>
              <p className={`pds-user-role ${esAdmin ? "pds-user-role--admin" : "pds-user-role--user"}`}>
                {rolLabel}
              </p>
            </div>

            {/* Profile Menu */}
            <div className="pds-profile-wrapper" ref={profileRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="pds-profile-button"
              >
                <User className="pds-profile-icon" />
              </button>

              {isProfileMenuOpen && (
                <div className="pds-profile-dropdown">
                  {/* Nombre en móvil */}
                  <div className="pds-profile-dropdown-header">
                    <p className="pds-profile-dropdown-name">{nombre} {apellido}</p>
                    <p className={`pds-profile-dropdown-role ${esAdmin ? "pds-user-role--admin" : "pds-user-role--user"}`}>
                      {rolLabel}
                    </p>
                  </div>
                  <button
                    onClick={() => { navigate("/perfil"); setIsProfileMenuOpen(false); }}
                    className="pds-profile-dropdown-item pds-profile-dropdown-item--default"
                  >
                    <User className="pds-icon-sm" />
                    Perfil
                  </button>
                  {esAdmin && (
                    <button
                      onClick={() => { handleDeleteProject(); setIsProfileMenuOpen(false); }}
                      className="pds-profile-dropdown-item pds-profile-dropdown-item--danger"
                    >
                      <Trash2 className="pds-icon-sm" />
                      Eliminar proyecto
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="pds-profile-dropdown-item pds-profile-dropdown-item--danger"
                  >
                    <LogOut className="pds-icon-sm" />
                    Salir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pds-main">
        {/* Project Name and Menu Button */}
        <div className="pds-project-header" ref={menuRef}>
          <h1 className="pds-project-title">{projectName}</h1>
          <div className="pds-menu-toggle-wrapper">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="pds-menu-toggle"
            >
              <Menu className="pds-menu-toggle-icon" />
              <span className="pds-menu-toggle-label">Menú</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="pds-content">
          {/* Menu Sidebar */}
          {isMenuOpen && (
            <div ref={menuRef} className="pds-sidebar">
              {menuOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleMenuOption(option)}
                  className={`pds-sidebar-item ${
                    option === "Roles" ? "pds-sidebar-item--roles" : "pds-sidebar-item--default"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Modules Grid */}
          <div className={`pds-modules-grid ${
            isMenuOpen ? "pds-modules-grid--collapsed" : "pds-modules-grid--expanded"
          }`}>
            {modules.map((module) => (
              <div
                key={module.name}
                onClick={() => handleMenuOption(module.name)}
                className={`pds-module-card ${
                  isMenuOpen ? "pds-module-card--compact" : "pds-module-card--full"
                }`}
                style={{ cursor: "pointer" }}
              >
                <div
                  className={`pds-module-icon-wrapper ${
                    isMenuOpen ? "pds-module-icon-wrapper--compact" : "pds-module-icon-wrapper--full"
                  }`}
                  style={{ backgroundColor: module.color }}
                >
                  <span className={`pds-module-emoji ${isMenuOpen ? "pds-module-emoji--compact" : "pds-module-emoji--full"}`}>📋</span>
                </div>
                <h3 className={`pds-module-title ${
                  isMenuOpen ? "pds-module-title--compact" : "pds-module-title--full"
                }`}>
                  {module.name}
                </h3>
                <button className="pds-module-button">
                  Ver más
                </button>
              </div>
            ))}
          </div>
        </div>

        <section className="pds-updates">
          <div className="pds-updates-header">
            <div>
              <p className="pds-updates-eyebrow">Actividad reciente</p>
              <h2>Últimas actualizaciones</h2>
            </div>
            <span className="pds-updates-total">{latestUpdates.length} registros</span>
          </div>

          {updatesLoading ? (
            <p className="pds-update-empty">Cargando actividad...</p>
          ) : updatesError ? (
            <p className="pds-update-empty">{updatesError}</p>
          ) : latestUpdates.length === 0 ? (
            <p className="pds-update-empty">Aún no hay actividad en el plan de rodaje.</p>
          ) : (
            <div className="pds-updates-grid">
              {updateStatusOrder.map((status) => {
              const items = latestUpdates.filter((item) => item.status === status.key);

              return (
                <div key={status.key} className={`pds-update-column pds-update-column--${status.key}`}>
                  <div className="pds-update-column__header">
                    <span className={`pds-status-pill pds-status-pill--${status.key}`}>{status.label}</span>
                    <span className="pds-status-count">{items.length}</span>
                  </div>

                  <div className="pds-update-list">
                    {items.length === 0 ? (
                      <p className="pds-update-empty">Sin cambios aún</p>
                    ) : (
                      items.map((item) => (
                        <article key={`${item.module}-${item.title}`} className="pds-update-item">
                          <div className="pds-update-item__topline">
                            <span className="pds-update-module">{item.module}</span>
                            <span className="pds-update-date">{item.date}</span>
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.detail}</p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </section>

        {/* Volver */}
        <div className="pds-back-wrapper">
          <button
            onClick={() => navigate("/seleccion-proyecto")}
            className="pds-back-button"
          >
            ← Volver a Proyectos
          </button>
        </div>
      </main>
    </div>
  );
}
