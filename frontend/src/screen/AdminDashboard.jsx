import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  ClipboardList,
  FileText,
  Film,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import logo from "../assets/FoccusNB_White.png";
import { apiFetch, clearSession, getActiveRole, setActiveProject as persistActiveProject } from "../api";
import "../desing/AdminDashboard.css";

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

const emptyProjectForm = {
  project_name: "",
  formato_de_produccion: "",
  genero: "",
  sinopsis: "",
  director: "",
};

const statusProgress = (value) => {
  const status = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  if (["finalizado", "finalizada", "completado", "completada", "aprobado", "aprobada", "terminado", "terminada"].includes(status)) {
    return 1;
  }
  if (["en-progreso", "en-rodaje", "revision", "en-revision", "confirmado", "confirmada"].includes(status)) {
    return 0.5;
  }
  return 0;
};

const getItems = async (path, fallbackMessage) => {
  const response = await apiFetch(path);
  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.detail || result.message || fallbackMessage);
  }
  return Array.isArray(result.data) ? result.data : [];
};

const getStatusLabel = (status) => {
  if (!status) return "Sin estado";
  return String(status);
};

const formatDate = (date) => {
  if (!date) return "Sin fecha";
  const parsedDate = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? "Sin fecha"
    : parsedDate.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
};

