import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

// Buscador de códigos FOCCUS (PRO-001, ESC-014...). SOLO para admins del proyecto:
// el backend también lo valida; esto solo evita mostrar el cuadro a otros roles.
export default function BuscadorCodigos({ projectId }) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [estado, setEstado] = useState("idle"); // idle | cargando | ok | error
  const [mensaje, setMensaje] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  useEffect(() => {
    const q = texto.trim();
    if (!projectId || q.length < 2) return undefined;
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      setEstado("cargando");
      try {
        const resp = await apiFetch(
          `/projects/${encodeURIComponent(projectId)}/buscar-codigo?q=${encodeURIComponent(q)}`,
        );
        const body = await resp.json().catch(() => ({}));
        if (cancelado) return;
        if (!resp.ok || body.success === false) {
          setMensaje(body.message || "No se pudo buscar");
          setResultados([]);
          setEstado("error");
          return;
        }
        setResultados(Array.isArray(body.data) ? body.data : []);
        setEstado("ok");
        setAbierto(true);
      } catch {
        if (!cancelado) {
          setMensaje("No se pudo conectar con el servidor");
          setEstado("error");
        }
      }
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [texto, projectId]);

  useEffect(() => {
    const cerrar = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  const ir = (destino) => {
    setAbierto(false);
    if (destino) navigate(destino);
  };

  return (
    <div ref={contenedor} style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar código (ej. ESC-014)"
        aria-label="Buscar por código FOCCUS"
        disabled={!projectId}
        style={{ width: "100%", padding: "7px 12px", borderRadius: 8, border: "1px solid #3a3a45", background: "transparent", color: "inherit" }}
      />
      {abierto && texto.trim().length >= 2 && (
        <ul
          aria-label="Resultados de la búsqueda"
          style={{ position: "absolute", top: "110%", left: 0, right: 0, zIndex: 50, margin: 0, padding: 4, listStyle: "none", background: "#1b1b22", color: "#fff", border: "1px solid #3a3a45", borderRadius: 8, maxHeight: 320, overflowY: "auto" }}
        >
          {estado === "cargando" && <li style={{ padding: 8 }}>Buscando…</li>}
          {estado === "error" && <li style={{ padding: 8 }} role="alert">{mensaje}</li>}
          {estado === "ok" && resultados.length === 0 && <li style={{ padding: 8 }}>Sin resultados</li>}
          {estado === "ok" &&
            resultados.map((r) => (
              <li key={`${r.tipo}-${r.codigo}`}>
                <button
                  type="button"
                  onClick={() => ir(r.destino)}
                  style={{ width: "100%", textAlign: "left", padding: 8, background: "transparent", color: "inherit", border: 0, cursor: "pointer" }}
                >
                  <strong>{r.codigo}</strong> · {r.nombre}
                  <br />
                  <small style={{ opacity: 0.7 }}>{r.tipo}</small>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
