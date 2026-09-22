import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  X,
  Trash2,
  Filter,
  UploadCloud,
  CalendarDays,
  Link2Off,
} from "lucide-react";
import { apiFetch, getToken } from "../api";
import API_URL from "../api";
import "../desing/Desglose.css";

const MOMENTOS = ["Todos", "Día", "Noche", "Amanecer", "Atardecer"];

const DEPARTAMENTOS = [
  "Elenco",
  "Extras / BG",
  "Bits",
  "Props",
  "Vestuario",
  "Maquillaje y Pelo",
  "Maquillaje FX",
  "Arte",
  "Cámara",
  "Sonido",
  "SFX",
  "VFX",
  "Stunts",
  "Vehículos",
  "Animales",
  "Armas",
  "Crew Adicional",
  "Notas",
];

const colorDepartamento = (dep) => {
  const paleta = {
    "Elenco": "#0B4F8A",
    "Extras / BG": "#64748b",
    "Bits": "#94a3b8",
    "Props": "#E67E5C",
    "Vestuario": "#7B5FCF",
    "Maquillaje y Pelo": "#d946ef",
    "Maquillaje FX": "#c026d3",
    "Arte": "#f59e0b",
    "Cámara": "#22c55e",
    "Sonido": "#06b6d4",
    "SFX": "#ef4444",
    "VFX": "#8b5cf6",
    "Stunts": "#f97316",
    "Vehículos": "#0ea5e9",
    "Animales": "#84cc16",
    "Armas": "#dc2626",
    "Crew Adicional": "#6b7280",
    "Notas": "#a8a29e",
  };
  return paleta[dep] || "#6b7280";
};

