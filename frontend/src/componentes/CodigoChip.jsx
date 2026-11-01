import { useEffect, useRef, useState } from "react";
import "../desing/Codigo.css";

// Etiqueta discreta con el código FOCCUS (ESC-014, GUI-001...). Clic = copiar.
// El backend SOLO manda `codigo` al admin; si no viene, no se dibuja nada.
export default function CodigoChip({ codigo, className = "" }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  if (!codigo) return null;

  const copiar = async (evento) => {
    evento.stopPropagation(); // no abrir la tarjeta que lo contiene
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      const area = document.createElement("textarea");
      area.value = codigo;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); } catch { /* sin portapapeles */ }
      area.remove();
    }
    setCopiado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <button
      type="button"
      className={`codigo-chip ${copiado ? "codigo-chip--copiado" : ""} ${className}`.trim()}
      onClick={copiar}
      title="Copiar código"
      aria-label={`Copiar código ${codigo}`}
    >
      <span>{codigo}</span>
      <span className="codigo-chip__estado" role="status" aria-live="polite">{copiado ? "Copiado" : ""}</span>
    </button>
  );
}
