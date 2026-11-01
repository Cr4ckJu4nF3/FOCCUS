import "../desing/Estado.css";

// Estado de una vista: cargando / error (con Reintentar) / vacío (con acción).
// Sirve para que todas las pantallas expliquen qué pasa y qué hacer después.
export default function EstadoVista({ tipo = "vacio", mensaje, accionTexto, onAccion, className = "" }) {
  const clases = `estado-vista estado-vista--${tipo} ${className}`.trim();
  const rol = tipo === "error" ? "alert" : "status";
  return (
    <div className={clases} role={rol} aria-live={tipo === "error" ? "assertive" : "polite"} aria-busy={tipo === "cargando" || undefined}>
      {tipo === "cargando" && <span className="estado-vista__spinner" aria-hidden="true" />}
      <p className="estado-vista__texto">{mensaje}</p>
      {onAccion && accionTexto && tipo !== "cargando" && (
        <button type="button" className="estado-vista__accion" onClick={onAccion}>
          {accionTexto}
        </button>
      )}
    </div>
  );
}
