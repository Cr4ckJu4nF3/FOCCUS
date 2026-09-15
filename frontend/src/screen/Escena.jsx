import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Film,
  Plus,
  Eye,
  PenLine,
  Trash2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import API_URL, { getToken } from "../api";
import "../desing/Escena.css";

const modoVistaOptions = ["Int", "Ext", "Int/Ext", "Ext/Int"];
const momentoDiaOptions = ["Día", "Noche", "Amanecer", "Atardecer", "Mañana", "Tarde"];
const estadoOptions = ["Pendiente", "En Proceso", "Finalizada"];

function normalizarEstado(estado) {
  if (!estado) return "pendiente";
  return estado
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

const formVacio = {
  numero_de_escena: "",
  encabezado: "",
  descripcion: "",
  modo_vista: "Int",
  momento_dia: "Día",
  ciudad: "",
  pagina: "",
  fecha_de_grabacion: "",
  dia_dramatico: "",
  estado: "Pendiente",
};

export default function EscenaScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const idRol = Number(localStorage.getItem("id_rol")) || 0;
  const esAdmin = idRol === 1001;

  // vista: lista | detalle
  const [vista, setVista] = useState("lista");

  const [guiones, setGuiones] = useState([]);
  const [selectedGuionId, setSelectedGuionId] = useState("");
  const [escenas, setEscenas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEscenas, setLoadingEscenas] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // modal crear/editar escena
  const [showEscenaModal, setShowEscenaModal] = useState(false);
  const [editandoEscenaId, setEditandoEscenaId] = useState(null);
  const [form, setForm] = useState(formVacio);

  // detalle de una escena
  const [escenaActiva, setEscenaActiva] = useState(null);
  const [tabDetalle, setTabDetalle] = useState("info"); // info | continuidad
  const [versiones, setVersiones] = useState([]);
  const [loadingVersiones, setLoadingVersiones] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [fotos, setFotos] = useState([]);
  const [loadingFotos, setLoadingFotos] = useState(false);

  // subir fotos de continuidad
  const [showFotosModal, setShowFotosModal] = useState(false);
  const [continuidadForm, setContinuidadForm] = useState({ tipo: "vestuario", etiqueta: "", notas: "", archivos: [] });

  const fetchGuiones = async () => {
    if (!projectId) {
      setGuiones([]);
      setSelectedGuionId("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones?id_project=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudieron cargar los guiones");
      }

      const items = Array.isArray(data.data) ? data.data : [];
      setGuiones(items);
      if (items.length > 0) {
        const nextId = String(items[0].id_guion);
        setSelectedGuionId(nextId);
        await fetchEscenas(nextId);
      } else {
        setSelectedGuionId("");
        setEscenas([]);
      }
    } catch (err) {
      setError(err.message || "Error al cargar guiones");
    } finally {
      setLoading(false);
    }
  };

  const fetchEscenas = async (idGuion) => {
    if (!idGuion) {
      setEscenas([]);
      return;
    }
    setLoadingEscenas(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/${idGuion}/escenas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudieron cargar las escenas");
      }
      setEscenas(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las escenas");
    } finally {
      setLoadingEscenas(false);
    }
  };

  useEffect(() => {
    fetchGuiones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ---------- Crear / editar escena ----------
  const openCreateModal = () => {
    if (!selectedGuionId) {
      setError("Selecciona un guion antes de crear una escena");
      return;
    }
    setEditandoEscenaId(null);
    setForm(formVacio);
    setShowEscenaModal(true);
  };

  const openEditModal = (escena, evt) => {
    evt.stopPropagation();
    setEditandoEscenaId(escena.id_escena);
    setForm({
      numero_de_escena: escena.numero_de_escena || "",
      encabezado: escena.encabezado || "",
      descripcion: escena.descripcion || "",
      modo_vista: escena.modo_vista || "Int",
      momento_dia: escena.momento_dia || "Día",
      ciudad: escena.ciudad || "",
      pagina: escena.pagina ?? "",
      fecha_de_grabacion: escena.fecha_de_grabacion || "",
      dia_dramatico: escena.dia_dramatico ?? "",
      estado: escena.estado || "Pendiente",
    });
    setShowEscenaModal(true);
  };

  const handleSubmitEscena = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.numero_de_escena.trim() || !form.encabezado.trim()) {
      setError("El número y el encabezado de la escena son obligatorios");
      return;
    }

    const payloadBase = {
      numero_de_escena: form.numero_de_escena,
      encabezado: form.encabezado,
      descripcion: form.descripcion,
      modo_vista: form.modo_vista,
      momento_dia: form.momento_dia,
      ciudad: form.ciudad || null,
      pagina: form.pagina ? Number(form.pagina) : null,
      fecha_de_grabacion: form.fecha_de_grabacion || null,
      dia_dramatico: form.dia_dramatico ? Number(form.dia_dramatico) : null,
      estado: form.estado || "Pendiente",
    };

    try {
      const token = getToken();
      const esEdicion = Boolean(editandoEscenaId);
      const url = esEdicion ? `${API_URL}/escenas/${editandoEscenaId}` : `${API_URL}/escenas`;
      const payload = esEdicion ? payloadBase : { ...payloadBase, id_guion: Number(selectedGuionId) };

      const response = await fetch(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo guardar la escena");
      }

      setSuccess(esEdicion ? "Escena actualizada correctamente" : "Escena creada correctamente");
      setShowEscenaModal(false);
      setForm(formVacio);
      setEditandoEscenaId(null);
      await fetchEscenas(selectedGuionId);
      if (escenaActiva && esEdicion && escenaActiva.id_escena === editandoEscenaId) {
        setEscenaActiva(data.data);
      }
    } catch (err) {
      setError(err.message || "No se pudo guardar la escena");
    }
  };

  const handleDeleteEscena = async (idEscena, evt) => {
    evt.stopPropagation();
    if (!window.confirm("¿Eliminar esta escena? No se puede deshacer.")) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/escenas/${idEscena}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo eliminar la escena");
      }
      await fetchEscenas(selectedGuionId);
    } catch (err) {
      setError(err.message || "No se pudo eliminar la escena");
    }
  };

  // ---------- Detalle de escena + continuidad visual ----------
  const abrirDetalle = async (escena, tab = "info") => {
    setEscenaActiva(escena);
    setTabDetalle(tab);
    setVista("detalle");
    setFotos([]);
    await fetchVersionesEscena(escena.id_escena);
  };

  const volverALista = () => {
    setVista("lista");
    setEscenaActiva(null);
    setVersiones([]);
    setFotos([]);
    setSelectedVersionId("");
    fetchEscenas(selectedGuionId);
  };

  const fetchVersionesEscena = async (idEscena) => {
    setLoadingVersiones(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/escenas/${idEscena}/versiones`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "No se pudieron cargar las versiones");
      const items = Array.isArray(data.data) ? data.data : [];
      setVersiones(items);
      if (items.length > 0) {
        setSelectedVersionId(String(items[0].id_escena_version));
        await fetchFotos(items[0].id_escena_version);
      } else {
        setSelectedVersionId("");
        setFotos([]);
      }
    } catch (err) {
      setError(err.message || "Error al cargar versiones");
    } finally {
      setLoadingVersiones(false);
    }
  };

  const fetchFotos = async (idVersion) => {
    if (!idVersion) {
      setFotos([]);
      return;
    }
    setLoadingFotos(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/escenas/versiones/${idVersion}/fotos`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "No se pudieron cargar las fotos");
      setFotos(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "Error al cargar fotos");
    } finally {
      setLoadingFotos(false);
    }
  };

  const handleCrearVersion = async () => {
    if (!escenaActiva) return;
    setError("");
    setSuccess("");
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("comentario_cambio", "Nueva versión de continuidad");
      const res = await fetch(`${API_URL}/escenas/${escenaActiva.id_escena}/versiones`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "No se pudo crear la versión");
      setSuccess("Versión de continuidad creada");
      await fetchVersionesEscena(escenaActiva.id_escena);
    } catch (err) {
      setError(err.message || "Error creando versión");
    }
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setContinuidadForm({ ...continuidadForm, archivos: files });
  };

  const handleUploadContinuidad = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedVersionId) return setError("Selecciona o crea una versión primero");
    if (!continuidadForm.archivos || continuidadForm.archivos.length === 0) return setError("Selecciona al menos un archivo");

    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("tipo", continuidadForm.tipo);
      if (continuidadForm.etiqueta) fd.append("etiqueta", continuidadForm.etiqueta);
      if (continuidadForm.notas) fd.append("notas", continuidadForm.notas);
      continuidadForm.archivos.forEach((f) => fd.append("archivos", f));

      const res = await fetch(`${API_URL}/escenas/versiones/${selectedVersionId}/fotos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "No se pudo subir archivos");
      setSuccess("Fotos de continuidad subidas correctamente");
      setContinuidadForm({ tipo: "vestuario", etiqueta: "", notas: "", archivos: [] });
      setShowFotosModal(false);
      await fetchFotos(selectedVersionId);
    } catch (err) {
      setError(err.message || "Error al subir archivos");
    }
  };

  return (
    <div className="escena-page">
      <header className="escena-header">
        <div className="escena-header__inner">
          <button type="button" className="escena-back" onClick={() => navigate("/guion")}>
            <ArrowLeft size={18} />
            Volver
          </button>
          <div className="escena-header__badge">
            <Film size={18} />
            {projectName}
          </div>
        </div>
      </header>

      <main className="escena-main escena-main--single">
        {(error || success) && (
          <div className={`escena-message ${error ? "escena-message--error" : "escena-message--success"}`}>
            {error || success}
          </div>
        )}

        {/* ---------------- LISTA ---------------- */}
        {vista === "lista" && (
          <section className="escena-panel escena-panel--wide">
            <div className="escena-panel__header">
              <div className="escena-panel__title-row">
                <Camera size={20} />
                <h2>Escenas</h2>
              </div>
              <span>{escenas.length} registros</span>
            </div>

            <div className="escena-toolbar escena-toolbar--row">
              <label>
                Guion activo
                <select
                  value={selectedGuionId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedGuionId(id);
                    fetchEscenas(id);
                  }}
                >
                  {!selectedGuionId && <option value="">Selecciona un guion</option>}
                  {guiones.map((guion) => (
                    <option key={guion.id_guion} value={guion.id_guion}>
                      {guion.nombre}
                    </option>
                  ))}
                </select>
              </label>

              {esAdmin && (
                <button type="button" className="escena-button" onClick={openCreateModal}>
                  <Plus size={16} /> Crear Escena
                </button>
              )}
            </div>

            {loading ? (
              <p className="escena-empty">Cargando guiones...</p>
            ) : loadingEscenas ? (
              <p className="escena-empty">Cargando escenas...</p>
            ) : escenas.length === 0 ? (
              <p className="escena-empty">Aún no hay escenas para este guion.</p>
            ) : (
              <div className="escena-table">
                <div className="escena-table__head">
                  <span>Escena</span>
                  <span>Encabezado</span>
                  <span>Día Dramático</span>
                  <span>Estado</span>
                  <span />
                </div>
                {escenas.map((escena) => (
                  <div key={escena.id_escena} className="escena-row" onClick={() => abrirDetalle(escena, "info")}>
                    <span className="escena-row__numero">#{escena.numero_de_escena}</span>
                    <span className="escena-row__encabezado">{escena.encabezado}</span>
                    <span className="escena-row__dia">{escena.dia_dramatico ? `Día ${escena.dia_dramatico}` : "-"}</span>
                    <span className={`escena-badge escena-badge--${normalizarEstado(escena.estado)}`}>
                      {escena.estado || "Pendiente"}
                    </span>
                    <span className="escena-row__actions">
                      <button type="button" title="Ver escena" onClick={(evt) => { evt.stopPropagation(); abrirDetalle(escena, "info"); }}>
                        <Eye size={16} />
                      </button>
                      {esAdmin && (
                        <>
                          <button type="button" title="Editar escena" onClick={(evt) => openEditModal(escena, evt)}>
                            <PenLine size={16} />
                          </button>
                          <button type="button" title="Eliminar escena" onClick={(evt) => handleDeleteEscena(escena.id_escena, evt)}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------------- DETALLE ---------------- */}
        {vista === "detalle" && escenaActiva && (
          <section className="escena-panel escena-panel--wide">
            <div className="escena-panel__header">
              <div className="escena-panel__title-row">
                <Camera size={20} />
                <div>
                  <h2 style={{ margin: 0 }}>Escena #{escenaActiva.numero_de_escena} — {escenaActiva.encabezado}</h2>
                </div>
              </div>
              <button type="button" className="escena-back" onClick={volverALista}>
                <ArrowLeft size={16} /> Escenas
              </button>
            </div>

            <div className="escena-tabs">
              <button
                type="button"
                className={`escena-tabs__tab ${tabDetalle === "info" ? "escena-tabs__tab--active" : ""}`}
                onClick={() => setTabDetalle("info")}
              >
                Información
              </button>
              <button
                type="button"
                className={`escena-tabs__tab ${tabDetalle === "continuidad" ? "escena-tabs__tab--active" : ""}`}
                onClick={() => setTabDetalle("continuidad")}
              >
                Continuidad visual
              </button>
            </div>

            {tabDetalle === "info" && (
              <div className="escena-info-grid">
                <div><span>Estado</span><strong className={`escena-badge escena-badge--${normalizarEstado(escenaActiva.estado)}`}>{escenaActiva.estado || "Pendiente"}</strong></div>
                <div><span>Modo de vista</span><strong>{escenaActiva.modo_vista || "-"}</strong></div>
                <div><span>Momento del día</span><strong>{escenaActiva.momento_dia || "-"}</strong></div>
                <div><span>Ciudad</span><strong>{escenaActiva.ciudad || "-"}</strong></div>
                <div><span>Página</span><strong>{escenaActiva.pagina || "-"}</strong></div>
                <div><span>Día dramático</span><strong>{escenaActiva.dia_dramatico || "-"}</strong></div>
                <div><span>Fecha de grabación</span><strong>{escenaActiva.fecha_de_grabacion || "Sin definir"}</strong></div>
                <div className="escena-info-grid__full"><span>Descripción</span><p>{escenaActiva.descripcion || "Sin descripción"}</p></div>
              </div>
            )}

            {tabDetalle === "continuidad" && (
              <div className="escena-continuidad">
                <div className="escena-toolbar escena-toolbar--row">
                  <label>
                    Versión activa
                    <select
                      value={selectedVersionId}
                      onChange={(e) => {
                        setSelectedVersionId(e.target.value);
                        fetchFotos(e.target.value);
                      }}
                    >
                      {!selectedVersionId && <option value="">Selecciona una versión</option>}
                      {versiones.map((v) => (
                        <option key={v.id_escena_version} value={v.id_escena_version}>
                          V{v.numero_version} - {v.comentario_cambio || ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  {esAdmin && (
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                      <button type="button" className="escena-button escena-button--ghost" onClick={handleCrearVersion}>
                        <Plus size={14} /> Crear versión
                      </button>
                      <button
                        type="button"
                        className="escena-button"
                        disabled={!selectedVersionId}
                        onClick={() => setShowFotosModal(true)}
                      >
                        <Camera size={14} /> Subir fotos
                      </button>
                    </div>
                  )}
                </div>

                {loadingVersiones || loadingFotos ? (
                  <p className="escena-empty">Cargando continuidad…</p>
                ) : versiones.length === 0 ? (
                  <p className="escena-empty">Esta escena todavía no tiene versiones de continuidad.</p>
                ) : fotos.length === 0 ? (
                  <p className="escena-empty">Esta versión todavía no tiene fotos.</p>
                ) : (
                  <div className="escena-fotos-grid">
                    {fotos.map((f) => (
                      <a key={f.id_foto} href={`${API_URL}/assets/${f.archivo_path}`} target="_blank" rel="noreferrer" className="escena-foto-card">
                        <img src={`${API_URL}/assets/${f.archivo_path}`} alt={f.etiqueta || f.tipo} />
                        <div className="escena-foto-card__meta">
                          <span className="escena-foto-card__tipo">{f.tipo}</span>
                          {f.etiqueta && <span>{f.etiqueta}</span>}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ---------------- MODAL: crear / editar escena ---------------- */}
      {showEscenaModal && (
        <div className="escena-modal-overlay" onClick={() => setShowEscenaModal(false)}>
          <div className="escena-modal" onClick={(e) => e.stopPropagation()}>
            <div className="escena-modal__header">
              <h3>{editandoEscenaId ? "Editar escena" : "Nueva escena"}</h3>
              <button className="escena-modal__close" type="button" onClick={() => setShowEscenaModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEscena} className="escena-form escena-form--modal">
              <div className="escena-grid">
                <label>
                  Número
                  <input type="text" value={form.numero_de_escena} onChange={(e) => setForm({ ...form, numero_de_escena: e.target.value })} placeholder="Ej. 12" />
                </label>
                <label>
                  Página
                  <input type="number" value={form.pagina} onChange={(e) => setForm({ ...form, pagina: e.target.value })} placeholder="42" />
                </label>
              </div>

              <label>
                Encabezado
                <input type="text" value={form.encabezado} onChange={(e) => setForm({ ...form, encabezado: e.target.value })} placeholder="Interior: salón principal - noche" />
              </label>

              <label>
                Descripción
                <textarea rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe la acción, el tono y la intención de la escena" />
              </label>

              <div className="escena-grid">
                <label>
                  Modo de vista
                  <select value={form.modo_vista} onChange={(e) => setForm({ ...form, modo_vista: e.target.value })}>
                    {modoVistaOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </label>
                <label>
                  Momento del día
                  <select value={form.momento_dia} onChange={(e) => setForm({ ...form, momento_dia: e.target.value })}>
                    {momentoDiaOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </label>
              </div>

              <div className="escena-grid">
                <label>
                  Ciudad
                  <input type="text" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} placeholder="Madrid" />
                </label>
                <label>
                  Día dramático
                  <input type="number" value={form.dia_dramatico} onChange={(e) => setForm({ ...form, dia_dramatico: e.target.value })} placeholder="1" />
                </label>
              </div>

              <div className="escena-grid">
                <label>
                  Fecha de grabación
                  <input type="date" value={form.fecha_de_grabacion} onChange={(e) => setForm({ ...form, fecha_de_grabacion: e.target.value })} />
                </label>
                <label>
                  Estado
                  <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                    {estadoOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </label>
              </div>

              <button type="submit" className="escena-button">
                <Plus size={18} />
                {editandoEscenaId ? "Guardar cambios" : "Crear escena"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: subir fotos de continuidad ---------------- */}
      {showFotosModal && (
        <div className="escena-modal-overlay" onClick={() => setShowFotosModal(false)}>
          <div className="escena-modal" onClick={(e) => e.stopPropagation()}>
            <div className="escena-modal__header">
              <h3><ImageIcon size={18} /> Subir fotos de continuidad</h3>
              <button className="escena-modal__close" type="button" onClick={() => setShowFotosModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadContinuidad} className="escena-form escena-form--modal">
              <label>
                Tipo
                <select value={continuidadForm.tipo} onChange={(e) => setContinuidadForm({ ...continuidadForm, tipo: e.target.value })}>
                  <option value="vestuario">Vestuario</option>
                  <option value="objeto">Objeto</option>
                  <option value="espacio">Espacio</option>
                </select>
              </label>
              <label>
                Etiqueta
                <input type="text" value={continuidadForm.etiqueta} onChange={(e) => setContinuidadForm({ ...continuidadForm, etiqueta: e.target.value })} placeholder="Ej. Vestuario - Juan" />
              </label>
              <label>
                Notas
                <textarea rows={2} value={continuidadForm.notas} onChange={(e) => setContinuidadForm({ ...continuidadForm, notas: e.target.value })} />
              </label>
              <label>
                Archivos (imágenes)
                <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
              </label>
              <button type="submit" className="escena-button">
                <Camera size={16} /> Subir fotos
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