export default function AdminDashboardScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeProject, setActiveProject] = useState(() => ({
    id: location.state?.projectId || localStorage.getItem("projectId") || "",
    name: location.state?.projectName || localStorage.getItem("projectName") || "",
  }));
  const projectName = activeProject.name || "Selecciona un proyecto";
  const projectId = activeProject.id;
  const isAdmin = getActiveRole() === 1001;
  const isGlobalAdmin = Number(localStorage.getItem("id_rol")) === 1001;
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [showCenterProjectPicker, setShowCenterProjectPicker] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [creatingProject, setCreatingProject] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    scripts: [],
    scenes: [],
    shootDays: [],
    teamMembers: [],
    breakdownScenes: [],
  });
  const [loading, setLoading] = useState(Boolean(projectId));
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    const loadProjects = async () => {
      setProjectsLoading(true);
      setProjectsError("");
      try {
        const userId = localStorage.getItem("id_user");
        const response = await apiFetch(`/users/${encodeURIComponent(userId || "")}/projects`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.detail || result.message || "No se pudieron cargar los proyectos");
        }
        const items = result.data || result;
        if (isCurrent) setProjects(Array.isArray(items) ? items : []);
      } catch (loadError) {
        if (isCurrent) setProjectsError(loadError.message || "No se pudieron cargar los proyectos");
      } finally {
        if (isCurrent) setProjectsLoading(false);
      }
    };

    loadProjects();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const [scripts, shootDays, teamMembers] = await Promise.all([
          getItems(`/guiones?id_project=${encodeURIComponent(projectId)}`, "No se pudieron cargar los guiones"),
          getItems(`/projects/${encodeURIComponent(projectId)}/rodajes`, "No se pudo cargar el plan de rodaje"),
          getItems(`/users/project/${encodeURIComponent(projectId)}`, "No se pudo cargar el equipo del proyecto"),
        ]);
        const scenesByScript = await Promise.all(
          scripts.map((script) =>
            getItems(`/guiones/${encodeURIComponent(script.id_guion)}/escenas`, "No se pudieron cargar las escenas"),
          ),
        );
        const breakdownByScript = await Promise.all(
          scripts.map((script) =>
            getItems(`/guiones/${encodeURIComponent(script.id_guion)}/desglose`, "No se pudieron cargar las estadísticas del desglose"),
          ),
        );

        if (isCurrent) {
          setDashboardData({
            scripts,
            scenes: scenesByScript.flat(),
            shootDays,
            teamMembers,
            breakdownScenes: breakdownByScript.flat(),
          });
        }
      } catch (loadError) {
        if (isCurrent) {
          setDashboardData({ scripts: [], scenes: [], shootDays: [], teamMembers: [], breakdownScenes: [] });
          setError(loadError.message || "No se pudo cargar el resumen del proyecto");
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    if (projectId) {
      loadDashboard();
    }

    return () => {
      isCurrent = false;
    };
  }, [projectId]);

  const breakdownStats = useMemo(() => {
    const departments = new Map();
    let totalRequirements = 0;
    let totalDepartmentItems = 0;
    let coveredScenes = 0;

    dashboardData.breakdownScenes.forEach((scene) => {
      totalRequirements += Number(scene.total_requerimientos) || 0;
      if ((Number(scene.total_requerimientos) || 0) > 0) coveredScenes += 1;
      (scene.resumen_departamentos || []).forEach(({ departamento, cantidad }) => {
        const count = Number(cantidad) || 0;
        departments.set(departamento, (departments.get(departamento) || 0) + count);
        totalDepartmentItems += count;
      });
    });

    return {
      totalRequirements,
      totalDepartmentItems,
      coveredScenes,
      scenesWithoutRequirements: dashboardData.breakdownScenes.length - coveredScenes,
      departments: [...departments.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name)),
    };
  }, [dashboardData.breakdownScenes]);

  const selectProject = (project) => {
    const selected = { id: String(project.id_project), name: project.project_name };
    persistActiveProject(project);
    if (Number(project.id_rol) !== 1001) {
      navigate("/proyecto-dashboard", { state: { projectName: selected.name, projectId: selected.id } });
      return;
    }
    setActiveProject(selected);
    setProjectMenuOpen(false);
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    setProjectsError("");
    setCreatingProject(true);
    try {
      const response = await apiFetch("/projects/create", {
        method: "POST",
        body: JSON.stringify({
          ...projectForm,
          id_client: Number(localStorage.getItem("id_client") || 1),
          id_user: Number(localStorage.getItem("id_user")),
        }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        const detail = Array.isArray(result.detail)
          ? result.detail.map((item) => item.msg).join(", ")
          : result.detail;
        throw new Error(detail || result.message || "No se pudo crear el proyecto");
      }

      const createdProject = result.data;
      if (!createdProject?.id_project) {
        throw new Error("El servidor no devolvió el identificador del proyecto creado");
      }
      const project = {
        id_project: createdProject.id_project,
        project_name: createdProject.project_name || projectForm.project_name,
        id_rol: 1001,
        formato_de_produccion: createdProject.formato_de_produccion || projectForm.formato_de_produccion,
        genero: createdProject.genero || projectForm.genero,
        director: createdProject.director || projectForm.director,
      };
      setProjects((current) => [...current, project]);
      selectProject(project);
      setProjectForm(emptyProjectForm);
      setCreateProjectOpen(false);
    } catch (createError) {
      setProjectsError(createError.message || "No se pudo crear el proyecto");
    } finally {
      setCreatingProject(false);
    }
  };

  const metrics = useMemo(() => {
    const areas = [
      {
        id: "scripts",
        name: "Guiones",
        icon: FileText,
        items: dashboardData.scripts,
        status: (item) => item.estado_actual,
        color: "blue",
      },
      {
        id: "scenes",
        name: "Escenas",
        icon: Film,
        items: dashboardData.scenes,
        status: (item) => item.estado,
        color: "purple",
      },
      {
        id: "shootDays",
        name: "Plan de rodaje",
        icon: CalendarDays,
        items: dashboardData.shootDays,
        status: (item) => item.estado,
        color: "orange",
      },
    ].map((area) => {
      const completed = area.items.filter((item) => statusProgress(area.status(item)) === 1).length;
      const progress = area.items.length
        ? Math.round(area.items.reduce((total, item) => total + statusProgress(area.status(item)), 0) / area.items.length * 100)
        : 0;
      return { ...area, completed, progress, count: area.items.length };
    });

    const allItems = [
      ...dashboardData.scripts.map((item) => item.estado_actual),
      ...dashboardData.scenes.map((item) => item.estado),
      ...dashboardData.shootDays.map((item) => item.estado),
    ];
    const progress = allItems.length
      ? Math.round(allItems.reduce((total, status) => total + statusProgress(status), 0) / allItems.length * 100)
      : 0;
    const completeCount = allItems.filter((status) => statusProgress(status) === 1).length;

    return { areas, progress, completeCount, total: allItems.length };
  }, [dashboardData]);
  const totalScriptVersions = dashboardData.scripts.reduce(
    (total, script) => total + (Number(script.numero_de_version_actual) || 0),
    0,
  );

  const statusSummary = useMemo(() => {
    const items = [
      ...dashboardData.scripts.map((item) => ({ status: item.estado_actual })),
      ...dashboardData.scenes.map((item) => ({ status: item.estado })),
      ...dashboardData.shootDays.map((item) => ({ status: item.estado })),
    ];
    return [
      { key: "pending", label: "Pendiente", count: items.filter((item) => statusProgress(item.status) === 0).length },
      { key: "progress", label: "En progreso", count: items.filter((item) => statusProgress(item.status) === 0.5).length },
      { key: "completed", label: "Finalizado", count: items.filter((item) => statusProgress(item.status) === 1).length },
    ];
  }, [dashboardData]);

  const recentItems = useMemo(() => [
    ...dashboardData.scripts.map((item) => ({
      id: `script-${item.id_guion}`,
      title: item.nombre || "Guion sin título",
      area: "Guión",
      status: item.estado_actual,
      date: null,
      icon: FileText,
    })),
    ...dashboardData.scenes.map((item) => ({
      id: `scene-${item.id_escena}`,
      title: item.encabezado || `Escena ${item.numero_de_escena || ""}`,
      area: "Escenas",
      status: item.estado,
      date: item.fecha_de_grabacion,
      icon: Film,
    })),
    ...dashboardData.shootDays.map((item) => ({
      id: `shoot-${item.id_rodaje}`,
      title: item.nombre || "Jornada de rodaje",
      area: "Plan de rodaje",
      status: item.estado,
      date: item.fecha_inicio,
      icon: CalendarDays,
    })),
  ].sort((first, second) => String(second.date || "").localeCompare(String(first.date || ""))).slice(0, 6), [dashboardData]);

  if (!isAdmin) return <Navigate to="/proyecto-dashboard" replace />;

  const navigateToModule = (path) => navigate(path, { state: { projectName, projectId } });
  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <button type="button" onClick={handleLogout} className="admin-brand" aria-label="Cerrar sesión y volver al inicio">
          <img src={logo} alt="FOCCUS" />
        </button>
        <p className="admin-sidebar__label">Panel de control</p>
        <nav className="admin-navigation" aria-label="Navegación administrativa">
          <button className="admin-navigation__item admin-navigation__item--active" type="button">
            <LayoutDashboard size={18} /> Resumen general
          </button>
          <button className="admin-navigation__item" disabled={!projectId} onClick={() => navigateToModule("/guion")} type="button">
            <FileText size={18} /> Guiones
          </button>
          <button className="admin-navigation__item" disabled={!projectId} onClick={() => navigateToModule("/escenas")} type="button">
            <Film size={18} /> Escenas
          </button>
          <button className="admin-navigation__item" disabled={!projectId} onClick={() => navigateToModule("/personajes")} type="button">
            <UserRound size={18} /> Personajes
          </button>
          <button className="admin-navigation__item" disabled={!projectId} onClick={() => navigateToModule("/rodaje")} type="button">
            <CalendarDays size={18} /> Plan de rodaje
          </button>
          <button className="admin-navigation__item" disabled={!projectId} onClick={() => navigateToModule("/desglose")} type="button">
            <ClipboardList size={18} /> Desglose
          </button>
          <button className="admin-navigation__item" disabled={!projectId} onClick={() => navigateToModule("/galeria")} type="button">
            <Camera size={18} /> Galería
          </button>
          <button className="admin-navigation__item" disabled={!projectId} onClick={() => navigateToModule("/roles")} type="button">
            <Users size={18} /> Equipo y roles
          </button>
        </nav>
        <div className="admin-project-control">
          <button
            type="button"
            className="admin-sidebar__project"
            onClick={() => setProjectMenuOpen((open) => !open)}
            aria-expanded={projectMenuOpen}
          >
            <span className="admin-sidebar__project-icon"><Clapperboard size={18} /></span>
            <span className="admin-sidebar__project-name">
              <span>Proyecto activo</span>
              <strong>{projectName}</strong>
            </span>
            <ChevronDown size={16} />
          </button>
          {projectMenuOpen && (
            <div className="admin-project-menu">
              <div className="admin-project-menu__heading">Tus proyectos</div>
              {projectsLoading ? (
                <div className="admin-project-menu__state"><LoaderCircle size={15} /> Cargando proyectos…</div>
              ) : projects.length ? (
                <div className="admin-project-menu__list">
                  {projects.map((project) => (
                    <button
                      className="admin-project-menu__item"
                      key={project.id_project}
                      onClick={() => selectProject(project)}
                      type="button"
                    >
                      <span>{project.project_name}</span>
                      {String(project.id_project) === String(projectId) && <ChevronRight size={15} />}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="admin-project-menu__empty">Aún no tienes proyectos.</p>
              )}
              {projectsError && <p className="admin-project-menu__error" role="alert">{projectsError}</p>}
              {isGlobalAdmin && <button
                className="admin-project-menu__create"
                onClick={() => {
                  setProjectMenuOpen(false);
                  setProjectsError("");
                  setCreateProjectOpen(true);
                }}
                type="button"
              >
                <Plus size={16} /> Crear proyecto
              </button>}
            </div>
          )}
          {isGlobalAdmin && <button
            className="admin-project-create"
            onClick={() => {
              setProjectsError("");
              setCreateProjectOpen(true);
            }}
            type="button"
          >
            <Plus size={15} /> Crear proyecto
          </button>}
        </div>
      </aside>

      <div className="admin-dashboard__workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__context">
            <span title={projectId ? projectName : "FOCCUS"}>{projectId ? projectName : "FOCCUS"}</span>
            <span>/</span>
            <strong>Administrador</strong>
          </div>
          <div className="admin-profile">
            <button
              type="button"
              className="admin-profile__trigger"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              <span className="admin-profile__avatar"><UserRound size={17} /></span>
              <span className="admin-profile__name">{localStorage.getItem("nombre") || "Mi perfil"}</span>
              <ChevronDown size={15} />
            </button>
            {profileMenuOpen && (
              <div className="admin-profile__menu" role="menu">
                <div className="admin-profile__summary">
                  <strong>{[localStorage.getItem("nombre"), localStorage.getItem("apellido")].filter(Boolean).join(" ") || "Administrador"}</strong>
                  <span>{localStorage.getItem("mail") || ""}</span>
                </div>
                <button type="button" role="menuitem" onClick={() => navigate("/perfil")}>
                  <UserRound size={16} /> Ver perfil
                </button>
                <button type="button" role="menuitem" onClick={handleLogout}>
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="admin-main">
          <section className="admin-welcome">
            <div>
              <p className="admin-eyebrow">PANEL ADMINISTRATIVO</p>
              <h1>{projectId ? "Resumen del proyecto" : "Gestiona tus proyectos"}</h1>
              <p className="admin-welcome__subtitle">
                {projectId
                  ? <>Estado y avance de <strong>{projectName}</strong> en un solo lugar.</>
                  : "Selecciona o crea un proyecto desde el menú lateral para empezar."}
              </p>
            </div>
            <div className="admin-welcome__badge"><span /> Vista de administrador</div>
          </section>

          {!projectId ? (
            <section className="admin-project-empty">
              <span className="admin-project-empty__icon"><FolderOpen size={25} /></span>
              <h2>Selecciona o crea un proyecto</h2>
              <p>Elige un proyecto desde “Proyecto activo” en el menú lateral para consultar su avance, o crea uno nuevo para comenzar.</p>
              {projectsError && <div className="admin-error" role="alert">{projectsError}</div>}
              <div className="admin-project-empty__actions">
                <button
                  type="button"
                  aria-expanded={showCenterProjectPicker}
                  onClick={() => {
                    setProjectMenuOpen(true);
                    setShowCenterProjectPicker(true);
                  }}
                >
                  <FolderOpen size={17} /> Escoger proyecto
                </button>
                {isGlobalAdmin && <button type="button" onClick={() => setCreateProjectOpen(true)}><Plus size={17} /> Crear proyecto</button>}
              </div>
              {showCenterProjectPicker && (
                <div className="admin-project-picker" aria-live="polite">
                  <div className="admin-project-picker__heading">
                    <div>
                      <span className="admin-eyebrow">TUS PROYECTOS</span>
                      <h3>¿En cuál quieres trabajar?</h3>
                    </div>
                    {!projectsLoading && <span>{projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}</span>}
                  </div>
                  {projectsLoading ? (
                    <div className="admin-project-picker__state"><LoaderCircle size={19} /> Cargando tus proyectos…</div>
                  ) : projectsError ? (
                    <p className="admin-project-picker__empty">No se pudo cargar la lista de proyectos. Consulta el aviso para ver más detalles.</p>
                  ) : projects.length ? (
                    <div className="admin-project-picker__grid">
                      {projects.map((project) => (
                        <button
                          className="admin-project-picker__card"
                          key={project.id_project}
                          onClick={() => selectProject(project)}
                          type="button"
                        >
                          <span className="admin-project-picker__icon"><Clapperboard size={19} /></span>
                          <span className="admin-project-picker__details">
                            <strong>{project.project_name}</strong>
                            <small>{project.formato_de_produccion || "Proyecto audiovisual"}{project.genero ? ` · ${project.genero}` : ""}</small>
                          </span>
                          <ChevronRight size={18} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-project-picker__empty">Todavía no tienes proyectos. Crea uno para comenzar a organizar tu producción.</p>
                  )}
                </div>
              )}
            </section>
          ) : (
            <>
          {error && <div className="admin-error" role="alert">{error}</div>}

          {loading ? (
            <div className="admin-loading"><LoaderCircle size={22} /> Cargando indicadores del proyecto…</div>
          ) : (
            <>
              <section className="admin-kpis" aria-label="Indicadores del proyecto">
                <article className="admin-kpi admin-kpi--progress">
                  <div className="admin-kpi__icon"><LayoutDashboard size={20} /></div>
                  <p>Avance general</p>
                  <strong>{metrics.progress}<small>%</small></strong>
                  <span>{metrics.completeCount} de {metrics.total} elementos finalizados</span>
                  <div className="admin-kpi__progress"><span style={{ width: `${metrics.progress}%` }} /></div>
                </article>
                <article className="admin-kpi">
                  <div className="admin-kpi__icon admin-kpi__icon--blue"><FileText size={20} /></div>
                  <p>Versiones del guion</p>
                  <strong>{totalScriptVersions}</strong>
                  <span>En {dashboardData.scripts.length} guiones</span>
                </article>
                <article className="admin-kpi">
                  <div className="admin-kpi__icon admin-kpi__icon--purple"><Film size={20} /></div>
                  <p>Escenas</p>
                  <strong>{dashboardData.scenes.length}</strong>
                  <span>{dashboardData.scenes.filter((scene) => statusProgress(scene.estado) === 1).length} finalizadas</span>
                </article>
                <article className="admin-kpi">
                  <div className="admin-kpi__icon admin-kpi__icon--orange"><CalendarDays size={20} /></div>
                  <p>Jornadas</p>
                  <strong>{dashboardData.shootDays.length}</strong>
                  <span>{dashboardData.shootDays.filter((day) => statusProgress(day.estado) === 1).length} finalizadas</span>
                </article>
                <article className="admin-kpi">
                  <div className="admin-kpi__icon admin-kpi__icon--green"><Users size={20} /></div>
                  <p>Personas</p>
                  <strong>{dashboardData.teamMembers.length}</strong>
                  <span>Vinculadas al proyecto</span>
                </article>
                <article className="admin-kpi">
                  <div className="admin-kpi__icon admin-kpi__icon--teal"><ClipboardList size={20} /></div>
                  <p>Desglose</p>
                  <strong>{breakdownStats.totalRequirements}</strong>
                  <span>Requerimientos registrados</span>
                </article>
              </section>

              {metrics.total === 0 && (
                <div className="admin-empty" role="status">
                  <ClipboardList size={22} />
                  <div><strong>El proyecto aún no tiene elementos para medir.</strong><span>Al crear guiones, escenas o jornadas, aquí aparecerá el avance real.</span></div>
                </div>
              )}

              <section className="admin-panels">
                <article className="admin-panel admin-panel--areas">
                  <div className="admin-panel__heading">
                    <div><p className="admin-eyebrow">SEGUIMIENTO</p><h2>Avance por área</h2></div>
                    <span>Según estado de los elementos</span>
                  </div>
                  <div className="admin-area-list">
                    {metrics.areas.map((area) => {
                      const Icon = area.icon;
                      return (
                        <div className="admin-area" key={area.id}>
                          <div className={`admin-area__icon admin-area__icon--${area.color}`}><Icon size={18} /></div>
                          <div className="admin-area__content">
                            <div className="admin-area__topline"><strong>{area.name}</strong><span>{area.completed}/{area.count} finalizados</span></div>
                            <div className="admin-area__track" role="progressbar" aria-label={`Avance de ${area.name}`} aria-valuenow={area.progress} aria-valuemin="0" aria-valuemax="100">
                              <span className={`admin-area__fill admin-area__fill--${area.color}`} style={{ width: `${area.progress}%` }} />
                            </div>
                          </div>
                          <strong className="admin-area__percentage">{area.progress}%</strong>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="admin-panel admin-panel--status">
                  <div className="admin-panel__heading">
                    <div><p className="admin-eyebrow">DISTRIBUCIÓN</p><h2>Estado del trabajo</h2></div>
                  </div>
                  <div className="admin-status-chart" aria-label="Cantidad de elementos por estado">
                    {statusSummary.map((status) => {
                      const maxCount = Math.max(...statusSummary.map((item) => item.count), 1);
                      const height = status.count ? Math.max(10, (status.count / maxCount) * 100) : 3;
                      return (
                        <div className="admin-status-chart__column" key={status.key}>
                          <strong>{status.count}</strong>
                          <div className={`admin-status-chart__bar admin-status-chart__bar--${status.key}`} style={{ height: `${height}%` }} />
                          <span>{status.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="admin-chart-caption">Elementos agrupados por su estado actual.</p>
                </article>
              </section>

              <section className="admin-panel admin-breakdown" aria-labelledby="admin-breakdown-title">
                <div className="admin-panel__heading">
                  <div>
                    <p className="admin-eyebrow">ELEMENTOS DE PRODUCCIÓN</p>
                    <h2 id="admin-breakdown-title">Estadísticas del desglose</h2>
                  </div>
                  <button type="button" onClick={() => navigateToModule("/desglose")}>
                    Ver desglose <ArrowLeft size={15} />
                  </button>
                </div>
                <div className="admin-breakdown__summary">
                  <div><strong>{dashboardData.breakdownScenes.length}</strong><span>Escenas revisadas</span></div>
                  <div><strong>{breakdownStats.coveredScenes}</strong><span>Con requerimientos</span></div>
                  <div><strong>{breakdownStats.scenesWithoutRequirements}</strong><span>Sin requerimientos</span></div>
                </div>
                {breakdownStats.departments.length ? (
                  <div className="admin-breakdown__departments">
                    {breakdownStats.departments.map((department) => {
                      const percentage = breakdownStats.totalDepartmentItems
                        ? Math.round(department.count / breakdownStats.totalDepartmentItems * 100)
                        : 0;
                      return (
                        <div className="admin-breakdown__department" key={department.name}>
                          <div className="admin-breakdown__department-heading">
                            <strong>{department.name}</strong>
                            <span>{department.count} elementos · {percentage}%</span>
                          </div>
                          <div className="admin-breakdown__track" role="progressbar" aria-label={`Requerimientos de ${department.name}`} aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100">
                            <span style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="admin-recent__empty">Aún no hay requerimientos de desglose registrados en las escenas.</p>
                )}
              </section>

              <section className="admin-panel admin-recent">
                <div className="admin-panel__heading">
                  <div><p className="admin-eyebrow">ACTIVIDAD DEL PROYECTO</p><h2>Elementos recientes</h2></div>
                  <button type="button" onClick={() => navigateToModule("/rodaje")}>Ver plan de rodaje <ArrowLeft size={15} /></button>
                </div>
                {recentItems.length ? (
                  <div className="admin-recent__list">
                    {recentItems.map((item) => {
                      const Icon = item.icon;
                      const progress = statusProgress(item.status);
                      return (
                        <article className="admin-recent-item" key={item.id}>
                          <span className="admin-recent-item__icon"><Icon size={17} /></span>
                          <div className="admin-recent-item__title"><strong>{item.title}</strong><span>{item.area}</span></div>
                          <span className={`admin-state admin-state--${progress === 1 ? "done" : progress === 0.5 ? "active" : "pending"}`}>{getStatusLabel(item.status)}</span>
                          <time>{formatDate(item.date)}</time>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="admin-recent__empty">Todavía no hay actividad registrada para mostrar.</p>
                )}
              </section>
            </>
          )}
            </>
          )}
        </main>
      </div>
      {createProjectOpen && isGlobalAdmin && (
        <div className="admin-project-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !creatingProject) setCreateProjectOpen(false);
        }}>
          <section className="admin-project-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="admin-project-modal-title">
            <header className="admin-project-modal__header">
              <div><p className="admin-eyebrow">NUEVO REGISTRO</p><h2 id="admin-project-modal-title">Crear proyecto</h2></div>
              <button type="button" onClick={() => setCreateProjectOpen(false)} disabled={creatingProject} aria-label="Cerrar"><X size={20} /></button>
            </header>
            {projectsError && <div className="admin-project-modal__error" role="alert">{projectsError}</div>}
            <form className="admin-project-form" onSubmit={handleCreateProject}>
              <label>
                Nombre del proyecto
                <input
                  name="project_name"
                  value={projectForm.project_name}
                  onChange={(event) => setProjectForm({ ...projectForm, project_name: event.target.value })}
                  placeholder="Nombre de la producción"
                  required
                />
              </label>
              <div className="admin-project-form__grid">
                <label>
                  Formato
                  <select name="formato_de_produccion" value={projectForm.formato_de_produccion} onChange={(event) => setProjectForm({ ...projectForm, formato_de_produccion: event.target.value })} required>
                    <option value="">Selecciona un formato</option>
                    {formatOptions.map((format) => <option key={format} value={format}>{format.charAt(0).toUpperCase() + format.slice(1)}</option>)}
                  </select>
                </label>
                <label>
                  Género
                  <select name="genero" value={projectForm.genero} onChange={(event) => setProjectForm({ ...projectForm, genero: event.target.value })} required>
                    <option value="">Selecciona un género</option>
                    {genreOptions.map((genre) => <option key={genre} value={genre}>{genre.charAt(0).toUpperCase() + genre.slice(1)}</option>)}
                  </select>
                </label>
              </div>
              <label>
                Sinopsis
                <textarea name="sinopsis" rows={3} value={projectForm.sinopsis} onChange={(event) => setProjectForm({ ...projectForm, sinopsis: event.target.value })} placeholder="Describe brevemente la producción" />
              </label>
              <label>
                Director
                <input name="director" value={projectForm.director} onChange={(event) => setProjectForm({ ...projectForm, director: event.target.value })} placeholder="Director o directores" />
              </label>
              <footer className="admin-project-form__actions">
                <button type="button" onClick={() => setCreateProjectOpen(false)} disabled={creatingProject}>Cancelar</button>
                <button type="submit" disabled={creatingProject}>{creatingProject ? "Creando…" : "Crear proyecto"}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
