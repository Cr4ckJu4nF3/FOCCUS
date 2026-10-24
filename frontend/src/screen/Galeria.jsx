import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CameraOff,
  Clapperboard,
  Film,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import API_URL, { apiFetch, getActiveRole } from "../api";
import "../desing/Galeria.css";

const emptyForm = {
  tipo: "objeto",
  categoria: "",
  nombre: "",
  descripcion: "",
  id_personaje: "",
  id_escenario: "",
  id_escena: "",
  id_guion: "",
  personaje_sinopsis: "",
  interprete_nombre: "",
  interprete_descripcion: "",
  lugar_detalle_ubicacion: "",
  lugar_apariencia: "",
  lugar_objetos: "",
  lugar_personajes: "",
  ultimo_uso: "",
  estado: "Disponible",
};

const tipoLabels = {
  objeto: "Objeto",
  personaje: "Personaje",
  lugar: "Lugar",
};

const categoryOptions = {
  objeto: [
    "Vestuario",
    "Maquillaje",
    "Utilería",
    "Accesorio",
    "Mobiliario",
    "Vehículo",
    "Arma de utilería",
    "Equipo técnico",
    "Decoración",
    "Alimento y bebida",
    "Documento o elemento gráfico",
    "Efectos especiales",
    "Otro",
  ],
  personaje: [
    "Personaje principal",
    "Personaje secundario",
    "Antagonista",
    "Extra / figuración",
    "Episódico",
    "Cameo",
    "Narrador",
    "Personaje colectivo",
    "Otro",
  ],
  lugar: [
    "Interior",
    "Exterior",
    "Set / estudio",
    "Locación real",
    "Locación ficticia",
    "Espacio público",
    "Residencial",
    "Comercial",
    "Natural",
    "Histórico",
    "Otro",
  ],
};

const descriptionLabels = {
  objeto: ["Descripción y uso del elemento", "Describe su apariencia, materiales, uso en cámara y cuidados…"],
  personaje: ["Sinopsis y descripción del personaje", "Historia, personalidad, motivaciones y evolución del personaje ficticio…"],
  lugar: ["Descripción y apariencia del lugar", "Describe el ambiente, arquitectura, iluminación y rasgos visuales…"],
};

const getDescription = (item) => {
  if (item.tipo === "personaje") return item.personaje_sinopsis || item.descripcion;
  if (item.tipo === "lugar") return item.lugar_apariencia || item.descripcion;
  return item.descripcion;
};

const parseResult = async (response, fallback) => {
  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.detail || result.message || fallback);
  }
  return result.data;
};

