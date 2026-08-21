import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Plus, ChevronRight, X, Film, Clapperboard } from "lucide-react";
import logo from "../assets/Logo_Negativo.png";
import API_URL from "../api";

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
    const response = await fetch(`${API_URL}/users/${idUser}/projects`);
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
      const response = await fetch(`${API_URL}/projects/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <img src={logo} alt="Logo" className="h-15" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Page heading */}
        <div className="text-center mb-12">
          <Clapperboard className="w-10 h-10 text-[#0B4F8A] mx-auto mb-4 opacity-80" />
          <h1 className="text-[#FAFAFA] text-2xl font-semibold tracking-wide mb-2">
            Gestión de Proyectos
          </h1>
          <p className="text-[#6B6B6B] text-sm">
            Consulte tus proyectos.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Two action buttons */}
        <div className={`grid gap-5 mb-8 ${esAdmin ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-md mx-auto"}`}>
          {/* Escoger proyecto */}
          <button
            onClick={() => {
              setShowProjectList((prev) => !prev);
              setShowCreateModal(false);
            }}
            className={`group relative flex flex-col items-center gap-4 py-10 px-6 rounded-xl border-2 transition-all duration-200 ${
              showProjectList
                ? "bg-[#0B4F8A]/15 border-[#0B4F8A] shadow-lg shadow-[#0B4F8A]/10"
                : "bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#0B4F8A]/60 hover:bg-[#0B4F8A]/5"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                showProjectList
                  ? "bg-[#0B4F8A]"
                  : "bg-[#2A2A2A] group-hover:bg-[#0B4F8A]/20"
              }`}
            >
              <FolderOpen
                className={`w-7 h-7 transition-colors ${
                  showProjectList ? "text-white" : "text-[#6B6B6B] group-hover:text-[#0B4F8A]"
                }`}
              />
            </div>
            <div className="text-center">
              <span className="block font-semibold text-base tracking-wide text-[#FAFAFA]">
                Escoger Proyecto
              </span>
              <span className="block text-xs text-[#6B6B6B] mt-1">
                Acceder a un proyecto existente
              </span>
            </div>
            {showProjectList && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#0B4F8A]" />
            )}
          </button>

          {/* Crear proyecto - solo admin */}
          {esAdmin && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setShowProjectList(false);
              }}
              className="group relative flex flex-col items-center gap-4 py-10 px-6 rounded-xl border-2 border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#7B5FCF]/60 hover:bg-[#7B5FCF]/5 transition-all duration-200"
            >
              <div className="w-16 h-16 rounded-full bg-[#2A2A2A] group-hover:bg-[#7B5FCF]/20 flex items-center justify-center transition-all">
                <Plus className="w-7 h-7 text-[#6B6B6B] group-hover:text-[#7B5FCF] transition-colors" />
              </div>
              <div className="text-center">
                <span className="block font-semibold text-base tracking-wide text-[#FAFAFA]">
                  Crear Proyecto
                </span>
                <span className="block text-xs text-[#6B6B6B] mt-1">
                  Registrar un nuevo proyecto
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Project List */}
        {showProjectList && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center gap-2">
              <Film className="w-4 h-4 text-[#0B4F8A]" />
              <span className="text-[#FAFAFA] text-sm font-semibold tracking-wide">
                Proyectos disponibles
              </span>
              <span className="ml-auto text-[#6B6B6B] text-xs">
                {projects.length} proyectos
              </span>
            </div>

            {loadingProjects ? (
              <div className="p-8 text-center">
                <span className="w-6 h-6 border-2 border-[#0B4F8A]/30 border-t-[#0B4F8A] rounded-full animate-spin inline-block" />
                <p className="text-[#6B6B6B] text-sm mt-3">Cargando proyectos...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[#6B6B6B] text-sm">No hay proyectos disponibles. Crea uno nuevo.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#2A2A2A]">
                {projects.map((project) => (
                  <li key={project.id_project}>
                    <button
                      onClick={() => handleSelectProject(project)}
                      onMouseEnter={() => setHoveredProject(project.id_project)}
                      onMouseLeave={() => setHoveredProject(null)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#0B4F8A]/8 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#0B4F8A]/15 border border-[#0B4F8A]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0B4F8A]/25 transition-colors">
                        <Clapperboard className="w-4 h-4 text-[#0B4F8A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#FAFAFA] font-medium text-sm truncate">
                          {project.project_name}
                        </p>
                        <p className="text-[#6B6B6B] text-xs mt-0.5">
                          {project.formato_de_produccion} &middot; {project.genero} {project.director ? `· Dir. ${project.director}` : ""}
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 flex-shrink-0 transition-all ${
                          hoveredProject === project.id_project
                            ? "text-[#0B4F8A] translate-x-0.5"
                            : "text-[#2A2A2A]"
                        }`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />

          <div className="relative w-full max-w-lg bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#7B5FCF] to-[#0B4F8A] px-7 py-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-1">
                    Nuevo registro
                  </p>
                  <h2 className="text-white text-lg font-semibold tracking-wide">
                    Crear Proyecto
                  </h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-7">
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-5" id="create-project-form">
                <div>
                  <label className="block mb-1.5 text-[#FAFAFA] text-sm font-medium">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    name="project_name"
                    value={formData.project_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA] placeholder:text-[#4A4A4A] text-sm"
                    placeholder="Nombre de la serie, película u otro proyecto audiovisual"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-[#FAFAFA] text-sm font-medium">
                      Formato
                    </label>
                    <select
                      name="formato_de_produccion"
                      value={formData.formato_de_produccion}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA] text-sm"
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

                  <div>
                    <label className="block mb-1.5 text-[#FAFAFA] text-sm font-medium">
                      Género
                    </label>
                    <select
                      name="genero"
                      value={formData.genero}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA] text-sm"
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

                <div>
                  <label className="block mb-1.5 text-[#FAFAFA] text-sm font-medium">
                    Sinopsis
                  </label>
                  <textarea
                    name="sinopsis"
                    value={formData.sinopsis}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA] placeholder:text-[#4A4A4A] resize-none text-sm"
                    placeholder="Detalle de lo que trata el producto audiovisual"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-[#FAFAFA] text-sm font-medium">
                    Director
                  </label>
                  <input
                    type="text"
                    name="director"
                    value={formData.director}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA] placeholder:text-[#4A4A4A] text-sm"
                    placeholder="Director o directores del producto audiovisual"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-7 py-5 border-t border-[#2A2A2A] bg-[#0A0A0A] flex items-center justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2.5 rounded-lg border border-[#2A2A2A] text-[#6B6B6B] hover:text-[#FAFAFA] hover:border-[#6B6B6B] text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-project-form"
                disabled={loadingCreate}
                className="px-8 py-2.5 rounded-lg bg-[#7B5FCF] text-white hover:bg-[#6a4eb8] text-sm font-semibold tracking-wide transition-all shadow-lg shadow-[#7B5FCF]/20 disabled:opacity-50"
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