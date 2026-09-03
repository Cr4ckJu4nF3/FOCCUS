import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, FileText, FolderOpen, Plus, Sparkles, UploadCloud, CheckCircle2, Trash2 } from "lucide-react";
import API_URL, { getToken } from "../api";
import "../desing/Guion.css";

export default function GuionScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";

  const [guiones, setGuiones] = useState([]);
  const [selectedGuionId, setSelectedGuionId] = useState(null);
  const [versiones, setVersiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [archivo, setArchivo] = useState(null);
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

  const handleUploadVersion = async (e) => {
    e.preventDefault();
    if (!selectedGuionId) {
      setError("Primero selecciona o crea un guion");
      return;
    }

    if (!archivo) {
      setError("Debes adjuntar un archivo del guion");
      return;
    }

    const token = getToken();
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
          <div className="guion-form-card">
            <div className="guion-form-card__header">
              <Sparkles size={18} />
              <h3>Crear guion</h3>
            </div>

            {error && <div className="guion-message guion-message--error">{error}</div>}
            {success && <div className="guion-message guion-message--success">{success}</div>}

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
          </div>

          <div className="guion-form-card">
            <div className="guion-form-card__header">
              <UploadCloud size={18} />
              <h3>Subir versión</h3>
            </div>

            {!selectedGuionId ? (
              <p className="guion-empty">Selecciona un guion para subir una versión.</p>
            ) : (
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

                <label className="guion-upload">
                  <span>Archivo del guion</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.fdx"
                    onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  />
                </label>

                <button type="submit" className="guion-button guion-button--accent">
                  <UploadCloud size={18} />
                  Subir versión
                </button>
              </form>
            )}
          </div>
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
                    <span>Archivo: {version.archivo || "Sin archivo"}</span>
                    <span className="guion-version-card__ok"><CheckCircle2 size={14} /> Disponible</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
