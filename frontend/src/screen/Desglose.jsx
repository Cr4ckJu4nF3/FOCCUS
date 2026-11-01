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
  Link2,
  CameraOff,
} from "lucide-react";
import { apiFetch, getActiveRole, getProjectHeaders, getToken } from "../api";
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
  const idRol = getActiveRole();
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
  const [elementosGaleria, setElementosGaleria] = useState([]);
  const [galeriaProyecto, setGaleriaProyecto] = useState([]);
  const [loadingRequerimientos, setLoadingRequerimientos] = useState(false);
  const [rodajeAsignado, setRodajeAsignado] = useState(null);
  const [mostrarVincularElemento, setMostrarVincularElemento] = useState(false);
  const [mostrarCrearElemento, setMostrarCrearElemento] = useState(false);
  const [elementoSeleccionado, setElementoSeleccionado] = useState("");
  const [etiquetasElemento, setEtiquetasElemento] = useState("");
  const [notasElemento, setNotasElemento] = useState("");
  const [nuevoElemento, setNuevoElemento] = useState({
    tipo: "personaje",
    nombre: "",
    categoria: "",
    descripcion: "",
    etiquetas: "",
    notas: "",
    personajes_vinculados: [],
  });
  const [fotoNuevoElemento, setFotoNuevoElemento] = useState(null);
  const [guardandoElemento, setGuardandoElemento] = useState(false);

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

  const fetchGaleria = async () => {
    if (!projectId) return;
    try {
      const response = await apiFetch(`/projects/${encodeURIComponent(projectId)}/galeria`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo cargar la galería");
      }
      setGaleriaProyecto(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "No se pudo cargar la galería del proyecto");
    }
  };

  useEffect(() => {
    // Loading state is set as the project's asynchronous data requests start.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGuiones();
    fetchDiasRodaje();
    fetchGaleria();
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
      setElementosGaleria(data.data?.elementos_galeria || []);
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
    setMostrarVincularElemento(false);
    setMostrarCrearElemento(false);
    fetchDesglose(selectedGuionId);
  };

  const recargarElementosEscena = async () => {
    if (!escenaActiva) return;
    const response = await apiFetch(`/escenas/${escenaActiva.id_escena}/desglose`);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.detail || data.message || "No se pudieron actualizar los elementos de la escena");
    }
    setElementosGaleria(data.data?.elementos_galeria || []);
    await fetchDesglose(selectedGuionId);
  };

  const handleVincularElemento = async (event) => {
    event.preventDefault();
    setError("");
    if (!elementoSeleccionado || !escenaActiva) return;
    setGuardandoElemento(true);
    try {
      const response = await apiFetch(`/escenas/${escenaActiva.id_escena}/desglose/galeria`, {
        method: "POST",
        body: JSON.stringify({
          id_galeria: Number(elementoSeleccionado),
          etiquetas: etiquetasElemento.trim() || null,
          notas: notasElemento.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo vincular el elemento");
      }
      setElementoSeleccionado("");
      setEtiquetasElemento("");
      setNotasElemento("");
      setMostrarVincularElemento(false);
      setSuccess("Elemento vinculado a la escena");
      await recargarElementosEscena();
    } catch (linkError) {
      setError(linkError.message || "No se pudo vincular el elemento");
    } finally {
      setGuardandoElemento(false);
    }
  };

  const handleCrearElementoVinculado = async (event) => {
    event.preventDefault();
    setError("");
    setGuardandoElemento(true);
    try {
      const formData = new FormData();
      formData.append("tipo", nuevoElemento.tipo);
      formData.append("nombre", nuevoElemento.nombre.trim());
      formData.append("categoria", nuevoElemento.categoria.trim());
      formData.append("descripcion", nuevoElemento.descripcion.trim());
      formData.append("etiquetas", nuevoElemento.etiquetas.trim());
      formData.append("notas", nuevoElemento.notas.trim());
      (nuevoElemento.personajes_vinculados || []).forEach((idGaleria) => {
        formData.append("personajes_vinculados", String(idGaleria));
      });
      if (fotoNuevoElemento) formData.append("foto", fotoNuevoElemento);

      const response = await apiFetch(
        `/escenas/${escenaActiva.id_escena}/desglose/galeria/nuevo`,
        { method: "POST", headers: {}, body: formData },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo crear y vincular el elemento");
      }
      setNuevoElemento({
        tipo: "personaje",
        nombre: "",
        categoria: "",
        descripcion: "",
        etiquetas: "",
        notas: "",
        personajes_vinculados: [],
      });
      setFotoNuevoElemento(null);
      setMostrarCrearElemento(false);
      setSuccess("Elemento creado en Galería y vinculado a la escena");
      await Promise.all([fetchGaleria(), recargarElementosEscena()]);
    } catch (createError) {
      setError(createError.message || "No se pudo crear el elemento");
    } finally {
      setGuardandoElemento(false);
    }
  };

  const handleDesvincularElemento = async (idGaleria) => {
    if (!escenaActiva || !window.confirm("¿Desvincular este elemento de la escena? Seguirá guardado en Galería.")) return;
    setError("");
    try {
      const response = await apiFetch(
        `/escenas/${escenaActiva.id_escena}/desglose/galeria/${idGaleria}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || "No se pudo desvincular el elemento");
      }
      setSuccess("Elemento desvinculado; la ficha sigue en Galería");
      await recargarElementosEscena();
    } catch (removeError) {
      setError(removeError.message || "No se pudo desvincular el elemento");
    }
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
        headers: { ...getProjectHeaders(), Authorization: `Bearer ${token}` },
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
    <div className={`dsg-page ${esAdmin ? "module-role-admin" : "module-role-user"}`}>
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
                        {(escena.elementos_galeria || []).map((item) => (
                          <span key={item.id_galeria} className="dsg-tag dsg-tag--gallery">
                            {item.tipo}: {item.nombre}
                          </span>
                        ))}
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

            <section className="dsg-gallery-links">
              <div className="dsg-gallery-links__header">
                <div>
                  <h4>Elementos vinculados</h4>
                  <p>Personajes, lugares y objetos usados en esta escena desde Galería.</p>
                </div>
                <span>{elementosGaleria.length}</span>
              </div>
              {elementosGaleria.length === 0 ? (
                <p className="dsg-empty dsg-gallery-links__empty">Todavía no hay fichas vinculadas a esta escena.</p>
              ) : (
                <div className="dsg-gallery-items">
                  {elementosGaleria.map((item) => (
                    <article className="dsg-gallery-item" key={item.id_galeria}>
                      {item.archivo_path ? (
                        <img src={`${API_URL}/assets/${item.archivo_path}`} alt="" />
                      ) : (
                        <span className="dsg-gallery-item__placeholder"><CameraOff size={18} /></span>
                      )}
                      <div className="dsg-gallery-item__content">
                        <span className={`dsg-gallery-item__type dsg-gallery-item__type--${item.tipo}`}>
                          {item.tipo}
                        </span>
                        <strong>{item.nombre}</strong>
                        {item.categoria && <small>{item.categoria}</small>}
                        {item.etiquetas && <span className="dsg-gallery-item__tags">{item.etiquetas}</span>}
                        {item.personajes_vinculados?.length > 0 && (
                          <small>Personajes: {item.personajes_vinculados.map((character) => character.nombre).join(", ")}</small>
                        )}
                        {item.notas && <p>{item.notas}</p>}
                        {item.foto_pendiente && <small className="dsg-gallery-item__pending">Imagen pendiente de agregar en Galería</small>}
                      </div>
                      {esAdmin && (
                        <button
                          type="button"
                          className="dsg-req-item__delete"
                          onClick={() => handleDesvincularElemento(item.id_galeria)}
                          title="Desvincular de la escena"
                        >
                          <Link2Off size={15} />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {esAdmin && (
                <div className="dsg-gallery-links__actions">
                  <button
                    type="button"
                    className="dsg-button dsg-button--ghost"
                    onClick={() => {
                      setMostrarCrearElemento(false);
                      setMostrarVincularElemento((visible) => !visible);
                    }}
                  >
                    <Link2 size={15} /> Vincular de Galería
                  </button>
                  <button
                    type="button"
                    className="dsg-button"
                    onClick={() => {
                      setMostrarVincularElemento(false);
                      setMostrarCrearElemento((visible) => !visible);
                    }}
                  >
                    <Plus size={15} /> Crear aquí
                  </button>
                </div>
              )}
              {esAdmin && mostrarVincularElemento && (
                <form className="dsg-form dsg-gallery-form" onSubmit={handleVincularElemento}>
                  <label>
                    Ficha existente
                    <select
                      value={elementoSeleccionado}
                      onChange={(event) => setElementoSeleccionado(event.target.value)}
                      required
                    >
                      <option value="">Selecciona un personaje, lugar u objeto</option>
                      {galeriaProyecto
                        .filter((item) => !elementosGaleria.some((linked) => String(linked.id_galeria) === String(item.id_galeria)))
                        .map((item) => (
                          <option key={item.id_galeria} value={item.id_galeria}>
                            {item.tipo} · {item.nombre}{item.categoria ? ` (${item.categoria})` : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Etiquetas de uso
                    <input
                      value={etiquetasElemento}
                      onChange={(event) => setEtiquetasElemento(event.target.value)}
                      placeholder="Ej. protagonista, vestuario rojo"
                      maxLength={255}
                    />
                  </label>
                  <label>
                    Notas de esta escena
                    <textarea rows={2} value={notasElemento} onChange={(event) => setNotasElemento(event.target.value)} />
                  </label>
                  <div className="dsg-form__actions">
                    <button type="button" className="dsg-button dsg-button--ghost" onClick={() => setMostrarVincularElemento(false)}>Cancelar</button>
                    <button type="submit" className="dsg-button" disabled={guardandoElemento}>
                      <Link2 size={15} /> {guardandoElemento ? "Vinculando…" : "Vincular a escena"}
                    </button>
                  </div>
                </form>
              )}
              {esAdmin && mostrarCrearElemento && (
                <form className="dsg-form dsg-gallery-form" onSubmit={handleCrearElementoVinculado}>
                  <div className="dsg-grid">
                    <label>
                      Tipo de ficha
                      <select
                        value={nuevoElemento.tipo}
                        onChange={(event) => setNuevoElemento((current) => ({ ...current, tipo: event.target.value }))}
                      >
                        <option value="personaje">Personaje</option>
                        <option value="lugar">Lugar</option>
                        <option value="objeto">Objeto</option>
                      </select>
                    </label>
                    <label>
                      Categoría
                      <input
                        value={nuevoElemento.categoria}
                        onChange={(event) => setNuevoElemento((current) => ({ ...current, categoria: event.target.value }))}
                        placeholder="Ej. Protagonista, Interior, Utilería"
                        maxLength={80}
                      />
                    </label>
                  </div>
                  <label>
                    Nombre
                    <input
                      value={nuevoElemento.nombre}
                      onChange={(event) => setNuevoElemento((current) => ({ ...current, nombre: event.target.value }))}
                      maxLength={150}
                      required
                    />
                  </label>
                  <label>
                    Descripción
                    <textarea
                      rows={3}
                      value={nuevoElemento.descripcion}
                      onChange={(event) => setNuevoElemento((current) => ({ ...current, descripcion: event.target.value }))}
                      required
                    />
                  </label>
                  {nuevoElemento.tipo === "lugar" && (
                    <label>
                      Personajes vinculados a este lugar
                      <select
                        multiple
                        value={(nuevoElemento.personajes_vinculados || []).map(String)}
                        onChange={(event) => setNuevoElemento((current) => ({
                          ...current,
                          personajes_vinculados: Array.from(
                            event.target.selectedOptions,
                            (option) => Number(option.value),
                          ),
                        }))}
                      >
                        {elementosGaleria
                          .filter((item) => item.tipo === "personaje")
                          .map((item) => (
                            <option key={item.id_galeria} value={item.id_galeria}>{item.nombre}</option>
                          ))}
                      </select>
                      <small>Los personajes vinculados a la escena aparecen aquí; mantén Ctrl/Cmd para elegir varios. Crea primero las fichas nuevas.</small>
                    </label>
                  )}
                  <div className="dsg-grid">
                    <label>
                      Etiquetas de uso
                      <input
                        value={nuevoElemento.etiquetas}
                        onChange={(event) => setNuevoElemento((current) => ({ ...current, etiquetas: event.target.value }))}
                        placeholder="Ej. protagonista, interior"
                        maxLength={255}
                      />
                    </label>
                    <label>
                      Foto opcional
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFotoNuevoElemento(event.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <label>
                    Notas para esta escena
                    <textarea
                      rows={2}
                      value={nuevoElemento.notas}
                      onChange={(event) => setNuevoElemento((current) => ({ ...current, notas: event.target.value }))}
                    />
                  </label>
                  <p className="dsg-gallery-form__hint">
                    Se guardará la ficha en Galería y quedará vinculada a esta escena. Si no agregas una foto, podrás subirla después desde Galería.
                  </p>
                  <div className="dsg-form__actions">
                    <button type="button" className="dsg-button dsg-button--ghost" onClick={() => setMostrarCrearElemento(false)}>Cancelar</button>
                    <button type="submit" className="dsg-button" disabled={guardandoElemento}>
                      <Plus size={15} /> {guardandoElemento ? "Guardando…" : "Crear y vincular"}
                    </button>
                  </div>
                </form>
              )}
            </section>

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
