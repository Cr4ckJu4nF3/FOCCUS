import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
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
  EyeOff,
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

export default function GuionScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const idRol = Number(localStorage.getItem("id_rol")) || 0;
  const esAdmin = idRol === 1001;

  const [guiones, setGuiones] = useState([]);
  const [selectedGuionId, setSelectedGuionId] = useState(null);
  const [versiones, setVersiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [contenidoInicial, setContenidoInicial] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [origenVersion, setOrigenVersion] = useState("archivo"); // "archivo" | "texto"
  const [contenidoTexto, setContenidoTexto] = useState("");
  const [modoCreacion, setModoCreacion] = useState("simple"); // "simple" | "cero"
  const [versionesExpandidas, setVersionesExpandidas] = useState({});
  const [alineacionTexto, setAlineacionTexto] = useState("left");
  const editorRef = useRef(null);
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudieron cargar los guiones");
      }

      const items = Array.isArray(data.data) ? data.data : [];
      setGuiones(items);

      if (items.length > 0) {
        const firstId = selectedGuionId || items[0].id_guion;
        setSelectedGuionId(firstId);
        await fetchVersiones(firstId);
      } else {
        setSelectedGuionId(null);
        setVersiones([]);
      }
    } catch (err) {
      setError(err.message || "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGuion = async (idGuion) => {
    if (!window.confirm("¿Eliminar este guion? No se puede deshacer.")) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/${idGuion}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo eliminar el guion");
      }
      if (selectedGuionId === idGuion) {
        setSelectedGuionId(null);
        setVersiones([]);
      }
      await fetchGuiones();
    } catch (err) {
      setError(err.message || "No se pudo eliminar el guion");
    }
  };

  const fetchVersiones = async (idGuion) => {
    if (!idGuion) {
      setVersiones([]);
      return;
    }

    setLoadingVersions(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/${idGuion}/versiones`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudieron cargar las versiones");
      }

      setVersiones(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las versiones");
    } finally {
      setLoadingVersions(false);
    }
  };

  useEffect(() => {
    fetchGuiones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreateGuion = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nombre.trim()) {
      setError("El nombre del guion es obligatorio");
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion,
          id_project: projectId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "Error al crear el guion");
      }

      const nuevoGuion = data.data;
      setForm({ nombre: "", descripcion: "" });
      setSuccess("Guion creado correctamente");
      await fetchGuiones();
      if (nuevoGuion?.id_guion) {
        setSelectedGuionId(nuevoGuion.id_guion);
        await fetchVersiones(nuevoGuion.id_guion);
      }
    } catch (err) {
      setError(err.message || "No se pudo crear el guion");
    }
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

  const handleCreateGuionDesdeCero = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nombre.trim()) {
      setError("El nombre del guion es obligatorio");
      return;
    }

    if (!contenidoInicial.trim()) {
      setError("Escribe el contenido inicial del guion antes de crearla");
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/texto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion,
          id_project: projectId,
          contenido: contenidoInicial,
          fecha_de_emision: new Date().toISOString().slice(0, 10),
          estado: "Borrador",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudo crear el guion desde cero");
      }

      const nuevoGuion = data.data;
      setForm({ nombre: "", descripcion: "" });
      setContenidoInicial("");
      setModoCreacion("simple");
      if (editorRef.current) {
        editorRef.current.value = "";
      }
      setSuccess("Guion creado desde cero correctamente");
      await fetchGuiones();
      if (nuevoGuion?.id_guion) {
        setSelectedGuionId(nuevoGuion.id_guion);
        await fetchVersiones(nuevoGuion.id_guion);
      }
    } catch (err) {
      setError(err.message || "No se pudo crear el guion desde cero");
    }
  };

  const handleUploadVersion = async (e) => {
    e.preventDefault();
    if (!selectedGuionId) {
      setError("Primero selecciona o crea un guion");
      return;
    }

    const token = getToken();

    // ---- Version escrita directo en el sistema (sin archivo) ----
    if (origenVersion === "texto") {
      if (!contenidoTexto.trim()) {
        setError("Escribe el contenido del guion antes de guardar");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/guiones/${selectedGuionId}/versiones/texto`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            contenido: contenidoTexto,
            fecha_de_emision: versionForm.fecha_de_emision,
            estado: versionForm.estado,
            comentario_cambio: versionForm.comentario_cambio || "",
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.detail || data.message || "No se pudo guardar la versión");
        }

        setSuccess("Versión del guion guardada correctamente");
        setVersionForm({
          fecha_de_emision: new Date().toISOString().slice(0, 10),
          estado: "Borrador",
          comentario_cambio: "",
        });
        setContenidoTexto("");
        await fetchVersiones(selectedGuionId);
      } catch (err) {
        setError(err.message || "No se pudo guardar la versión");
      }
      return;
    }

    // ---- Version subida como archivo ----
    if (!archivo) {
      setError("Debes adjuntar un archivo del guion");
      return;
    }

    const formData = new FormData();
    formData.append("fecha_de_emision", versionForm.fecha_de_emision);
    formData.append("estado", versionForm.estado);
    formData.append("comentario_cambio", versionForm.comentario_cambio || "");
    formData.append("archivo", archivo);

    try {
      const response = await fetch(`${API_URL}/guiones/${selectedGuionId}/versiones`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudo guardar la versión");
      }

      setSuccess("Versión del guion subida correctamente");
      setVersionForm({
        fecha_de_emision: new Date().toISOString().slice(0, 10),
        estado: "Borrador",
        comentario_cambio: "",
      });
      setArchivo(null);
      await fetchVersiones(selectedGuionId);
    } catch (err) {
      setError(err.message || "No se pudo subir la versión");
    }
  };

  const toggleVersionExpandida = (idGuionVersion) => {
    setVersionesExpandidas((prev) => ({ ...prev, [idGuionVersion]: !prev[idGuionVersion] }));
  };

  return (
    <div className="guion-page">
      <header className="guion-header">
        <div className="guion-header__inner">
          <button className="guion-back" type="button" onClick={() => navigate("/proyecto-dashboard")}>
            <ArrowLeft size={18} />
            Volver
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div className="guion-header__badge">
              <FileText size={18} />
              {projectName}
            </div>
            <button
              type="button"
              className="guion-button guion-button--accent"
              style={{ padding: "0.65rem 1rem", fontSize: "0.85rem" }}
              onClick={() => navigate("/escenas", { state: { projectName, projectId } })}
            >
              Ver escenas
            </button>
          </div>
        </div>
      </header>

      <main className="guion-main">
        <section className="guion-panel guion-panel--left">
          <div className="guion-panel__header">
            <div className="guion-panel__title-row">
              <FolderOpen size={20} />
              <h2>Guiones</h2>
            </div>
            <span>{guiones.length} en proyecto</span>
          </div>

          {loading ? (
            <p className="guion-empty">Cargando guiones...</p>
          ) : guiones.length === 0 ? (
            <p className="guion-empty">Aún no hay guiones para este proyecto.</p>
          ) : (
            <div className="guion-list">
              {guiones.map((guion) => (
                <div
                  key={guion.id_guion}
                  role="button"
                  tabIndex={0}
                  className={`guion-item ${selectedGuionId === guion.id_guion ? "guion-item--active" : ""}`}
                  onClick={() => {
                    setSelectedGuionId(guion.id_guion);
                    fetchVersiones(guion.id_guion);
                  }}
                >
                  <div className="guion-item__top">
                    <span className="guion-item__number">#{guion.id_guion}</span>
                    <span className="guion-item__tag">Guion</span>
                    <button
                      type="button"
                      className="guion-item__delete"
                      title="Eliminar guion"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGuion(guion.id_guion);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <strong>{guion.nombre}</strong>
                  <small>{guion.descripcion || "Sin descripción"}</small>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="guion-panel guion-panel--right">
          {esAdmin ? (
            <>
              <div className="guion-form-card">
                <div className="guion-form-card__header">
                  <Sparkles size={18} />
                  <h3>Crear guion</h3>
                </div>

                {error && <div className="guion-message guion-message--error">{error}</div>}
                {success && <div className="guion-message guion-message--success">{success}</div>}

                <div className="guion-origen-toggle" style={{ marginBottom: "1rem" }}>
                  <button
                    type="button"
                    className={`guion-origen-toggle__option ${modoCreacion === "simple" ? "guion-origen-toggle__option--active" : ""}`}
                    onClick={() => setModoCreacion("simple")}
                  >
                    <FileText size={16} />
                    Crear básico
                  </button>
                  <button
                    type="button"
                    className={`guion-origen-toggle__option ${modoCreacion === "cero" ? "guion-origen-toggle__option--active" : ""}`}
                    onClick={() => setModoCreacion("cero")}
                  >
                    <PenLine size={16} />
                    Crear desde cero
                  </button>
                </div>

                {modoCreacion === "simple" ? (
                  <form onSubmit={handleCreateGuion} className="guion-form">
                    <label>
                      Nombre del guion
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        placeholder="Ej. Episode 01 - Opening"
                      />
                    </label>

                    <label>
                      Descripción
                      <textarea
                        rows={4}
                        value={form.descripcion}
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        placeholder="Resumen del guion, tono, estructura o notas del proyecto"
                      />
                    </label>

                    <button type="submit" className="guion-button guion-button--primary">
                      <Plus size={18} />
                      Crear guion
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleCreateGuionDesdeCero} className="guion-form">
                    <label>
                      Nombre del guion
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        placeholder="Ej. Episode 01 - Opening"
                      />
                    </label>

                    <label>
                      Descripción
                      <textarea
                        rows={3}
                        value={form.descripcion}
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        placeholder="Resumen del guion, tono, estructura o notas del proyecto"
                      />
                    </label>

                    <div className="guion-editor-shell">
                      <div className="guion-editor-toolbar">
                        <button type="button" onClick={() => insertarFormatoEditor("**", "**")} title="Negrita">
                          <Bold size={14} />
                        </button>
                        <button type="button" onClick={() => insertarFormatoEditor("*", "*")} title="Cursiva">
                          <Italic size={14} />
                        </button>
                        <button type="button" onClick={() => insertarFormatoEditor("<u>", "</u>")} title="Subrayado">
                          <Underline size={14} />
                        </button>
                        <button type="button" onClick={() => insertarFormatoEditor("\n# ", "\n")} title="Título">
                          <Heading1 size={14} />
                        </button>
                        <button type="button" onClick={() => insertarFormatoEditor("\n- ", "")} title="Lista">
                          <List size={14} />
                        </button>
                        <button type="button" onClick={() => aplicarAlineacionTexto("left")} title="Alinear a la izquierda">
                          <AlignLeft size={14} />
                        </button>
                        <button type="button" onClick={() => aplicarAlineacionTexto("center")} title="Centrar">
                          <AlignCenter size={14} />
                        </button>
                        <button type="button" onClick={() => aplicarAlineacionTexto("right")} title="Alinear a la derecha">
                          <AlignRight size={14} />
                        </button>
                      </div>

                      <textarea
                        ref={editorRef}
                        className={`guion-editor-surface guion-editor-surface--${alineacionTexto}`}
                        rows={18}
                        value={contenidoInicial}
                        onChange={(e) => setContenidoInicial(e.target.value)}
                        placeholder={"ESC. 1 - INT. CASA DE JUAN - DIA\n\nJuan entra a la habitación...\n\nJUAN\n¿Hay alguien ahí?"}
                      />
                    </div>

                    <button type="submit" className="guion-button guion-button--accent">
                      <PenLine size={18} />
                      Crear desde cero
                    </button>
                  </form>
                )}
              </div>

              <div className="guion-form-card">
                <div className="guion-form-card__header">
                  <UploadCloud size={18} />
                  <h3>Nueva versión</h3>
                </div>

                {!selectedGuionId ? (
                  <p className="guion-empty">Selecciona un guion para agregar una versión.</p>
                ) : (
                  <>
                    <div className="guion-origen-toggle">
                      <button
                        type="button"
                        className={`guion-origen-toggle__option ${origenVersion === "archivo" ? "guion-origen-toggle__option--active" : ""}`}
                        onClick={() => setOrigenVersion("archivo")}
                      >
                        <Paperclip size={16} />
                        Subir archivo
                      </button>
                      <button
                        type="button"
                        className={`guion-origen-toggle__option ${origenVersion === "texto" ? "guion-origen-toggle__option--active" : ""}`}
                        onClick={() => setOrigenVersion("texto")}
                      >
                        <PenLine size={16} />
                        Escribir guion
                      </button>
                    </div>

                    <form onSubmit={handleUploadVersion} className="guion-form">
                      <div className="guion-grid">
                        <label>
                          Fecha de emisión
                          <input
                            type="date"
                            value={versionForm.fecha_de_emision}
                            onChange={(e) => setVersionForm({ ...versionForm, fecha_de_emision: e.target.value })}
                          />
                        </label>

                        <label>
                          Estado
                          <select
                            value={versionForm.estado}
                            onChange={(e) => setVersionForm({ ...versionForm, estado: e.target.value })}
                          >
                            <option value="Borrador">Borrador</option>
                            <option value="En revisión">En revisión</option>
                            <option value="Aprobado">Aprobado</option>
                            <option value="Publicado">Publicado</option>
                          </select>
                        </label>
                      </div>

                      <label>
                        Comentario del cambio
                        <textarea
                          rows={3}
                          value={versionForm.comentario_cambio}
                          onChange={(e) => setVersionForm({ ...versionForm, comentario_cambio: e.target.value })}
                          placeholder="Describe la modificación realizada"
                        />
                      </label>

                      {origenVersion === "archivo" ? (
                        <label className="guion-upload">
                          <span>Archivo del guion</span>
                          <input
                            type="file"
                            accept=".pdf,.docx,.fdx"
                            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                          />
                        </label>
                      ) : (
                        <label>
                          Contenido del guion
                          <textarea
                            className="guion-texto-editor"
                            rows={14}
                            value={contenidoTexto}
                            onChange={(e) => setContenidoTexto(e.target.value)}
                            placeholder={"ESC. 1 - INT. CASA DE JUAN - DIA\n\nJuan entra a la habitación...\n\nJUAN\n¿Hay alguien ahí?"}
                          />
                        </label>
                      )}

                      <button type="submit" className="guion-button guion-button--accent">
                        {origenVersion === "archivo" ? <UploadCloud size={18} /> : <PenLine size={18} />}
                        {origenVersion === "archivo" ? "Subir versión" : "Guardar versión"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="guion-form-card">
              <div className="guion-message guion-message--error">
                Solo los administradores pueden crear, editar o eliminar guiones y versiones.
              </div>
            </div>
          )}
        </section>

        <section className="guion-panel guion-panel--wide">
          <div className="guion-panel__header">
            <div className="guion-panel__title-row">
              <CalendarDays size={20} />
              <h2>Versiones</h2>
            </div>
            <span>{versiones.length} registros</span>
          </div>

          {loadingVersions ? (
            <p className="guion-empty">Cargando versiones...</p>
          ) : versiones.length === 0 ? (
            <p className="guion-empty">Todavía no hay versiones para este guion.</p>
          ) : (
            <div className="guion-version-list">
              {versiones.map((version) => (
                <article key={version.id_guion_version} className="guion-version-card">
                  <div className="guion-version-card__header">
                    <span className="guion-version-card__version">Versión {version.numero_de_version}</span>
                    <span className={`guion-version-card__state guion-version-card__state--${version.estado?.toLowerCase().replace(/\s+/g, "-") || "borrador"}`}>
                      {version.estado || "Borrador"}
                    </span>
                  </div>

                  <p className="guion-version-card__date">{version.fecha_de_emision}</p>

                  {version.comentario_cambio && (
                    <p className="guion-version-card__comment">{version.comentario_cambio}</p>
                  )}

                  <div className="guion-version-card__meta">
                    {version.contenido ? (
                      <span className="guion-version-card__origen guion-version-card__origen--texto">
                        <PenLine size={14} /> Escrito en el sistema
                      </span>
                    ) : (
                      <span className="guion-version-card__origen">
                        <Paperclip size={14} /> {version.archivo || "Sin archivo"}
                      </span>
                    )}
                    <span className="guion-version-card__ok"><CheckCircle2 size={14} /> Disponible</span>
                  </div>

                  {version.contenido && (
                    <>
                      <button
                        type="button"
                        className="guion-version-card__toggle"
                        onClick={() => toggleVersionExpandida(version.id_guion_version)}
                      >
                        {versionesExpandidas[version.id_guion_version] ? <EyeOff size={14} /> : <Eye size={14} />}
                        {versionesExpandidas[version.id_guion_version] ? "Ocultar contenido" : "Ver contenido"}
                      </button>
                      {versionesExpandidas[version.id_guion_version] && (
                        <pre className="guion-version-card__contenido">{version.contenido}</pre>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