export default function DesgloseScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const idRol = Number(localStorage.getItem("id_rol")) || 0;
  const esAdmin = idRol === 1001;

  const [guiones, setGuiones] = useState([]);
  const [selectedGuionId, setSelectedGuionId] = useState("");
  const [escenas, setEscenas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filtroMomento, setFiltroMomento] = useState("Todos");

  // panel de detalle (requerimientos de una escena)
  const [escenaActiva, setEscenaActiva] = useState(null);
  const [requerimientos, setRequerimientos] = useState([]);
  const [loadingRequerimientos, setLoadingRequerimientos] = useState(false);
  const [rodajeAsignado, setRodajeAsignado] = useState(null);

  // dias de rodaje del proyecto (para poder asignar la escena a uno)
  const [diasRodaje, setDiasRodaje] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ departamento: DEPARTAMENTOS[0], etiqueta: "", cantidad: 1, notas: "" });

  // Importar desglose desde PDF
  const [showImportModal, setShowImportModal] = useState(false);
  const [archivoImport, setArchivoImport] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resumenImport, setResumenImport] = useState(null);

  const fetchGuiones = async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`/guiones?id_project=${projectId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "No se pudieron cargar los guiones");
      const items = Array.isArray(data.data) ? data.data : [];
      setGuiones(items);
      if (items.length > 0) {
        const nextId = String(items[0].id_guion);
        setSelectedGuionId(nextId);
        await fetchDesglose(nextId);
      }
    } catch (err) {
      setError(err.message || "Error al cargar guiones");
    } finally {
      setLoading(false);
    }
  };

  const fetchDesglose = async (idGuion) => {
    if (!idGuion) {
      setEscenas([]);
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch(`/guiones/${idGuion}/desglose`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "No se pudo cargar el desglose");
      setEscenas(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "Error al cargar el desglose");
    } finally {
      setLoading(false);
    }
  };

  const fetchDiasRodaje = async () => {
    if (!projectId) return;
    try {
      const response = await apiFetch(`/projects/${projectId}/rodajes`);
      const data = await response.json();
      if (response.ok) setDiasRodaje(Array.isArray(data.data) ? data.data : []);
    } catch {
      // silencioso: no bloquea el resto de la pantalla
    }
  };

  useEffect(() => {
    fetchGuiones();
    fetchDiasRodaje();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const abrirDetalle = async (escena) => {
    setEscenaActiva(escena);
    setDiaSeleccionado("");
    setLoadingRequerimientos(true);
    try {
      const response = await apiFetch(`/escenas/${escena.id_escena}/desglose`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "No se pudo cargar el desglose de la escena");
      setRequerimientos(data.data?.requerimientos || []);
      setRodajeAsignado(data.data?.rodaje || null);
    } catch (err) {
      setError(err.message || "Error al cargar la escena");
    } finally {
      setLoadingRequerimientos(false);
    }
  };

  const cerrarDetalle = () => {
    setEscenaActiva(null);
    setRequerimientos([]);
    setRodajeAsignado(null);
    setShowForm(false);
    fetchDesglose(selectedGuionId);
  };

  const handleAsignarDia = async () => {
    if (!diaSeleccionado || !escenaActiva) return;
    try {
      const response = await apiFetch(`/rodajes/${diaSeleccionado}/escenas/${escenaActiva.id_escena}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo asignar el día de rodaje");
      const dia = diasRodaje.find((d) => d.id_rodaje === diaSeleccionado);
      setRodajeAsignado(dia ? { id_rodaje: dia.id_rodaje, nombre: dia.nombre, fecha_inicio: dia.fecha_inicio, llamado: dia.llamado, estado: dia.estado } : null);
      setDiaSeleccionado("");
      setSuccess("Escena asignada al día de rodaje");
    } catch (err) {
      setError(err.message || "No se pudo asignar el día de rodaje");
    }
  };

  const handleQuitarDia = async () => {
    if (!rodajeAsignado || !escenaActiva) return;
    try {
      const response = await apiFetch(`/rodajes/${rodajeAsignado.id_rodaje}/escenas/${escenaActiva.id_escena}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo quitar la escena del día");
      setRodajeAsignado(null);
    } catch (err) {
      setError(err.message || "No se pudo quitar la escena del día");
    }
  };

  const handleAgregarRequerimiento = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.departamento) return setError("Selecciona un departamento");

    try {
      const response = await apiFetch(`/escenas/${escenaActiva.id_escena}/desglose/requerimientos`, {
        method: "POST",
        body: JSON.stringify({
          departamento: form.departamento,
          etiqueta: form.etiqueta || null,
          cantidad: Number(form.cantidad) || 1,
          notas: form.notas || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo agregar el requerimiento");
      setRequerimientos((prev) => [...prev, data.data]);
      setForm({ departamento: DEPARTAMENTOS[0], etiqueta: "", cantidad: 1, notas: "" });
      setShowForm(false);
      setSuccess("Requerimiento agregado");
    } catch (err) {
      setError(err.message || "No se pudo agregar el requerimiento");
    }
  };

  const handleEliminarRequerimiento = async (idRequerimiento) => {
    if (!window.confirm("¿Eliminar este requerimiento?")) return;
    try {
      const response = await apiFetch(`/desglose/requerimientos/${idRequerimiento}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || data.message || "No se pudo eliminar");
      setRequerimientos((prev) => prev.filter((r) => r.id_requerimiento !== idRequerimiento));
    } catch (err) {
      setError(err.message || "No se pudo eliminar el requerimiento");
    }
  };

  const handleImportarPdf = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResumenImport(null);

    if (!selectedGuionId) return setError("Selecciona un guion primero");
    if (!archivoImport) return setError("Selecciona el PDF de desglose a importar");

    setImportando(true);
    try {
      const formData = new FormData();
      formData.append("archivo", archivoImport);
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/${selectedGuionId}/desglose/importar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.detail || "No se pudo importar el PDF");
      }
      setResumenImport(data.data);
      setSuccess("Desglose importado correctamente");
      setArchivoImport(null);
      await fetchDesglose(selectedGuionId);
    } catch (err) {
      setError(err.message || "No se pudo importar el PDF");
    } finally {
      setImportando(false);
    }
  };

  // Agrupar escenas por dia dramatico (equivalente al "Día X" de Raccord)
  const escenasFiltradas = escenas.filter((e) => filtroMomento === "Todos" || e.momento_dia === filtroMomento);
  const grupos = {};
  escenasFiltradas.forEach((e) => {
    const clave = e.dia_dramatico ? `Día ${e.dia_dramatico}` : "Sin día asignado";
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(e);
  });

  return (
    <div className="dsg-page">
      <header className="dsg-header">
        <div className="dsg-header__inner">
          <button type="button" className="dsg-back" onClick={() => navigate("/proyecto-dashboard")}>
            <ArrowLeft size={18} /> Volver
          </button>
          <div className="dsg-header__badge">
            <ClipboardList size={18} />
            {projectName}
          </div>
        </div>
      </header>

      <main className="dsg-main">
        {(error || success) && (
          <div className={`dsg-message ${error ? "dsg-message--error" : "dsg-message--success"}`}>
            {error || success}
          </div>
        )}

        <div className="dsg-panel">
          <div className="dsg-panel__header">
            <div className="dsg-panel__title-row">
              <ClipboardList size={20} />
              <div>
                <h2>Desglose de Producción</h2>
                <span>Haz clic en una escena para ver y editar sus requerimientos por departamento.</span>
              </div>
            </div>
            <label className="dsg-guion-select">
              Guion
              <select
                value={selectedGuionId}
                onChange={(e) => { setSelectedGuionId(e.target.value); fetchDesglose(e.target.value); }}
              >
                {!selectedGuionId && <option value="">Selecciona un guion</option>}
                {guiones.map((g) => (<option key={g.id_guion} value={g.id_guion}>{g.nombre}</option>))}
              </select>
            </label>
            {esAdmin && (
              <button type="button" className="dsg-button dsg-button--ghost" onClick={() => { setShowImportModal(true); setResumenImport(null); }}>
                <UploadCloud size={16} /> Importar PDF
              </button>
            )}
          </div>

          <div className="dsg-filtros">
            <Filter size={14} />
            {MOMENTOS.map((m) => (
              <button
                key={m}
                type="button"
                className={`dsg-filtro-chip ${filtroMomento === m ? "dsg-filtro-chip--active" : ""}`}
                onClick={() => setFiltroMomento(m)}
              >
                {m}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="dsg-empty">Cargando desglose…</p>
          ) : escenasFiltradas.length === 0 ? (
            <p className="dsg-empty">No hay escenas para mostrar con este filtro.</p>
          ) : (
            <div className="dsg-groups">
              {Object.entries(grupos).map(([dia, lista]) => (
                <div key={dia} className="dsg-group">
                  <div className="dsg-group__title">{dia}<span>{lista.length} escenas</span></div>
                  {lista.map((escena) => (
                    <div key={escena.id_escena} className="dsg-scene-row" onClick={() => abrirDetalle(escena)}>
                      <div className="dsg-scene-row__head">
                        <span className="dsg-scene-row__numero">#{escena.numero_de_escena}</span>
                        <strong>{escena.encabezado}</strong>
                        {escena.momento_dia && <span className="dsg-scene-row__momento">{escena.momento_dia}</span>}
                      </div>
                      <div className="dsg-scene-row__rodaje">
                        {escena.rodaje ? (
                          <span className="dsg-rodaje-tag">
                            <CalendarDays size={12} /> {escena.rodaje.nombre} · {escena.rodaje.fecha_inicio}
                          </span>
                        ) : (
                          <span className="dsg-rodaje-tag dsg-rodaje-tag--sin-asignar">
                            <CalendarDays size={12} /> Sin día de rodaje
                          </span>
                        )}
                      </div>
                      <div className="dsg-scene-row__tags">
                        {escena.resumen_departamentos.length === 0 ? (
                          <span className="dsg-tag dsg-tag--empty">Sin requerimientos</span>
                        ) : (
                          escena.resumen_departamentos.map((r) => (
                            <span key={r.departamento} className="dsg-tag" style={{ backgroundColor: `${colorDepartamento(r.departamento)}22`, color: colorDepartamento(r.departamento), borderColor: `${colorDepartamento(r.departamento)}55` }}>
                              {r.departamento} ({r.cantidad})
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ---------------- PANEL DE DETALLE DE UNA ESCENA ---------------- */}
      {escenaActiva && (
        <div className="dsg-modal-overlay" onClick={cerrarDetalle}>
          <div className="dsg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dsg-modal__header">
              <h3>Escena #{escenaActiva.numero_de_escena} — {escenaActiva.encabezado}</h3>
              <button className="dsg-modal__close" type="button" onClick={cerrarDetalle}><X size={18} /></button>
            </div>

            <div className="dsg-rodaje-block">
              <div className="dsg-rodaje-block__label"><CalendarDays size={14} /> Día de rodaje</div>
              {rodajeAsignado ? (
                <div className="dsg-rodaje-block__current">
                  <span>{rodajeAsignado.nombre} · {rodajeAsignado.fecha_inicio} {rodajeAsignado.llamado ? `· Llamado ${rodajeAsignado.llamado}` : ""}</span>
                  {esAdmin && (
                    <button type="button" className="dsg-rodaje-block__quitar" onClick={handleQuitarDia} title="Quitar de este día">
                      <Link2Off size={14} /> Quitar
                    </button>
                  )}
                </div>
              ) : esAdmin ? (
                <div className="dsg-rodaje-block__assign">
                  <select value={diaSeleccionado} onChange={(e) => setDiaSeleccionado(e.target.value)}>
                    <option value="">Selecciona un día del plan de rodaje…</option>
                    {diasRodaje.map((d) => (
                      <option key={d.id_rodaje} value={d.id_rodaje}>{d.nombre} · {d.fecha_inicio}</option>
                    ))}
                  </select>
                  <button type="button" className="dsg-button dsg-button--ghost" disabled={!diaSeleccionado} onClick={handleAsignarDia}>
                    Asignar
                  </button>
                </div>
              ) : (
                <span className="dsg-empty" style={{ padding: 0 }}>Sin día de rodaje asignado.</span>
              )}
            </div>

            {loadingRequerimientos ? (
              <p className="dsg-empty">Cargando requerimientos…</p>
            ) : (
              <div className="dsg-req-list">
                {requerimientos.length === 0 && <p className="dsg-empty">Esta escena todavía no tiene requerimientos.</p>}
                {requerimientos.map((r) => (
                  <div key={r.id_requerimiento} className="dsg-req-item">
                    <span className="dsg-tag" style={{ backgroundColor: `${colorDepartamento(r.departamento)}22`, color: colorDepartamento(r.departamento), borderColor: `${colorDepartamento(r.departamento)}55` }}>
                      {r.departamento} ({r.cantidad})
                    </span>
                    <div className="dsg-req-item__body">
                      {r.etiqueta && <strong>{r.etiqueta}</strong>}
                      {r.notas && <p>{r.notas}</p>}
                    </div>
                    {esAdmin && (
                      <button type="button" className="dsg-req-item__delete" onClick={() => handleEliminarRequerimiento(r.id_requerimiento)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {esAdmin && !showForm && (
              <button type="button" className="dsg-button" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Agregar requerimiento
              </button>
            )}

            {esAdmin && showForm && (
              <form className="dsg-form" onSubmit={handleAgregarRequerimiento}>
                <div className="dsg-grid">
                  <label>
                    Departamento
                    <select value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })}>
                      {DEPARTAMENTOS.map((d) => (<option key={d} value={d}>{d}</option>))}
                    </select>
                  </label>
                  <label>
                    Cantidad
                    <input type="number" min={1} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
                  </label>
                </div>
                <label>
                  Detalle
                  <input type="text" value={form.etiqueta} onChange={(e) => setForm({ ...form, etiqueta: e.target.value })} placeholder="Ej. Copas de cristal" />
                </label>
                <label>
                  Notas
                  <textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
                </label>
                <div className="dsg-form__actions">
                  <button type="button" className="dsg-button dsg-button--ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                  <button type="submit" className="dsg-button"><Plus size={15} /> Agregar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ---------------- MODAL: importar desglose desde PDF ---------------- */}
      {showImportModal && (
        <div className="dsg-modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="dsg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dsg-modal__header">
              <h3><UploadCloud size={18} /> Importar desglose desde PDF</h3>
              <button className="dsg-modal__close" type="button" onClick={() => setShowImportModal(false)}><X size={18} /></button>
            </div>

            <p style={{ color: "#9ca3af", fontSize: "0.82rem", marginTop: 0 }}>
              Sube un PDF de desglose de producción (formato "Semana &gt; Día &gt; Escena" con requerimientos por
              departamento). Se crearán o actualizarán automáticamente las escenas de <strong>{guiones.find(g => String(g.id_guion) === String(selectedGuionId))?.nombre || "este guion"}</strong> y sus requerimientos.
            </p>

            {resumenImport ? (
              <div className="dsg-message dsg-message--success" style={{ marginBottom: "1rem" }}>
                {resumenImport.escenas_creadas} escenas creadas, {resumenImport.escenas_actualizadas} actualizadas,{" "}
                {resumenImport.requerimientos_creados} requerimientos importados de {resumenImport.total_escenas_en_pdf} escenas detectadas.
              </div>
            ) : null}

            <form className="dsg-form" onSubmit={handleImportarPdf}>
              <label>
                Archivo PDF
                <input type="file" accept="application/pdf" onChange={(e) => setArchivoImport(e.target.files?.[0] || null)} />
              </label>
              <div className="dsg-form__actions">
                <button type="button" className="dsg-button dsg-button--ghost" onClick={() => setShowImportModal(false)}>Cerrar</button>
                <button type="submit" className="dsg-button" disabled={importando}>
                  <UploadCloud size={15} /> {importando ? "Importando…" : "Importar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
