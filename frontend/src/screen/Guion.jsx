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
  Check,
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
  Clapperboard,
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
  const ultimaSeleccionRef = useRef(null); // ultimo cursor/seleccion dentro del editor, para restaurarlo tras usar la barra de herramientas o insertar un personaje/escenario

  // Modo "por escenas" dentro del editor de creacion desde cero: en vez de
  // un solo bloque de texto, se escribe escena por escena. Cada escena es
  // un buffer independiente ({numero, texto}); al crear el guion, cada una
  // se persiste como una fila real en la tabla escenas (no es solo visual).
  const [escenasActivo, setEscenasActivo] = useState(false);
  const [escenasBorrador, setEscenasBorrador] = useState([]);
  const [escenaActivaIndex, setEscenaActivaIndex] = useState(0);

  // Personajes / Escenarios del proyecto (atajos dentro del editor)
  const [personajes, setPersonajes] = useState([]);
  const [escenarios, setEscenarios] = useState([]);
  const [nuevoPersonaje, setNuevoPersonaje] = useState("");
  const [nuevoEscenario, setNuevoEscenario] = useState("");
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
    setEscenasActivo(false);
    setEscenasBorrador([]);
    setEscenaActivaIndex(0);
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
    setContenidoInicial(escenasBorrador.map((esc) => esc.texto).join("<br><br>"));
    setEscenasActivo(false);
  };

  const handleNuevaEscenaBorrador = () => {
    setEscenasBorrador((prev) => [...prev, { numero: prev.length + 1, texto: "" }]);
    setEscenaActivaIndex(escenasBorrador.length); // el nuevo bloque queda ultimo
  };

  const handleEliminarEscenaBorrador = (idx) => {
    if (escenasBorrador.length <= 1) return; // siempre debe quedar al menos una escena
    setEscenasBorrador((prev) => prev.filter((_, i) => i !== idx).map((esc, i) => ({ ...esc, numero: i + 1 })));
    setEscenaActivaIndex((prevActivo) => {
      if (idx < prevActivo) return prevActivo - 1;
      if (idx === prevActivo) return Math.max(0, Math.min(prevActivo, escenasBorrador.length - 2));
      return prevActivo;
    });
  };

  // Convierte el HTML del editor a texto plano (para validar si esta vacio,
  // sacar el encabezado de una escena, etc.)
  const htmlATextoPlano = (html) => {
    const contenedor = document.createElement("div");
    contenedor.innerHTML = html || "";
    return contenedor.textContent || contenedor.innerText || "";
  };

  // El editor es un <div contentEditable>, no un input controlado: React no
  // sincroniza su innerHTML en cada render (eso rompería el cursor mientras
  // se escribe). En vez de eso, este efecto solo empuja el contenido guardado
  // hacia el DOM cuando cambia CUAL escena/buffer se esta mostrando (cambio
  // de pestaña, activar/desactivar modo escenas, o entrar de nuevo a la
  // pantalla). Mientras se escribe, el flujo va al reves: onInput lee el DOM
  // y lo guarda en el estado de React (ver sincronizarDesdeEditor).
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = textoEditorActivo || "";
    }
    ultimaSeleccionRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escenaActivaIndex, escenasActivo, vista]);

  const sincronizarDesdeEditor = () => {
    if (editorRef.current) {
      setTextoEditorActivo(editorRef.current.innerHTML);
    }
  };

  // Recuerda donde esta el cursor/seleccion dentro del editor mientras se
  // escribe o se hace clic en el, para poder devolverselo justo despues de
  // usar un boton de la barra de herramientas (que le quita el foco).
  const guardarSeleccionEditor = () => {
    const seleccion = window.getSelection();
    if (seleccion && seleccion.rangeCount > 0 && editorRef.current?.contains(seleccion.anchorNode)) {
      ultimaSeleccionRef.current = seleccion.getRangeAt(0).cloneRange();
    }
  };

  const restaurarFocoEnEditor = () => {
    const input = editorRef.current;
    if (!input) return;
    input.focus();
    const seleccion = window.getSelection();
    if (ultimaSeleccionRef.current && input.contains(ultimaSeleccionRef.current.startContainer)) {
      seleccion.removeAllRanges();
      seleccion.addRange(ultimaSeleccionRef.current);
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

  const alternarEncabezado = () => {
    if (!editorRef.current) return;
    restaurarFocoEnEditor();
    const bloqueActual = document.queryCommandValue("formatBlock");
    const yaEsEncabezado = (bloqueActual || "").toLowerCase() === "h1";
    document.execCommand("formatBlock", false, yaEsEncabezado ? "P" : "H1");
    sincronizarDesdeEditor();
    guardarSeleccionEditor();
  };

  const aplicarAlineacionTexto = (tipo) => {
    if (!editorRef.current) return;
    restaurarFocoEnEditor();
    const comando = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight" }[tipo];
    document.execCommand(comando);
    setAlineacionTexto(tipo);
    sincronizarDesdeEditor();
    guardarSeleccionEditor();
  };

  // Inserta texto plano (nombre de personaje/escenario) en la posicion
  // del cursor, sin envolver la seleccion actual.
  const insertarElementoEditor = (texto) => {
    if (!editorRef.current) return;
    restaurarFocoEnEditor();
    document.execCommand("insertText", false, texto);
    sincronizarDesdeEditor();
    guardarSeleccionEditor();
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
      } else {
        setError(data.message || "No se pudo crear el personaje");
      }
    } catch {
      setError("No se pudo crear el personaje");
    }
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
      const response = await fetch(`${API_URL}/personajes/${id_personaje}`, {
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
      const response = await fetch(`${API_URL}/personajes/${id_personaje}`, {
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
      } else {
        setError(data.message || "No se pudo crear el escenario");
      }
    } catch {
      setError("No se pudo crear el escenario");
    }
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
      const response = await fetch(`${API_URL}/escenarios/${id_escenario}`, {
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
      const response = await fetch(`${API_URL}/escenarios/${id_escenario}`, {
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

    // El texto completo que se guarda como version del guion: si esta en
    // modo escenas, se arma uniendo cada escena (en HTML real) con su encabezado.
    const contenidoParaVersion = escenasActivo
      ? escenasBorrador.map((esc) => `<h3>ESCENA ${esc.numero}</h3>${esc.texto}`).join("<hr/>")
      : contenidoInicial;

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/guiones/texto`, {
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
      if (!response.ok) {
        throw new Error(extraerMensajeError(data, "No se pudo crear el guion"));
      }

      // Si se escribio por escenas, cada una se guarda tambien como fila
      // real en la tabla escenas, ya ligada al guion recien creado, para
      // que se pueda usar despues en Desglose, Rodaje y Continuidad. Estas
      // filas guardan texto plano (sin las etiquetas de formato), porque
      // otras pantallas del sistema muestran esta descripcion tal cual.
      if (escenasActivo) {
        const idGuionNuevo = data.data.id_guion;
        for (const esc of escenasBorrador) {
          const textoPlano = htmlATextoPlano(esc.texto);
          const primeraLinea = textoPlano.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
          try {
            await fetch(`${API_URL}/escenas`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                id_guion: idGuionNuevo,
                numero_de_escena: String(esc.numero),
                encabezado: (primeraLinea || `ESCENA ${esc.numero}`).slice(0, 250),
                descripcion: textoPlano,
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
              <div className="guion-titlebar">
                <input
                  className="guion-titlebar__title"
                  value={ceroForm.nombre}
                  onChange={(e) => setCeroForm({ ...ceroForm, nombre: e.target.value })}
                  placeholder="Título del guion"
                  required
                />
                <input
                  className="guion-titlebar__desc"
                  value={ceroForm.descripcion}
                  onChange={(e) => setCeroForm({ ...ceroForm, descripcion: e.target.value })}
                  placeholder="Añade una descripción: tono, estructura o notas del guion"
                />
              </div>

              <div className="guion-editor-layout">
                <div className="guion-editor-shell">
                  <div className="guion-editor-toolbar">
                    <button type="button" onClick={() => ejecutarComandoEditor("bold")} title="Negrita"><Bold size={16} /></button>
                    <button type="button" onClick={() => ejecutarComandoEditor("italic")} title="Cursiva"><Italic size={16} /></button>
                    <button type="button" onClick={() => ejecutarComandoEditor("underline")} title="Subrayado"><Underline size={16} /></button>
                    <button type="button" onClick={alternarEncabezado} title="Encabezado"><Heading1 size={16} /></button>
                    <button type="button" onClick={() => ejecutarComandoEditor("insertUnorderedList")} title="Lista"><List size={16} /></button>
                    <button type="button" onClick={() => aplicarAlineacionTexto("left")} title="Alinear izquierda"><AlignLeft size={16} /></button>
                    <button type="button" onClick={() => aplicarAlineacionTexto("center")} title="Centrar"><AlignCenter size={16} /></button>
                    <button type="button" onClick={() => aplicarAlineacionTexto("right")} title="Alinear derecha"><AlignRight size={16} /></button>
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
                    contentEditable
                    suppressContentEditableWarning
                    className={`guion-editor-surface guion-editor-surface--rich guion-editor-surface--${alineacionTexto}`}
                    onInput={sincronizarDesdeEditor}
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
                    <div className="guion-sidebar__header"><Users size={16} /> Personajes</div>
                    <div className="guion-sidebar__add">
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
                    </div>
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
                              onClick={() => insertarElementoEditor(`${p.nombre.toUpperCase()}\n`)}
                            >
                              {p.nombre}
                            </button>
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
                    <div className="guion-sidebar__header"><MapPin size={16} /> Escenarios</div>
                    <div className="guion-sidebar__add">
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
                    </div>
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
                              onClick={() => insertarElementoEditor(`INT/EXT. ${esc.nombre.toUpperCase()} - DÍA\n`)}
                            >
                              {esc.nombre}
                            </button>
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
                  <div className="guion-content-view__pre" dangerouslySetInnerHTML={{ __html: versionActualDeGuionActivo.contenido }} />
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
                          <div className="guion-version-card__contenido" dangerouslySetInnerHTML={{ __html: v.contenido }} />
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