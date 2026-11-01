const API_URL = "http://127.0.0.1:8000";

export function getDeviceId() {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
}

// ==========================================
// AUTENTICACION (JWT)
// ==========================================

export function getToken() {
  return sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
}

export function getActiveRole() {
  const projectId = localStorage.getItem("projectId");
  const roleProjectId = localStorage.getItem("project_role_project_id");
  if (projectId && projectId === roleProjectId) {
    return Number(localStorage.getItem("project_role")) || 0;
  }
  return Number(localStorage.getItem("id_rol")) || 0;
}

export function setActiveProject(project) {
  const projectId = String(project.id_project);
  localStorage.setItem("projectId", projectId);
  localStorage.setItem("id_project", projectId);
  localStorage.setItem("projectName", project.project_name || "");
  localStorage.setItem("project_role", String(project.id_rol ?? localStorage.getItem("id_rol") ?? 0));
  localStorage.setItem("project_role_project_id", projectId);
}

export function getProjectHeaders() {
  const projectId = localStorage.getItem("projectId");
  return projectId ? { "X-Project-Id": projectId } : {};
}

export function setToken(token, rememberMe = false) {
  if (token) {
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("access_token");
    (rememberMe ? localStorage : sessionStorage).setItem("access_token", token);
  }
}

export function clearSession() {
  const theme = localStorage.getItem("foccus-theme");
  localStorage.clear();
  sessionStorage.clear();
  if (theme) localStorage.setItem("foccus-theme", theme);
}

// Lee la fecha de expiración del token sin verificar la firma (eso lo
// hace siempre el backend). Sirve solo para decidir en el frontend si
// hay que mandar al usuario de vuelta al login antes de intentar un
// fetch que de todas formas fallaría con 401.
export function isTokenValid(token = getToken()) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// Wrapper de fetch que agrega automáticamente el header
// "Authorization: Bearer <token>" cuando hay una sesión activa, y
// redirige al login si el backend responde 401 (token vencido o
// inválido). Uso: apiFetch("/users/login", { method: "POST", ... })
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...getProjectHeaders(),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearSession();
    window.location.href = "/";
  }

  return response;
}

export default API_URL;
