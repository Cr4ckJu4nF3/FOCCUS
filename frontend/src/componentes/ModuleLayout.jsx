import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import {
  CalendarDays,
  Camera,
  ClipboardList,
  FileText,
  Film,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Search,
  Users,
  X,
} from "lucide-react";
import { getActiveRole } from "../api";
import "../desing/ModuleLayout.css";

const enlacesBase = [
  { to: "/guion", label: "Guiones", Icon: FileText },
  { to: "/escenas", label: "Escenas", Icon: Film },
  { to: "/rodaje", label: "Plan de rodaje", Icon: CalendarDays },
  { to: "/desglose", label: "Desglose", Icon: ClipboardList },
  { to: "/galeria", label: "Galería", Icon: Camera },
];

export default function ModuleLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const botonMenuRef = useRef(null);
  const navegacionRef = useRef(null);
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const projectId = localStorage.getItem("projectId") || "";
  const esAdmin = getActiveRole() === 1001;
  const rutaPanel = esAdmin ? "/admin-dashboard" : "/proyecto-dashboard";
  const enlaces = [
    ...enlacesBase,
    ...(esAdmin ? [
      { to: "/roles", label: "Equipo y roles", Icon: Users },
      { to: "/buscar-codigo", label: "Buscar código", Icon: Search },
    ] : []),
  ];

  const cerrarMenu = () => {
    setMenuAbierto(false);
    if (menuAbierto) botonMenuRef.current?.focus();
  };

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const cerrarConEscape = (event) => {
      if (event.key === "Escape") {
        setMenuAbierto(false);
        botonMenuRef.current?.focus();
      }
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [menuAbierto]);

  useEffect(() => {
    if (menuAbierto) {
      navegacionRef.current?.querySelector("a")?.focus();
    }
  }, [menuAbierto]);

  if (!projectId) {
    return <Navigate to={esAdmin ? "/admin-dashboard" : "/seleccion-proyecto"} replace />;
  }

  return (
    <div className="module-layout">
      <header className="module-layout__mobile-header">
        <span className="module-layout__mobile-project">{projectName}</span>
        <button
          type="button"
          className="module-layout__toggle"
          aria-controls="module-primary-navigation"
          aria-expanded={menuAbierto}
          aria-label={menuAbierto ? "Cerrar navegación" : "Abrir navegación"}
          ref={botonMenuRef}
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          {menuAbierto ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <aside className={`module-layout__sidebar ${menuAbierto ? "is-open" : ""}`}>
        <div className="module-layout__brand">
          <strong>FOCCUS</strong>
          <span title={projectName}>{projectName}</span>
        </div>
        <nav
          id="module-primary-navigation"
          ref={navegacionRef}
          className="module-layout__navigation"
          aria-label="Navegación principal del proyecto"
        >
          {enlaces.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              state={{ projectName, projectId }}
              className={({ isActive }) => `module-layout__link${isActive ? " is-active" : ""}`}
              onClick={cerrarMenu}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <nav className="module-layout__secondary-navigation" aria-label="Panel y proyectos">
          <NavLink
            to={rutaPanel}
            state={{ projectName, projectId }}
            className={({ isActive }) => `module-layout__link${isActive ? " is-active" : ""}`}
            onClick={cerrarMenu}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            <span>{esAdmin ? "Panel de administración" : "Panel del proyecto"}</span>
          </NavLink>
          {!esAdmin && (
            <NavLink
              to="/seleccion-proyecto"
              className={({ isActive }) => `module-layout__link${isActive ? " is-active" : ""}`}
              onClick={cerrarMenu}
            >
              <FolderOpen size={18} aria-hidden="true" />
              <span>Cambiar de proyecto</span>
            </NavLink>
          )}
        </nav>
      </aside>

      {menuAbierto && (
        <button
          type="button"
          className="module-layout__scrim"
          aria-label="Cerrar navegación"
          onClick={cerrarMenu}
        />
      )}
      <main className="module-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
