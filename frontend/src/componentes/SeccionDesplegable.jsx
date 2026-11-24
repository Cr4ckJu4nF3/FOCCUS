import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import "../desing/SeccionDesplegable.css";

export default function SeccionDesplegable({ titulo, children, abiertaInicialmente = true }) {
  const [abierta, setAbierta] = useState(abiertaInicialmente);
  const id = useId();

  return (
    <div className="seccion-desplegable">
      <button
        type="button"
        className="seccion-desplegable__toggle"
        aria-expanded={abierta}
        aria-controls={id}
        onClick={() => setAbierta((valor) => !valor)}
      >
        <span>{abierta ? "Ocultar" : "Mostrar"} {titulo}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div id={id} className="seccion-desplegable__content" hidden={!abierta}>
        {children}
      </div>
    </div>
  );
}
