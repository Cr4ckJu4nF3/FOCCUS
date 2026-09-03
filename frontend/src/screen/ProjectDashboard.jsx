import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, User, Bell, LogOut } from "lucide-react";
import logo from "../assets/FoccusNB_White.png";
import API_URL from "../api";
import "../desing/ProjectDashboard.css";

const modules = [
  { name: "Guión", color: "#0B4F8A" },
  { name: "Escenas", color: "#7B5FCF" },
  { name: "Plan de Rodaje", color: "#E67E5C" },
  { name: "Desglose", color: "#6B6B6B" },
];

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

  const latestUpdates = [
    {
      title: "Revisión de guion",
      module: "Guión",
      status: "pendiente",
      detail: "Falta confirmar cambios de narrativas finales antes del pase de producción.",
      date: "Hoy",
    },
    {
      title: "Ajuste de escenografía",
      module: "Escenas",
      status: "en-progreso",
      detail: "Se están corrigiendo cambios de ubicación para la escena 08 y 09.",
      date: "Hace 2h",
    },
    {
      title: "Cronograma de grabación",
      module: "Plan de Rodaje",
      status: "en-progreso",
      detail: "Se validan días y orden de rodaje del bloque principal.",
      date: "Ayer",
    },
    {
      title: "Pasaje final del guion",
      module: "Guión",
      status: "finalizado",
      detail: "El guion quedó aprobado por dirección y producción.",
      date: "Hace 1d",
    },
    {
      title: "Escenas cerradas",
      module: "Escenas",
      status: "finalizado",
      detail: "La secuencia principal está marcada como lista para revisión técnica.",
      date: "Hace 2d",
    },
    {
      title: "Desglose de producción",
      module: "Desglose",
      status: "pendiente",
      detail: "Falta validar costos, materiales y tiempos de armado del set.",
      date: "Próximo",
    },
  ];

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
            <span className="pds-updates-total">{latestUpdates.length} cambios</span>
          </div>

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
