import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, User, Bell, LogOut } from "lucide-react";
import logo from "../assets/Logo_Negativo.png";
import API_URL from "../api";

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
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="h-15" />
          </div>

          <div className="flex items-center gap-4">
            {/* Nombre y rol */}
            <div className="text-right hidden md:block">
              <p className="text-[#FAFAFA] text-sm font-medium">{nombre} {apellido}</p>
              <p className={`text-xs font-semibold ${esAdmin ? "text-[#7B5FCF]" : "text-[#0B4F8A]"}`}>
                {rolLabel}
              </p>
            </div>

            {/* Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-10 h-10 rounded-full bg-[#0B4F8A] flex items-center justify-center hover:bg-[#094170] transition-colors"
              >
                <User className="w-5 h-5 text-white" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-lg py-2 z-50">
                  {/* Nombre en móvil */}
                  <div className="px-4 py-2 border-b border-[#2A2A2A] md:hidden">
                    <p className="text-[#FAFAFA] text-sm font-medium">{nombre} {apellido}</p>
                    <p className={`text-xs font-semibold ${esAdmin ? "text-[#7B5FCF]" : "text-[#0B4F8A]"}`}>
                      {rolLabel}
                    </p>
                  </div>
                  <button
                    onClick={() => { navigate("/perfil"); setIsProfileMenuOpen(false); }}
                    className="w-full px-4 py-2 text-left text-[#FAFAFA] hover:bg-[#2A2A2A] transition-colors flex items-center gap-3"
                  >
                    <User className="w-4 h-4" />
                    Perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-red-500 hover:bg-[#2A2A2A] transition-colors flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
                    Salir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Project Name and Menu Button */}
        <div className="mb-8" ref={menuRef}>
          <h1 className="text-[#FAFAFA] mb-4">{projectName}</h1>
          <div className="inline-block">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              <Menu className="w-5 h-5 text-[#FAFAFA]" />
              <span className="text-[#FAFAFA]">Menú</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex gap-8">
          {/* Menu Sidebar */}
          {isMenuOpen && (
            <div ref={menuRef} className="w-64 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-lg py-2 h-fit flex-shrink-0">
              {menuOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleMenuOption(option)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    option === "Roles"
                      ? "text-[#7B5FCF] hover:bg-[#7B5FCF]/10 font-semibold"
                      : "text-[#FAFAFA] hover:bg-[#2A2A2A]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Modules Grid */}
          <div className={`flex-1 grid gap-6 transition-all ${
            isMenuOpen
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          }`}>
            {modules.map((module) => (
              <div
                key={module.name}
                className={`bg-[#1A1A1A] rounded-2xl shadow-lg border border-[#2A2A2A] flex flex-col items-center justify-center transition-all ${
                  isMenuOpen ? "p-6 min-h-[220px]" : "p-12 min-h-[320px]"
                }`}
              >
                <div
                  className={`rounded-full flex items-center justify-center transition-all ${
                    isMenuOpen ? "w-16 h-16 mb-4" : "w-24 h-24 mb-8"
                  }`}
                  style={{ backgroundColor: module.color }}
                >
                  <span className={`text-white ${isMenuOpen ? "text-2xl" : "text-4xl"}`}>📋</span>
                </div>
                <h3 className={`text-[#FAFAFA] text-center mb-4 ${
                  isMenuOpen ? "text-base" : "text-xl"
                }`}>
                  {module.name}
                </h3>
                <button className="px-6 py-2 rounded-lg bg-[#0B4F8A] text-white hover:bg-[#094170] transition-colors">
                  Ver más
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Volver */}
        <div className="mt-12">
          <button
            onClick={() => navigate("/seleccion-proyecto")}
            className="text-[#FAFAFA] hover:text-[#0B4F8A] transition-colors flex items-center gap-2"
          >
            ← Volver a Proyectos
          </button>
        </div>
      </main>
    </div>
  );
}