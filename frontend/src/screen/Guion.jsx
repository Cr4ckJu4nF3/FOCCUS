import { useEffect, useRef, useState } from "react";
import { useBlocker, useSearchParams } from "react-router-dom";
import CodigoChip from "../componentes/CodigoChip";
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
  Check,
  Users,
  MapPin,
  Bold,
  Italic,
  Underline,
  Clapperboard,
  House,
  Image,
  Moon,
  Package,
  Search,
  Sun,
  Sunrise,
  Sunset,
  Trees,
  Undo2,
  Redo2,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  ArrowRightToLine,
} from "lucide-react";
import API_URL, { getActiveRole, getProjectHeaders, getToken } from "../api";
import { GalleryModal } from "./Galeria";
import {
  TIPOS_BLOQUE,
  SIGUIENTE_ENTER,
  SIGUIENTE_TAB,
  claseBloque,
  crearBloqueHtml,
  estimarPaginas,
  extraerEscenas,
  generarPdfGuion,
  htmlABloques,
  htmlATextoPlano,
  limpiarHtmlGuion,
  normalizarHtmlGuion,
  tipoDeElemento,
} from "../utils/guionBloques";
import {
  analizarEncabezadoEscena,
  camposEscenaVacios,
  encabezadoDesdeCamposEscena,
  planificarSincronizacionEscenas,
} from "../utils/guionEscenas";
import EstadoVista from "../componentes/EstadoVista";
import { hayCambiosGuion } from "../utils/guionBorrador";
import "../desing/Guion.css";
import "../desing/GuionPagina.css";

const fetchWithProject = (url, options = {}) =>
  globalThis.fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...getProjectHeaders() },
  });

const ESTADOS_VERSION = ["Borrador", "Pendiente", "En revisión", "Aprobado", "En Rodaje", "Completado", "Finalizado", "Archivado"];

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

