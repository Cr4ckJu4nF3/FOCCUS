import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, Camera, ClipboardList, FileText, Film, LayoutDashboard, Search, Users } from "lucide-react";
import logo from "../assets/FoccusNB_White.png";
import { apiFetch, getActiveRole } from "../api";
import CodigoChip from "../componentes/CodigoChip";
import EstadoVista from "../componentes/EstadoVista";
import "../desing/AdminDashboard.css";
import "../desing/Codigo.css";

// Módulo "Buscar código": solo admin del proyecto (el backend también lo valida).
export default function BuscarCodigo() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const esAdmin = getActiveRole() === 1001;

  const [texto, setTexto] = useState("");
  const [consulta, setConsulta] = useState("");
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState("idle"); // idle | cargando | ok | error
  const [mensaje, setMensaje] = useState("");
  const [resultados, setResultados] = useState([]);

  // Espera 300 ms tras dejar de escribir antes de consultar.
  useEffect(() => {
    const t = setTimeout(() => setConsulta(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    if (!projectId || consulta.length < 2) return undefined;
    let cancelado = false;
    (async () => {
      setEstado("cargando");
      try {
        const resp = await apiFetch(`/projects/${encodeURIComponent(projectId)}/buscar-codigo?q=${encodeURIComponent(consulta)}`);
        const body = await resp.json().catch(() => ({}));
        if (cancelado) return;
        if (!resp.ok || body.success === false) {
          setMensaje(body.message || body.detail || "No se pudo buscar");
          setResultados([]);
          setEstado("error");
          return;
        }
        setResultados(Array.isArray(body.data) ? body.data : []);
        setEstado("ok");
      } catch {
        if (!cancelado) {
          setMensaje("No se pudo conectar con el servidor");
          setEstado("error");
        }
      }
    })();
    return () => { cancelado = true; };
  }, [consulta, projectId, intento]);

  if (!esAdmin) return <Navigate to="/proyecto-dashboard" replace />;

  const ir = (ruta) => navigate(ruta, { state: { projectName, projectId } });
  const corta = consulta.length < 2;

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <button type="button" onClick={() => ir("/admin-dashboard")} className="admin-brand" aria-label="Volver al panel">
          <img src={logo} alt="FOCCUS" />
        </button>
        <p className="admin-sidebar__label">Panel de control</p>
        <nav className="admin-navigation" aria-label="Navegación administrativa">
          <button className="admin-navigation__item" type="button" onClick={() => ir("/admin-dashboard")}>
            <LayoutDashboard size={18} /> Resumen general
          </button>
          <button className="admin-navigation__item" type="button" onClick={() => ir("/guion")}><FileText size={18} /> Guiones</button>
          <button className="admin-navigation__item" type="button" onClick={() => ir("/escenas")}><Film size={18} /> Escenas</button>
          <button className="admin-navigation__item" type="button" onClick={() => ir("/rodaje")}><CalendarDays size={18} /> Plan de rodaje</button>
          <button className="admin-navigation__item" type="button" onClick={() => ir("/desglose")}><ClipboardList size={18} /> Desglose</button>
          <button className="admin-navigation__item" type="button" onClick={() => ir("/galeria")}><Camera size={18} /> Galería</button>
          <button className="admin-navigation__item" type="button" onClick={() => ir("/roles")}><Users size={18} /> Equipo y roles</button>
          <button className="admin-navigation__item admin-navigation__item--active" type="button" aria-current="page">
            <Search size={18} /> Buscar código
          </button>
        </nav>
      </aside>

      <div className="admin-dashboard__workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__context">
            <span>{projectName}</span>
            <span>/</span>
            <strong>Buscar código</strong>
          </div>
          <button type="button" className="buscador-page__enlace" onClick={() => ir("/admin-dashboard")}>
            <ArrowLeft size={14} /> Volver al panel
          </button>
        </header>

        <main className="buscador-page__cuerpo">
          <h1>Buscar por código</h1>
          <p className="buscador-page__ayuda">
            Escribe un código (ej. <code>ESC-014</code>, <code>GUI-001</code>, <code>PER-003</code>) o su prefijo
            para abrir la ficha en su módulo.
          </p>
          {!projectId ? (
            <EstadoVista tipo="vacio" mensaje="Selecciona un proyecto para buscar códigos." accionTexto="Elegir proyecto" onAccion={() => navigate("/seleccion-proyecto")} />
          ) : (
            <>
              <form className="buscador-page__form" role="search" onSubmit={(e) => { e.preventDefault(); setConsulta(texto.trim()); }}>
                <input
                  type="search"
                  className="buscador-page__input"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Buscar código (ej. ESC-014)"
                  aria-label="Buscar por código FOCCUS"
                  autoFocus
                />
              </form>
              {corta && <EstadoVista tipo="vacio" mensaje="Escribe al menos 2 caracteres para buscar." />}
              {!corta && estado === "cargando" && <EstadoVista tipo="cargando" mensaje="Buscando…" />}
              {!corta && estado === "error" && (
                <EstadoVista tipo="error" mensaje={mensaje} accionTexto="Reintentar" onAccion={() => setIntento((n) => n + 1)} />
              )}
              {!corta && estado === "ok" && resultados.length === 0 && (
                <EstadoVista tipo="vacio" mensaje={`Sin resultados para «${consulta}».`} />
              )}
              {!corta && estado === "ok" && resultados.length > 0 && (
                <ul className="buscador-page__lista" aria-label="Resultados de la búsqueda">
                  {resultados.map((r) => (
                    <li key={`${r.tipo}-${r.codigo}`} className="buscador-page__fila">
                      <span className="buscador-page__tipo">{String(r.tipo || "").replace(/_/g, " ")}</span>
                      <CodigoChip codigo={r.codigo} />
                      <strong>{r.nombre}</strong>
                      <button type="button" className="buscador-page__enlace" onClick={() => r.destino && ir(r.destino)}>
                        Abrir ficha
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
