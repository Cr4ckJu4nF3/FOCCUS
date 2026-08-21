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
    }
  };

  const handleLogout = () => {
  localStorage.clear();
  navigate("/", { replace: true });
  window.history.pushState(null, "", "/");
  };

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
                className={`pds-module-card ${
                  isMenuOpen ? "pds-module-card--compact" : "pds-module-card--full"
                }`}
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
