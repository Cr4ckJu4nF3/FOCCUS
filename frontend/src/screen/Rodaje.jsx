import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarRange, MapPinned, Plus, ClipboardList } from "lucide-react";
import API_URL, { getToken } from "../api";
import "../desing/Rodaje.css";

const initialRodajeForm = {
  nombre: "",
  descripcion: "",
  fecha_inicio: "",
  fecha_fin: "",
  locacion: "",
  estado: "Pendiente",
  archivo: "",
};

const initialProcesoForm = {
  nombre: "",
  ubicacion: "",
  fecha: "",
  encargado: "",
  estado: "Pendiente",
  descripcion: "",
  orden: "1",
  archivo: "",
};

export default function RodajeScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";

  const [rodajes, setRodajes] = useState([]);
  const [selectedRodajeId, setSelectedRodajeId] = useState("");
  const [procesos, setProcesos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProcesos, setLoadingProcesos] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rodajeForm, setRodajeForm] = useState(initialRodajeForm);
  const [procesoForm, setProcesoForm] = useState(initialProcesoForm);

  const fetchRodajes = async () => {
    if (!projectId) {
      setRodajes([]);
      setSelectedRodajeId("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/rodajes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudo cargar el plan de rodaje");
      }

      const items = Array.isArray(data.data) ? data.data : [];
      setRodajes(items);

      if (items.length > 0) {
        const firstId = items[0].id_rodaje;
        setSelectedRodajeId(firstId);
        await fetchProcesos(firstId);
      } else {
        setSelectedRodajeId("");
        setProcesos([]);
      }
    } catch (err) {
      setError(err.message || "Error al cargar la planificación");
    } finally {
      setLoading(false);
    }
  };

  const fetchProcesos = async (idRodaje) => {
    if (!idRodaje) {
      setProcesos([]);
      return;
    }

    setLoadingProcesos(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/rodajes/${idRodaje}/procesos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudieron cargar los procesos");
      }

      setProcesos(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los procesos");
    } finally {
      setLoadingProcesos(false);
    }
  };

  useEffect(() => {
    fetchRodajes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreateRodaje = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!rodajeForm.nombre.trim() || !rodajeForm.fecha_inicio || !rodajeForm.fecha_fin) {
      setError("Debes completar el nombre, la fecha de inicio y la fecha de fin");
      return;
    }

    try {
      const token = getToken();
      const payload = {
        id_project: projectId,
        nombre: rodajeForm.nombre,
        descripcion: rodajeForm.descripcion,
        fecha_inicio: rodajeForm.fecha_inicio,
        fecha_fin: rodajeForm.fecha_fin,
        locacion: rodajeForm.locacion,
        estado: rodajeForm.estado,
        archivo: rodajeForm.archivo || null,
      };

      const response = await fetch(`${API_URL}/rodajes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudo crear el plan de rodaje");
      }

      setSuccess("Plan de rodaje creado correctamente");
      setRodajeForm(initialRodajeForm);
      await fetchRodajes();
    } catch (err) {
      setError(err.message || "No se pudo crear el plan");
    }
  };

  const handleCreateProceso = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedRodajeId) {
      setError("Primero crea o selecciona un plan de rodaje");
      return;
    }

    if (!procesoForm.nombre.trim() || !procesoForm.ubicacion.trim() || !procesoForm.fecha) {
      setError("El nombre, la ubicación y la fecha del proceso son obligatorios");
      return;
    }

    try {
      const token = getToken();
      const payload = {
        nombre: procesoForm.nombre,
        ubicacion: procesoForm.ubicacion,
        fecha: procesoForm.fecha,
        encargado: procesoForm.encargado || null,
        estado: procesoForm.estado,
        descripcion: procesoForm.descripcion || null,
        orden: Number(procesoForm.orden) || 1,
        archivo: procesoForm.archivo || null,
      };

      const response = await fetch(`${API_URL}/rodajes/${selectedRodajeId}/procesos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || "No se pudo crear el proceso");
      }

      setSuccess("Proceso agregado correctamente");
      setProcesoForm(initialProcesoForm);
      await fetchProcesos(selectedRodajeId);
    } catch (err) {
      setError(err.message || "No se pudo agregar el proceso");
    }
  };

  return (
    <div className="rodaje-page">
      <header className="rodaje-header">
        <div className="rodaje-header__inner">
          <button type="button" className="rodaje-back" onClick={() => navigate("/proyecto-dashboard")}>
            <ArrowLeft size={18} />
            Volver
          </button>
          <div className="rodaje-header__badge">
            <CalendarRange size={18} />
            {projectName}
          </div>
        </div>
      </header>

      <main className="rodaje-main">
        <section className="rodaje-panel">
          <div className="rodaje-panel__header">
            <div className="rodaje-panel__title-row">
              <CalendarRange size={20} />
              <h2>Plan de rodaje</h2>
            </div>
            <span>{rodajes.length} planes</span>
          </div>

          <div className="rodaje-toolbar">
            <label>
              Plan activo
              <select
                value={selectedRodajeId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedRodajeId(id);
                  fetchProcesos(id);
                }}
              >
                {!selectedRodajeId && <option value="">Selecciona un plan</option>}
                {rodajes.map((rodaje) => (
                  <option key={rodaje.id_rodaje} value={rodaje.id_rodaje}>
                    {rodaje.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <div className="rodaje-message rodaje-message--error">{error}</div>}
          {success && <div className="rodaje-message rodaje-message--success">{success}</div>}

          {loading ? (
            <p className="rodaje-empty">Cargando planes...</p>
          ) : rodajes.length === 0 ? (
            <p className="rodaje-empty">Todavía no hay planes de rodaje para este proyecto.</p>
          ) : (
            <div className="rodaje-list">
              {rodajes.map((rodaje) => (
                <article key={rodaje.id_rodaje} className={`rodaje-card ${selectedRodajeId === rodaje.id_rodaje ? "rodaje-card--active" : ""}`}>
                  <div className="rodaje-card__top">
                    <span className="rodaje-card__tag">{rodaje.estado || "Pendiente"}</span>
                    <span className="rodaje-card__code">{rodaje.id_rodaje}</span>
                  </div>
                  <h3>{rodaje.nombre}</h3>
                  <p>{rodaje.descripcion || "Sin descripción"}</p>
                  <div className="rodaje-card__meta">
                    <span>{rodaje.locacion || "Sin locación"}</span>
                    <span>{rodaje.fecha_inicio} → {rodaje.fecha_fin}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rodaje-panel">
          <div className="rodaje-panel__header">
            <div className="rodaje-panel__title-row">
              <Plus size={20} />
              <h2>Nuevo plan</h2>
            </div>
          </div>

          <form onSubmit={handleCreateRodaje} className="rodaje-form">
            <label>
              Nombre del plan
              <input
                type="text"
                value={rodajeForm.nombre}
                onChange={(e) => setRodajeForm({ ...rodajeForm, nombre: e.target.value })}
                placeholder="Rodaje principal"
              />
            </label>

            <label>
              Descripción
              <textarea
                rows={4}
                value={rodajeForm.descripcion}
                onChange={(e) => setRodajeForm({ ...rodajeForm, descripcion: e.target.value })}
                placeholder="Resumen del bloque de rodaje, objetivos y observaciones"
              />
            </label>

            <div className="rodaje-grid">
              <label>
                Fecha inicio
                <input
                  type="date"
                  value={rodajeForm.fecha_inicio}
                  onChange={(e) => setRodajeForm({ ...rodajeForm, fecha_inicio: e.target.value })}
                />
              </label>

              <label>
                Fecha fin
                <input
                  type="date"
                  value={rodajeForm.fecha_fin}
                  onChange={(e) => setRodajeForm({ ...rodajeForm, fecha_fin: e.target.value })}
                />
              </label>
            </div>

            <div className="rodaje-grid">
              <label>
                Locación
                <input
                  type="text"
                  value={rodajeForm.locacion}
                  onChange={(e) => setRodajeForm({ ...rodajeForm, locacion: e.target.value })}
                  placeholder="Madrid / estudio / exterior"
                />
              </label>

              <label>
                Estado
                <select
                  value={rodajeForm.estado}
                  onChange={(e) => setRodajeForm({ ...rodajeForm, estado: e.target.value })}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En progreso">En progreso</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </label>
            </div>

            <label>
              Documento / archivo relacionado
              <input
                type="text"
                value={rodajeForm.archivo}
                onChange={(e) => setRodajeForm({ ...rodajeForm, archivo: e.target.value })}
                placeholder="cronograma.pdf / agenda-rodaje.xlsx"
              />
            </label>

            <button type="submit" className="rodaje-button">
              <Plus size={18} />
              Crear plan
            </button>
          </form>
        </section>
      </main>

      <section className="rodaje-processes">
        <div className="rodaje-processes__header">
          <div className="rodaje-panel__title-row">
            <ClipboardList size={20} />
            <h2>Procesos del rodaje</h2>
          </div>
          <span>{procesos.length} tareas</span>
        </div>

        <div className="rodaje-processes__content">
          <div className="rodaje-process-list">
            {loadingProcesos ? (
              <p className="rodaje-empty">Cargando procesos...</p>
            ) : procesos.length === 0 ? (
              <p className="rodaje-empty">No hay procesos cargados todavía.</p>
            ) : (
              procesos.map((proceso) => (
                <article key={proceso.id_proceso} className="rodaje-process-item">
                  <div className="rodaje-process-item__header">
                    <span className="rodaje-process-item__state">{proceso.estado || "Pendiente"}</span>
                    <span className="rodaje-process-item__order">#{proceso.orden || 1}</span>
                  </div>
                  <h3>{proceso.nombre}</h3>
                  <p>{proceso.descripcion || "Sin descripción"}</p>
                  <div className="rodaje-process-item__meta">
                    <span><MapPinned size={14} /> {proceso.ubicacion}</span>
                    <span>{proceso.fecha}</span>
                    <span>{proceso.encargado || "Sin responsable"}</span>
                  </div>
                </article>
              ))
            )}
          </div>

          <form onSubmit={handleCreateProceso} className="rodaje-process-form">
            <h3>Agregar proceso</h3>

            <label>
              Nombre del proceso
              <input
                type="text"
                value={procesoForm.nombre}
                onChange={(e) => setProcesoForm({ ...procesoForm, nombre: e.target.value })}
                placeholder="Carga de equipamiento"
              />
            </label>

            <div className="rodaje-grid">
              <label>
                Ubicación
                <input
                  type="text"
                  value={procesoForm.ubicacion}
                  onChange={(e) => setProcesoForm({ ...procesoForm, ubicacion: e.target.value })}
                  placeholder="Set 2 - estudio central"
                />
              </label>

              <label>
                Orden
                <input
                  type="number"
                  min="1"
                  value={procesoForm.orden}
                  onChange={(e) => setProcesoForm({ ...procesoForm, orden: e.target.value })}
                />
              </label>
            </div>

            <div className="rodaje-grid">
              <label>
                Fecha
                <input
                  type="date"
                  value={procesoForm.fecha}
                  onChange={(e) => setProcesoForm({ ...procesoForm, fecha: e.target.value })}
                />
              </label>

              <label>
                Encargado
                <input
                  type="text"
                  value={procesoForm.encargado}
                  onChange={(e) => setProcesoForm({ ...procesoForm, encargado: e.target.value })}
                  placeholder="Director de arte"
                />
              </label>
            </div>

            <label>
              Estado
              <select
                value={procesoForm.estado}
                onChange={(e) => setProcesoForm({ ...procesoForm, estado: e.target.value })}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="En progreso">En progreso</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </label>

            <label>
              Descripción
              <textarea
                rows={3}
                value={procesoForm.descripcion}
                onChange={(e) => setProcesoForm({ ...procesoForm, descripcion: e.target.value })}
                placeholder="Detalles del proceso, criterio, recursos y observaciones"
              />
            </label>

            <label>
              Archivo relacionado
              <input
                type="text"
                value={procesoForm.archivo}
                onChange={(e) => setProcesoForm({ ...procesoForm, archivo: e.target.value })}
                placeholder="cronograma-proceso.pdf"
              />
            </label>

            <button type="submit" className="rodaje-button rodaje-button--secondary">
              <Plus size={18} />
              Agregar proceso
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
