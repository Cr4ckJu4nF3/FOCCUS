import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Plus, ChevronRight, X, Film, Clapperboard } from "lucide-react";
import logo from "../assets/FoccusNB_White.png";
import { apiFetch } from "../api";
import "../desing/ProjectSelection.css";

const formatOptions = [
  "serie", "miniserie", "pelicula", "largometraje", "mediometraje", "cortometraje",
  "documental", "spot publicitario", "video musical", "video corporativo",
  "video educativo", "micro-formato", "mockumentary",
];

const genreOptions = [
  "accion", "comedia", "aventura", "drama", "terror", "ciencia ficcion",
  "fantasia", "suspenso", "musical", "western", "belico", "romance",
  "crimen", "misterio", "animacion", "biopic", "documental", "video",
  "artes marciales", "thriller", "historico", "epoca", "familiar",
  "deportivo", "horror", "paranormal", "otro",
];

export default function ProjectSelectionScreen() {
  const [showProjectList, setShowProjectList] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hoveredProject, setHoveredProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [formData, setFormData] = useState({
    project_name: "",
    formato_de_produccion: "",
    genero: "",
    sinopsis: "",
    director: "",
  });
  const navigate = useNavigate();
  const idRol = parseInt(localStorage.getItem("id_rol")) || 0;
  const esAdmin = idRol === 1001;

  // Cargar proyectos al abrir la lista
  const fetchProjects = async () => {
  setLoadingProjects(true);
  setError("");
  try {
    const idUser = localStorage.getItem("id_user");
    const response = await apiFetch(`/users/${idUser}/projects`);
    if (response.ok) {
      const result = await response.json();
      const data = result.data || result;
      setProjects(Array.isArray(data) ? data : []);
    } else {
      setError("Error al cargar los proyectos");
    }
  } catch (err) {
    setError("No se pudo conectar con el servidor");
  } finally {
    setLoadingProjects(false);
  }
};

  useEffect(() => {
    if (showProjectList) {
      fetchProjects();
    }
  }, [showProjectList]);


  const handleSelectProject = (project) => {
  localStorage.setItem("projectId", project.id_project);
  localStorage.setItem("id_project", project.id_project);
  localStorage.setItem("projectName", project.project_name);
  navigate("/proyecto-dashboard", { state: { projectName: project.project_name, projectId: project.id_project } });
};

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError("");
    setLoadingCreate(true);

    try {
      const idClient = localStorage.getItem("id_client") || 1;
      const response = await apiFetch("/projects/create", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          id_client: Number(idClient),
          id_user: Number(localStorage.getItem("id_user")),
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ project_name: "", formato_de_produccion: "", genero: "", sinopsis: "", director: "" });
        navigate("/proyecto-dashboard", { state: { projectName: formData.project_name } });
      } else {
        const errorData = await response.json();
        const mensaje = typeof errorData.detail === "string"
          ? errorData.detail
          : Array.isArray(errorData.detail)
            ? errorData.detail.map(e => e.msg).join(", ")
            : errorData.message || "Error al crear el proyecto";
        setError(mensaje);

      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <div className="pss-page">
      {/* Header */}
      <header className="pss-header">
        <div className="pss-header-inner">
          <img src={logo} alt="Logo" className="pss-logo" />
        </div>
      </header>

      {/* Content */}
      <main className="pss-main">
        {/* Page heading */}
        <div className="pss-heading">
          <Clapperboard className="pss-heading-icon" />
          <h1 className="pss-heading-title">
            Gestión de Proyectos
          </h1>
          <p className="pss-heading-subtitle">
            Consulte tus proyectos.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="pss-error">
            {error}
          </div>
        )}

        {/* Two action buttons */}
        <div className={`pss-actions-grid ${esAdmin ? "pss-actions-grid--admin" : "pss-actions-grid--single"}`}>
          {/* Escoger proyecto */}
          <button
            onClick={() => {
              setShowProjectList((prev) => !prev);
              setShowCreateModal(false);
            }}
            className={`pss-action-card pss-action-card--select ${showProjectList ? "pss-action-card--active" : ""}`}
          >
            <div className="pss-action-icon-wrapper">
              <FolderOpen className="pss-action-icon" />
            </div>
            <div className="pss-action-text">
              <span className="pss-action-title">
                Escoger Proyecto
              </span>
              <span className="pss-action-subtitle">
                Acceder a un proyecto existente
              </span>
            </div>
            {showProjectList && (
              <span className="pss-action-dot" />
            )}
          </button>

          {/* Crear proyecto - solo admin */}
          {esAdmin && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setShowProjectList(false);
              }}
              className="pss-action-card pss-action-card--create"
            >
              <div className="pss-action-icon-wrapper">
                <Plus className="pss-action-icon" />
              </div>
              <div className="pss-action-text">
                <span className="pss-action-title">
                  Crear Proyecto
                </span>
                <span className="pss-action-subtitle">
                  Registrar un nuevo proyecto
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Project List */}
        {showProjectList && (
          <div className="pss-list-card">
            <div className="pss-list-header">
              <Film className="pss-list-header-icon" />
              <span className="pss-list-header-title">
                Proyectos disponibles
              </span>
              <span className="pss-list-header-count">
                {projects.length} proyectos
              </span>
            </div>

            {loadingProjects ? (
              <div className="pss-list-state">
                <span className="pss-spinner" />
                <p className="pss-list-state-text">Cargando proyectos...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="pss-list-state">
                <p className="pss-list-state-text">No hay proyectos disponibles. Crea uno nuevo.</p>
              </div>
            ) : (
              <ul className="pss-list">
                {projects.map((project) => (
                  <li key={project.id_project}>
                    <button
                      onClick={() => handleSelectProject(project)}
                      onMouseEnter={() => setHoveredProject(project.id_project)}
                      onMouseLeave={() => setHoveredProject(null)}
                      className="pss-list-item"
                    >
                      <div className="pss-list-item-icon-wrapper">
                        <Clapperboard className="pss-list-item-icon" />
                      </div>
                      <div className="pss-list-item-body">
                        <p className="pss-list-item-name">
                          {project.project_name}
                        </p>
                        <p className="pss-list-item-meta">
                          {project.formato_de_produccion} &middot; {project.genero} {project.director ? `· Dir. ${project.director}` : ""}
                        </p>
                      </div>
                      <ChevronRight
                        className={`pss-list-item-chevron ${hoveredProject === project.id_project ? "pss-list-item-chevron--active" : ""}`}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="pss-modal-overlay">
          <div
            className="pss-modal-backdrop"
            onClick={() => setShowCreateModal(false)}
          />

          <div className="pss-modal">
            {/* Modal Header */}
            <div className="pss-modal-header">
              <div className="pss-modal-header-row">
                <div>
                  <p className="pss-modal-header-eyebrow">
                    Nuevo registro
                  </p>
                  <h2 className="pss-modal-header-title">
                    Crear Proyecto
                  </h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="pss-modal-close"
                >
                  <X className="pss-modal-close-icon" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="pss-modal-body">
              {error && (
                <div className="pss-modal-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateProject} className="pss-modal-form" id="create-project-form">
                <div className="pss-modal-field">
                  <label className="pss-modal-label">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    name="project_name"
                    value={formData.project_name}
                    onChange={handleChange}
                    className="pss-modal-input"
                    placeholder="Nombre de la serie, película u otro proyecto audiovisual"
                    required
                  />
                </div>

                <div className="pss-modal-grid-2">
                  <div className="pss-modal-field">
                    <label className="pss-modal-label">
                      Formato
                    </label>
                    <select
                      name="formato_de_produccion"
                      value={formData.formato_de_produccion}
                      onChange={handleChange}
                      className="pss-modal-select"
                      required
                    >
                      <option value="">Selecciona formato</option>
                      {formatOptions.map((f) => (
                        <option key={f} value={f}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pss-modal-field">
                    <label className="pss-modal-label">
                      Género
                    </label>
                    <select
                      name="genero"
                      value={formData.genero}
                      onChange={handleChange}
                      className="pss-modal-select"
                      required
                    >
                      <option value="">Selecciona género</option>
                      {genreOptions.map((g) => (
                        <option key={g} value={g}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pss-modal-field">
                  <label className="pss-modal-label">
                    Sinopsis
                  </label>
                  <textarea
                    name="sinopsis"
                    value={formData.sinopsis}
                    onChange={handleChange}
                    rows={3}
                    className="pss-modal-textarea"
                    placeholder="Detalle de lo que trata el producto audiovisual"
                  />
                </div>

                <div className="pss-modal-field">
                  <label className="pss-modal-label">
                    Director
                  </label>
                  <input
                    type="text"
                    name="director"
                    value={formData.director}
                    onChange={handleChange}
                    className="pss-modal-input"
                    placeholder="Director o directores del producto audiovisual"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="pss-modal-footer">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="pss-modal-cancel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-project-form"
                disabled={loadingCreate}
                className="pss-modal-submit"
              >
                {loadingCreate ? "Creando..." : "Crear Proyecto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
