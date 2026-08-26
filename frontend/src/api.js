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
  return localStorage.getItem("access_token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("access_token", token);
  }
}

export function clearSession() {
  localStorage.clear();
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

  const headers = {
    "Content-Type": "application/json",
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