function NotasVersion({ version, projectId }) {
  const [notas, setNotas] = useState([]);
  const [contenido, setContenido] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState(false);
  const [exito, setExito] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const cargar = async () => {
      try {
        const response = await fetch(`${API_URL}/guiones/versiones/${version.id_guion_version}/notas`, {
          headers: { Authorization: `Bearer ${getToken()}`, "X-Project-Id": projectId },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(extraerMensajeError(data, "No se pudieron cargar las notas"));
        setNotas(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "No se pudieron cargar las notas");
          setErrorCarga(true);
        }
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    };
    cargar();
    return () => controller.abort();
  }, [version.id_guion_version, projectId, intento]);

  const guardar = async (event) => {
    event.preventDefault();
    const texto = contenido.trim();
    if (!texto || cargando || errorCarga || guardando) return;
    setGuardando(true);
    setError("");
    setExito("");
    try {
      const response = await fetch(`${API_URL}/guiones/versiones/${version.id_guion_version}/notas`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "X-Project-Id": projectId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contenido: texto }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(extraerMensajeError(data, "No se pudo guardar la nota"));
      setNotas((actuales) => [data.data, ...actuales]);
      setContenido("");
      setExito("Nota guardada en esta versión.");
    } catch (err) {
      setError(err.message || "No se pudo guardar la nota");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="guion-notas" aria-label={`Notas de la versión ${version.numero_de_version}`}>
      <h2>Notas de la versión {version.numero_de_version}</h2>
      {cargando && <p role="status">Cargando notas…</p>}
      {error && <p className="guion-notas__error" role="alert">{error}</p>}
      {exito && <p role="status">{exito}</p>}
      {!cargando && errorCarga && (
        <button className="guion-reader__action" type="button" onClick={() => {
          setError("");
          setErrorCarga(false);
          setCargando(true);
          setIntento((actual) => actual + 1);
        }}>Volver a cargar notas</button>
      )}
      {!cargando && !error && notas.length === 0 && <p>Aún no hay notas para esta versión.</p>}
      {notas.length > 0 && (
        <ul className="guion-notas__lista">
          {notas.map((nota) => (
            <li key={nota.id_nota}>
              <p>{nota.contenido}</p>
              <small>Usuario {nota.id_user}{nota.fecha_creacion ? ` · ${nota.fecha_creacion}` : ""}</small>
            </li>
          ))}
        </ul>
      )}
      <form className="guion-form" onSubmit={guardar}>
        <label htmlFor="nota-version">Agregar nota a esta versión</label>
        <textarea id="nota-version" rows={3} value={contenido} onChange={(event) => setContenido(event.target.value)} disabled={guardando} required />
        <button className="guion-reader__action guion-reader__action--primary" type="submit" disabled={cargando || errorCarga || guardando || !contenido.trim()}>
          {guardando ? "Guardando nota…" : "Guardar nota"}
        </button>
      </form>
    </section>
  );
}

export default function GuionScreen() {
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName")?.trim() || "";
  const idRol = getActiveRole();
  const esAdmin = idRol === 1001;

  // vista principal: lista de guiones | editor "crear desde cero" | detalle de un guion
  const [vista, setVista] = useState("lista");

  const [guiones, setGuiones] = useState([]);
  const [loading, setLoading] = useState(Boolean(projectId));
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
  const [tipoBloqueActual, setTipoBloqueActual] = useState("accion");
  const editorRef = useRef(null);
  const ultimaSeleccionRef = useRef(null); // ultimo cursor/seleccion dentro del editor, para restaurarlo tras usar la barra de herramientas o insertar un personaje/escenario

  // Modo "por escenas" dentro del editor de creacion desde cero: en vez de
  // un solo bloque de texto, se escribe escena por escena. Cada escena es
  // un buffer independiente ({numero, texto}); al crear el guion, cada una
  // se persiste como una fila real en la tabla escenas (no es solo visual).
  const [escenasActivo, setEscenasActivo] = useState(false);
  const [escenasBorrador, setEscenasBorrador] = useState([]);
  const [escenaActivaIndex, setEscenaActivaIndex] = useState(0);
  const [dialogoEscena, setDialogoEscena] = useState(false);
  const [formEscena, setFormEscena] = useState(camposEscenaVacios());
  const [camposEscenaEditados, setCamposEscenaEditados] = useState(new Set());
  const [contextoEscena, setContextoEscena] = useState(null);
  const [errorFormEscena, setErrorFormEscena] = useState("");
  const [cambiosEscenaPendientes, setCambiosEscenaPendientes] = useState([]);
  const [sincronizacionesPendientes, setSincronizacionesPendientes] = useState([]);
  const [sincronizandoEscenas, setSincronizandoEscenas] = useState(false);
  const campoEncabezadoEscenaRef = useRef(null);

  // Personajes / Escenarios del proyecto (atajos dentro del editor)
  const [personajes, setPersonajes] = useState([]);
  const [escenarios, setEscenarios] = useState([]);
  const [nuevoPersonaje, setNuevoPersonaje] = useState("");
  const [nuevoEscenario, setNuevoEscenario] = useState("");
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [galleryPickerType, setGalleryPickerType] = useState(null);
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryEditorType, setGalleryEditorType] = useState(null);
  const [galleryInitialName, setGalleryInitialName] = useState("");
  const [galleryFormError, setGalleryFormError] = useState("");
  const [savingGalleryForm, setSavingGalleryForm] = useState(false);
  const [lugarPendiente, setLugarPendiente] = useState(null);
  const [tipoEscenaLugar, setTipoEscenaLugar] = useState("INT.");
  const [momentoEscenaLugar, setMomentoEscenaLugar] = useState("DÍA");
  const [fichaPendienteDeUso, setFichaPendienteDeUso] = useState(null);
  const [detallesUso, setDetallesUso] = useState("");
  const [usoSinCambios, setUsoSinCambios] = useState(false);
  const [guardandoVersionUso, setGuardandoVersionUso] = useState(false);
  const [errorVersionUso, setErrorVersionUso] = useState("");
  // Edicion en linea de un personaje/escenario existente (id + valor en edicion)
  const [editandoPersonajeId, setEditandoPersonajeId] = useState(null);
  const [editandoPersonajeNombre, setEditandoPersonajeNombre] = useState("");
  const [editandoEscenarioId, setEditandoEscenarioId] = useState(null);
  const [editandoEscenarioNombre, setEditandoEscenarioNombre] = useState("");

  // Detalle de un guion
  const [guionActivo, setGuionActivo] = useState(null);
  const [tabDetalle, setTabDetalle] = useState("contenido"); // contenido | versiones
  const [versiones, setVersiones] = useState([]);
  const [loadingVersiones, setLoadingVersiones] = useState(false);
  const [versionStatusUpdating, setVersionStatusUpdating] = useState({});
  const [versionLectorId, setVersionLectorId] = useState(null);
  const [editandoContenido, setEditandoContenido] = useState(false);
  const [contenidoEditado, setContenidoEditado] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [herramientasVisibles, setHerramientasVisibles] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);

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
  const [versionInicial, setVersionInicial] = useState("");
  const [contenidoOriginal, setContenidoOriginal] = useState("");
  const [escenaInicial, setEscenaInicial] = useState("");
  const hayBorrador = hayCambiosGuion({
    vista, editandoContenido, contenidoInicial, escenasActivo, escenasBorrador,
    ceroForm, versionForm, versionInicial,
    contenidoEditado, contenidoOriginal,
    cambiosEscenaPendientes, dialogoEscena, formEscena, escenaInicial,
  });
  const hayDatosSubida = showUploadModal && Boolean(uploadForm.nombre || uploadForm.descripcion || uploadArchivo);
  const hayDatosVersion = showVersionModal && (
    JSON.stringify(versionForm) !== versionInicial || Boolean(archivoVersion)
  );
  const hayPendientes = hayBorrador || hayDatosSubida || hayDatosVersion || sincronizacionesPendientes.length > 0;
  const confirmarSalida = () => {
    if (guardandoEdicion || sincronizandoEscenas || uploading) {
      window.alert("Espera a que termine el guardado o la sincronización antes de salir.");
      return false;
    }
    return !hayPendientes || window.confirm(
      "Hay cambios sin guardar o escenas pendientes de sincronizar. ¿Deseas salir y perderlos?",
    );
  };
  useBlocker(() => !confirmarSalida());
  useEffect(() => {
    if (!hayPendientes && !guardandoEdicion && !sincronizandoEscenas && !uploading) return undefined;
    const advertir = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", advertir);
    return () => window.removeEventListener("beforeunload", advertir);
  }, [hayPendientes, guardandoEdicion, sincronizandoEscenas, uploading]);

  const fetchGuiones = async () => {
    if (!projectId) {
      setGuiones([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/guiones?id_project=${projectId}`, {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      const response = await fetchWithProject(`${API_URL}/guiones/${idGuion}/versiones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(extraerMensajeError(data, "No se pudieron cargar las versiones"));
      }
      const versionesCargadas = Array.isArray(data.data) ? data.data : [];
      setVersiones(versionesCargadas);
      return versionesCargadas;
    } catch (err) {
      setError(err.message || "No se pudieron cargar las versiones");
      return [];
    } finally {
      setLoadingVersiones(false);
    }
  };

  const handleCambiarEstadoVersion = async (version, estado) => {
    if (!guionActivo || !version || version.estado === estado) return;
    setError("");
    setSuccess("");
    setVersionStatusUpdating((current) => ({ ...current, [version.id_guion_version]: true }));
    try {
      const token = getToken();
      const response = await fetchWithProject(
        `${API_URL}/guiones/${guionActivo.id_guion}/versiones/${version.id_guion_version}/estado`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ estado }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo actualizar el estado de la versión"));
      }
      setVersiones((current) =>
        current.map((item) =>
          item.id_guion_version === version.id_guion_version ? { ...item, estado: data.data.estado } : item,
        ),
      );
      setSuccess(`Versión ${version.numero_de_version} actualizada a «${data.data.estado}»`);
      await fetchGuiones();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el estado de la versión");
    } finally {
      setVersionStatusUpdating((current) => ({ ...current, [version.id_guion_version]: false }));
    }
  };

  const fetchPersonajes = async () => {
    if (!projectId) return;
    try {
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/projects/${projectId}/personajes`, {
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
      const response = await fetchWithProject(`${API_URL}/projects/${projectId}/escenarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setEscenarios(Array.isArray(data.data) ? data.data : []);
    } catch {
      // silencioso
    }
  };

  const fetchGalleryItems = async () => {
    if (!projectId) return;
    setGalleryLoading(true);
    setGalleryError("");
    try {
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/projects/${projectId}/galeria`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(extraerMensajeError(data, "No se pudo cargar la galería"));
      }
      setGalleryItems(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setGalleryError(err.message || "No se pudo cargar la galería");
    } finally {
      setGalleryLoading(false);
    }
  };

  const abrirDetalle = async (guion, tab = "contenido", versionId = null) => {
    setGuionActivo(guion);
    setTabDetalle(tab);
    setVersionLectorId(null);
    setEditandoContenido(false);
    setVista("detalle");
    const disponibles = await fetchVersiones(guion.id_guion);
    const versionEnlace = disponibles.find((version) => String(version.id_guion_version) === versionId);
    if (versionEnlace) {
      setVersionLectorId(versionEnlace.id_guion_version);
      setVista("lector");
    }
  };

  // Enlace desde el buscador de códigos: /guion?guion=ID (y &version=ID abre la pestaña de versiones)
  const [searchParams, setSearchParams] = useSearchParams();
  const guionParam = searchParams.get("guion");
  const versionParam = searchParams.get("version");
  useEffect(() => {
    if (!guionParam || loading) return;
    const found = guiones.find((g) => String(g.id_guion) === guionParam);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (found) abrirDetalle(found, versionParam ? "versiones" : "contenido", versionParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guionParam, versionParam, loading, guiones]);

  const volverALista = () => {
    setVista("lista");
    setGuionActivo(null);
    setVersiones([]);
    setVersionLectorId(null);
    setEditandoContenido(false);
    fetchGuiones();
  };

  const handleDeleteGuion = async (idGuion, evt) => {
    evt.stopPropagation();
    if (!window.confirm("¿Eliminar este guion? No se puede deshacer.")) return;
    try {
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/guiones/${idGuion}`, {
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
      const response = await fetchWithProject(`${API_URL}/guiones/archivo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo subir el guion"));
      }
      setSuccess(data.data?.mensaje_extraccion
        ? `Guion subido. ${data.data.mensaje_extraccion}`
        : "Guion subido correctamente");
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
    setCambiosEscenaPendientes([]);
    fetchPersonajes();
    fetchEscenarios();
    fetchGalleryItems();
  };

  const cancelarCreacionDesdeCero = () => {
    if (!confirmarSalida()) return;
    setVista("lista");
    setCeroForm({ nombre: "", descripcion: "" });
    setContenidoInicial("");
    setEscenasActivo(false);
    setEscenasBorrador([]);
    setEscenaActivaIndex(0);
    setCambiosEscenaPendientes([]);
    cerrarFormularioEscena();
  };

  const iniciarEscrituraVersion = () => {
    if (!guionActivo) return;
    setOrigenVersion("texto");
    setShowVersionModal(false);
    setError("");
    setSuccess("");
    setContenidoInicial("");
    setEscenasActivo(false);
    setEscenasBorrador([]);
    setEscenaActivaIndex(0);
    setCambiosEscenaPendientes([]);
    setVista("crear-version");
    fetchPersonajes();
    fetchEscenarios();
    fetchGalleryItems();
  };

  const cancelarEscrituraVersion = () => {
    if (!confirmarSalida()) return;
    setError("");
    setContenidoInicial("");
    setEscenasActivo(false);
    setEscenasBorrador([]);
    setEscenaActivaIndex(0);
    setCambiosEscenaPendientes([]);
    cerrarFormularioEscena();
    setOrigenVersion("archivo");
    setVista("detalle");
    setTabDetalle("versiones");
  };

  // Buffer de texto que el editor lee/escribe en este momento: si el modo
  // por escenas esta activo, es el texto de la escena seleccionada; si no,
  // es el bloque de texto plano de siempre. Todas las funciones del editor
  // (negrita, alinear, insertar personaje/escenario) pasan por aca, asi
  // funcionan igual en ambos modos sin duplicar logica.
  const textoEditorActivo = escenasActivo
    ? (escenasBorrador[escenaActivaIndex]?.texto ?? "")
    : contenidoInicial;

  const setTextoEditorActivo = (valor) => {
    if (escenasActivo) {
      setEscenasBorrador((prev) =>
        prev.map((esc, i) =>
          i === escenaActivaIndex
            ? { ...esc, texto: typeof valor === "function" ? valor(esc.texto) : valor }
            : esc
        )
      );
    } else {
      setContenidoInicial(valor);
    }
  };

  const handleActivarModoEscenas = () => {
    // Al activar, lo que ya estaba escrito pasa a ser el contenido de la Escena 1
    setEscenasBorrador([{ numero: 1, texto: contenidoInicial }]);
    setEscenaActivaIndex(0);
    setEscenasActivo(true);
  };

  const handleDesactivarModoEscenas = () => {
    // Al desactivar, se unen todas las escenas de vuelta en un solo bloque
    // (union con salto de linea real en HTML, no con "\n" que el navegador ignora)
    setContenidoInicial(escenasBorrador.map((esc) => esc.texto).join(""));
    setEscenasActivo(false);
  };

  const handleNuevaEscenaBorrador = () => {
    setEscenasBorrador((prev) => [...prev, { numero: prev.length + 1, texto: "" }]);
    setEscenaActivaIndex(escenasBorrador.length); // el nuevo bloque queda ultimo
  };

  const handleEliminarEscenaBorrador = (idx) => {
    if (escenasBorrador.length <= 1) return; // siempre debe quedar al menos una escena
    if (escenasBorrador[idx]?.texto && !window.confirm("Esta escena contiene texto. ¿Deseas eliminarla del borrador?")) return;
    setEscenasBorrador((prev) => prev.filter((_, i) => i !== idx).map((esc, i) => ({ ...esc, numero: i + 1 })));
    setEscenaActivaIndex((prevActivo) => {
      if (idx < prevActivo) return prevActivo - 1;
      if (idx === prevActivo) return Math.max(0, Math.min(prevActivo, escenasBorrador.length - 2));
      return prevActivo;
    });
  };

  // El editor es un <div contentEditable>, no un input controlado: React no
  // sincroniza su innerHTML en cada render (eso rompería el cursor mientras
  // se escribe). En vez de eso, este efecto solo empuja el contenido guardado
  // hacia el DOM cuando cambia CUAL escena/buffer se esta mostrando (cambio
  // de pestaña, activar/desactivar modo escenas, o entrar de nuevo a la
  // pantalla). Mientras se escribe, el flujo va al reves: onInput lee el DOM
  // y lo guarda en el estado de React (ver sincronizarDesdeEditor).
  useEffect(() => {
    if ((vista === "crear-cero" || vista === "crear-version") && editorRef.current) {
      editorRef.current.innerHTML = textoEditorActivo || "";
    }
    ultimaSeleccionRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escenaActivaIndex, escenasActivo, vista]);

  useEffect(() => {
    if (vista === "lector" && editandoContenido && editorRef.current) {
      editorRef.current.innerHTML = limpiarHtmlGuion(contenidoEditado || "");
      ultimaSeleccionRef.current = null;
      editorRef.current.focus();
    }
    // Including contenidoEditado would reset the caret after every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, editandoContenido, versionLectorId]);

  const sincronizarDesdeEditor = () => {
    if (editorRef.current) {
      if (vista === "lector" && editandoContenido) {
        setContenidoEditado(editorRef.current.innerHTML);
      } else {
        setTextoEditorActivo(editorRef.current.innerHTML);
      }
    }
  };

  // Recuerda donde esta el cursor/seleccion dentro del editor mientras se
  // escribe o se hace clic en el, para poder devolverselo justo despues de
  // usar un boton de la barra de herramientas (que le quita el foco).
  const guardarSeleccionEditor = () => {
    const seleccion = window.getSelection();
    if (seleccion && seleccion.rangeCount > 0 && editorRef.current?.contains(seleccion.anchorNode)) {
      ultimaSeleccionRef.current = seleccion.getRangeAt(0).cloneRange();
      const bloque = bloqueDeNodo(seleccion.anchorNode);
      setTipoBloqueActual(tipoDeElemento(bloque) || "accion");
    }
  };

  // ---- Bloques tipados (escena, acción, personaje, paréntesis, diálogo, transición)
  // Devuelve el bloque (hijo directo del editor) que contiene el nodo dado.
  const bloqueDeNodo = (nodo) => {
    const editor = editorRef.current;
    if (!editor || !nodo || !editor.contains(nodo) || nodo === editor) return null;
    let actual = nodo;
    while (actual.parentNode && actual.parentNode !== editor) actual = actual.parentNode;
    return actual.nodeType === Node.ELEMENT_NODE ? actual : null;
  };

  const colocarCursor = (nodo, alFinal = false) => {
    const rango = document.createRange();
    rango.selectNodeContents(nodo);
    rango.collapse(!alFinal);
    const seleccion = window.getSelection();
    seleccion.removeAllRanges();
    seleccion.addRange(rango);
    ultimaSeleccionRef.current = rango.cloneRange();
  };

  // Garantiza que el cursor esté dentro de un <p class="gb ..."> y lo devuelve.
  const asegurarBloqueActual = () => {
    const editor = editorRef.current;
    if (!editor) return null;
    restaurarFocoEnEditor();
    const seleccion = window.getSelection();
    let bloque = bloqueDeNodo(seleccion.anchorNode);
    if (!bloque || bloque.tagName !== "P") {
      document.execCommand("formatBlock", false, "P");
      bloque = bloqueDeNodo(window.getSelection().anchorNode);
    }
    if (!bloque) {
      editor.insertAdjacentHTML("beforeend", crearBloqueHtml("accion"));
      bloque = editor.lastElementChild;
      colocarCursor(bloque);
    }
    if (!tipoDeElemento(bloque)) bloque.setAttribute("class", claseBloque("accion"));
    return bloque;
  };

  const establecerTipoBloque = (tipo) => {
    const bloque = asegurarBloqueActual();
    if (!bloque) return;
    bloque.setAttribute("class", claseBloque(tipo));
    setTipoBloqueActual(tipo);
    sincronizarDesdeEditor();
    guardarSeleccionEditor();
  };

  // Inserta bloques (HTML con <p class="gb ...">) después del bloque actual,
  // o en su lugar si está vacío, y deja el cursor en el último.
  const insertarBloquesEnEditor = (html) => {
    const editor = editorRef.current;
    if (!editor) return;
    restaurarFocoEnEditor();
    const actual = bloqueDeNodo(window.getSelection().anchorNode);
    const plantilla = document.createElement("div");
    plantilla.innerHTML = html;
    const nuevos = Array.from(plantilla.children);
    if (!nuevos.length) return;
    if (!actual) {
      nuevos.forEach((n) => editor.appendChild(n));
    } else {
      const vacio = !(actual.textContent || "").trim();
      nuevos.reduce((previo, n) => { previo.after(n); return n; }, actual);
      if (vacio) actual.remove();
    }
    const ultimo = nuevos[nuevos.length - 1];
    colocarCursor(ultimo, true);
    setTipoBloqueActual(tipoDeElemento(ultimo) || "accion");
    sincronizarDesdeEditor();
  };

  const cargarEscenasPersistidas = async (idGuion) => {
    if (!idGuion) return [];
    const response = await fetchWithProject(`${API_URL}/guiones/${idGuion}/escenas`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(extraerMensajeError(data, "No se pudieron cargar las escenas existentes"));
    }
    return Array.isArray(data.data) ? data.data : [];
  };

  const abrirFormularioEscena = async (forzarCreacion = false) => {
    const editor = editorRef.current;
    if (!editor) {
      setError("Abre el editor del guion antes de agregar una escena");
      return;
    }
    guardarSeleccionEditor();
    const seleccion = window.getSelection();
    const bloqueActual = bloqueDeNodo(seleccion?.anchorNode);
    const escenasEditor = Array.from(editor.children).filter((bloque) => tipoDeElemento(bloque) === "escena");
    const elementosEditor = Array.from(editor.children);
    const indiceBloqueActual = elementosEditor.indexOf(bloqueActual);
    const escenaAnterior = !forzarCreacion && bloqueActual && tipoDeElemento(bloqueActual) !== "escena"
      ? elementosEditor.slice(0, indiceBloqueActual + 1).filter((bloque) => tipoDeElemento(bloque) === "escena").at(-1)
      : null;
    const bloqueEscena = !forzarCreacion
      ? (tipoDeElemento(bloqueActual) === "escena"
        ? bloqueActual
        : (escenasActivo && escenasEditor.length === 1 ? escenasEditor[0] : escenaAnterior))
      : null;
    const esEdicion = Boolean(bloqueEscena);
    const indiceLocal = esEdicion ? escenasEditor.indexOf(bloqueEscena) : null;
    const escenasAntes = esEdicion
      ? escenasEditor.slice(0, indiceLocal).length
      : elementosEditor
        .slice(0, bloqueActual ? elementosEditor.indexOf(bloqueActual) + 1 : elementosEditor.length)
        .filter((bloque) => tipoDeElemento(bloque) === "escena").length;
    const escenasPrevias = escenasActivo
      ? escenasBorrador.slice(0, escenaActivaIndex).reduce((total, escena) => total + extraerEscenas(escena.texto).length, 0)
      : 0;
    const indiceGlobal = escenasPrevias + escenasAntes;
    const encabezadoActual = esEdicion ? bloqueEscena.textContent.trim() : "";
    let escenasExistentes = [];
    try {
      if (guionActivo?.id_guion) {
        escenasExistentes = await cargarEscenasPersistidas(guionActivo.id_guion);
      }
    } catch (err) {
      setError(err.message || "No se pudieron cargar las escenas del guion");
      return;
    }

    let escenaGuardada = null;
    if (esEdicion) {
      const coincidencias = escenasExistentes.filter(
        (escena) => String(escena.encabezado || "").trim().toLocaleUpperCase() === encabezadoActual.toLocaleUpperCase(),
      );
      if (coincidencias.length === 1) escenaGuardada = coincidencias[0];
    }
    const cambioPendiente = cambiosEscenaPendientes.find((cambio) => cambio.indice === indiceGlobal);
    const datosEscena = cambioPendiente?.form || escenaGuardada;
    const siguienteNumero = escenasExistentes.reduce(
      (maximo, escena) => Math.max(maximo, Number(escena.numero_de_escena) || 0),
      0,
    ) + 1;
    const numeroBorrador = cambiosEscenaPendientes.reduce(
      (maximo, cambio) => Math.max(maximo, Number(cambio.form?.numero_de_escena) || 0),
      0,
    ) + 1;
    const numero = datosEscena?.numero_de_escena || (
      esEdicion
        ? indiceGlobal + 1
        : Math.max(siguienteNumero, indiceGlobal + 1, numeroBorrador)
    );
    const datosEncabezado = analizarEncabezadoEscena(encabezadoActual);
    const valores = {
      ...camposEscenaVacios(numero),
      ...datosEscena,
      encabezado: encabezadoActual || datosEscena?.encabezado || "",
      modo_vista: datosEscena?.modo_vista || datosEncabezado?.modo_vista || "",
      momento_dia: datosEscena?.momento_dia || datosEncabezado?.momento_dia || "",
      ciudad: datosEscena?.ciudad || "",
      pagina: datosEscena?.pagina ?? "",
      fecha_de_grabacion: datosEscena?.fecha_de_grabacion || "",
      dia_dramatico: datosEscena?.dia_dramatico ?? "",
      estado: datosEscena?.estado || "Pendiente",
    };
    valores.encabezado = encabezadoDesdeCamposEscena(valores);
    setEscenaInicial(JSON.stringify(valores));
    setContextoEscena({
      esEdicion,
      indiceLocal,
      indiceGlobal,
      id_escena: escenaGuardada?.id_escena || cambioPendiente?.id_escena || null,
      encabezadoAnterior: encabezadoActual,
      insertarAlInicio: escenasActivo && !esEdicion && escenasEditor.length === 0,
    });
    setCamposEscenaEditados(new Set());
    setFormEscena(valores);
    setErrorFormEscena("");
    setDialogoEscena(true);
  };

  const cerrarFormularioEscena = () => {
    setDialogoEscena(false);
    setErrorFormEscena("");
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const cancelarFormularioEscena = () => {
    if (JSON.stringify(formEscena) !== escenaInicial &&
        !window.confirm("Hay cambios en la escena sin aplicar. ¿Descartarlos?")) return;
    cerrarFormularioEscena();
  };

  const actualizarCampoEscena = (campo, valor) => {
    const camposEditados = new Set(camposEscenaEditados);
    camposEditados.add(campo);
    setCamposEscenaEditados(camposEditados);
    setFormEscena((actual) => {
      const siguiente = { ...actual, [campo]: valor };
      if (campo === "encabezado") {
        const detectado = analizarEncabezadoEscena(valor);
        if (detectado) {
          siguiente.modo_vista = detectado.modo_vista;
          siguiente.momento_dia = detectado.momento_dia;
          if (detectado.numero_de_escena) {
            siguiente.numero_de_escena = detectado.numero_de_escena;
          }
        }
      } else if (campo === "modo_vista" || campo === "momento_dia") {
        siguiente.encabezado = encabezadoDesdeCamposEscena(siguiente, camposEditados);
      } else if (campo === "ciudad" || campo === "numero_de_escena") {
        siguiente.encabezado = encabezadoDesdeCamposEscena(siguiente, camposEditados);
      }
      return siguiente;
    });
  };

  const confirmarFormularioEscena = () => {
    const encabezado = encabezadoDesdeCamposEscena(formEscena, camposEscenaEditados).trim();
    const numero = formEscena.numero_de_escena.trim();
    if (!numero || !encabezado) {
      setErrorFormEscena("El número y el encabezado de la escena son obligatorios.");
      return;
    }
    if (encabezado.length > 250) {
      setErrorFormEscena("El encabezado no puede superar 250 caracteres.");
      return;
    }
    if (formEscena.pagina && (!Number.isInteger(Number(formEscena.pagina)) || Number(formEscena.pagina) < 1)) {
      setErrorFormEscena("La página debe ser un número entero mayor que cero.");
      return;
    }
    if (formEscena.dia_dramatico && (!Number.isInteger(Number(formEscena.dia_dramatico)) || Number(formEscena.dia_dramatico) < 1)) {
      setErrorFormEscena("El día dramático debe ser un número entero mayor que cero.");
      return;
    }

    const editor = editorRef.current;
    if (!editor || !contextoEscena) {
      setErrorFormEscena("No se encontró el editor donde aplicar la escena.");
      return;
    }
    let indiceLocal = contextoEscena.indiceLocal;
    if (contextoEscena.esEdicion) {
      const bloquesEscena = Array.from(editor.children).filter((bloque) => tipoDeElemento(bloque) === "escena");
      const bloque = bloquesEscena[indiceLocal];
      if (!bloque) {
        setErrorFormEscena("La escena que ibas a editar ya no está en el documento.");
        return;
      }
      bloque.textContent = encabezado.toLocaleUpperCase();
    } else {
      let encabezadoInsertado;
      if (contextoEscena.insertarAlInicio) {
        const plantilla = document.createElement("div");
        plantilla.innerHTML = crearBloqueHtml("escena", encabezado);
        encabezadoInsertado = plantilla.firstElementChild;
        editor.insertBefore(encabezadoInsertado, editor.firstChild);
        if (editor.children.length === 1) {
          editor.appendChild(document.createElement("p"));
          editor.lastElementChild.className = claseBloque("accion");
          editor.lastElementChild.appendChild(document.createElement("br"));
        }
        const siguienteBloque = encabezadoInsertado.nextElementSibling || encabezadoInsertado;
        colocarCursor(siguienteBloque);
      } else {
        const encabezadoHtml = crearBloqueHtml("escena", encabezado) + crearBloqueHtml("accion");
        insertarBloquesEnEditor(encabezadoHtml);
        const seleccionado = window.getSelection();
        const bloqueAccion = bloqueDeNodo(seleccionado?.anchorNode);
        encabezadoInsertado = bloqueAccion?.previousElementSibling;
      }
      if (!encabezadoInsertado || tipoDeElemento(encabezadoInsertado) !== "escena") {
        setErrorFormEscena("No se pudo insertar el encabezado en el guion.");
        return;
      }
      const bloquesEscena = Array.from(editor.children).filter((bloque) => tipoDeElemento(bloque) === "escena");
      indiceLocal = bloquesEscena.indexOf(encabezadoInsertado);
    }
    sincronizarDesdeEditor();

    const escenasPrevias = escenasActivo
      ? escenasBorrador.slice(0, escenaActivaIndex).reduce((total, escena) => total + extraerEscenas(escena.texto).length, 0)
      : 0;
    const indiceGlobal = escenasPrevias + indiceLocal;
    setCambiosEscenaPendientes((actuales) => {
      const conservados = contextoEscena.esEdicion
        ? actuales.filter((cambio) => cambio.indice !== indiceGlobal)
        : actuales.map((cambio) => (
          cambio.indice >= indiceGlobal ? { ...cambio, indice: cambio.indice + 1 } : cambio
        ));
      return [
        ...conservados,
        {
          indice: indiceGlobal,
          id_escena: contextoEscena.id_escena,
          form: { ...formEscena, encabezado: encabezado.toLocaleUpperCase() },
        },
      ];
    });
    setError("");
    cerrarFormularioEscena();
  };

  const sincronizarEscenasPersistidas = async (idGuion, html, cambios = cambiosEscenaPendientes) => {
    const escenasDocumento = extraerEscenas(limpiarHtmlGuion(html));
    if (!escenasDocumento.length) return { cantidad: 0, advertencias: [] };
    const persistidas = await cargarEscenasPersistidas(idGuion);
    const plan = planificarSincronizacionEscenas(escenasDocumento, persistidas, cambios);
    if (plan.errores.length) throw new Error(plan.errores.join(" "));

    for (const accion of plan.acciones) {
      const esEdicion = accion.tipo === "actualizar";
      const url = esEdicion
        ? `${API_URL}/escenas/${accion.id_escena}`
        : `${API_URL}/escenas`;
      const payload = esEdicion
        ? accion.payload
        : { ...accion.payload, id_guion: Number(idGuion) };
      const response = await fetchWithProject(url, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(
          data,
          `No se pudo ${esEdicion ? "actualizar" : "crear"} la escena ${payload.numero_de_escena}.`,
        ));
      }
    }

    const advertencias = [];
    if (plan.noRelacionadas.length) {
      advertencias.push(
        `Se conservaron ${plan.noRelacionadas.length} escena(s) persistida(s) que no aparecen en esta versión; no se borró ningún dato.`,
      );
    }
    return { cantidad: plan.acciones.length, advertencias };
  };

  const encolarSincronizacionEscenas = (tarea) => {
    setSincronizacionesPendientes((pendientes) => [
      ...pendientes.filter((pendiente) => String(pendiente.idGuion) !== String(tarea.idGuion)),
      tarea,
    ]);
  };

  const limpiarSincronizacionEscenaPendiente = (idGuion) => {
    setSincronizacionesPendientes((pendientes) =>
      pendientes.filter((pendiente) => String(pendiente.idGuion) !== String(idGuion)),
    );
  };

  const reintentarSincronizacionEscenas = async () => {
    if (!sincronizacionesPendientes.length || sincronizandoEscenas) return;
    const sincronizacionPendiente = sincronizacionesPendientes[0];
    setSincronizandoEscenas(true);
    setError("");
    try {
      const resultado = await sincronizarEscenasPersistidas(
        sincronizacionPendiente.idGuion,
        sincronizacionPendiente.html,
        sincronizacionPendiente.cambios,
      );
      limpiarSincronizacionEscenaPendiente(sincronizacionPendiente.idGuion);
      setCambiosEscenaPendientes([]);
      setSuccess(`Escenas sincronizadas correctamente.${resultado.advertencias.length ? ` ${resultado.advertencias.join(" ")}` : ""}`);
    } catch (err) {
      setError(`El guion está guardado, pero la sincronización de escenas sigue pendiente: ${err.message}`);
    } finally {
      setSincronizandoEscenas(false);
    }
  };

  const manejarTeclaEditor = (event) => {
    if (event.key !== "Enter" && event.key !== "Tab") return;
    if (event.key === "Enter" && event.shiftKey) return;
    if (event.key === "Tab" && (event.ctrlKey || event.metaKey || event.altKey)) return;
    event.preventDefault();
    const bloque = asegurarBloqueActual();
    if (!bloque) return;
    const tipo = tipoDeElemento(bloque) || "accion";

    if (event.key === "Tab") {
      establecerTipoBloque(SIGUIENTE_TAB[tipo] || "accion");
      return;
    }

    // Enter: parte el bloque en el cursor y el nuevo toma el tipo siguiente
    const rango = window.getSelection().getRangeAt(0);
    rango.deleteContents();
    const resto = rango.cloneRange();
    resto.selectNodeContents(bloque);
    resto.setStart(rango.endContainer, rango.endOffset);
    const fragmento = resto.extractContents();
    const nuevo = document.createElement("p");
    // Enter sobre un bloque vacío de diálogo/paréntesis vuelve a Acción
    const vacio = !(bloque.textContent || "").trim() && !(fragmento.textContent || "").trim();
    nuevo.className = claseBloque(vacio && ["dialogo", "parentesis", "personaje"].includes(tipo) ? "accion" : SIGUIENTE_ENTER[tipo]);
    nuevo.appendChild(fragmento);
    if (!(nuevo.textContent || "").trim() && !nuevo.querySelector("br")) nuevo.appendChild(document.createElement("br"));
    if (!(bloque.textContent || "").trim() && !bloque.querySelector("br")) bloque.appendChild(document.createElement("br"));
    bloque.after(nuevo);
    colocarCursor(nuevo);
    setTipoBloqueActual(tipoDeElemento(nuevo));
    sincronizarDesdeEditor();
  };

  // Pegar siempre como texto plano (evita HTML sucio de Word / web)
  const manejarPegadoEditor = (event) => {
    event.preventDefault();
    const texto = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, texto);
    sincronizarDesdeEditor();
  };

  const restaurarFocoEnEditor = () => {
    const input = editorRef.current;
    if (!input) return;
    input.focus();
    const seleccion = window.getSelection();
    if (ultimaSeleccionRef.current && input.contains(ultimaSeleccionRef.current.startContainer)) {
      seleccion.removeAllRanges();
      seleccion.addRange(ultimaSeleccionRef.current);
    } else {
      const rangoFinal = document.createRange();
      rangoFinal.selectNodeContents(input);
      rangoFinal.collapse(false);
      seleccion.removeAllRanges();
      seleccion.addRange(rangoFinal);
      ultimaSeleccionRef.current = rangoFinal.cloneRange();
    }
  };

  // Aplica un comando de formato (negrita, cursiva, subrayado, lista) sobre
  // la seleccion actual del editor. El formato se ve aplicado de inmediato,
  // no se insertan simbolos como "**" en el texto.
  const ejecutarComandoEditor = (comando, valor = null) => {
    if (!editorRef.current) return;
    restaurarFocoEnEditor();
    document.execCommand(comando, false, valor);
    sincronizarDesdeEditor();
    guardarSeleccionEditor();
  };

  const herramientasFormatoEditor = () => {
    const base = { type: "button", onMouseDown: (event) => event.preventDefault() };
    return (
      <>
        <select
          className="guion-editor-tipo-bloque"
          aria-label="Tipo de bloque"
          title="Tipo de bloque (Tab cambia el tipo, Enter crea el siguiente)"
          value={tipoBloqueActual}
          onMouseDown={guardarSeleccionEditor}
          onChange={(event) => establecerTipoBloque(event.target.value)}
        >
          {TIPOS_BLOQUE.map((t) => <option key={t.id} value={t.id}>{t.etiqueta}</option>)}
        </select>
        <span className="guion-editor-toolbar__divider" aria-hidden="true" />
        <button {...base} onClick={() => ejecutarComandoEditor("bold")} title="Negrita" aria-label="Negrita"><Bold size={16} /></button>
        <button {...base} onClick={() => ejecutarComandoEditor("italic")} title="Cursiva" aria-label="Cursiva"><Italic size={16} /></button>
        <button {...base} onClick={() => ejecutarComandoEditor("underline")} title="Subrayado" aria-label="Subrayado"><Underline size={16} /></button>
        <button {...base} onClick={() => ejecutarComandoEditor("undo")} title="Deshacer" aria-label="Deshacer"><Undo2 size={16} /></button>
        <button {...base} onClick={() => ejecutarComandoEditor("redo")} title="Rehacer" aria-label="Rehacer"><Redo2 size={16} /></button>
        <span className="guion-editor-toolbar__divider" aria-hidden="true" />
        <button
          {...base}
          className="guion-editor-scene-button"
          onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }}
          onClick={() => abrirFormularioEscena()}
          title="Crear una escena o editar el encabezado seleccionado"
        >
          <Clapperboard size={15} /> Escena
        </button>
        <button
          {...base}
          className="guion-editor-scene-button"
          onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }}
          onClick={() => abrirFormularioEscena(true)}
          title="Agregar una escena nueva en esta posición"
        >
          <Plus size={14} /> Nueva escena
        </button>
        <button {...base} className="guion-editor-scene-button" onClick={() => insertarBloquesEnEditor(crearBloqueHtml("personaje", "PERSONAJE") + crearBloqueHtml("dialogo"))} title="Insertar personaje con diálogo"><MessageSquare size={15} /> Diálogo</button>
        <button {...base} className="guion-editor-scene-button" onClick={() => insertarBloquesEnEditor(crearBloqueHtml("transicion", "CORTE A:") + crearBloqueHtml("escena", "INT. LOCACIÓN - DÍA"))} title="Insertar transición"><ArrowRightToLine size={15} /> Transición</button>
      </>
    );
  };

  const botonOcultarHerramientas = () => (
    <button
      type="button"
      className="guion-editor-toolbar-toggle"
      onClick={() => setHerramientasVisibles((visible) => !visible)}
      aria-expanded={herramientasVisibles}
    >
      {herramientasVisibles ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      {herramientasVisibles ? "Ocultar herramientas" : "Mostrar herramientas"}
    </button>
  );

  const insertarFichaGaleria = (item) => {
    if (item.tipo === "lugar") {
      const tipoLugar = `${item.tipo_escenario || item.categoria || ""}`.toLowerCase();
      setTipoEscenaLugar(tipoLugar.includes("interior") || tipoLugar === "int" ? "INT." : "EXT.");
      setMomentoEscenaLugar("DÍA");
      setLugarPendiente(item);
      setGalleryPickerType(null);
      return;
    }
    iniciarRegistroUso(item);
  };

  const iniciarRegistroUso = (item, encabezadoEscena = "") => {
    if (!item.id_galeria) {
      setSuccess(`${item.nombre} no tiene ficha vinculada en Galería; se insertó sin agregar una versión de uso.`);
      insertarFichaEnEditor({ ...item, encabezado_escena: encabezadoEscena });
      return;
    }
    setFichaPendienteDeUso({ ...item, encabezado_escena: encabezadoEscena });
    setDetallesUso("");
    setUsoSinCambios(false);
    setErrorVersionUso("");
    setGalleryPickerType(null);
  };

  const insertarFichaEnEditor = (item) => {
    const nombre = item.nombre || "";
    let html;

    if (item.tipo === "personaje") {
      html = crearBloqueHtml("personaje", nombre) + crearBloqueHtml("dialogo");
    } else if (item.tipo === "objeto") {
      const categoria = String(item.categoria || "Objeto").toUpperCase();
      html = crearBloqueHtml("accion", `[${categoria}: ${nombre}]`);
    } else {
      html = crearBloqueHtml("escena", item.encabezado_escena || `${tipoEscenaLugar} ${nombre} - ${momentoEscenaLugar}`) + crearBloqueHtml("accion");
    }

    if (!editorRef.current) return;
    insertarBloquesEnEditor(html);
    setGalleryPickerType(null);
    setGallerySearch("");
  };

  const abrirSelectorGaleria = (tipo) => {
    guardarSeleccionEditor();
    setGalleryPickerType(tipo);
    setGallerySearch("");
    setGalleryError("");
  };

  const confirmarInsercionLugar = () => {
    if (!lugarPendiente) return;
    const encabezado = `${tipoEscenaLugar} ${lugarPendiente.nombre.toUpperCase()} - ${momentoEscenaLugar}`;
    iniciarRegistroUso(lugarPendiente, encabezado);
    setLugarPendiente(null);
  };

  const guardarVersionDeUso = async () => {
    if (!fichaPendienteDeUso || (!usoSinCambios && !detallesUso.trim())) {
      setErrorVersionUso("Describe cómo terminó o se usó este elemento para guardarlo en su historial.");
      return;
    }
    setGuardandoVersionUso(true);
    setErrorVersionUso("");
    try {
      const token = getToken();
      if (usoSinCambios) {
        let fechaUso = "";
        let avisoUso = "";
        try {
          const response = await fetchWithProject(
            `${API_URL}/projects/${encodeURIComponent(projectId)}/galeria/${fichaPendienteDeUso.id_galeria}/uso`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(extraerMensajeError(data, "No se pudo registrar el uso"));
          }
          fechaUso = data.data?.ultimo_uso || new Date().toISOString().slice(0, 10);
        } catch (usageError) {
          avisoUso = `Se insertó en el guion, pero no se pudo actualizar la fecha de último uso en Galería: ${usageError.message || "error de conexión"}.`;
        }
        if (fechaUso) {
          setGalleryItems((current) => current.map((item) =>
            item.id_galeria === fichaPendienteDeUso.id_galeria
              ? { ...item, ultimo_uso: fechaUso }
              : item
          ));
        }
        insertarFichaEnEditor(fichaPendienteDeUso);
        setFichaPendienteDeUso(null);
        setDetallesUso("");
        setUsoSinCambios(false);
        if (avisoUso) {
          setError(avisoUso);
          setSuccess("");
        } else {
          setError("");
          setSuccess("Uso sin cambios registrado e insertado en el guion.");
        }
        return;
      }
      const response = await fetchWithProject(
        `${API_URL}/projects/${encodeURIComponent(projectId)}/galeria/${fichaPendienteDeUso.id_galeria}/versiones`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            detalles_uso: [
              fichaPendienteDeUso.encabezado_escena ? `Escena: ${fichaPendienteDeUso.encabezado_escena}` : "",
              detallesUso.trim(),
            ].filter(Boolean).join("\n\n"),
            id_guion: guionActivo?.id_guion || null,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo registrar el uso"));
      }
      setGalleryItems((current) => current.map((item) =>
        item.id_galeria === fichaPendienteDeUso.id_galeria
          ? {
              ...item,
              total_versiones: (item.total_versiones || 0) + 1,
              versiones_sin_foto: (item.versiones_sin_foto || 0) + 1,
            }
          : item
      ));
      insertarFichaEnEditor(fichaPendienteDeUso);
      setFichaPendienteDeUso(null);
      setDetallesUso("");
      setUsoSinCambios(false);
    } catch (err) {
      setErrorVersionUso(err.message || "No se pudo registrar el uso");
    } finally {
      setGuardandoVersionUso(false);
    }
  };

  const abrirFormularioGaleria = (tipo, nombre = "") => {
    guardarSeleccionEditor();
    setGalleryPickerType(null);
    setGalleryFormError("");
    setGalleryInitialName(nombre);
    setGalleryEditorType(tipo);
  };

  const guardarFichaDesdeGuion = async (form, photo) => {
    setSavingGalleryForm(true);
    setGalleryFormError("");
    const values = { ...form };
    values.descripcion = values.descripcion.trim();
    values.personaje_sinopsis = values.tipo === "personaje" ? values.descripcion : null;
    values.lugar_apariencia = values.tipo === "lugar" ? values.descripcion : null;
    values.ultimo_uso = values.ultimo_uso || null;
    ["categoria", "interprete_nombre", "interprete_descripcion", "lugar_detalle_ubicacion", "lugar_objetos", "lugar_personajes"].forEach((key) => {
      values[key] = values[key]?.trim() || null;
    });
    ["id_personaje", "id_escenario", "id_escena", "id_guion"].forEach((key) => {
      values[key] = values[key] || null;
    });

    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((entry) => formData.append(key, String(entry)));
        } else if (value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });
      formData.append("foto", photo);
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/projects/${encodeURIComponent(projectId)}/galeria`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo guardar la ficha"));
      }

      const createdItem = data.data;
      setGalleryItems((current) => [createdItem, ...current.filter((item) => item.id_galeria !== createdItem.id_galeria)]);
      setGalleryEditorType(null);
      setGalleryInitialName("");
      setSuccess(createdItem.tipo === "objeto"
        ? "Ficha de objeto guardada en la galería del proyecto."
        : `Ficha de ${createdItem.tipo === "personaje" ? "personaje" : "lugar"} guardada y vinculada al proyecto.`);
      if (createdItem.tipo === "personaje") {
        await fetchPersonajes();
      } else if (createdItem.tipo === "lugar") {
        await fetchEscenarios();
      }
      insertarFichaGaleria(createdItem);
    } catch (err) {
      setGalleryFormError(err.message || "No se pudo guardar la ficha");
    } finally {
      setSavingGalleryForm(false);
    }
  };

  const handleCrearPersonaje = (e) => {
    e.preventDefault();
    if (!nuevoPersonaje.trim()) return;
    abrirFormularioGaleria("personaje", nuevoPersonaje.trim());
    setNuevoPersonaje("");
  };

  const iniciarEdicionPersonaje = (p) => {
    setEditandoPersonajeId(p.id_personaje);
    setEditandoPersonajeNombre(p.nombre);
  };

  const cancelarEdicionPersonaje = () => {
    setEditandoPersonajeId(null);
    setEditandoPersonajeNombre("");
  };

  const guardarEdicionPersonaje = async (id_personaje) => {
    if (!editandoPersonajeNombre.trim()) return;
    try {
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/personajes/${id_personaje}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: editandoPersonajeNombre.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setPersonajes((prev) =>
          prev
            .map((p) => (p.id_personaje === id_personaje ? data.data : p))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
        cancelarEdicionPersonaje();
      } else {
        setError(data.message || "No se pudo editar el personaje");
      }
    } catch {
      setError("No se pudo editar el personaje");
    }
  };

  const handleEliminarPersonaje = async (id_personaje) => {
    if (!window.confirm("¿Eliminar este personaje? Esta acción no se puede deshacer.")) return;
    try {
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/personajes/${id_personaje}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setPersonajes((prev) => prev.filter((p) => p.id_personaje !== id_personaje));
        if (editandoPersonajeId === id_personaje) cancelarEdicionPersonaje();
      } else {
        setError(data.message || "No se pudo eliminar el personaje");
      }
    } catch {
      setError("No se pudo eliminar el personaje");
    }
  };

  const handleCrearEscenario = (e) => {
    e.preventDefault();
    if (!nuevoEscenario.trim()) return;
    abrirFormularioGaleria("lugar", nuevoEscenario.trim());
    setNuevoEscenario("");
  };

  const iniciarEdicionEscenario = (esc) => {
    setEditandoEscenarioId(esc.id_escenario);
    setEditandoEscenarioNombre(esc.nombre);
  };

  const cancelarEdicionEscenario = () => {
    setEditandoEscenarioId(null);
    setEditandoEscenarioNombre("");
  };

  const guardarEdicionEscenario = async (id_escenario) => {
    if (!editandoEscenarioNombre.trim()) return;
    try {
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/escenarios/${id_escenario}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: editandoEscenarioNombre.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setEscenarios((prev) =>
          prev
            .map((esc) => (esc.id_escenario === id_escenario ? data.data : esc))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
        cancelarEdicionEscenario();
      } else {
        setError(data.message || "No se pudo editar el escenario");
      }
    } catch {
      setError("No se pudo editar el escenario");
    }
  };

  const handleEliminarEscenario = async (id_escenario) => {
    if (!window.confirm("¿Eliminar este escenario? Esta acción no se puede deshacer.")) return;
    try {
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/escenarios/${id_escenario}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEscenarios((prev) => prev.filter((esc) => esc.id_escenario !== id_escenario));
        if (editandoEscenarioId === id_escenario) cancelarEdicionEscenario();
      } else {
        setError(data.message || "No se pudo eliminar el escenario");
      }
    } catch {
      setError("No se pudo eliminar el escenario");
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
    const hayContenidoEscenas = escenasActivo && escenasBorrador.some((esc) => htmlATextoPlano(esc.texto).trim().length > 0);
    if (!escenasActivo && htmlATextoPlano(contenidoInicial).trim().length === 0) {
      setError("Escribe el contenido inicial del guion antes de crearlo");
      return;
    }
    if (escenasActivo && !hayContenidoEscenas) {
      setError("Escribe contenido en al menos una escena antes de crear el guion");
      return;
    }
    if (escenasActivo && escenasBorrador.some((escena) => extraerEscenas(escena.texto).length === 0)) {
      setError("Cada escena del modo por escenas necesita un encabezado. Usa el botón «Escena» para completarlo antes de guardar.");
      return;
    }

    // El texto completo que se guarda como version del guion. En modo
    // escenas se unen los bloques de cada escena (cada una trae su propio
    // encabezado INT./EXT. como bloque "escena", sin rótulos "ESCENA N").
    const contenidoParaVersion = limpiarHtmlGuion(
      escenasActivo ? escenasBorrador.map((esc) => esc.texto).join("") : contenidoInicial,
    );

    setGuardandoEdicion(true);
    try {
      const token = getToken();
      const response = await fetchWithProject(`${API_URL}/guiones/texto`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: ceroForm.nombre,
          descripcion: ceroForm.descripcion,
          id_project: projectId,
          contenido: contenidoParaVersion,
          fecha_de_emision: new Date().toISOString().slice(0, 10),
          estado: "Borrador",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo crear el guion"));
      }

      // Cada escena (bloque "escena" del guion) se guarda también como fila
      // real en la tabla escenas, ligada al guion recién creado, para usarla
      // en Desglose, Rodaje y Continuidad. Las filas guardan texto plano porque
      // otras pantallas muestran esta descripción tal cual.
      let idGuionNuevo = data.data?.id_guion;
      {
        let escenasParaCrear = extraerEscenas(contenidoParaVersion);
        if (escenasParaCrear.length === 0 && escenasActivo) {
          // Modo escenas sin encabezados INT./EXT.: una escena por pestaña
          escenasParaCrear = escenasBorrador.map((esc) => {
            const textoPlano = htmlATextoPlano(esc.texto);
            const primeraLinea = textoPlano.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
            return { numero: esc.numero, encabezado: primeraLinea || `ESCENA ${esc.numero}`, descripcion: textoPlano };
          });
        }
        for (const esc of escenasParaCrear) {
          try {
            await fetchWithProject(`${API_URL}/escenas`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                id_guion: idGuionNuevo,
                numero_de_escena: String(esc.numero),
                encabezado: (esc.encabezado || `ESCENA ${esc.numero}`).slice(0, 250),
                descripcion: esc.descripcion,
              }),
            });
          } catch {
            // si una escena puntual falla, seguimos con las demas: el guion ya quedo creado
          }
        }
      }

      setSuccess("Guion creado correctamente");
      setCeroForm({ nombre: "", descripcion: "" });
      setContenidoInicial("");
      setEscenasActivo(false);
      setEscenasBorrador([]);
      setEscenaActivaIndex(0);
      setCambiosEscenaPendientes([]);
      setVista("lista");
      await fetchGuiones();
      if (idGuionNuevo) {
        try {
          const resultado = await sincronizarEscenasPersistidas(
            idGuionNuevo,
            contenidoParaVersion,
            cambiosEscenaPendientes,
          );
          limpiarSincronizacionEscenaPendiente(idGuionNuevo);
          setSuccess(`Guion creado correctamente.${resultado.advertencias.length ? ` ${resultado.advertencias.join(" ")}` : ""}`);
        } catch (syncError) {
          encolarSincronizacionEscenas({
            idGuion: idGuionNuevo,
            html: contenidoParaVersion,
            cambios: cambiosEscenaPendientes,
          });
          setError(`El guion se creó, pero no se completó la sincronización de escenas: ${syncError.message}`);
        }
      } else {
        setError("El guion se creó, pero la respuesta no incluyó el identificador necesario para sincronizar sus escenas.");
      }
    } catch (err) {
      setError(err.message || "No se pudo crear el guion");
    } finally {
      setGuardandoEdicion(false);
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
        const response = await fetchWithProject(`${API_URL}/guiones/${guionActivo.id_guion}/versiones/texto`, {
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
        setGuionActivo((actual) => ({ ...actual, id_guion_version_actual: data.data.id_guion_version }));
        setVersionLectorId(data.data.id_guion_version);
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
      const response = await fetchWithProject(`${API_URL}/guiones/${guionActivo.id_guion}/versiones`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo subir la versión"));
      }
      setGuionActivo((actual) => ({ ...actual, id_guion_version_actual: data.data.id_guion_version }));
      setVersionLectorId(data.data.id_guion_version);
      setSuccess(data.data?.mensaje_extraccion
        ? `Versión subida. ${data.data.mensaje_extraccion}`
        : "Versión subida correctamente");
      setArchivoVersion(null);
      setShowVersionModal(false);
      await fetchVersiones(guionActivo.id_guion);
      await fetchGuiones();
    } catch (err) {
      setError(err.message || "No se pudo subir la versión");
    }
  };

  const guardarVersionDesdeEditor = async (event) => {
    event.preventDefault();
    if (!guionActivo) return;

    if (escenasActivo && escenasBorrador.some((escena) => extraerEscenas(escena.texto).length === 0)) {
      setError("Cada escena del modo por escenas necesita un encabezado. Usa el botón «Escena» para completarlo antes de guardar.");
      return;
    }
    const contenido = escenasActivo
      ? escenasBorrador.map((esc) => esc.texto).join("")
      : contenidoInicial;
    if (!htmlATextoPlano(contenido).trim()) {
      setError("Escribe el contenido de esta versión antes de guardarla");
      return;
    }

    setError("");
    setSuccess("");
    setGuardandoEdicion(true);
    try {
      const response = await fetchWithProject(`${API_URL}/guiones/${guionActivo.id_guion}/versiones/texto`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          contenido: limpiarHtmlGuion(contenido),
          fecha_de_emision: versionForm.fecha_de_emision,
          estado: versionForm.estado,
          comentario_cambio: versionForm.comentario_cambio || "",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo guardar la versión"));
      }

      const contenidoGuardado = limpiarHtmlGuion(contenido);
      setGuionActivo((actual) => ({ ...actual, id_guion_version_actual: data.data.id_guion_version }));
      setVersionLectorId(data.data.id_guion_version);
      setContenidoInicial("");
      setEscenasActivo(false);
      setEscenasBorrador([]);
      setEscenaActivaIndex(0);
      setOrigenVersion("archivo");
      setVista("detalle");
      setTabDetalle("versiones");
      setSuccess("Nueva versión escrita y guardada correctamente");
      await Promise.all([fetchVersiones(guionActivo.id_guion), fetchGuiones()]);
      try {
        const resultado = await sincronizarEscenasPersistidas(
          guionActivo.id_guion,
          contenidoGuardado,
          cambiosEscenaPendientes,
        );
        limpiarSincronizacionEscenaPendiente(guionActivo.id_guion);
        setCambiosEscenaPendientes([]);
        if (resultado.advertencias.length) {
          setSuccess(`Nueva versión guardada. ${resultado.advertencias.join(" ")}`);
        }
      } catch (syncError) {
        encolarSincronizacionEscenas({
          idGuion: guionActivo.id_guion,
          html: contenidoGuardado,
          cambios: cambiosEscenaPendientes,
        });
        setError(`La versión se guardó, pero no se completó la sincronización de escenas: ${syncError.message}`);
      }
    } catch (err) {
      setError(err.message || "No se pudo guardar la versión");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const iniciarEdicionContenido = (version = versionSeleccionadaParaLector) => {
    if (!version) return;
    setVersionLectorId(version.id_guion_version);
    const contenidoOriginal = normalizarHtmlGuion(version.contenido || "");
    setContenidoOriginal(contenidoOriginal);
    setContenidoEditado(contenidoOriginal);
    setCambiosEscenaPendientes([]);
    fetchPersonajes();
    fetchEscenarios();
    fetchGalleryItems();
    setEditandoContenido(true);
  };

  const guardarEdicionContenido = async () => {
    if (!guionActivo || !versionSeleccionadaParaLector || !htmlATextoPlano(contenidoEditado).trim()) {
      setError("El contenido del guion no puede estar vacío");
      return;
    }

    setError("");
    setSuccess("");
    setGuardandoEdicion(true);
    const token = getToken();
    try {
      const response = await fetchWithProject(`${API_URL}/guiones/${guionActivo.id_guion}/versiones/texto`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contenido: limpiarHtmlGuion(contenidoEditado),
          fecha_de_emision: new Date().toISOString().slice(0, 10),
          estado: versionSeleccionadaParaLector.estado || "Borrador",
          comentario_cambio: `Edición de la versión ${versionSeleccionadaParaLector.numero_de_version}`,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(extraerMensajeError(data, "No se pudo guardar la edición"));
      }

      setGuionActivo((actual) => ({
        ...actual,
        id_guion_version_actual: data.data.id_guion_version,
      }));
      setVersionLectorId(data.data.id_guion_version);
      setEditandoContenido(false);
      setSuccess("Edición guardada como una nueva versión");
      await Promise.all([fetchVersiones(guionActivo.id_guion), fetchGuiones()]);
      const contenidoGuardado = limpiarHtmlGuion(contenidoEditado);
      try {
        const resultado = await sincronizarEscenasPersistidas(
          guionActivo.id_guion,
          contenidoGuardado,
          cambiosEscenaPendientes,
        );
        limpiarSincronizacionEscenaPendiente(guionActivo.id_guion);
        setCambiosEscenaPendientes([]);
        if (resultado.advertencias.length) {
          setSuccess(`Edición guardada como nueva versión. ${resultado.advertencias.join(" ")}`);
        }
      } catch (syncError) {
        encolarSincronizacionEscenas({
          idGuion: guionActivo.id_guion,
          html: contenidoGuardado,
          cambios: cambiosEscenaPendientes,
        });
        setError(`La nueva versión quedó guardada, pero no se completó la sincronización de escenas: ${syncError.message}`);
      }
    } catch (err) {
      setError(err.message || "No se pudo guardar la edición");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const versionActualDeGuionActivo =
    versiones.find((v) => v.id_guion_version === guionActivo?.id_guion_version_actual) || versiones[0];
  const versionSeleccionadaParaLector =
    versiones.find((version) => version.id_guion_version === versionLectorId) || versionActualDeGuionActivo;

  const descargarGuionPdf = async (version = versionSeleccionadaParaLector) => {
    const contenido = version?.contenido;
    if (!contenido) {
      setError("Esta versión no tiene texto disponible para generar un PDF");
      return;
    }

    setGenerandoPdf(true);
    try {
      const nombreArchivo = Array.from(`${guionActivo?.nombre || "guion"}-v${version.numero_de_version}`)
        .filter((caracter) => caracter.charCodeAt(0) >= 32 && !'<>:"/\\|?*'.includes(caracter))
        .join("")
        .trim() || "guion";
      await generarPdfGuion({
        titulo: guionActivo?.nombre || "Guion",
        subtitulo: `Versión ${version.numero_de_version} · ${version.estado || "Sin estado"}`,
        html: contenido,
        nombreArchivo,
      });
    } catch (err) {
      setError(err.message || "No se pudo generar el PDF");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const normalizarNombreGaleria = (nombre) =>
    String(nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();
  const obtenerFichaGaleria = (tipo, id, nombre) => galleryItems.find((item) =>
    item.tipo === tipo && (item[tipo === "personaje" ? "id_personaje" : "id_escenario"] === id
      || normalizarNombreGaleria(item.nombre) === normalizarNombreGaleria(nombre))
  );
  const galleryPersonajes = galleryItems.filter((item) => item.tipo === "personaje");
  const galleryLugares = galleryItems.filter((item) => item.tipo === "lugar");
  const fichasGaleria = [
    ...personajes.map((personaje) => {
      const ficha = obtenerFichaGaleria("personaje", personaje.id_personaje, personaje.nombre);
      return {
        ...ficha,
        tipo: "personaje",
        id: personaje.id_personaje,
        nombre: personaje.nombre,
        descripcion: ficha?.personaje_sinopsis || ficha?.descripcion || "",
        categoria: ficha?.categoria || "Personaje",
      };
    }),
    ...galleryPersonajes
      .filter((item) => !personajes.some((personaje) =>
        personaje.id_personaje === item.id_personaje
        || normalizarNombreGaleria(personaje.nombre) === normalizarNombreGaleria(item.nombre)
      ))
      .map((item) => ({ ...item, id: item.id_galeria, descripcion: item.personaje_sinopsis || item.descripcion || "" })),
    ...escenarios.map((escenario) => {
      const ficha = obtenerFichaGaleria("lugar", escenario.id_escenario, escenario.nombre);
      return {
        ...ficha,
        tipo: "lugar",
        id: escenario.id_escenario,
        id_escenario: escenario.id_escenario,
        nombre: escenario.nombre,
        descripcion: ficha?.lugar_apariencia || ficha?.descripcion || "",
        categoria: ficha?.categoria || "Locación",
      };
    }),
    ...galleryLugares
      .filter((item) => !escenarios.some((escenario) =>
        escenario.id_escenario === item.id_escenario
        || normalizarNombreGaleria(escenario.nombre) === normalizarNombreGaleria(item.nombre)
      ))
      .map((item) => ({ ...item, id: item.id_galeria, descripcion: item.lugar_apariencia || item.descripcion || "" })),
    ...galleryItems.filter((item) => item.tipo === "objeto"),
  ];
  const fichasGaleriaFiltradas = fichasGaleria.filter((item) => {
    const coincideTipo = galleryPickerType === "todos" || item.tipo === galleryPickerType;
    const busqueda = gallerySearch.trim().toLocaleLowerCase();
    return coincideTipo && (!busqueda || `${item.nombre} ${item.categoria || ""} ${item.descripcion || ""}`.toLocaleLowerCase().includes(busqueda));
  });

  return (
    <div className={`guion-page ${esAdmin ? "module-role-admin" : "module-role-user"}`}>
      <main className={`guion-main guion-main--single ${vista === "lector" || vista === "crear-cero" || vista === "crear-version" ? "guion-main--writing" : ""}`}>
        {(error || success) && (
          <div className={`guion-message ${error ? "guion-message--error" : "guion-message--success"}`}>
            {error || success}
            {sincronizacionesPendientes.length > 0 && (
              <button
                type="button"
                className="guion-message__retry"
                onClick={reintentarSincronizacionEscenas}
                disabled={sincronizandoEscenas}
              >
                {sincronizandoEscenas
                  ? `Sincronizando escenas (${sincronizacionesPendientes.length})…`
                  : `Reintentar sincronización (${sincronizacionesPendientes.length})`}
              </button>
            )}
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
              <EstadoVista tipo="cargando" mensaje="Cargando guiones…" />
            ) : guiones.length === 0 && error ? (
              <EstadoVista tipo="error" mensaje={error} accionTexto="Reintentar" onAccion={fetchGuiones} />
            ) : guiones.length === 0 ? (
              <EstadoVista
                mensaje="Aún no hay guiones en este proyecto."
                accionTexto={esAdmin ? "Crear el primer guion" : undefined}
                onAccion={esAdmin ? () => setShowChoiceModal(true) : undefined}
              />
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
                    <CodigoChip codigo={g.codigo} />
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
        {(vista === "crear-cero" || vista === "crear-version") && (
          <div className={`guion-reader guion-composer ${vista === "crear-cero" ? "guion-composer--new" : ""}`}>
            <div className="guion-writing-bar">
              <button className="guion-reader__back" type="button" onClick={vista === "crear-version" ? cancelarEscrituraVersion : cancelarCreacionDesdeCero} disabled={guardandoEdicion}>
                <ArrowLeft size={16} /> {vista === "crear-version" ? "Versiones" : "Guiones"}
              </button>
              <strong>{vista === "crear-version" ? "Nueva versión" : "Crear guion"}</strong>
              <span title={vista === "crear-version" ? guionActivo?.nombre : projectName}>{vista === "crear-version" ? guionActivo?.nombre : projectName || "Proyecto"}</span>
            </div>

            <form className="guion-form-card" style={{ borderBottom: "none" }} onSubmit={vista === "crear-version" ? guardarVersionDesdeEditor : handleCreateGuionDesdeCero}>
              <fieldset className="guion-writing-fields" disabled={guardandoEdicion}>
              {vista === "crear-version" ? (
                <section className="guion-version-writer-meta" aria-label="Datos de la versión">
                  <div className="guion-grid">
                    <label>
                      Fecha de emisión
                      <input
                        type="date"
                        value={versionForm.fecha_de_emision}
                        onChange={(event) => setVersionForm({ ...versionForm, fecha_de_emision: event.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Estado
                      <select
                        value={versionForm.estado}
                        onChange={(event) => setVersionForm({ ...versionForm, estado: event.target.value })}
                      >
                        {ESTADOS_VERSION.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                      </select>
                    </label>
                  </div>
                  <label>
                    Comentario del cambio
                    <textarea
                      rows={2}
                      value={versionForm.comentario_cambio}
                      onChange={(event) => setVersionForm({ ...versionForm, comentario_cambio: event.target.value })}
                      placeholder="Describe la modificación realizada en esta versión"
                    />
                  </label>
                </section>
              ) : (
                <div className="guion-titlebar">
                  <input
                    className="guion-titlebar__title"
                    aria-label="Título del guion"
                    value={ceroForm.nombre}
                    onChange={(e) => setCeroForm({ ...ceroForm, nombre: e.target.value })}
                    placeholder="Título del guion"
                    required
                  />
                  <input
                    className="guion-titlebar__desc"
                    aria-label="Descripción del guion"
                    value={ceroForm.descripcion}
                    onChange={(e) => setCeroForm({ ...ceroForm, descripcion: e.target.value })}
                    placeholder="Añade una descripción: tono, estructura o notas del guion"
                  />
                </div>
              )}

              <div className="guion-editor-layout">
                <div className="guion-editor-shell guion-reader__editor-shell">
                  {botonOcultarHerramientas()}
                  <div className={`guion-editor-toolbar ${herramientasVisibles ? "" : "is-collapsed"}`} role="toolbar" aria-label="Herramientas de creación del guion">
                    {herramientasFormatoEditor()}
                    <button className="guion-editor-catalog-button" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirSelectorGaleria("personaje")}><Users size={15} /> Personaje</button>
                    <button className="guion-editor-catalog-button" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirSelectorGaleria("lugar")}><MapPin size={15} /> Lugar</button>
                    <button className="guion-editor-catalog-button" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirSelectorGaleria("objeto")}><Package size={15} /> Objeto</button>
                    {esAdmin && (
                      <>
                        <button className="guion-editor-catalog-button guion-editor-catalog-button--new" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirFormularioGaleria("personaje")}><Plus size={14} /> Crear personaje</button>
                        <button className="guion-editor-catalog-button guion-editor-catalog-button--new" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirFormularioGaleria("lugar")}><Plus size={14} /> Crear lugar</button>
                        <button className="guion-editor-catalog-button guion-editor-catalog-button--new" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirFormularioGaleria("objeto")}><Plus size={14} /> Crear objeto</button>
                      </>
                    )}
                    <span className="guion-editor-toolbar__spacer" />
                    <button
                      type="button"
                      className={`guion-escenas-toggle ${escenasActivo ? "is-active" : ""}`}
                      onClick={escenasActivo ? handleDesactivarModoEscenas : handleActivarModoEscenas}
                      title="Escribir el guion dividido por escenas"
                    >
                      <Clapperboard size={16} /> {escenasActivo ? "Modo escenas: ON" : "Dividir en escenas"}
                    </button>
                  </div>

                  {escenasActivo && (
                    <div className="guion-escenas-tabs">
                      {escenasBorrador.map((esc, idx) => (
                        <div className={`guion-escena-tab ${idx === escenaActivaIndex ? "is-active" : ""}`} key={idx}>
                          <button type="button" onClick={() => setEscenaActivaIndex(idx)}>
                            Escena {esc.numero}
                          </button>
                          {escenasBorrador.length > 1 && (
                            <button
                              type="button"
                              className="guion-escena-tab__delete"
                              title="Eliminar escena"
                              onClick={() => handleEliminarEscenaBorrador(idx)}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" className="guion-escena-tab guion-escena-tab--add" onClick={handleNuevaEscenaBorrador}>
                        <Plus size={14} /> Nueva escena
                      </button>
                    </div>
                  )}

                  <div
                    ref={editorRef}
                    contentEditable={!guardandoEdicion}
                    suppressContentEditableWarning
                    className="guion-editor-surface guion-editor-surface--rich guion-pagina"
                    role="textbox"
                    aria-label="Editor del guion"
                    aria-multiline="true"
                    onInput={sincronizarDesdeEditor}
                    onKeyDown={manejarTeclaEditor}
                    onPaste={manejarPegadoEditor}
                    onMouseUp={guardarSeleccionEditor}
                    onKeyUp={guardarSeleccionEditor}
                    data-placeholder={
                      escenasActivo
                        ? `Escribe el contenido de la Escena ${escenasBorrador[escenaActivaIndex]?.numero ?? 1}...`
                        : "INT. CABAÑA - SALA PRINCIPAL - AMANECER — Escribe la acción, el diálogo y las notas de tu escena..."
                    }
                  />
                </div>

                <aside className="guion-sidebar">
                  <div className="guion-sidebar__block">
                    <div className="guion-sidebar__header">
                      <Users size={16} /> Personajes
                      <button className="guion-sidebar__choose" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirSelectorGaleria("personaje")}>Elegir</button>
                    </div>
                    {esAdmin && <div className="guion-sidebar__add">
                      <input
                        value={nuevoPersonaje}
                        onChange={(e) => setNuevoPersonaje(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCrearPersonaje(e);
                          }
                        }}
                        placeholder="Nombre del personaje"
                      />
                      <button type="button" title="Agregar personaje" onClick={handleCrearPersonaje}><Plus size={14} /></button>
                    </div>}
                    <div className="guion-sidebar__list">
                      {personajes.length === 0 && <span className="guion-sidebar__empty">Aún no hay personajes</span>}
                      {personajes.map((p) =>
                        editandoPersonajeId === p.id_personaje ? (
                          <div className="guion-sidebar__row guion-sidebar__row--editing" key={p.id_personaje}>
                            <input
                              autoFocus
                              value={editandoPersonajeNombre}
                              onChange={(e) => setEditandoPersonajeNombre(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") guardarEdicionPersonaje(p.id_personaje);
                                if (e.key === "Escape") cancelarEdicionPersonaje();
                              }}
                            />
                            <button type="button" title="Guardar" onClick={() => guardarEdicionPersonaje(p.id_personaje)}>
                              <Check size={14} />
                            </button>
                            <button type="button" title="Cancelar" onClick={cancelarEdicionPersonaje}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="guion-sidebar__row" key={p.id_personaje}>
                            <button
                              type="button"
                              className="guion-sidebar__item"
                              title="Insertar en el guion"
                              onClick={() => insertarFichaGaleria(
                                obtenerFichaGaleria("personaje", p.id_personaje, p.nombre) || { tipo: "personaje", nombre: p.nombre },
                              )}
                            >
                              {p.nombre}
                            </button>
                            <CodigoChip codigo={p.codigo} />
                            <button type="button" title="Editar personaje" onClick={() => iniciarEdicionPersonaje(p)}>
                              <PenLine size={14} />
                            </button>
                            <button type="button" title="Eliminar personaje" onClick={() => handleEliminarPersonaje(p.id_personaje)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="guion-sidebar__block">
                    <div className="guion-sidebar__header">
                      <MapPin size={16} /> Escenarios
                      <button className="guion-sidebar__choose" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirSelectorGaleria("lugar")}>Elegir</button>
                    </div>
                    {esAdmin && <div className="guion-sidebar__add">
                      <input
                        value={nuevoEscenario}
                        onChange={(e) => setNuevoEscenario(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCrearEscenario(e);
                          }
                        }}
                        placeholder="Nombre del escenario"
                      />
                      <button type="button" title="Agregar escenario" onClick={handleCrearEscenario}><Plus size={14} /></button>
                    </div>}
                    <div className="guion-sidebar__list">
                      {escenarios.length === 0 && <span className="guion-sidebar__empty">Aún no hay escenarios</span>}
                      {escenarios.map((esc) =>
                        editandoEscenarioId === esc.id_escenario ? (
                          <div className="guion-sidebar__row guion-sidebar__row--editing" key={esc.id_escenario}>
                            <input
                              autoFocus
                              value={editandoEscenarioNombre}
                              onChange={(e) => setEditandoEscenarioNombre(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") guardarEdicionEscenario(esc.id_escenario);
                                if (e.key === "Escape") cancelarEdicionEscenario();
                              }}
                            />
                            <button type="button" title="Guardar" onClick={() => guardarEdicionEscenario(esc.id_escenario)}>
                              <Check size={14} />
                            </button>
                            <button type="button" title="Cancelar" onClick={cancelarEdicionEscenario}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="guion-sidebar__row" key={esc.id_escenario}>
                            <button
                              type="button"
                              className="guion-sidebar__item"
                              title="Insertar en el guion"
                              onClick={() => insertarFichaGaleria({
                                ...(obtenerFichaGaleria("lugar", esc.id_escenario, esc.nombre) || {}),
                                tipo: "lugar",
                                nombre: esc.nombre,
                                id_escenario: esc.id_escenario,
                                tipo_escenario: esc.tipo,
                              })}
                            >
                              {esc.nombre}
                            </button>
                            <CodigoChip codigo={esc.codigo} />
                            <button type="button" title="Editar escenario" onClick={() => iniciarEdicionEscenario(esc)}>
                              <PenLine size={14} />
                            </button>
                            <button type="button" title="Eliminar escenario" onClick={() => handleEliminarEscenario(esc.id_escenario)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div className="guion-sidebar__block guion-sidebar__object-block">
                    <div className="guion-sidebar__header"><Package size={16} /> Utilería y objetos</div>
                    <p>Inserta vestuario, maquillaje, utilería y otros elementos registrados en la galería.</p>
                    <button className="guion-sidebar__choose guion-sidebar__choose--wide" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirSelectorGaleria("objeto")}>
                      <Image size={15} /> Explorar objetos
                    </button>
                    {esAdmin && (
                      <button
                        className="guion-sidebar__choose guion-sidebar__choose--wide guion-sidebar__object-create"
                        type="button"
                        onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }}
                        onClick={() => abrirFormularioGaleria("objeto")}
                      >
                        <Plus size={15} /> Crear objeto
                      </button>
                    )}
                  </div>
                </aside>
              </div>

              <button className="guion-button guion-button--primary" type="submit" style={{ marginTop: "1.25rem" }} disabled={guardandoEdicion}>
                <CheckCircle2 size={16} /> {guardandoEdicion ? "Guardando…" : vista === "crear-version" ? "Guardar nueva versión" : "Crear guion"}
              </button>
              </fieldset>
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
                  <h2 style={{ margin: 0 }}>{guionActivo.nombre} <CodigoChip codigo={guionActivo.codigo} /></h2>
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
                ) : (
                  <div className="guion-content-summary">
                    <div className="guion-content-summary__icon"><FileText size={23} /></div>
                    <div>
                      <span>VERSIÓN ACTUAL · V{versionActualDeGuionActivo.numero_de_version}</span>
                      <h3>{versionActualDeGuionActivo.estado || "Sin estado"}</h3>
                      <p>{versionActualDeGuionActivo.contenido
                        ? "El texto está listo para leer en una vista cómoda y dedicada."
                        : "Consulta el archivo original en el lector de guiones."}</p>
                    </div>
                    <div className="guion-content-summary__actions">
                      <button
                        className="guion-button guion-button--accent"
                        type="button"
                        onClick={() => {
                          setVersionLectorId(versionActualDeGuionActivo.id_guion_version);
                          setEditandoContenido(false);
                          setVista("lector");
                        }}
                      >
                        <Eye size={16} /> Leer guion
                      </button>
                      {esAdmin && (
                        <button
                          className="guion-button guion-button--accent"
                          type="button"
                          onClick={() => {
                            setVersionLectorId(versionActualDeGuionActivo.id_guion_version);
                            iniciarEdicionContenido(versionActualDeGuionActivo);
                            setVista("lector");
                          }}
                        >
                          <PenLine size={16} /> Editar como nueva versión
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tabDetalle === "versiones" && (
              <>
                <div className="guion-versions-toolbar">
                  <span>{versiones.length} registros</span>
                  {esAdmin && (
                    <button className="guion-button guion-button--accent" type="button" onClick={() => {
                      setOrigenVersion("archivo");
                      setArchivoVersion(null);
                      setVersionInicial(JSON.stringify(versionForm));
                      setShowVersionModal(true);
                    }}>
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
                          <span className="guion-version-card__version">Versión {v.numero_de_version} <CodigoChip codigo={v.codigo} /></span>
                          <span className={`guion-version-card__state guion-version-card__state--${normalizarEstado(v.estado)}`}>
                            {v.estado}
                          </span>
                        </div>
                        {esAdmin && (
                          <label className="guion-version-card__status-control">
                            Estado de la versión
                            <select
                              value={ESTADOS_VERSION.includes(v.estado) ? v.estado : v.estado === "Revision" ? "En revisión" : "Pendiente"}
                              onChange={(event) => handleCambiarEstadoVersion(v, event.target.value)}
                              disabled={Boolean(versionStatusUpdating[v.id_guion_version])}
                              aria-label={`Cambiar estado de versión ${v.numero_de_version}`}
                            >
                              {ESTADOS_VERSION.map((estado) => (
                                <option key={estado} value={estado}>{estado}</option>
                              ))}
                            </select>
                            {versionStatusUpdating[v.id_guion_version] && <small>Guardando estado…</small>}
                          </label>
                        )}
                        <p className="guion-version-card__date">{v.fecha_de_emision}</p>
                        {v.comentario_cambio && <p className="guion-version-card__comment">{v.comentario_cambio}</p>}
                        <div className="guion-version-card__meta">
                          <span className={`guion-version-card__origen ${v.contenido ? "guion-version-card__origen--texto" : ""}`}>
                            {v.contenido ? (
                              v.archivo ? <><Paperclip size={14} /> Archivo con texto editable</> : <><PenLine size={14} /> Escrito en el sistema</>
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
                        <button
                          className="guion-version-card__toggle"
                          type="button"
                          onClick={() => {
                            setVersionLectorId(v.id_guion_version);
                            setEditandoContenido(false);
                            setVista("lector");
                          }}
                        >
                          <Eye size={14} /> Leer versión
                        </button>
                        {esAdmin && (
                          <button
                            className="guion-version-card__toggle"
                            type="button"
                            onClick={() => {
                              setVersionLectorId(v.id_guion_version);
                              iniciarEdicionContenido(v);
                              setVista("lector");
                            }}
                          >
                            <PenLine size={14} /> Editar como nueva versión
                          </button>
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

        {vista === "lector" && guionActivo && versionSeleccionadaParaLector && (
          <section className="guion-reader" aria-label="Lector de guiones">
            <header className="guion-writing-bar">
              <button className="guion-reader__back" type="button" onClick={() => { if (!confirmarSalida()) return; setVista("detalle"); setEditandoContenido(false); }} disabled={guardandoEdicion}>
                <ArrowLeft size={17} /> Volver al guion
              </button>
              <strong>{editandoContenido ? "Editando versión" : "Lectura"}</strong>
              <span title={guionActivo.nombre}>{guionActivo.nombre} · v{versionSeleccionadaParaLector.numero_de_version}</span>
              <div className="guion-reader__tools">
                <label>
                  <span>Versión</span>
                  <select
                    value={versionSeleccionadaParaLector.id_guion_version}
                    onChange={(event) => {
                      if (!confirmarSalida()) return;
                      setVersionLectorId(Number(event.target.value));
                      setEditandoContenido(false);
                    }}
                    disabled={guardandoEdicion}
                    aria-label="Seleccionar versión para leer"
                  >
                    {versiones.map((version) => (
                      <option key={version.id_guion_version} value={version.id_guion_version}>
                        v{version.numero_de_version} · {version.estado}
                      </option>
                    ))}
                  </select>
                </label>
                {versionSeleccionadaParaLector.contenido && (
                  <button className="guion-reader__action" type="button" onClick={descargarGuionPdf} disabled={generandoPdf}>
                    <FileText size={16} /> {generandoPdf ? "Generando…" : "Descargar PDF"}
                  </button>
                )}
                {esAdmin && !editandoContenido && (
                  <button className="guion-reader__action guion-reader__action--primary" type="button" onClick={() => iniciarEdicionContenido(versionSeleccionadaParaLector)}>
                    <PenLine size={16} /> Editar como nueva versión
                  </button>
                )}
              </div>
            </header>

            <article className={`guion-reader__page ${editandoContenido ? "guion-reader__page--editing" : ""}`}>
              {versionSeleccionadaParaLector.archivo?.toLowerCase().endsWith(".pdf") && !editandoContenido && (
                <iframe
                  className="guion-reader__pdf"
                  src={`${API_URL}/assets/${versionSeleccionadaParaLector.archivo}`}
                  title={`Archivo original, versión ${versionSeleccionadaParaLector.numero_de_version} de ${guionActivo.nombre}`}
                />
              )}
              {versionSeleccionadaParaLector.mensaje_extraccion && (
                <p className="guion-reader__notice">{versionSeleccionadaParaLector.mensaje_extraccion}</p>
              )}
              {editandoContenido ? (
                <fieldset className="guion-reader__editor guion-writing-fields" disabled={guardandoEdicion}>
                  <p>Guarda los cambios para crear una nueva versión. La versión elegida y el archivo original seguirán en el historial.</p>
                  {!htmlATextoPlano(contenidoEditado).trim() && versionSeleccionadaParaLector.archivo && (
                    <p className="guion-reader__notice">No se pudo extraer texto editable. Puedes escribir o pegar aquí el contenido.</p>
                  )}
                  <div className="guion-editor-shell guion-reader__editor-shell">
                    {botonOcultarHerramientas()}
                    <div className={`guion-editor-toolbar ${herramientasVisibles ? "" : "is-collapsed"}`} role="toolbar" aria-label="Herramientas de edición del guion">
                      {herramientasFormatoEditor()}
                      <button className="guion-editor-catalog-button" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirSelectorGaleria("personaje")}><Users size={15} /> Personaje</button>
                      <button className="guion-editor-catalog-button" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirSelectorGaleria("lugar")}><MapPin size={15} /> Lugar</button>
                      <button className="guion-editor-catalog-button" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirSelectorGaleria("objeto")}><Package size={15} /> Objeto</button>
                      {esAdmin && (
                        <>
                          <button className="guion-editor-catalog-button guion-editor-catalog-button--new" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirFormularioGaleria("personaje")}><Plus size={14} /> Crear personaje</button>
                          <button className="guion-editor-catalog-button guion-editor-catalog-button--new" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirFormularioGaleria("lugar")}><Plus size={14} /> Crear lugar</button>
                          <button className="guion-editor-catalog-button guion-editor-catalog-button--new" type="button" onMouseDown={(event) => { guardarSeleccionEditor(); event.preventDefault(); }} onClick={() => abrirFormularioGaleria("objeto")}><Plus size={14} /> Crear objeto</button>
                        </>
                      )}
                    </div>
                    <div
                      ref={editorRef}
                      className="guion-editor-surface guion-editor-surface--rich guion-reader__edit-surface guion-pagina"
                      contentEditable={!guardandoEdicion}
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label="Editar contenido del guion"
                      aria-multiline="true"
                      data-placeholder="Escribe aquí el guion..."
                      onInput={sincronizarDesdeEditor}
                      onKeyDown={manejarTeclaEditor}
                      onPaste={manejarPegadoEditor}
                      onKeyUp={guardarSeleccionEditor}
                      onMouseUp={guardarSeleccionEditor}
                      onBlur={sincronizarDesdeEditor}
                    />
                  </div>
                  <div>
                    <button className="guion-reader__action guion-reader__action--primary" type="button" onClick={guardarEdicionContenido} disabled={guardandoEdicion}>
                      <Check size={16} /> {guardandoEdicion ? "Guardando versión…" : "Guardar nueva versión"}
                    </button>
                    <button className="guion-reader__action" type="button" onClick={() => { if (confirmarSalida()) setEditandoContenido(false); }} disabled={guardandoEdicion}>
                      Cancelar
                    </button>
                  </div>
                </fieldset>
              ) : versionSeleccionadaParaLector.contenido ? (
                <>
                  <p className="guion-reader__meta">≈ {estimarPaginas(versionSeleccionadaParaLector.contenido)} págs. · ≈ {estimarPaginas(versionSeleccionadaParaLector.contenido)} min (1 página ≈ 1 minuto)</p>
                  <div className="guion-pagina guion-pagina--lector" aria-label="Texto del guion">
                    {htmlABloques(versionSeleccionadaParaLector.contenido).map((bloque, i) => (
                      <p
                        key={i}
                        className={claseBloque(bloque.tipo)}
                        dangerouslySetInnerHTML={{ __html: bloque.html }}
                      />
                    ))}
                  </div>
                </>
              ) : versionSeleccionadaParaLector.archivo?.toLowerCase().endsWith(".pdf") ? null : (
                <p className="guion-reader__empty">Este formato no tiene vista previa disponible en el navegador. Usa el acceso al archivo original desde el detalle del guion.</p>
              )}
            </article>
            {!editandoContenido && (
              <NotasVersion
                key={`${projectId}-${versionSeleccionadaParaLector.id_guion_version}`}
                version={versionSeleccionadaParaLector}
                projectId={projectId}
              />
            )}
          </section>
        )}
      </main>

      {galleryPickerType && (
        <div
          className="guion-modal-overlay guion-gallery-picker-overlay"
          onClick={() => setGalleryPickerType(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setGalleryPickerType(null);
          }}
        >
          <section
            className="guion-modal guion-gallery-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guion-gallery-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="guion-modal__header">
              <div>
                <span className="guion-gallery-picker__eyebrow">BIBLIOTECA DEL PROYECTO</span>
                <h3 id="guion-gallery-picker-title">Añadir al guion</h3>
              </div>
              <button className="guion-modal__close" type="button" onClick={() => setGalleryPickerType(null)} aria-label="Cerrar selector">
                <X size={18} />
              </button>
            </div>
            <p className="guion-modal__subtitle">Elige un elemento para insertarlo en la posición actual del cursor.</p>

            <div className="guion-gallery-picker__filters" role="tablist" aria-label="Filtrar elementos">
              {[
                ["todos", "Todo"],
                ["personaje", "Personajes"],
                ["lugar", "Lugares"],
                ["objeto", "Objetos"],
              ].map(([tipo, etiqueta]) => (
                <button
                  key={tipo}
                  className={galleryPickerType === tipo ? "is-active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={galleryPickerType === tipo}
                  onClick={() => setGalleryPickerType(tipo)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            <label className="guion-gallery-picker__search">
              <Search size={17} />
              <input
                autoFocus
                value={gallerySearch}
                onChange={(event) => setGallerySearch(event.target.value)}
                placeholder="Buscar por nombre, categoría o descripción"
                aria-label="Buscar en la galería"
              />
            </label>

            {galleryError && (
              <div className="guion-gallery-picker__error" role="alert">
                {galleryError}
                <button type="button" onClick={fetchGalleryItems}>Reintentar</button>
              </div>
            )}
            {galleryLoading ? (
              <div className="guion-gallery-picker__empty"><span className="guion-gallery-picker__spinner" /> Cargando elementos…</div>
            ) : fichasGaleriaFiltradas.length ? (
              <div className="guion-gallery-picker__grid">
                {fichasGaleriaFiltradas.map((item) => (
                  <button
                    className="guion-gallery-card"
                    key={`${item.tipo}-${item.id || item.id_galeria || item.nombre}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertarFichaGaleria(item)}
                  >
                    <span className="guion-gallery-card__image">
                      {item.archivo_path ? (
                        <img src={`${API_URL}/assets/${item.archivo_path}`} alt="" loading="lazy" />
                      ) : (
                        item.tipo === "personaje" ? <Users size={27} /> : item.tipo === "lugar" ? <MapPin size={27} /> : <Package size={27} />
                      )}
                      <span className="guion-gallery-card__type">{item.tipo === "personaje" ? "Personaje" : item.tipo === "lugar" ? "Lugar" : "Objeto"}</span>
                    </span>
                    <span className="guion-gallery-card__content">
                      <strong>{item.nombre}</strong>
                      {item.categoria && <small>{item.categoria}</small>}
                      {item.descripcion && <span>{item.descripcion}</span>}
                      <span className="guion-gallery-card__action">Registrar uso y añadir <Plus size={14} /></span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="guion-gallery-picker__empty">
                {galleryError
                  ? "No se pudieron cargar los elementos. Cierra esta ventana e inténtalo de nuevo."
                  : "No hay elementos que coincidan. Añade personajes, lugares u objetos desde la galería del proyecto."}
              </div>
            )}
          </section>
        </div>
      )}

      {galleryEditorType && (
        <GalleryModal
          key={`${galleryEditorType}-${galleryInitialName}`}
          item={null}
          characters={[]}
          galleryCharacters={galleryItems
            .filter((item) => item.tipo === "personaje")
            .map((item) => ({ value: item.id_galeria, label: item.nombre }))}
          locations={[]}
          scripts={[]}
          scenes={[]}
          initialType={galleryEditorType}
          initialName={galleryInitialName}
          lockType
          hideRelations
          onClose={() => {
            if (savingGalleryForm) return;
            setGalleryEditorType(null);
            setGalleryInitialName("");
          }}
          onSave={guardarFichaDesdeGuion}
          saving={savingGalleryForm}
          error={galleryFormError}
        />
      )}

      {lugarPendiente && (
        <div className="guion-modal-overlay guion-location-options-overlay" onClick={() => setLugarPendiente(null)}>
          <section
            className="guion-modal guion-location-options"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guion-location-options-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="guion-modal__header">
              <div>
                <span className="guion-gallery-picker__eyebrow">ENCABEZADO DE ESCENA</span>
                <h3 id="guion-location-options-title">{lugarPendiente.nombre}</h3>
              </div>
              <button className="guion-modal__close" type="button" onClick={() => setLugarPendiente(null)} aria-label="Cerrar opciones">
                <X size={18} />
              </button>
            </div>
            <p className="guion-modal__subtitle">Define el tipo de locación y el momento para el encabezado del guion.</p>
            <fieldset className="guion-location-options__group">
              <legend>¿Dónde ocurre?</legend>
              {[
                ["INT.", "Interior", House],
                ["EXT.", "Exterior", Trees],
              ].map(([valor, etiqueta, Icon]) => (
                <button
                  key={valor}
                  type="button"
                  className={tipoEscenaLugar === valor ? "is-active" : ""}
                  aria-pressed={tipoEscenaLugar === valor}
                  onClick={() => setTipoEscenaLugar(valor)}
                >
                  <Icon size={17} strokeWidth={1.9} />
                  <span>{etiqueta}</span>
                </button>
              ))}
            </fieldset>
            <fieldset className="guion-location-options__group">
              <legend>¿En qué momento?</legend>
              {[
                ["DÍA", "Día", Sun],
                ["NOCHE", "Noche", Moon],
                ["AMANECER", "Amanecer", Sunrise],
                ["ATARDECER", "Atardecer", Sunset],
              ].map(([valor, etiqueta, Icon]) => (
                <button
                  key={valor}
                  type="button"
                  className={momentoEscenaLugar === valor ? "is-active" : ""}
                  aria-pressed={momentoEscenaLugar === valor}
                  onClick={() => setMomentoEscenaLugar(valor)}
                >
                  <Icon size={17} strokeWidth={1.9} />
                  <span>{etiqueta}</span>
                </button>
              ))}
            </fieldset>
            <footer className="guion-location-options__footer">
              <button className="guion-reader__action" type="button" onClick={() => setLugarPendiente(null)}>Cancelar</button>
              <button className="guion-reader__action guion-reader__action--primary" type="button" onMouseDown={(event) => event.preventDefault()} onClick={confirmarInsercionLugar}>
                <Plus size={16} /> Insertar escena
              </button>
            </footer>
          </section>
        </div>
      )}

      {fichaPendienteDeUso && (
        <div className="guion-modal-overlay guion-usage-version-overlay" onClick={() => !guardandoVersionUso && setFichaPendienteDeUso(null)}>
          <section
            className="guion-modal guion-usage-version"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guion-usage-version-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="guion-modal__header">
              <div>
                <span className="guion-gallery-picker__eyebrow">NUEVO REGISTRO DE USO</span>
                <h3 id="guion-usage-version-title">{fichaPendienteDeUso.nombre}</h3>
              </div>
              <button className="guion-modal__close" type="button" onClick={() => setFichaPendienteDeUso(null)} disabled={guardandoVersionUso} aria-label="Cerrar registro">
                <X size={18} />
              </button>
            </div>
            <p className="guion-modal__subtitle">
              Indica si hubo cambios para guardar una nueva versión o si el elemento se usó sin cambios.
            </p>
            {fichaPendienteDeUso.encabezado_escena && (
              <div className="guion-usage-version__scene">
                <Clapperboard size={15} /> {fichaPendienteDeUso.encabezado_escena}
              </div>
            )}
            {errorVersionUso && <p className="guion-gallery-picker__error" role="alert">{errorVersionUso}</p>}
            <label className="guion-usage-version__no-change">
              <input
                type="checkbox"
                checked={usoSinCambios}
                onChange={(event) => {
                  setUsoSinCambios(event.target.checked);
                  setErrorVersionUso("");
                }}
              />
              <span>Sin cambios; no crear una nueva versión</span>
            </label>
            {usoSinCambios ? (
              <p className="guion-usage-version__hint">
                Se registrará la fecha de uso y el elemento se insertará en el guion, sin agregar una versión al historial.
              </p>
            ) : (
              <>
                <label className="guion-usage-version__field">
                  <span>Detalles de este uso</span>
                  <textarea
                    autoFocus
                    rows={5}
                    value={detallesUso}
                    onChange={(event) => setDetallesUso(event.target.value)}
                    placeholder={fichaPendienteDeUso.tipo === "personaje"
                      ? "Ej. Termina la escena con el cabello largo y mojado, camisa rasgada en el hombro…"
                      : fichaPendienteDeUso.tipo === "lugar"
                        ? "Ej. Se usó con las ventanas rotas, iluminación nocturna y muebles desplazados…"
                        : "Ej. El objeto queda rayado, con la tapa abierta y una etiqueta roja…"}
                    required
                  />
                </label>
                <p className="guion-usage-version__hint">
                  Anota apariencia, cambios, daños o continuidad que el equipo deba recordar. La versión aparecerá en Galería con la imagen pendiente de subir.
                </p>
              </>
            )}
            <footer className="guion-location-options__footer">
              <button className="guion-reader__action" type="button" onClick={() => setFichaPendienteDeUso(null)} disabled={guardandoVersionUso}>
                Cancelar
              </button>
              <button className="guion-reader__action guion-reader__action--primary" type="button" onMouseDown={(event) => event.preventDefault()} onClick={guardarVersionDeUso} disabled={guardandoVersionUso || (!usoSinCambios && !detallesUso.trim())}>
                <Check size={16} /> {guardandoVersionUso ? (usoSinCambios ? "Registrando uso…" : "Guardando versión…") : (usoSinCambios ? "Registrar e insertar" : "Guardar e insertar")}
              </button>
            </footer>
          </section>
        </div>
      )}

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
        <div className="guion-modal-overlay" onClick={() => { if (confirmarSalida()) setShowUploadModal(false); }}>
          <div className="guion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="guion-modal__header">
              <h3><UploadCloud size={18} /> Subir guion</h3>
              <button className="guion-modal__close" type="button" onClick={() => { if (confirmarSalida()) setShowUploadModal(false); }}>
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
                  Archivo del guion (PDF, Word o FDX)
                  <input
                    type="file"
                    accept=".pdf,.docx,.fdx"
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
        <div className="guion-modal-overlay" onClick={() => { if (confirmarSalida()) setShowVersionModal(false); }}>
          <div className="guion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="guion-modal__header">
              <h3><Plus size={18} /> Nueva versión</h3>
              <button className="guion-modal__close" type="button" onClick={() => { if (confirmarSalida()) setShowVersionModal(false); }}>
                <X size={18} />
              </button>
            </div>

            <div className="guion-origen-toggle">
              <button
                type="button"
                className={`guion-origen-toggle__option ${origenVersion === "archivo" ? "guion-origen-toggle__option--active" : ""}`}
                onClick={() => {
                  setOrigenVersion("archivo");
                  setArchivoVersion(null);
                }}
              >
                <Paperclip size={15} /> Subir archivo
              </button>
              <button
                type="button"
                className={`guion-origen-toggle__option ${origenVersion === "texto" ? "guion-origen-toggle__option--active" : ""}`}
                onClick={iniciarEscrituraVersion}
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
                <p className="guion-form__hint">
                  Al elegir “Escribir guion” se abrirá el editor completo para redactar esta versión con las herramientas de formato y escenas.
                </p>
              )}

              <button className="guion-button guion-button--accent" type="submit">
                <UploadCloud size={16} /> Guardar versión
              </button>
            </form>
          </div>
        </div>
      )}

      {dialogoEscena && (
        <div
          className="guion-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelarFormularioEscena();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") cancelarFormularioEscena();
          }}
        >
          <section
            className="guion-modal guion-scene-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guion-scene-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="guion-modal__header">
              <div>
                <span className="guion-gallery-picker__eyebrow">ESCENA DEL GUION</span>
                <h3 id="guion-scene-form-title">
                  {contextoEscena?.esEdicion ? "Editar escena" : "Crear escena"}
                </h3>
              </div>
              <button
                className="guion-modal__close"
                type="button"
                onClick={cancelarFormularioEscena}
                aria-label="Cancelar edición de escena"
              >
                <X size={18} />
              </button>
            </div>
            <p className="guion-modal__subtitle">
              Los cambios se aplican primero al borrador del guion. Al guardarlo, se sincronizarán con la ficha de escena; el contenido de acción y diálogo se conserva.
            </p>
            {errorFormEscena && <p className="guion-gallery-picker__error" role="alert">{errorFormEscena}</p>}
            <div className="guion-scene-form__grid">
              <label className="guion-scene-form__wide">
                Proyecto activo
                <input
                  type="text"
                  value={projectName || "Nombre del proyecto no cargado"}
                  readOnly
                  aria-label="Nombre del proyecto activo"
                />
              </label>
              <label>
                Número de escena
                <input
                  type="text"
                  inputMode="numeric"
                  value={formEscena.numero_de_escena}
                  onChange={(event) => actualizarCampoEscena("numero_de_escena", event.target.value)}
                  required
                />
              </label>
              <label className="guion-scene-form__wide">
                Encabezado completo
                <input
                  ref={campoEncabezadoEscenaRef}
                  autoFocus
                  type="text"
                  maxLength={250}
                  value={formEscena.encabezado}
                  onChange={(event) => actualizarCampoEscena("encabezado", event.target.value)}
                  placeholder="Ej. INT. COCINA - NOCHE"
                  required
                />
              </label>
              <label>
                Interior / exterior
                <select
                  value={formEscena.modo_vista}
                  onChange={(event) => actualizarCampoEscena("modo_vista", event.target.value)}
                >
                  <option value="">Sin especificar</option>
                  {["Int", "Ext", "Int/Ext", "Ext/Int"].map((valor) => (
                    <option key={valor} value={valor}>{valor}</option>
                  ))}
                </select>
              </label>
              <label>
                Momento del día
                <select
                  value={formEscena.momento_dia}
                  onChange={(event) => actualizarCampoEscena("momento_dia", event.target.value)}
                >
                  <option value="">Sin especificar</option>
                  {["Día", "Noche", "Amanecer", "Atardecer", "Mañana", "Tarde"].map((valor) => (
                    <option key={valor} value={valor}>{valor}</option>
                  ))}
                </select>
              </label>
              <label>
                Ciudad
                <input
                  type="text"
                  value={formEscena.ciudad}
                  onChange={(event) => actualizarCampoEscena("ciudad", event.target.value)}
                />
              </label>
              <label>
                Página
                <input
                  type="number"
                  min="1"
                  value={formEscena.pagina}
                  onChange={(event) => actualizarCampoEscena("pagina", event.target.value)}
                />
              </label>
              <label>
                Fecha de grabación
                <input
                  type="date"
                  value={formEscena.fecha_de_grabacion}
                  onChange={(event) => actualizarCampoEscena("fecha_de_grabacion", event.target.value)}
                />
              </label>
              <label>
                Día dramático
                <input
                  type="number"
                  min="1"
                  value={formEscena.dia_dramatico}
                  onChange={(event) => actualizarCampoEscena("dia_dramatico", event.target.value)}
                />
              </label>
              <label>
                Estado de escena
                <select
                  value={formEscena.estado}
                  onChange={(event) => actualizarCampoEscena("estado", event.target.value)}
                >
                  {["Pendiente", "En Proceso", "Finalizada"].map((valor) => (
                    <option key={valor} value={valor}>{valor}</option>
                  ))}
                </select>
              </label>
            </div>
            <footer className="guion-location-options__footer">
              <button className="guion-reader__action" type="button" onClick={cancelarFormularioEscena}>
                Cancelar
              </button>
              <button
                className="guion-reader__action guion-reader__action--primary"
                type="button"
                onClick={confirmarFormularioEscena}
              >
                <Check size={16} /> Aplicar al guion
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}