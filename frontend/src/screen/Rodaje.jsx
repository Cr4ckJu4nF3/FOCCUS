import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  X,
  Trash2,
  PenLine,
  UploadCloud,
  Sparkles,
  Clock,
  MapPin,
  CheckSquare,
} from "lucide-react";
import { apiFetch, getToken } from "../api";
import API_URL from "../api";
import "../desing/Rodaje.css";

const ESTADOS = ["Pendiente", "Confirmado", "En Rodaje", "Finalizado"];

function normalizarEstado(estado) {
  if (!estado) return "pendiente";
  return estado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
}

const formVacio = {
  dia_dramatico: "",
  semana: "",
  fecha_inicio: "",
  locacion: "",
  llamado: "",
  estado: "Pendiente",
  descripcion: "",
};

export default function RodajeScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const idRol = Number(localStorage.getItem("id_rol")) || 0;
  const esAdmin = idRol === 1001;

  const [vista, setVista] = useState("lista"); // lista | detalle
  const [rodajes, setRodajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [archivoImport, setArchivoImport] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resumenImport, setResumenImport] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(formVacio);

  // detalle de un dia
  const [rodajeActivo, setRodajeActivo] = useState(null);
  const [tabDetalle, setTabDetalle] = useState("escenas"); // escenas | procesos
  const [escenasDisponibles, setEscenasDisponibles] = useState([]);
  const [escenaSeleccionada, setEscenaSeleccionada] = useState("");

  const [procesos, setProcesos] = useState([]);
  const [loadingProcesos, setLoadingProcesos] = useState(false);
  const [showProcesoForm, setShowProcesoForm] = useState(false);
  const [procesoForm, setProcesoForm] = useState({ nombre: "", ubicacion: "", fecha: "", encargado: "", estado: "Pendiente", descripcion: "" });

  const fetchRodajes = async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`/projects/${projectId}/rodajes`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "No se pudo cargar el plan de rodaje");
      setRodajes(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "Error al cargar el plan de rodaje");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRodajes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ---------- Crear desde cero ----------
  const handleCrearDia = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.fecha_inicio) return setError("La fecha del día es obligatoria");

    try {
      const response = await apiFetch("/rodajes", {
        method: "POST",
        body: JSON.stringify({
          id_project: projectId,
          nombre: form.dia_dramatico ? `Día ${form.dia_dramatico}` : "Nuevo día de rodaje",
          descripcion: form.descripcion || null,
          fecha_inicio: form.fecha_inicio,
          dia_dramatico: form.dia_dramatico ? Number(form.dia_dramatico) : null,
          semana: form.semana ? Number(form.semana) : null,
          llamado: form.llamado || null,
          locacion: form.locacion || null,
          estado: form.estado,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo crear el día");

      setSuccess("Día de rodaje creado. Ahora puedes agregarle escenas.");
      setForm(formVacio);
      setShowCreateModal(false);
      await fetchRodajes();
      abrirDetalle(data.data);
    } catch (err) {
      setError(err.message || "No se pudo crear el día");
    }
  };

  // ---------- Subir PDF ----------
  const handleImportarPdf = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResumenImport(null);
    if (!archivoImport) return setError("Selecciona el PDF del plan de rodaje");

    setImportando(true);
    try {
      const formData = new FormData();
      formData.append("archivo", archivoImport);
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/rodajes/importar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.detail || "No se pudo importar el PDF");
      setResumenImport(data.data);
      setSuccess("Plan de rodaje importado correctamente");
      setArchivoImport(null);
      await fetchRodajes();
    } catch (err) {
      setError(err.message || "No se pudo importar el PDF");
    } finally {
      setImportando(false);
    }
  };

  const handleDeleteRodaje = async (idRodaje, evt) => {
    evt.stopPropagation();
    if (!window.confirm("¿Eliminar este día de rodaje?")) return;
    try {
      const response = await apiFetch(`/rodajes/${idRodaje}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo eliminar");
      await fetchRodajes();
    } catch (err) {
      setError(err.message || "No se pudo eliminar el día");
    }
  };

  // ---------- Detalle de un dia ----------
  const abrirDetalle = async (rodaje) => {
    setRodajeActivo(rodaje);
    setTabDetalle("escenas");
    setVista("detalle");
    await fetchEscenasDisponibles();
    await fetchProcesos(rodaje.id_rodaje);
  };

  const volverALista = () => {
    setVista("lista");
    setRodajeActivo(null);
    setProcesos([]);
    fetchRodajes();
  };

  const fetchEscenasDisponibles = async () => {
    try {
      const response = await apiFetch(`/projects/${projectId}/escenas-disponibles`);
      const data = await response.json();
      if (response.ok) setEscenasDisponibles(Array.isArray(data.data) ? data.data : []);
    } catch {
      // silencioso
    }
  };

  const handleAgregarEscena = async () => {
    if (!escenaSeleccionada || !rodajeActivo) return;
    try {
      const response = await apiFetch(`/rodajes/${rodajeActivo.id_rodaje}/escenas/${escenaSeleccionada}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo asignar la escena");
      setRodajeActivo(data.data);
      setEscenaSeleccionada("");
      await fetchEscenasDisponibles();
    } catch (err) {
      setError(err.message || "No se pudo asignar la escena");
    }
  };

  const handleQuitarEscena = async (idEscena) => {
    try {
      const response = await apiFetch(`/rodajes/${rodajeActivo.id_rodaje}/escenas/${idEscena}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo quitar la escena");
      setRodajeActivo((prev) => ({ ...prev, escenas: prev.escenas.filter((e) => e.id_escena !== idEscena) }));
      await fetchEscenasDisponibles();
    } catch (err) {
      setError(err.message || "No se pudo quitar la escena");
    }
  };

  // ---------- Procesos del dia ----------
  const fetchProcesos = async (idRodaje) => {
    setLoadingProcesos(true);
    try {
      const response = await apiFetch(`/rodajes/${idRodaje}/procesos`);
      const data = await response.json();
      if (response.ok) setProcesos(Array.isArray(data.data) ? data.data : []);
    } catch {
      // silencioso
    } finally {
      setLoadingProcesos(false);
    }
  };

  const handleCrearProceso = async (e) => {
    e.preventDefault();
    if (!procesoForm.nombre.trim() || !procesoForm.ubicacion.trim() || !procesoForm.fecha) {
      setError("Nombre, ubicación y fecha del proceso son obligatorios");
      return;
    }
    try {
      const response = await apiFetch(`/rodajes/${rodajeActivo.id_rodaje}/procesos`, {
        method: "POST",
        body: JSON.stringify(procesoForm),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo agregar el proceso");
      setProcesoForm({ nombre: "", ubicacion: "", fecha: "", encargado: "", estado: "Pendiente", descripcion: "" });
      setShowProcesoForm(false);
      await fetchProcesos(rodajeActivo.id_rodaje);
    } catch (err) {
      setError(err.message || "No se pudo agregar el proceso");
    }
  };

  const handleEliminarProceso = async (idProceso) => {
    if (!window.confirm("¿Eliminar este proceso?")) return;
    try {
      const response = await apiFetch(`/rodajes/procesos/${idProceso}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo eliminar");
      setProcesos((prev) => prev.filter((p) => p.id_proceso !== idProceso));
    } catch (err) {
      setError(err.message || "No se pudo eliminar el proceso");
    }
  };

  // Agrupar por semana para la vista principal
  const semanas = {};
  rodajes.forEach((r) => {
    const clave = r.semana ? `Semana ${r.semana}` : "Sin semana asignada";
    if (!semanas[clave]) semanas[clave] = [];
    semanas[clave].push(r);
  });

  return (
    <div className="rdj-page">
      <header className="rdj-header">
        <div className="rdj-header__inner">
          <button type="button" className="rdj-back" onClick={() => navigate("/proyecto-dashboard")}>
            <ArrowLeft size={18} /> Volver
          </button>
          <div className="rdj-header__badge">
            <CalendarDays size={18} />
            {projectName}
          </div>
        </div>
      </header>

      <main className="rdj-main">
        {(error || success) && (
          <div className={`rdj-message ${error ? "rdj-message--error" : "rdj-message--success"}`}>
            {error || success}
          </div>
        )}

        {/* ---------------- LISTA ---------------- */}
        {vista === "lista" && (
          <div className="rdj-panel">
            <div className="rdj-panel__header">
              <div className="rdj-panel__title-row">
                <CalendarDays size={20} />
                <h2>Plan de Rodaje</h2>
                <span>{rodajes.length} días</span>
              </div>
              {esAdmin && (
                <button type="button" className="rdj-button" onClick={() => { setShowChoiceModal(true); setResumenImport(null); }}>
                  <Plus size={16} /> Crear Plan
                </button>
              )}
            </div>

            {loading ? (
              <p className="rdj-empty">Cargando plan de rodaje…</p>
            ) : rodajes.length === 0 ? (
              <p className="rdj-empty">Todavía no hay días de rodaje planificados para este proyecto.</p>
            ) : (
              <div className="rdj-groups">
                {Object.entries(semanas).map(([semana, lista]) => (
                  <div key={semana} className="rdj-group">
                    <div className="rdj-group__title">{semana}</div>
                    {lista.map((r) => (
                      <div key={r.id_rodaje} className="rdj-day-card" onClick={() => abrirDetalle(r)}>
                        <div className="rdj-day-card__head">
                          <strong>{r.nombre}</strong>
                          <span className={`rdj-badge rdj-badge--${normalizarEstado(r.estado)}`}>{r.estado || "Pendiente"}</span>
                        </div>
                        <div className="rdj-day-card__meta">
                          <span>{r.fecha_inicio}</span>
                          {r.locacion && <span><MapPin size={13} /> {r.locacion}</span>}
                          {r.llamado && <span><Clock size={13} /> Llamado {r.llamado}</span>}
                        </div>
                        <div className="rdj-day-card__escenas">
                          {r.escenas.length === 0 ? (
                            <span className="rdj-chip rdj-chip--empty">Sin escenas asignadas</span>
                          ) : (
                            r.escenas.map((e) => (
                              <span key={e.id_escena} className="rdj-chip">#{e.numero_de_escena} {e.encabezado}</span>
                            ))
                          )}
                        </div>
                        {esAdmin && (
                          <div className="rdj-day-card__actions">
                            <button type="button" onClick={(evt) => { evt.stopPropagation(); abrirDetalle(r); }} title="Editar"><PenLine size={15} /></button>
                            <button type="button" onClick={(evt) => handleDeleteRodaje(r.id_rodaje, evt)} title="Eliminar"><Trash2 size={15} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- DETALLE ---------------- */}
        {vista === "detalle" && rodajeActivo && (
          <div className="rdj-panel">
            <div className="rdj-panel__header">
              <div className="rdj-panel__title-row">
                <CalendarDays size={20} />
                <div>
                  <h2 style={{ margin: 0 }}>{rodajeActivo.nombre}</h2>
                  <span>{rodajeActivo.fecha_inicio} {rodajeActivo.locacion ? `· ${rodajeActivo.locacion}` : ""} {rodajeActivo.llamado ? `· Llamado ${rodajeActivo.llamado}` : ""}</span>
                </div>
              </div>
              <button type="button" className="rdj-back" onClick={volverALista}><ArrowLeft size={16} /> Plan de Rodaje</button>
            </div>

            <div className="rdj-tabs">
              <button type="button" className={`rdj-tabs__tab ${tabDetalle === "escenas" ? "rdj-tabs__tab--active" : ""}`} onClick={() => setTabDetalle("escenas")}>
                Escenas ({rodajeActivo.escenas.length})
              </button>
              <button type="button" className={`rdj-tabs__tab ${tabDetalle === "procesos" ? "rdj-tabs__tab--active" : ""}`} onClick={() => setTabDetalle("procesos")}>
                Procesos ({procesos.length})
              </button>
            </div>

            {tabDetalle === "escenas" && (
              <div className="rdj-detalle-body">
                {esAdmin && (
                  <div className="rdj-add-escena">
                    <select value={escenaSeleccionada} onChange={(e) => setEscenaSeleccionada(e.target.value)}>
                      <option value="">Selecciona una escena para agregar…</option>
                      {escenasDisponibles.map((e) => (
                        <option key={e.id_escena} value={e.id_escena}>#{e.numero_de_escena} — {e.encabezado}</option>
                      ))}
                    </select>
                    <button type="button" className="rdj-button" disabled={!escenaSeleccionada} onClick={handleAgregarEscena}>
                      <Plus size={15} /> Agregar
                    </button>
                  </div>
                )}

                {rodajeActivo.escenas.length === 0 ? (
                  <p className="rdj-empty">Este día todavía no tiene escenas asignadas.</p>
                ) : (
                  <div className="rdj-scene-list">
                    {rodajeActivo.escenas.map((e) => (
                      <div key={e.id_escena} className="rdj-scene-row">
                        <span className="rdj-scene-row__numero">#{e.numero_de_escena}</span>
                        <strong>{e.encabezado}</strong>
                        {e.momento_dia && <span className="rdj-scene-row__momento">{e.momento_dia}</span>}
                        {esAdmin && (
                          <button type="button" className="rdj-scene-row__remove" onClick={() => handleQuitarEscena(e.id_escena)} title="Quitar de este día">
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tabDetalle === "procesos" && (
              <div className="rdj-detalle-body">
                {esAdmin && !showProcesoForm && (
                  <button type="button" className="rdj-button" onClick={() => setShowProcesoForm(true)}>
                    <Plus size={15} /> Agregar proceso
                  </button>
                )}

                {esAdmin && showProcesoForm && (
                  <form className="rdj-form" onSubmit={handleCrearProceso}>
                    <div className="rdj-grid">
                      <label>Nombre<input value={procesoForm.nombre} onChange={(e) => setProcesoForm({ ...procesoForm, nombre: e.target.value })} placeholder="Ej. Carga de equipamiento" /></label>
                      <label>Ubicación<input value={procesoForm.ubicacion} onChange={(e) => setProcesoForm({ ...procesoForm, ubicacion: e.target.value })} placeholder="Set 2 - estudio central" /></label>
                    </div>
                    <div className="rdj-grid">
                      <label>Fecha<input type="date" value={procesoForm.fecha} onChange={(e) => setProcesoForm({ ...procesoForm, fecha: e.target.value })} /></label>
                      <label>Encargado<input value={procesoForm.encargado} onChange={(e) => setProcesoForm({ ...procesoForm, encargado: e.target.value })} /></label>
                    </div>
                    <label>Descripción<textarea rows={2} value={procesoForm.descripcion} onChange={(e) => setProcesoForm({ ...procesoForm, descripcion: e.target.value })} /></label>
                    <div className="rdj-form__actions">
                      <button type="button" className="rdj-button rdj-button--ghost" onClick={() => setShowProcesoForm(false)}>Cancelar</button>
                      <button type="submit" className="rdj-button"><Plus size={15} /> Agregar</button>
                    </div>
                  </form>
                )}

                {loadingProcesos ? (
                  <p className="rdj-empty">Cargando procesos…</p>
                ) : procesos.length === 0 ? (
                  <p className="rdj-empty">Este día todavía no tiene procesos cargados.</p>
                ) : (
                  <div className="rdj-scene-list">
                    {procesos.map((p) => (
                      <div key={p.id_proceso} className="rdj-scene-row">
                        <CheckSquare size={15} />
                        <strong>{p.nombre}</strong>
                        <span className="rdj-scene-row__momento">{p.ubicacion} · {p.fecha}</span>
                        {esAdmin && (
                          <button type="button" className="rdj-scene-row__remove" onClick={() => handleEliminarProceso(p.id_proceso)}>
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---------------- MODAL: elegir tipo de creación ---------------- */}
      {showChoiceModal && (
        <div className="rdj-modal-overlay" onClick={() => setShowChoiceModal(false)}>
          <div className="rdj-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rdj-modal__header">
              <h3>Crear plan de rodaje</h3>
              <button className="rdj-modal__close" type="button" onClick={() => setShowChoiceModal(false)}><X size={18} /></button>
            </div>
            <p className="rdj-modal__subtitle">¿Cómo quieres construir el cronograma?</p>
            <div className="rdj-choice-grid">
              <button type="button" className="rdj-choice-card" onClick={() => { setShowChoiceModal(false); setShowUploadModal(true); }}>
                <UploadCloud size={26} />
                <strong>Subir PDF</strong>
                <span>Importa un plan de rodaje ya exportado</span>
              </button>
              <button type="button" className="rdj-choice-card" onClick={() => { setShowChoiceModal(false); setForm(formVacio); setShowCreateModal(true); }}>
                <Sparkles size={26} />
                <strong>Crear desde cero</strong>
                <span>Arma el cronograma día por día en el sistema</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: subir PDF ---------------- */}
      {showUploadModal && (
        <div className="rdj-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="rdj-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rdj-modal__header">
              <h3><UploadCloud size={18} /> Subir plan de rodaje</h3>
              <button className="rdj-modal__close" type="button" onClick={() => setShowUploadModal(false)}><X size={18} /></button>
            </div>
            {resumenImport && (
              <div className="rdj-message rdj-message--success">
                {resumenImport.dias_creados} días creados, {resumenImport.dias_actualizados} actualizados,{" "}
                {resumenImport.escenas_asignadas} escenas asignadas de {resumenImport.total_dias_en_pdf} días detectados.
              </div>
            )}
            <form className="rdj-form" onSubmit={handleImportarPdf}>
              <label>Archivo PDF<input type="file" accept="application/pdf" onChange={(e) => setArchivoImport(e.target.files?.[0] || null)} /></label>
              <div className="rdj-form__actions">
                <button type="button" className="rdj-button rdj-button--ghost" onClick={() => setShowUploadModal(false)}>Cerrar</button>
                <button type="submit" className="rdj-button" disabled={importando}>
                  <UploadCloud size={15} /> {importando ? "Importando…" : "Importar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: crear desde cero ---------------- */}
      {showCreateModal && (
        <div className="rdj-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="rdj-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rdj-modal__header">
              <h3><Sparkles size={18} /> Nuevo día de rodaje</h3>
              <button className="rdj-modal__close" type="button" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <p className="rdj-modal__subtitle">Crea el día en blanco; después le agregas las escenas desde su detalle.</p>
            <form className="rdj-form" onSubmit={handleCrearDia}>
              <div className="rdj-grid">
                <label>Día dramático<input type="number" value={form.dia_dramatico} onChange={(e) => setForm({ ...form, dia_dramatico: e.target.value })} placeholder="1" /></label>
                <label>Semana<input type="number" value={form.semana} onChange={(e) => setForm({ ...form, semana: e.target.value })} placeholder="1" /></label>
              </div>
              <div className="rdj-grid">
                <label>Fecha<input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} required /></label>
                <label>Llamado<input type="text" value={form.llamado} onChange={(e) => setForm({ ...form, llamado: e.target.value })} placeholder="5:30 AM" /></label>
              </div>
              <label>Locación general<input type="text" value={form.locacion} onChange={(e) => setForm({ ...form, locacion: e.target.value })} placeholder="Valle del Cauca" /></label>
              <label>Estado
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map((es) => (<option key={es} value={es}>{es}</option>))}
                </select>
              </label>
              <label>Notas<textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label>
              <button type="submit" className="rdj-button"><Plus size={16} /> Crear día</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