export function GalleryModal({
  item,
  characters,
  locations,
  scripts,
  scenes,
  onClose,
  onSave,
  saving,
  error,
  initialType = "objeto",
  initialName = "",
  lockType = false,
  hideRelations = false,
}) {
  const [form, setForm] = useState(() => {
    if (!item) return { ...emptyForm, tipo: initialType, nombre: initialName };
    return {
      ...emptyForm,
      ...item,
      descripcion: item.tipo === "personaje"
        ? item.personaje_sinopsis || item.descripcion
        : item.tipo === "lugar"
          ? item.lugar_apariencia || item.descripcion
          : item.descripcion,
    };
  });
  const [photo, setPhoto] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const videoRef = useRef(null);
  const cameraRequestRef = useRef(0);
  const isEditing = Boolean(item);

  useEffect(() => () => {
    cameraRequestRef.current += 1;
  }, []);

  useEffect(() => {
    if (!cameraStream || !videoRef.current) return undefined;
    videoRef.current.srcObject = cameraStream;
    videoRef.current.play().catch(() => {
      setCameraError("No se pudo iniciar la vista previa de la cámara.");
    });
    return () => cameraStream.getTracks().forEach((track) => track.stop());
  }, [cameraStream]);

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Este navegador no permite acceder a la cámara. Usa una conexión HTTPS o localhost y prueba con un navegador compatible.");
      return;
    }
    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    setOpeningCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setCameraStream(stream);
    } catch (cameraAccessError) {
      if (requestId !== cameraRequestRef.current) return;
      const message = cameraAccessError.name === "NotAllowedError"
        ? "No se concedió permiso para usar la cámara. Revisa los permisos del navegador."
        : cameraAccessError.name === "NotFoundError"
          ? "No se encontró una cámara disponible en este dispositivo."
          : "No se pudo acceder a la cámara. Verifica que esté conectada y que ninguna otra aplicación la esté usando.";
      setCameraError(message);
    } finally {
      if (requestId === cameraRequestRef.current) setOpeningCamera(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError("La cámara aún no está lista. Espera un momento e inténtalo de nuevo.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("No se pudo preparar la captura de la fotografía.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("No se pudo capturar la fotografía. Inténtalo de nuevo.");
        return;
      }
      setPhoto(new File([blob], `galeria-${Date.now()}.jpg`, { type: "image/jpeg" }));
      setPhotoError("");
      setCameraStream(null);
    }, "image/jpeg", 0.92);
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "tipo" ? { categoria: "" } : {}),
      ...(name === "id_guion" ? { id_escena: "" } : {}),
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!isEditing && !photo) {
      setPhotoError("Selecciona una fotografía o toma una con la cámara antes de continuar.");
      return;
    }
    onSave(form, photo);
  };

  const field = (name, label, placeholder, rows = 0, required = false) => (
    <label className="gallery-field gallery-field--wide" key={name}>
      <span>{label}</span>
      {rows ? (
        <textarea name={name} value={form[name] || ""} onChange={updateField} placeholder={placeholder} rows={rows} required={required} />
      ) : (
        <input name={name} value={form[name] || ""} onChange={updateField} placeholder={placeholder} required={required} />
      )}
    </label>
  );

  const select = (name, label, options, emptyLabel, required = false) => (
    <label className="gallery-field" key={name}>
      <span>{label}</span>
      <select name={name} value={form[name] || ""} onChange={updateField} required={required}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="gallery-overlay gallery-modal-host" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="gallery-modal" role="dialog" aria-modal="true" aria-labelledby="gallery-form-title">
        <header className="gallery-modal__header">
          <div>
            <span className="gallery-eyebrow">{isEditing ? "ACTUALIZAR REGISTRO" : "NUEVO REGISTRO"}</span>
            <h2 id="gallery-form-title">
              {isEditing
                ? "Editar elemento de galería"
                : lockType
                  ? `Crear ficha de ${tipoLabels[form.tipo].toLowerCase()}`
                  : "Agregar a la galería"}
            </h2>
          </div>
          <button type="button" className="gallery-icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>
        </header>

        {error && <div className="gallery-alert gallery-alert--error" role="alert">{error}</div>}
        <form className="gallery-form" onSubmit={submit}>
          <div className="gallery-form__grid">
            <label className="gallery-field">
              <span>Tipo de registro</span>
              <select name="tipo" value={form.tipo} onChange={updateField} disabled={lockType}>
                {Object.entries(tipoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {select(
              "categoria",
              form.tipo === "personaje" ? "Tipo de personaje" : form.tipo === "lugar" ? "Tipo de locación" : "Categoría del elemento",
              [
                ...(categoryOptions[form.tipo] || []).map((value) => ({ value, label: value })),
                ...(form.categoria && !categoryOptions[form.tipo]?.includes(form.categoria)
                  ? [{ value: form.categoria, label: `${form.categoria} (actual)` }]
                  : []),
              ],
              "Selecciona una opción",
              true,
            )}
            {field("nombre", "Nombre", "Nombre del elemento", 0, true)}
            {select("estado", "Estado", ["Disponible", "En uso", "Mantenimiento", "Retirado"].map((value) => ({ value, label: value })), "Selecciona un estado")}

            {field("descripcion", descriptionLabels[form.tipo][0], descriptionLabels[form.tipo][1], 4, true)}

            {form.tipo === "objeto" && (
              <>
                {select("id_personaje", "Personaje que lo usa", characters, "Selecciona un personaje")}
                {select("id_escenario", "Lugar donde se usa", locations, "Selecciona un lugar")}
              </>
            )}
            {form.tipo === "personaje" && (
              <>
                {isEditing ? (
                  select("id_personaje", "Personaje del proyecto", characters, "Selecciona un personaje")
                ) : (
                  <p className="gallery-form__hint">
                    Al guardar, este personaje también se agregará a Personajes y estará disponible al escribir guiones.
                  </p>
                )}
                {field("interprete_nombre", "Quién lo interpreta", "Nombre del actor o actriz")}
                {field("interprete_descripcion", "Descripción del intérprete", "Detalles relevantes del actor o actriz…", 3)}
              </>
            )}
            {form.tipo === "lugar" && (
              <>
                {isEditing ? (
                  select("id_escenario", "Locación del proyecto", locations, "Selecciona una locación")
                ) : (
                  <p className="gallery-form__hint">
                    Al guardar, este lugar también se agregará a Lugares y estará disponible al escribir guiones.
                  </p>
                )}
                {field("lugar_detalle_ubicacion", "Ubicación detallada", "Dirección, zona, accesos o referencias…", 2)}
                {field("lugar_objetos", "Objetos usados en el lugar", "Vestuario, utilería, maquillaje u otros elementos…", 2)}
                {field("lugar_personajes", "Personajes que aparecen en el lugar", "Nombres y detalles de uso o interacción…", 2)}
              </>
            )}

            {!hideRelations && (
              <>
                {select("id_guion", "Guion relacionado", scripts, "Selecciona un guion")}
                {select(
                  "id_escena",
                  "Escena relacionada",
                  scenes.filter((scene) => !form.id_guion || String(scene.id_guion) === String(form.id_guion)),
                  "Selecciona una escena",
                )}
              </>
            )}
            <label className="gallery-field">
              <span>Último uso</span>
              <input type="date" name="ultimo_uso" value={form.ultimo_uso || ""} onChange={updateField} />
            </label>
            <label className="gallery-field gallery-field--wide">
              <span>{isEditing ? "Cambiar fotografía (opcional)" : "Fotografía"}</span>
              <div className="gallery-photo-controls">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                  setPhoto(event.target.files?.[0] || null);
                  setPhotoError("");
                }} />
                <button type="button" className="gallery-button gallery-button--subtle" onClick={startCamera} disabled={Boolean(cameraStream) || openingCamera}>
                  <Camera size={16} /> {openingCamera ? "Abriendo cámara…" : "Tomar foto"}
                </button>
              </div>
              {cameraError && <small className="gallery-camera-error" role="alert">{cameraError}</small>}
              {photoError && <small className="gallery-camera-error" role="alert">{photoError}</small>}
              <small>{photo ? `Foto seleccionada: ${photo.name}` : "JPG, PNG o WEBP. Máximo 10 MB."}</small>
            </label>
          </div>
          <footer className="gallery-modal__footer">
            <button type="button" className="gallery-button gallery-button--subtle" onClick={onClose}>Cancelar</button>
            <button type="submit" className="gallery-button gallery-button--primary" disabled={saving}>
              {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Agregar elemento"}
            </button>
          </footer>
        </form>
      </section>
      {cameraStream && (
        <section className="gallery-camera-screen" role="dialog" aria-modal="true" aria-label="Cámara para tomar fotografía">
          <video ref={videoRef} autoPlay muted playsInline aria-label="Vista previa de la cámara" />
          <header className="gallery-camera-screen__header">
            <span><Camera size={17} /> Cámara</span>
            <button type="button" className="gallery-icon-button" onClick={() => setCameraStream(null)} aria-label="Cerrar cámara">
              <X size={20} />
            </button>
          </header>
          <footer className="gallery-camera-screen__footer">
            <button type="button" className="gallery-button gallery-button--subtle" onClick={() => setCameraStream(null)}>
              <CameraOff size={17} /> Cancelar
            </button>
            <button type="button" className="gallery-button gallery-button--primary" onClick={capturePhoto}>
              <Camera size={18} /> Tomar foto
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

function GalleryDetails({ item, characters, locations, scripts, scenes, isAdmin, onClose, onItemUpdate }) {
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [versionsError, setVersionsError] = useState("");
  const [versionUploadError, setVersionUploadError] = useState("");
  const [uploadingVersionId, setUploadingVersionId] = useState(null);
  const [updateMainImageFor, setUpdateMainImageFor] = useState({});
  const character = characters.find((option) => String(option.value) === String(item.id_personaje));
  const location = locations.find((option) => String(option.value) === String(item.id_escenario));
  const script = scripts.find((option) => String(option.value) === String(item.id_guion));
  const scene = scenes.find((option) => String(option.id_escena) === String(item.id_escena));
  const details = [
    ["Personaje", character?.label],
    ["Lugar", location?.label],
    ["Guion", script?.label],
    ["Escena", scene?.encabezado || (scene ? `Escena ${scene.numero_de_escena}` : "")],
    ["Intérprete", item.interprete_nombre],
    ["Descripción del intérprete", item.interprete_descripcion],
    ["Ubicación detallada", item.lugar_detalle_ubicacion],
    ["Objetos usados en el lugar", item.lugar_objetos],
    ["Personajes en el lugar", item.lugar_personajes],
    ["Último uso", item.ultimo_uso],
  ].filter(([, value]) => value);

  const uploadVersionPhoto = async (version, photo) => {
    if (!photo) return;
    setUploadingVersionId(version.id_version);
    setVersionUploadError("");
    try {
      const formData = new FormData();
      formData.append("foto", photo);
      const updateMainImage = Boolean(isAdmin && updateMainImageFor[version.id_version]);
      formData.append("actualizar_imagen_principal", String(updateMainImage));
      const response = await apiFetch(
        `/projects/${encodeURIComponent(item.id_project)}/galeria/${item.id_galeria}/versiones/${version.id_version}/foto`,
        { method: "POST", body: formData },
      );
      const uploadedPhoto = await parseResult(response, "No se pudo guardar la imagen de la versión");
      setVersions((current) => current.map((entry) => (
        entry.id_version === version.id_version ? { ...entry, ...uploadedPhoto } : entry
      )));
      onItemUpdate({
        ...item,
        ...(updateMainImage ? { archivo_path: uploadedPhoto.archivo_path } : {}),
        versiones_sin_foto: Math.max(
          0,
          (item.versiones_sin_foto || 0) - (version.foto_pendiente ? 1 : 0),
        ),
      });
      setUpdateMainImageFor((current) => ({ ...current, [version.id_version]: false }));
    } catch (uploadError) {
      setVersionUploadError(uploadError.message || "No se pudo guardar la imagen de la versión");
    } finally {
      setUploadingVersionId(null);
    }
  };

  useEffect(() => {
    let active = true;
    const loadVersions = async () => {
      setLoadingVersions(true);
      setVersionsError("");
      try {
        const response = await apiFetch(`/projects/${encodeURIComponent(item.id_project)}/galeria/${item.id_galeria}/versiones`);
        const data = await parseResult(response, "No se pudo cargar el historial de versiones");
        if (active) setVersions(Array.isArray(data) ? data : []);
      } catch (error) {
        if (active) setVersionsError(error.message || "No se pudo cargar el historial de versiones");
      } finally {
        if (active) setLoadingVersions(false);
      }
    };
    loadVersions();
    return () => { active = false; };
  }, [item.id_galeria, item.id_project]);

  return (
    <div className="gallery-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="gallery-modal gallery-modal--details" role="dialog" aria-modal="true" aria-labelledby="gallery-details-title">
        <header className="gallery-modal__header">
          <div>
            <span className="gallery-eyebrow">{tipoLabels[item.tipo]}{item.categoria ? ` · ${item.categoria}` : ""}</span>
            <h2 id="gallery-details-title">{item.nombre}</h2>
          </div>
          <button type="button" className="gallery-icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>
        </header>
        <img className="gallery-details__image" src={`${API_URL}/assets/${item.archivo_path}`} alt={item.nombre} />
        <div className="gallery-details__body">
          <p>{getDescription(item)}</p>
          <span className={`gallery-status gallery-status--${item.estado.toLowerCase().replace(/\s+/g, "-")}`}>{item.estado}</span>
          {details.length > 0 && (
            <dl className="gallery-details__list">
              {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          )}
          <section className="gallery-version-history" aria-labelledby="gallery-version-history-title">
            <header className="gallery-version-history__header">
              <div>
                <span className="gallery-eyebrow">REGISTRO DE USO</span>
                <h3 id="gallery-version-history-title">Versiones de uso</h3>
              </div>
              <span className="gallery-version-history__count">{item.total_versiones || versions.length}</span>
            </header>
            {loadingVersions ? (
              <p className="gallery-version-history__empty">Cargando historial…</p>
            ) : versionsError ? (
              <p className="gallery-version-history__error" role="alert">{versionsError}</p>
            ) : versions.length ? (
              <>
                {versionUploadError && <p className="gallery-version-history__error" role="alert">{versionUploadError}</p>}
                <ol className="gallery-version-history__list">
                  {versions.map((version) => (
                    <li key={version.id_version}>
                    <div className="gallery-version-history__item-header">
                      <strong>Versión {version.numero_version}</strong>
                      <time dateTime={version.fecha_creacion}>
                        {version.fecha_creacion ? new Date(version.fecha_creacion).toLocaleString("es-CO") : ""}
                      </time>
                    </div>
                    <p>{version.detalles_uso}</p>
                    {version.guion_nombre && <small>Guion: {version.guion_nombre}</small>}
                      {version.archivo_path && (
                        <img
                          className="gallery-version-history__image"
                          src={`${API_URL}/assets/${version.archivo_path}`}
                          alt={`Imagen de la versión ${version.numero_version}`}
                        />
                      )}
                      {version.foto_pendiente && <span className="gallery-version-history__pending">Imagen pendiente de subir</span>}
                      <div className="gallery-version-history__actions">
                        {isAdmin && (
                          <label className="gallery-version-history__main-toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(updateMainImageFor[version.id_version])}
                              onChange={(event) => setUpdateMainImageFor((current) => ({
                                ...current,
                                [version.id_version]: event.target.checked,
                              }))}
                            />
                            <span>Actualizar también la imagen principal</span>
                          </label>
                        )}
                        <label className="gallery-version-history__upload">
                          <ImagePlus size={15} />
                          {uploadingVersionId === version.id_version ? "Subiendo…" : version.foto_pendiente ? "Subir imagen" : "Cambiar imagen"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            aria-label={`Subir imagen para la versión ${version.numero_version}`}
                            disabled={uploadingVersionId !== null}
                            onChange={(event) => {
                              uploadVersionPhoto(version, event.target.files?.[0]);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="gallery-version-history__empty">Aún no hay versiones de uso. Se registrará una cada vez que se utilice en un guion.</p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

export default function GaleriaScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const isAdmin = getActiveRole() === 1001;
  const [items, setItems] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorItem, setEditorItem] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);

  const loadGallery = async () => {
    setLoading(true);
    setError("");
    try {
      const [galleryResponse, charactersResponse, locationsResponse, scriptsResponse] = await Promise.all([
        apiFetch(`/projects/${encodeURIComponent(projectId)}/galeria`),
        apiFetch(`/projects/${encodeURIComponent(projectId)}/personajes`),
        apiFetch(`/projects/${encodeURIComponent(projectId)}/escenarios`),
        apiFetch(`/guiones?id_project=${encodeURIComponent(projectId)}`),
      ]);
      const [galleryData, charactersData, locationsData, scriptsData] = await Promise.all([
        parseResult(galleryResponse, "No se pudo cargar la galería"),
        parseResult(charactersResponse, "No se pudieron cargar los personajes"),
        parseResult(locationsResponse, "No se pudieron cargar las locaciones"),
        parseResult(scriptsResponse, "No se pudieron cargar los guiones"),
      ]);
      const sceneGroups = await Promise.all((scriptsData || []).map(async (script) => {
        const response = await apiFetch(`/guiones/${encodeURIComponent(script.id_guion)}/escenas`);
        return parseResult(response, "No se pudieron cargar las escenas");
      }));
      setItems(galleryData || []);
      setCharacters((charactersData || []).map((item) => ({ value: item.id_personaje, label: item.nombre })));
      setLocations((locationsData || []).map((item) => ({ value: item.id_escenario, label: item.nombre })));
      setScripts((scriptsData || []).map((item) => ({ value: item.id_guion, label: item.nombre })));
      setScenes(sceneGroups.flat());
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar la galería");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      navigate("/seleccion-proyecto", { replace: true });
      return;
    }
    loadGallery();
  }, [projectId]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesType = filter === "todos" || item.tipo === filter;
    const text = `${item.nombre} ${item.categoria || ""} ${getDescription(item)} ${item.estado}`.toLowerCase();
    return matchesType && text.includes(search.trim().toLowerCase());
  }), [filter, items, search]);

  const saveItem = async (form, photo) => {
    setSaving(true);
    setError("");
    setNotice("");
    const values = { ...form };
    ["id_personaje", "id_escenario", "id_escena", "id_guion"].forEach((key) => {
      values[key] = values[key] ? (key === "id_guion" ? Number(values[key]) : values[key]) : null;
    });
    ["categoria", "personaje_sinopsis", "interprete_nombre", "interprete_descripcion", "lugar_detalle_ubicacion", "lugar_apariencia", "lugar_objetos", "lugar_personajes"].forEach((key) => {
      values[key] = values[key]?.trim() || null;
    });
    values.personaje_sinopsis = values.tipo === "personaje" ? values.descripcion.trim() : null;
    values.lugar_apariencia = values.tipo === "lugar" ? values.descripcion.trim() : null;
    if (values.tipo !== "personaje") {
      values.interprete_nombre = null;
      values.interprete_descripcion = null;
    }
    if (values.tipo !== "lugar") {
      values.lugar_detalle_ubicacion = null;
      values.lugar_objetos = null;
      values.lugar_personajes = null;
    }
    if (values.tipo === "personaje") values.id_escenario = null;
    if (values.tipo === "lugar") values.id_personaje = null;
    try {
      if (editorItem?.id_galeria) {
        values.ultimo_uso = values.ultimo_uso || null;
        const response = await apiFetch(`/projects/${encodeURIComponent(projectId)}/galeria/${editorItem.id_galeria}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
        await parseResult(response, "No se pudo actualizar el elemento");
        if (photo) {
          const photoForm = new FormData();
          photoForm.append("foto", photo);
          const photoResponse = await apiFetch(`/projects/${encodeURIComponent(projectId)}/galeria/${editorItem.id_galeria}/foto`, {
            method: "POST",
            headers: {},
            body: photoForm,
          });
          await parseResult(photoResponse, "Los datos se guardaron, pero no se pudo reemplazar la fotografía");
        }
      } else {
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
          if (value !== null && value !== "") formData.append(key, String(value));
        });
        formData.append("foto", photo);
        const response = await apiFetch(`/projects/${encodeURIComponent(projectId)}/galeria`, {
          method: "POST",
          headers: {},
          body: formData,
        });
        const createdItem = await parseResult(response, "No se pudo agregar el elemento");
        if (createdItem.entidad_vinculada) {
          const entityLabel = createdItem.entidad_vinculada === "personaje" ? "Personajes" : "Lugares";
          setNotice(
            `Elemento agregado a la galería y ${createdItem.entidad_creada ? "agregado" : "vinculado"} a ${entityLabel}.`,
          );
        } else {
          setNotice("Elemento agregado a la galería.");
        }
      }
      setEditorItem(null);
      if (editorItem?.id_galeria) setNotice("Elemento actualizado.");
      await loadGallery();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar el elemento");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}" de la galería? Esta acción no se puede deshacer.`)) return;
    setError("");
    try {
      const response = await apiFetch(`/projects/${encodeURIComponent(projectId)}/galeria/${item.id_galeria}`, { method: "DELETE" });
      await parseResult(response, "No se pudo eliminar el elemento");
      setNotice("Elemento eliminado de la galería.");
      setItems((current) => current.filter((entry) => entry.id_galeria !== item.id_galeria));
    } catch (removeError) {
      setError(removeError.message || "No se pudo eliminar el elemento");
    }
  };

  return (
    <div className={`gallery-page ${isAdmin ? "module-role-admin" : "module-role-user"}`}>
      <header className="gallery-header">
        <div className="gallery-header__inner">
          <button type="button" className="gallery-back" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Volver</button>
          <span className="gallery-project"><Camera size={17} /> {projectName}</span>
        </div>
      </header>

      <main className="gallery-main">
        <section className="gallery-hero">
          <div className="gallery-hero__icon"><Camera size={23} /></div>
          <div>
            <span className="gallery-eyebrow">REFERENCIAS VISUALES DEL PROYECTO</span>
            <h1>Galería</h1>
            <p>Fotografías y detalles de utilería, personajes y locaciones para mantener cada referencia a mano.</p>
          </div>
          {isAdmin && (
            <button type="button" className="gallery-button gallery-button--primary gallery-hero__action" onClick={() => { setError(""); setEditorItem({}); }}>
              <ImagePlus size={17} /> Agregar fotografía
            </button>
          )}
        </section>

        {error && <div className="gallery-alert gallery-alert--error" role="alert">{error}</div>}
        {notice && <div className="gallery-alert gallery-alert--success" role="status">{notice}</div>}

        <section className="gallery-toolbar" aria-label="Filtros de galería">
          <div className="gallery-filters">
            {["todos", "objeto", "personaje", "lugar"].map((type) => (
              <button key={type} type="button" className={filter === type ? "gallery-filter gallery-filter--active" : "gallery-filter"} onClick={() => setFilter(type)}>
                {type === "todos" ? "Todo" : tipoLabels[type]}
              </button>
            ))}
          </div>
          <label className="gallery-search">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en la galería" />
          </label>
        </section>

        {loading ? (
          <div className="gallery-empty">Cargando galería…</div>
        ) : filteredItems.length === 0 ? (
          <div className="gallery-empty">
            <span><Camera size={25} /></span>
            <h2>{items.length ? "No hay resultados" : "Aún no hay fotografías"}</h2>
            <p>{items.length ? "Prueba con otro filtro o término de búsqueda." : isAdmin ? "Agrega la primera referencia visual del proyecto." : "Cuando el equipo agregue fotografías, aparecerán aquí."}</p>
            {isAdmin && items.length === 0 && <button type="button" className="gallery-button gallery-button--primary" onClick={() => { setError(""); setEditorItem({}); }}><Plus size={17} /> Agregar fotografía</button>}
          </div>
        ) : (
          <section className="gallery-grid" aria-label="Fotografías del proyecto">
            {filteredItems.map((item) => (
              <article className="gallery-card" key={item.id_galeria}>
                <button type="button" className="gallery-card__image-button" onClick={() => setDetailsItem(item)} aria-label={`Ver detalles de ${item.nombre}`}>
                  <img src={`${API_URL}/assets/${item.archivo_path}`} alt={item.nombre} loading="lazy" />
                  <span className="gallery-card__type">{tipoLabels[item.tipo]}</span>
                </button>
                <div className="gallery-card__body">
                  <div className="gallery-card__heading">
                    <div>
                      <h2>{item.nombre}</h2>
                      {item.categoria && <span>{item.categoria}</span>}
                    </div>
                    <span className={`gallery-status gallery-status--${item.estado.toLowerCase().replace(/\s+/g, "-")}`}>{item.estado}</span>
                  </div>
                  <div className="gallery-card__version-count">
                    <span>{item.total_versiones || 0}</span> {(item.total_versiones || 0) === 1 ? "versión de uso" : "versiones de uso"}
                  </div>
                  {item.versiones_sin_foto > 0 && (
                    <span className="gallery-card__pending">
                      {item.versiones_sin_foto} {item.versiones_sin_foto === 1 ? "imagen pendiente" : "imágenes pendientes"}
                    </span>
                  )}
                  <p className="gallery-card__description">{getDescription(item)}</p>
                  <div className="gallery-card__links">
                    {item.id_personaje && <span><UserRound size={14} /> {characters.find((character) => String(character.value) === String(item.id_personaje))?.label || "Personaje"}</span>}
                    {item.id_escenario && <span><MapPin size={14} /> {locations.find((location) => String(location.value) === String(item.id_escenario))?.label || "Locación"}</span>}
                    {item.id_guion && <span><Clapperboard size={14} /> {scripts.find((script) => String(script.value) === String(item.id_guion))?.label || "Guion"}</span>}
                    {item.id_escena && <span><Film size={14} /> Escena vinculada</span>}
                    {item.ultimo_uso && <span><CalendarDays size={14} /> Último uso: {item.ultimo_uso}</span>}
                  </div>
                  <footer className="gallery-card__footer">
                    <button type="button" onClick={() => setDetailsItem(item)}>Ver ficha completa</button>
                    {isAdmin && (
                      <div>
                        <button type="button" onClick={() => setEditorItem(item)} aria-label={`Editar ${item.nombre}`}><Pencil size={15} /></button>
                        <button type="button" onClick={() => removeItem(item)} aria-label={`Eliminar ${item.nombre}`}><Trash2 size={15} /></button>
                      </div>
                    )}
                  </footer>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {editorItem && (
        <GalleryModal
          key={editorItem.id_galeria || "new"}
          item={editorItem.id_galeria ? editorItem : null}
          characters={characters}
          locations={locations}
          scripts={scripts}
          scenes={scenes}
          onClose={() => setEditorItem(null)}
          onSave={saveItem}
          saving={saving}
          error={error}
        />
      )}
      {detailsItem && (
        <GalleryDetails
          item={detailsItem}
          characters={characters}
          locations={locations}
          scripts={scripts}
          scenes={scenes}
          isAdmin={isAdmin}
          onItemUpdate={(updatedItem) => {
            setDetailsItem(updatedItem);
            setItems((current) => current.map((entry) => (
              entry.id_galeria === updatedItem.id_galeria ? updatedItem : entry
            )));
          }}
          onClose={() => setDetailsItem(null)}
        />
      )}
    </div>
  );
}
