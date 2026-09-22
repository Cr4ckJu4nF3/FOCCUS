import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  Plus,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Trash2,
  PenLine,
  Paperclip,
  Eye,
  X,
  Users,
  MapPin,
  Bold,
  Italic,
  Underline,
  List,
  Heading1,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import API_URL, { getToken } from "../api";
import "../desing/Guion.css";

const ESTADOS_VERSION = ["Borrador", "Revision", "Aprobado", "En Rodaje", "Archivado"];

// Normaliza "En Rodaje" -> "en-rodaje", "Revisión" -> "revision", etc.
// para poder mapear el estado directo a una clase CSS.
function normalizarEstado(estado) {
  if (!estado) return "borrador";
  return estado
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

// FastAPI a veces manda el error en "detail" como texto simple y otras
// veces como una lista de objetos de validación (422), en cuyo caso
// mostrar el objeto directo da "[object Object]", y el "msg" solo (ej.
// "Field required") no dice cuál campo. Esta función arma un mensaje
// legible incluyendo el nombre del campo cuando está disponible.
function extraerMensajeError(data, fallback) {
  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => {
        if (typeof item === "string") return item;
        const campo = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null;
        const msg = item.msg || JSON.stringify(item);
        return campo ? `${campo}: ${msg}` : msg;
      })
      .join(" · ");
  }
  return data.message || fallback;
}

