import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { apiFetch } from "../api";
import { accionesDelCatalogo } from "../utils/catalogoBloques";
import "../desing/BloquesAccion.css";

export default function BloquesAccion() {
  const [projectId, setProjectId] = useState(() => localStorage.getItem("projectId") || "");
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const [resultado, setResultado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const actualizarProyecto = () => {
      const activo = localStorage.getItem("projectId") || "";
      if (activo !== projectId) {
        setResultado(null);
        setProjectId(activo);
      }
    };
    window.addEventListener("storage", actualizarProyecto);
    window.addEventListener("focus", actualizarProyecto);
    return () => {
      window.removeEventListener("storage", actualizarProyecto);
      window.removeEventListener("focus", actualizarProyecto);
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    const controller = new AbortController();
    const cargar = async () => {
      try {
        const response = await apiFetch(`/proyectos/${encodeURIComponent(projectId)}/catalogo-bloques?tipo=accion`, {
          headers: { "X-Project-Id": projectId },
          signal: controller.signal,
        });
        let data;
        try { data = await response.json(); } catch { data = null; }
        if (!response.ok) {
          throw new Error(typeof data?.detail === "string" ? data.detail : `No se pudieron cargar los bloques (HTTP ${response.status}).`);
        }
        const catalogo = accionesDelCatalogo(data, projectId);
        if (!controller.signal.aborted && localStorage.getItem("projectId") === projectId) {
          setResultado({ projectId, ...catalogo, error: "" });
        }
      } catch (error) {
        if (!controller.signal.aborted && localStorage.getItem("projectId") === projectId) {
          setResultado({ projectId, acciones: [], invalidos: 0, error: error.message || "No se pudieron cargar los bloques." });
        }
      }
    };
    void cargar();
    return () => controller.abort();
  }, [projectId, intento]);

  const actual = resultado?.projectId === projectId ? resultado : null;
  const termino = busqueda.trim().toLocaleLowerCase();
  const visibles = (actual?.acciones || []).filter((bloque) => bloque.texto.toLocaleLowerCase().includes(termino));

  return (
    <div className="acciones-page">
      <div className="acciones-main">
        <p className="acciones-eyebrow"><FileText size={17} aria-hidden="true" /> CATÁLOGO DEL PROYECTO · {projectName}</p>
        <h1>Bloques de acción</h1>
        <p>Consulta las acciones guardadas de este proyecto. Para reutilizarlas, abre un guion en edición y usa «Catálogo de bloques».</p>
        <Link className="acciones-link" to="/guion">Ir a guiones</Link>
        <label className="acciones-search">
          Buscar en acciones
          <input type="search" maxLength={200} value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar contenido" />
        </label>

        {!projectId ? <p role="alert">Selecciona un proyecto para consultar sus bloques.</p> : !actual ? (
          <p role="status">Cargando bloques de acción…</p>
        ) : actual.error ? (
          <div role="alert" className="acciones-notice">
            <p>{actual.error}</p>
            <button type="button" onClick={() => { setResultado(null); setIntento((n) => n + 1); }}>Reintentar</button>
          </div>
        ) : (
          <>
            {actual.invalidos > 0 && <p role="status">Algunos bloques no se pudieron mostrar porque no son válidos para este proyecto.</p>}
            {!visibles.length ? (
              <p>{termino ? "No hay acciones para esta búsqueda." : actual.invalidos ? "No hay bloques de acción válidos para mostrar." : "Aún no hay bloques de acción guardados en este proyecto."}</p>
            ) : (
              <section className="acciones-grid" aria-label="Bloques de acción guardados">
                {visibles.map((bloque) => (
                  <article className="acciones-card" key={bloque.id_catalogo_bloque}>
                    <h2>Acción</h2>
                    <div className="acciones-preview" dangerouslySetInnerHTML={{ __html: bloque.html }} />
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
