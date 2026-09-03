import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Film, Plus, Sparkles } from "lucide-react";
import API_URL, { getToken } from "../api";
import "../desing/Escena.css";
import { apiFetch } from "../api";

const modoVistaOptions = ["Int", "Ext", "Int/Ext", "Ext/Int"];
const momentoDiaOptions = ["Día", "Noche", "Amanecer", "Atardecer", "Mañana", "Tarde"];

export default function EscenaScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";

  const [guiones, setGuiones] = useState([]);
  const [selectedGuionId, setSelectedGuionId] = useState("");
  const [escenas, setEscenas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEscenas, setLoadingEscenas] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [versiones, setVersiones] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [continuidadForm, setContinuidadForm] = useState({
    tipo: "vestuario",
    etiqueta: "",
    id_personaje: "",
    notas: "",
    archivos: [],
  });

  const [form, setForm] = useState({
    numero_de_escena: "",
    encabezado: "",
    descripcion: "",
    modo_vista: "Int",
    momento_dia: "Día",
    ciudad: "",
    pagina: "",
    fecha_de_grabacion: "",
    dia_dramatico: "",
  });

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
        const nextId = items[0].id_guion;
        setSelectedGuionId(String(nextId));
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

  const fetchVersiones = async (idEscena) => {
    if (!idEscena) return setVersiones([]);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/escenas/${idEscena}/versiones`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "No se pudieron cargar las versiones");
      setVersiones(Array.isArray(data.data) ? data.data : []);
      if (Array.isArray(data.data) && data.data.length > 0) {
        setSelectedVersionId(String(data.data[0].id_escena_version));
      } else {
        setSelectedVersionId("");
      }
    } catch (err) {
      setError(err.message || "Error al cargar versiones");
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

  useEffect(() => {
    if (escenas.length > 0) {
      // cuando hay escenas cargadas, obtener versiones de la primera escena seleccionada
      const id = escenas[0].id_escena;
      fetchVersiones(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escenas]);

  const handleCreateEscena = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedGuionId) {
      setError("Selecciona un guion antes de crear una escena");
      return;
    }

    if (!form.numero_de_escena.trim() || !form.encabezado.trim()) {
      setError("El número y el encabezado de la escena son obligatorios");
      return;
    }

    try {
      const token = getToken();
      const payload = {
        id_guion: Number(selectedGuionId),
        numero_de_escena: form.numero_de_escena,
        encabezado: form.encabezado,
        descripcion: form.descripcion,
        modo_vista: form.modo_vista,
        momento_dia: form.momento_dia,
        ciudad: form.ciudad || null,
        pagina: form.pagina ? Number(form.pagina) : null,
        fecha_de_grabacion: form.fecha_de_grabacion || null,
        dia_dramatico: form.dia_dramatico ? Number(form.dia_dramatico) : null,
      };

      const response = await fetch(`${API_URL}/escenas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "Error al crear la escena");
      }

      setSuccess("Escena creada correctamente");
      setForm({
        numero_de_escena: "",
        encabezado: "",
        descripcion: "",
        modo_vista: "Int",
        momento_dia: "Día",
        ciudad: "",
        pagina: "",
        fecha_de_grabacion: "",
        dia_dramatico: "",
      });
      await fetchEscenas(selectedGuionId);
      await fetchVersiones(escena && escena.id_escena);
    } catch (err) {
      setError(err.message || "No se pudo crear la escena");
    }
  };

  const handleCreateVersion = async (idEscena) => {
    setError("");
    setSuccess("");
    try {
      const token = getToken();
      const form = new FormData();
      form.append("comentario_cambio", "Nueva version via UI");
      const res = await fetch(`${API_URL}/escenas/${idEscena}/versiones`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "No se pudo crear la version");
      setSuccess("Versión creada");
      await fetchVersiones(idEscena);
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
    if (!selectedVersionId) return setError("Selecciona una versión primero");
    if (!continuidadForm.archivos || continuidadForm.archivos.length === 0) return setError("Selecciona al menos un archivo");

    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("tipo", continuidadForm.tipo);
      if (continuidadForm.etiqueta) fd.append("etiqueta", continuidadForm.etiqueta);
      if (continuidadForm.id_personaje) fd.append("id_personaje", continuidadForm.id_personaje);
      if (continuidadForm.notas) fd.append("notas", continuidadForm.notas);
      continuidadForm.archivos.forEach((f) => fd.append("archivos", f));

      const res = await fetch(`${API_URL}/escenas/versiones/${selectedVersionId}/fotos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "No se pudo subir archivos");
      setSuccess("Archivos subidos correctamente");
      setContinuidadForm({ tipo: "vestuario", etiqueta: "", id_personaje: "", notas: "", archivos: [] });
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

      <main className="escena-main">
        <section className="escena-panel">
          <div className="escena-panel__header">
            <div className="escena-panel__title-row">
              <Camera size={20} />
              <h2>Escenas</h2>
            </div>
            <span>{escenas.length} registros</span>
          </div>

          <div className="escena-toolbar">
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
          </div>

          {error && <div className="escena-message escena-message--error">{error}</div>}
          {success && <div className="escena-message escena-message--success">{success}</div>}

          {loading ? (
            <p className="escena-empty">Cargando guiones...</p>
          ) : loadingEscenas ? (
            <p className="escena-empty">Cargando escenas...</p>
          ) : escenas.length === 0 ? (
            <p className="escena-empty">Aún no hay escenas para este guion.</p>
          ) : (
            <div className="escena-list">
              {escenas.map((escena) => (
                <article key={escena.id_escena} className="escena-card">
                  <div className="escena-card__top">
                    <span className="escena-card__number">{escena.numero_de_escena}</span>
                    <span className="escena-card__meta-tag">{escena.modo_vista || "Int"}</span>
                  </div>
                  <h3>{escena.encabezado}</h3>
                  <p>{escena.descripcion || "Sin descripción"}</p>
                  <div className="escena-card__info">
                    <span>{escena.momento_dia || "Día"}</span>
                    <span>{escena.ciudad || "Sin ciudad"}</span>
                    <span>Página {escena.pagina || "-"}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="escena-panel">
          <div className="escena-panel__header">
            <div className="escena-panel__title-row">
              <Camera size={20} />
              <h2>Continuidad visual</h2>
            </div>
            <span>{versiones.length} versiones</span>
          </div>

          <div className="escena-toolbar">
            <label>
              Versión activa
              <select value={selectedVersionId} onChange={(e) => setSelectedVersionId(e.target.value)}>
                {!selectedVersionId && <option value="">Selecciona una versión</option>}
                {versiones.map((v) => (
                  <option key={v.id_escena_version} value={v.id_escena_version}>
                    V{v.numero_version} - {v.comentario_cambio || ""}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="escena-button" onClick={() => handleCreateVersion(escenas[0]?.id_escena)}>
              <Plus size={14} /> Crear versión
            </button>
          </div>

          <form onSubmit={handleUploadContinuidad} className="escena-form">
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
        </section>
        <section className="escena-panel">
          <div className="escena-panel__header">
            <div className="escena-panel__title-row">
              <Sparkles size={20} />
              <h2>Nueva escena</h2>
            </div>
          </div>

          <form onSubmit={handleCreateEscena} className="escena-form">
            <div className="escena-grid">
              <label>
                Número
                <input
                  type="text"
                  value={form.numero_de_escena}
                  onChange={(e) => setForm({ ...form, numero_de_escena: e.target.value })}
                  placeholder="Ej. 12"
                />
              </label>

              <label>
                Página
                <input
                  type="number"
                  value={form.pagina}
                  onChange={(e) => setForm({ ...form, pagina: e.target.value })}
                  placeholder="42"
                />
              </label>
            </div>

            <label>
              Encabezado
              <input
                type="text"
                value={form.encabezado}
                onChange={(e) => setForm({ ...form, encabezado: e.target.value })}
                placeholder="Interior: salón principal - noche"
              />
            </label>

            <label>
              Descripción
              <textarea
                rows={4}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describe la acción, el tono y la intención de la escena"
              />
            </label>

            <div className="escena-grid">
              <label>
                Modo de vista
                <select
                  value={form.modo_vista}
                  onChange={(e) => setForm({ ...form, modo_vista: e.target.value })}
                >
                  {modoVistaOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                Momento del día
                <select
                  value={form.momento_dia}
                  onChange={(e) => setForm({ ...form, momento_dia: e.target.value })}
                >
                  {momentoDiaOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="escena-grid">
              <label>
                Ciudad
                <input
                  type="text"
                  value={form.ciudad}
                  onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                  placeholder="Madrid"
                />
              </label>

              <label>
                Día dramático
                <input
                  type="number"
                  value={form.dia_dramatico}
                  onChange={(e) => setForm({ ...form, dia_dramatico: e.target.value })}
                  placeholder="1"
                />
              </label>
            </div>

            <label>
              Fecha de grabación
              <input
                type="date"
                value={form.fecha_de_grabacion}
                onChange={(e) => setForm({ ...form, fecha_de_grabacion: e.target.value })}
              />
            </label>

            <button type="submit" className="escena-button">
              <Plus size={18} />
              Crear escena
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