export default function GuionScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const idRol = Number(localStorage.getItem("id_rol")) || 0;
  const esAdmin = idRol === 1001;

  // vista principal: lista de guiones | editor "crear desde cero" | detalle de un guion
  const [vista, setVista] = useState("lista");

  const [guiones, setGuiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // modal "Crear Guion" -> elegir Subir guion / Crear desde cero
  const [showChoiceModal, setShowChoiceModal] = useState(false);

  // modal Subir guion (archivo)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ nombre: "", descripcion: "" });
  const [uploadArchivo, setUploadArchivo] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Crear desde cero
  const [ceroForm, setCeroForm] = useState({ nombre: "", descripcion: "" });
  const [contenidoInicial, setContenidoInicial] = useState("");
  const [alineacionTexto, setAlineacionTexto] = useState("left");
  const editorRef = useRef(null);

  // Personajes / Escenarios del proyecto (atajos dentro del editor)
  const [personajes, setPersonajes] = useState([]);
  const [escenarios, setEscenarios] = useState([]);
  const [nuevoPersonaje, setNuevoPersonaje] = useState("");
  const [nuevoEscenario, setNuevoEscenario] = useState("");

  // Detalle de un guion
  const [guionActivo, setGuionActivo] = useState(null);
  const [tabDetalle, setTabDetalle] = useState("contenido"); // contenido | versiones
  const [versiones, setVersiones] = useState([]);
  const [loadingVersiones, setLoadingVersiones] = useState(false);
  const [versionesExpandidas, setVersionesExpandidas] = useState({});

  // modal Nueva versión (dentro del detalle)
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [origenVersion, setOrigenVersion] = useState("archivo"); // archivo | texto
  const [archivoVersion, setArchivoVersion] = useState(null);
  const [contenidoVersionTexto, setContenidoVersionTexto] = useState("");
  const [versionForm, setVersionForm] = useState({
    fecha_de_emision: new Date().toISOString().slice(0, 10),
    estado: "Borrador",
    comentario_cambio: "",
  });

  const fetchGuiones = async () => {
    if (!projectId) {
      setGuiones([]);
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
        throw new Error(extraerMensajeError(data, "No se pudieron cargar los guiones"));
      }
      setGuiones(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuiones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchVersiones = async (idGuion) => {
    if (!idGuion) {
      setVersiones([]);
      return;
    }
    setLoadingVersiones(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/${idGuion}/versiones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(extraerMensajeError(data, "No se pudieron cargar las versiones"));
      }
      setVersiones(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las versiones");
    } finally {
      setLoadingVersiones(false);
    }
  };

  const fetchPersonajes = async () => {
    if (!projectId) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/personajes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPersonajes(Array.isArray(data.data) ? data.data : []);
    } catch {
      // silencioso: no bloquea la escritura del guion si esto falla
    }
  };

  const fetchEscenarios = async () => {
    if (!projectId) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/escenarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setEscenarios(Array.isArray(data.data) ? data.data : []);
    } catch {
      // silencioso
    }
  };

  const abrirDetalle = async (guion, tab = "contenido") => {
    setGuionActivo(guion);
    setTabDetalle(tab);
    setVersionesExpandidas({});
    setVista("detalle");
    await fetchVersiones(guion.id_guion);
  };

  const volverALista = () => {
    setVista("lista");
    setGuionActivo(null);
    setVersiones([]);
    fetchGuiones();
  };

  const handleDeleteGuion = async (idGuion, evt) => {
    evt.stopPropagation();
    if (!window.confirm("¿Eliminar este guion? No se puede deshacer.")) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/${idGuion}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo eliminar el guion"));
      }
      await fetchGuiones();
    } catch (err) {
      setError(err.message || "No se pudo eliminar el guion");
    }
  };

  // ---------- Subir guion (archivo) ----------
  const handleUploadGuion = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!uploadForm.nombre.trim()) {
      setError("El nombre del guion es obligatorio");
      return;
    }
    if (!uploadArchivo) {
      setError("Debes adjuntar un archivo PDF o Word");
      return;
    }

    const formData = new FormData();
    formData.append("nombre", uploadForm.nombre);
    formData.append("descripcion", uploadForm.descripcion || "");
    formData.append("id_project", projectId);
    formData.append("archivo", uploadArchivo);

    setUploading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/archivo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo subir el guion"));
      }
      setSuccess("Guion subido correctamente");
      setUploadForm({ nombre: "", descripcion: "" });
      setUploadArchivo(null);
      setShowUploadModal(false);
      await fetchGuiones();
    } catch (err) {
      setError(err.message || "No se pudo subir el guion");
    } finally {
      setUploading(false);
    }
  };

  // ---------- Crear desde cero ----------
  const iniciarCreacionDesdeCero = () => {
    setShowChoiceModal(false);
    setVista("crear-cero");
    fetchPersonajes();
    fetchEscenarios();
  };

  const cancelarCreacionDesdeCero = () => {
    setVista("lista");
    setCeroForm({ nombre: "", descripcion: "" });
    setContenidoInicial("");
  };

  const insertarFormatoEditor = (prefijo, sufijo = "") => {
    const input = editorRef.current;
    if (!input) return;
    const inicio = input.selectionStart;
    const fin = input.selectionEnd;
    const seleccion = contenidoInicial.slice(inicio, fin) || "texto";
    const siguiente = contenidoInicial.slice(0, inicio) + prefijo + seleccion + sufijo + contenidoInicial.slice(fin);
    setContenidoInicial(siguiente);
    requestAnimationFrame(() => {
      input.focus();
      const cursorInicio = inicio + prefijo.length;
      const cursorFin = cursorInicio + seleccion.length;
      input.selectionStart = cursorInicio;
      input.selectionEnd = cursorFin;
    });
  };

  const aplicarAlineacionTexto = (tipo) => {
    const input = editorRef.current;
    if (!input) return;
    const inicio = input.selectionStart;
    const fin = input.selectionEnd;
    const seleccion = contenidoInicial.slice(inicio, fin) || "texto";
    const marcador = `\n[alinear:${tipo}]`;
    const siguiente = contenidoInicial.slice(0, inicio) + marcador + seleccion + "[/alinear]" + contenidoInicial.slice(fin);
    setContenidoInicial(siguiente);
    setAlineacionTexto(tipo);
    requestAnimationFrame(() => {
      input.focus();
      const cursorInicio = inicio + marcador.length;
      const cursorFin = cursorInicio + seleccion.length;
      input.selectionStart = cursorInicio;
      input.selectionEnd = cursorFin;
    });
  };

  // Inserta texto plano (nombre de personaje/escenario) en la posicion
  // del cursor, sin envolver la seleccion actual.
  const insertarElementoEditor = (texto) => {
    const input = editorRef.current;
    if (!input) {
      setContenidoInicial((prev) => prev + texto);
      return;
    }
    const inicio = input.selectionStart ?? contenidoInicial.length;
    const fin = input.selectionEnd ?? contenidoInicial.length;
    const siguiente = contenidoInicial.slice(0, inicio) + texto + contenidoInicial.slice(fin);
    setContenidoInicial(siguiente);
    requestAnimationFrame(() => {
      input.focus();
      const cursor = inicio + texto.length;
      input.selectionStart = cursor;
      input.selectionEnd = cursor;
    });
  };

  const handleCrearPersonaje = async (e) => {
    e.preventDefault();
    if (!nuevoPersonaje.trim()) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/personajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: nuevoPersonaje.trim(), id_project: projectId }),
      });
      const data = await response.json();
      if (data.success) {
        setPersonajes((prev) => [...prev, data.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setNuevoPersonaje("");
      }
    } catch {
      // noop
    }
  };

  const handleCrearEscenario = async (e) => {
    e.preventDefault();
    if (!nuevoEscenario.trim()) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/escenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: nuevoEscenario.trim(), id_project: projectId }),
      });
      const data = await response.json();
      if (data.success) {
        setEscenarios((prev) => [...prev, data.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setNuevoEscenario("");
      }
    } catch {
      // noop
    }
  };

  const handleCreateGuionDesdeCero = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!ceroForm.nombre.trim()) {
      setError("El título del guion es obligatorio");
      return;
    }
    if (!contenidoInicial.trim()) {
      setError("Escribe el contenido inicial del guion antes de crearlo");
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/texto`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: ceroForm.nombre,
          descripcion: ceroForm.descripcion,
          id_project: projectId,
          contenido: contenidoInicial,
          fecha_de_emision: new Date().toISOString().slice(0, 10),
          estado: "Borrador",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(extraerMensajeError(data, "No se pudo crear el guion"));
      }
      setSuccess("Guion creado correctamente");
      setCeroForm({ nombre: "", descripcion: "" });
      setContenidoInicial("");
      setVista("lista");
      await fetchGuiones();
    } catch (err) {
      setError(err.message || "No se pudo crear el guion");
    }
  };

  // ---------- Nueva version (dentro del detalle) ----------
  const handleUploadVersion = async (e) => {
    e.preventDefault();
    if (!guionActivo) return;

    const token = getToken();

    if (origenVersion === "texto") {
      if (!contenidoVersionTexto.trim()) {
        setError("Escribe el contenido del guion antes de guardar");
        return;
      }
      try {
        const response = await fetch(`${API_URL}/guiones/${guionActivo.id_guion}/versiones/texto`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            contenido: contenidoVersionTexto,
            fecha_de_emision: versionForm.fecha_de_emision,
            estado: versionForm.estado,
            comentario_cambio: versionForm.comentario_cambio || "",
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(extraerMensajeError(data, "No se pudo guardar la versión"));
        }
        setSuccess("Versión guardada correctamente");
        setContenidoVersionTexto("");
        setShowVersionModal(false);
        await fetchVersiones(guionActivo.id_guion);
        await fetchGuiones();
      } catch (err) {
        setError(err.message || "No se pudo guardar la versión");
      }
      return;
    }

    if (!archivoVersion) {
      setError("Debes adjuntar un archivo del guion");
      return;
    }

    const formData = new FormData();
    formData.append("fecha_de_emision", versionForm.fecha_de_emision);
    formData.append("estado", versionForm.estado);
    formData.append("comentario_cambio", versionForm.comentario_cambio || "");
    formData.append("archivo", archivoVersion);

    try {
      const response = await fetch(`${API_URL}/guiones/${guionActivo.id_guion}/versiones`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(extraerMensajeError(data, "No se pudo subir la versión"));
      }
      setSuccess("Versión subida correctamente");
      setArchivoVersion(null);
      setShowVersionModal(false);
      await fetchVersiones(guionActivo.id_guion);
      await fetchGuiones();
    } catch (err) {
      setError(err.message || "No se pudo subir la versión");
    }
  };

  const toggleVersionExpandida = (idGuionVersion) => {
    setVersionesExpandidas((prev) => ({ ...prev, [idGuionVersion]: !prev[idGuionVersion] }));
  };

  const versionActualDeGuionActivo =
    versiones.find((v) => v.id_guion_version === guionActivo?.id_guion_version_actual) || versiones[0];

  return (
    <div className="guion-page">
      <header className="guion-header">
        <div className="guion-header__inner">
          <button className="guion-back" type="button" onClick={() => navigate("/proyecto-dashboard")}>
            <ArrowLeft size={18} />
            Volver
          </button>
          <div className="guion-header__badge">
            <FileText size={18} />
            {projectName}
          </div>
        </div>
      </header>

      <main className="guion-main guion-main--single">
        {(error || success) && (
          <div className={`guion-message ${error ? "guion-message--error" : "guion-message--success"}`}>
            {error || success}
          </div>
        )}

        {/* ---------------- LISTA ---------------- */}
        {vista === "lista" && (
          <div className="guion-panel guion-panel--wide">
            <div className="guion-panel__header">
              <div className="guion-panel__title-row">
                <FolderOpen size={18} />
                <h2>Guiones</h2>
                <span>{guiones.length} en proyecto</span>
              </div>
              {esAdmin && (
                <button className="guion-button guion-button--primary" type="button" onClick={() => setShowChoiceModal(true)}>
                  <Plus size={16} /> Crear Guion
                </button>
              )}
            </div>

            {loading ? (
              <p className="guion-empty">Cargando guiones…</p>
            ) : guiones.length === 0 ? (
              <p className="guion-empty">Aún no hay guiones en este proyecto.</p>
            ) : (
              <div className="guion-grid-cards">
                {guiones.map((g) => (
                  <div key={g.id_guion} className="guion-card" onClick={() => abrirDetalle(g, "contenido")}>
                    <div className="guion-card__top">
                      <span className={`guion-badge guion-badge--${normalizarEstado(g.estado_actual)}`}>
                        {g.estado_actual || "Sin versión"}
                      </span>
                      {esAdmin && (
                        <button
                          className="guion-item__delete"
                          type="button"
                          onClick={(evt) => handleDeleteGuion(g.id_guion, evt)}
                          title="Eliminar guion"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <strong>{g.nombre}</strong>
                    {g.descripcion && <small>{g.descripcion}</small>}
                    <div className="guion-card__meta">
                      <span>{g.numero_de_version_actual ? `Versión v${g.numero_de_version_actual}` : "Sin versiones"}</span>
                      <button
                        className="guion-card__edit"
                        type="button"
                        title="Ver versiones"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          abrirDetalle(g, "versiones");
                        }}
                      >
                        <PenLine size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- CREAR DESDE CERO ---------------- */}
        {vista === "crear-cero" && (
          <div className="guion-panel guion-panel--wide">
            <div className="guion-panel__header">
              <div className="guion-panel__title-row">
                <Sparkles size={18} />
                <h2>Crear guion desde cero</h2>
              </div>
              <button className="guion-back" type="button" onClick={cancelarCreacionDesdeCero}>
                <ArrowLeft size={16} /> Cancelar
              </button>
            </div>

            <form className="guion-form-card" style={{ borderBottom: "none" }} onSubmit={handleCreateGuionDesdeCero}>
              <div className="guion-grid">
                <label>
                  Título del guion
                  <input
                    value={ceroForm.nombre}
                    onChange={(e) => setCeroForm({ ...ceroForm, nombre: e.target.value })}
                    placeholder="Ej. Episodio 01 - Opening"
                    required
                  />
                </label>
                <label>
                  Descripción
                  <input
                    value={ceroForm.descripcion}
                    onChange={(e) => setCeroForm({ ...ceroForm, descripcion: e.target.value })}
                    placeholder="Tono, estructura o notas del guion"
                  />
                </label>
              </div>

              <div className="guion-editor-layout">
                <div className="guion-editor-shell">
                  <div className="guion-editor-toolbar">
                    <button type="button" onClick={() => insertarFormatoEditor("**", "**")} title="Negrita"><Bold size={16} /></button>
                    <button type="button" onClick={() => insertarFormatoEditor("_", "_")} title="Cursiva"><Italic size={16} /></button>
                    <button type="button" onClick={() => insertarFormatoEditor("__", "__")} title="Subrayado"><Underline size={16} /></button>
                    <button type="button" onClick={() => insertarFormatoEditor("\n# ", "")} title="Encabezado"><Heading1 size={16} /></button>
                    <button type="button" onClick={() => insertarFormatoEditor("\n- ", "")} title="Lista"><List size={16} /></button>
                    <button type="button" onClick={() => aplicarAlineacionTexto("left")} title="Alinear izquierda"><AlignLeft size={16} /></button>
                    <button type="button" onClick={() => aplicarAlineacionTexto("center")} title="Centrar"><AlignCenter size={16} /></button>
                    <button type="button" onClick={() => aplicarAlineacionTexto("right")} title="Alinear derecha"><AlignRight size={16} /></button>
                  </div>
                  <textarea
                    ref={editorRef}
                    className={`guion-editor-surface guion-editor-surface--${alineacionTexto}`}
                    value={contenidoInicial}
                    onChange={(e) => setContenidoInicial(e.target.value)}
                    placeholder={"INT. CABAÑA - SALA PRINCIPAL - AMANECER\n\nEscribe la acción, el diálogo y las notas de tu escena..."}
                  />
                </div>

                <aside className="guion-sidebar">
                  <div className="guion-sidebar__block">
                    <div className="guion-sidebar__header"><Users size={16} /> Personajes</div>
                    <form className="guion-sidebar__add" onSubmit={handleCrearPersonaje}>
                      <input
                        value={nuevoPersonaje}
                        onChange={(e) => setNuevoPersonaje(e.target.value)}
                        placeholder="Nombre del personaje"
                      />
                      <button type="submit" title="Agregar personaje"><Plus size={14} /></button>
                    </form>
                    <div className="guion-sidebar__list">
                      {personajes.length === 0 && <span className="guion-sidebar__empty">Aún no hay personajes</span>}
                      {personajes.map((p) => (
                        <button
                          type="button"
                          key={p.id_personaje}
                          className="guion-sidebar__item"
                          title="Insertar en el guion"
                          onClick={() => insertarElementoEditor(`${p.nombre.toUpperCase()}\n`)}
                        >
                          {p.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="guion-sidebar__block">
                    <div className="guion-sidebar__header"><MapPin size={16} /> Escenarios</div>
                    <form className="guion-sidebar__add" onSubmit={handleCrearEscenario}>
                      <input
                        value={nuevoEscenario}
                        onChange={(e) => setNuevoEscenario(e.target.value)}
                        placeholder="Nombre del escenario"
                      />
                      <button type="submit" title="Agregar escenario"><Plus size={14} /></button>
                    </form>
                    <div className="guion-sidebar__list">
                      {escenarios.length === 0 && <span className="guion-sidebar__empty">Aún no hay escenarios</span>}
                      {escenarios.map((esc) => (
                        <button
                          type="button"
                          key={esc.id_escenario}
                          className="guion-sidebar__item"
                          title="Insertar en el guion"
                          onClick={() => insertarElementoEditor(`INT/EXT. ${esc.nombre.toUpperCase()} - DÍA\n`)}
                        >
                          {esc.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>

              <button className="guion-button guion-button--primary" type="submit" style={{ marginTop: "1.25rem" }}>
                <CheckCircle2 size={16} /> Crear guion
              </button>
            </form>
          </div>
        )}

        {/* ---------------- DETALLE ---------------- */}
        {vista === "detalle" && guionActivo && (
          <div className="guion-panel guion-panel--wide">
            <div className="guion-panel__header">
              <div className="guion-panel__title-row">
                <FileText size={18} />
                <div>
                  <h2 style={{ margin: 0 }}>{guionActivo.nombre}</h2>
                  {guionActivo.descripcion && <span>{guionActivo.descripcion}</span>}
                </div>
              </div>
              <button className="guion-back" type="button" onClick={volverALista}>
                <ArrowLeft size={16} /> Guiones
              </button>
            </div>

            <div className="guion-tabs">
              <button
                type="button"
                className={`guion-tabs__tab ${tabDetalle === "contenido" ? "guion-tabs__tab--active" : ""}`}
                onClick={() => setTabDetalle("contenido")}
              >
                Contenido
              </button>
              <button
                type="button"
                className={`guion-tabs__tab ${tabDetalle === "versiones" ? "guion-tabs__tab--active" : ""}`}
                onClick={() => setTabDetalle("versiones")}
              >
                Versiones ({versiones.length})
              </button>
            </div>

            {tabDetalle === "contenido" && (
              <div className="guion-content-view">
                {loadingVersiones ? (
                  <p className="guion-empty">Cargando…</p>
                ) : !versionActualDeGuionActivo ? (
                  <p className="guion-empty">Este guion todavía no tiene versiones.</p>
                ) : versionActualDeGuionActivo.contenido ? (
                  <pre className="guion-content-view__pre">{versionActualDeGuionActivo.contenido}</pre>
                ) : versionActualDeGuionActivo.archivo ? (
                  <div className="guion-content-view__file">
                    <Paperclip size={18} />
                    <span>Versión v{versionActualDeGuionActivo.numero_de_version} — archivo subido</span>
                    <a
                      className="guion-button guion-button--accent"
                      href={`${API_URL}/assets/${versionActualDeGuionActivo.archivo}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Eye size={16} /> Ver archivo
                    </a>
                  </div>
                ) : (
                  <p className="guion-empty">Sin contenido disponible.</p>
                )}
              </div>
            )}

            {tabDetalle === "versiones" && (
              <>
                <div className="guion-versions-toolbar">
                  <span>{versiones.length} registros</span>
                  {esAdmin && (
                    <button className="guion-button guion-button--accent" type="button" onClick={() => setShowVersionModal(true)}>
                      <Plus size={16} /> Nueva versión
                    </button>
                  )}
                </div>

                {loadingVersiones ? (
                  <p className="guion-empty">Cargando versiones…</p>
                ) : versiones.length === 0 ? (
                  <p className="guion-empty">Aún no hay versiones.</p>
                ) : (
                  <div className="guion-version-list">
                    {versiones.map((v) => (
                      <div key={v.id_guion_version} className="guion-version-card">
                        <div className="guion-version-card__header">
                          <span className="guion-version-card__version">Versión {v.numero_de_version}</span>
                          <span className={`guion-version-card__state guion-version-card__state--${normalizarEstado(v.estado)}`}>
                            {v.estado}
                          </span>
                        </div>
                        <p className="guion-version-card__date">{v.fecha_de_emision}</p>
                        {v.comentario_cambio && <p className="guion-version-card__comment">{v.comentario_cambio}</p>}
                        <div className="guion-version-card__meta">
                          <span className={`guion-version-card__origen ${v.contenido ? "guion-version-card__origen--texto" : ""}`}>
                            {v.contenido ? (
                              <><PenLine size={14} /> Escrito en el sistema</>
                            ) : (
                              <><Paperclip size={14} /> Archivo subido</>
                            )}
                          </span>
                          {v.archivo && (
                            <span className="guion-version-card__ok">
                              <CheckCircle2 size={14} /> Disponible
                            </span>
                          )}
                        </div>
                        {v.contenido && (
                          <button className="guion-version-card__toggle" type="button" onClick={() => toggleVersionExpandida(v.id_guion_version)}>
                            {versionesExpandidas[v.id_guion_version] ? "Ocultar contenido" : "Ver contenido"}
                          </button>
                        )}
                        {v.contenido && versionesExpandidas[v.id_guion_version] && (
                          <div className="guion-version-card__contenido">{v.contenido}</div>
                        )}
                        {v.archivo && (
                          <a
                            className="guion-version-card__toggle"
                            href={`${API_URL}/assets/${v.archivo}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye size={14} /> Ver archivo
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ---------------- MODAL: elegir tipo de creación ---------------- */}
      {showChoiceModal && (
        <div className="guion-modal-overlay" onClick={() => setShowChoiceModal(false)}>
          <div className="guion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="guion-modal__header">
              <h3>Crear guion</h3>
              <button className="guion-modal__close" type="button" onClick={() => setShowChoiceModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="guion-modal__subtitle">¿Cómo quieres empezar este guion?</p>
            <div className="guion-choice-grid">
              <button type="button" className="guion-choice-card" onClick={() => { setShowChoiceModal(false); setShowUploadModal(true); }}>
                <UploadCloud size={26} />
                <strong>Subir guion</strong>
                <span>Sube un PDF o Word ya escrito</span>
              </button>
              <button type="button" className="guion-choice-card" onClick={iniciarCreacionDesdeCero}>
                <Sparkles size={26} />
                <strong>Crear desde cero</strong>
                <span>Escríbelo directo en el sistema</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: Subir guion ---------------- */}
      {showUploadModal && (
        <div className="guion-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="guion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="guion-modal__header">
              <h3><UploadCloud size={18} /> Subir guion</h3>
              <button className="guion-modal__close" type="button" onClick={() => setShowUploadModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="guion-form" onSubmit={handleUploadGuion}>
              <label>
                Nombre del guion
                <input
                  value={uploadForm.nombre}
                  onChange={(e) => setUploadForm({ ...uploadForm, nombre: e.target.value })}
                  placeholder="Ej. Episodio 01 - Opening"
                  required
                />
              </label>
              <label>
                Descripción
                <textarea
                  rows={3}
                  value={uploadForm.descripcion}
                  onChange={(e) => setUploadForm({ ...uploadForm, descripcion: e.target.value })}
                  placeholder="Resumen del guion, tono o notas del proyecto"
                />
              </label>
              <div className="guion-upload">
                <label>
                  Archivo del guion (PDF o Word)
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => setUploadArchivo(e.target.files?.[0] || null)}
                    required
                  />
                </label>
              </div>
              <button className="guion-button guion-button--accent" type="submit" disabled={uploading}>
                <UploadCloud size={16} /> {uploading ? "Subiendo…" : "Subir guion"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: Nueva versión ---------------- */}
      {showVersionModal && (
        <div className="guion-modal-overlay" onClick={() => setShowVersionModal(false)}>
          <div className="guion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="guion-modal__header">
              <h3><Plus size={18} /> Nueva versión</h3>
              <button className="guion-modal__close" type="button" onClick={() => setShowVersionModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="guion-origen-toggle">
              <button
                type="button"
                className={`guion-origen-toggle__option ${origenVersion === "archivo" ? "guion-origen-toggle__option--active" : ""}`}
                onClick={() => setOrigenVersion("archivo")}
              >
                <Paperclip size={15} /> Subir archivo
              </button>
              <button
                type="button"
                className={`guion-origen-toggle__option ${origenVersion === "texto" ? "guion-origen-toggle__option--active" : ""}`}
                onClick={() => setOrigenVersion("texto")}
              >
                <PenLine size={15} /> Escribir guion
              </button>
            </div>

            <form className="guion-form" onSubmit={handleUploadVersion}>
              <div className="guion-grid">
                <label>
                  Fecha de emisión
                  <input
                    type="date"
                    value={versionForm.fecha_de_emision}
                    onChange={(e) => setVersionForm({ ...versionForm, fecha_de_emision: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Estado
                  <select value={versionForm.estado} onChange={(e) => setVersionForm({ ...versionForm, estado: e.target.value })}>
                    {ESTADOS_VERSION.map((es) => (
                      <option key={es} value={es}>{es}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Comentario del cambio
                <textarea
                  rows={2}
                  value={versionForm.comentario_cambio}
                  onChange={(e) => setVersionForm({ ...versionForm, comentario_cambio: e.target.value })}
                  placeholder="Describe la modificación realizada"
                />
              </label>

              {origenVersion === "archivo" ? (
                <div className="guion-upload">
                  <label>
                    Archivo del guion
                    <input type="file" accept=".pdf,.docx,.fdx" onChange={(e) => setArchivoVersion(e.target.files?.[0] || null)} />
                  </label>
                </div>
              ) : (
                <label>
                  Contenido
                  <textarea
                    className="guion-texto-editor"
                    rows={10}
                    value={contenidoVersionTexto}
                    onChange={(e) => setContenidoVersionTexto(e.target.value)}
                    placeholder="Escribe el contenido de esta versión..."
                  />
                </label>
              )}

              <button className="guion-button guion-button--accent" type="submit">
                <UploadCloud size={16} /> Guardar versión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
