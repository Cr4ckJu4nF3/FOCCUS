import { useEffect } from "react";

// Mejoras de accesibilidad que se aplican a TODAS las pantallas sin tener que
// tocar cada formulario:
//  - asocia <label> con su campo (htmlFor/id) cuando no están asociados;
//  - da nombre accesible a botones que solo tienen un icono;
//  - marca mensajes de error/éxito con role="alert"/"status";
//  - en modales (overlay + panel): role="dialog", aria-modal, nombre, foco
//    inicial, foco atrapado con Tab, cierre con Escape y devolución del foco.
// Es una capa común mientras cada pantalla migra a componentes propios.

const CONTROLES = "input:not([type=hidden]), select, textarea";
const FOCUSABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const NOMBRES_ICONO = [
  [/lucide-(x|circle-x)$/, "Cerrar"],
  [/lucide-trash/, "Eliminar"],
  [/lucide-(pen|pencil|square-pen)/, "Editar"],
  [/lucide-plus/, "Agregar"],
  [/lucide-eye/, "Ver"],
  [/lucide-download/, "Descargar"],
  [/lucide-search/, "Buscar"],
  [/lucide-(menu)/, "Abrir menú"],
  [/lucide-arrow-left|lucide-chevron-left/, "Volver"],
  [/lucide-(check)$/, "Confirmar"],
];

let contador = 0;
const idUnico = () => `auto-campo-${++contador}`;

const esVisible = (el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed";

function asociarEtiquetas(raiz) {
  raiz.querySelectorAll("label:not([for])").forEach((label) => {
    if (label.querySelector(CONTROLES)) return; // ya asociada por anidamiento
    let control = null;
    let hermano = label.nextElementSibling;
    for (let i = 0; i < 3 && hermano && !control; i += 1, hermano = hermano.nextElementSibling) {
      control = hermano.matches(CONTROLES) ? hermano : hermano.querySelector(CONTROLES);
      if (hermano.tagName === "LABEL") break;
    }
    if (!control) return;
    if (!control.id) control.id = idUnico();
    label.setAttribute("for", control.id);
  });
}

function nombrarIconos(raiz) {
  raiz.querySelectorAll("button:not([aria-label]):not([aria-labelledby]), a[href]:not([aria-label]):not([aria-labelledby])").forEach((el) => {
    if ((el.textContent || "").trim()) return;
    const titulo = el.getAttribute("title");
    if (titulo) {
      el.setAttribute("aria-label", titulo);
      return;
    }
    const svg = el.querySelector("svg");
    const clases = svg ? svg.getAttribute("class") || "" : "";
    const coincide = NOMBRES_ICONO.find(([re]) => re.test(clases));
    if (coincide) el.setAttribute("aria-label", coincide[1]);
  });
}

const tieneClase = (el, re) => Array.from(el.classList).some((c) => re.test(c));

function marcarAvisos(raiz) {
  raiz.querySelectorAll("p, div, span").forEach((el) => {
    if (el.hasAttribute("role") || !(el.textContent || "").trim()) return;
    if (el.querySelector("button, input, select, textarea, a")) return;
    if (tieneClase(el, /(^|[-_])error($|[-_])/) && !tieneClase(el, /input|field--|--empty/)) el.setAttribute("role", "alert");
    else if (tieneClase(el, /(^|[-_])success($|[-_])/)) el.setAttribute("role", "status");
  });
}

const modalesAbiertos = []; // { overlay, previo }

function prepararModales(raiz) {
  raiz.querySelectorAll('[class*="overlay"]').forEach((overlay) => {
    if (overlay.dataset.a11yModal) return;
    const panel = overlay.querySelector('[role="dialog"], [class*="modal"], [class*="dialog"]');
    if (!panel) return;
    overlay.dataset.a11yModal = "1";
    if (!panel.getAttribute("role")) panel.setAttribute("role", "dialog");
    if (!panel.hasAttribute("aria-modal")) panel.setAttribute("aria-modal", "true");
    if (!panel.hasAttribute("aria-label") && !panel.hasAttribute("aria-labelledby")) {
      const titulo = panel.querySelector("h1, h2, h3");
      if (titulo && titulo.textContent.trim()) panel.setAttribute("aria-label", titulo.textContent.trim());
    }
    modalesAbiertos.push({ overlay, previo: document.activeElement });
    if (!overlay.contains(document.activeElement)) {
      const primero = Array.from(panel.querySelectorAll(FOCUSABLES)).find(esVisible);
      (primero || panel).focus?.({ preventScroll: true });
    }
  });
  // Modales que ya se cerraron: devolver el foco a donde estaba
  for (let i = modalesAbiertos.length - 1; i >= 0; i -= 1) {
    const { overlay, previo } = modalesAbiertos[i];
    if (!overlay.isConnected) {
      modalesAbiertos.splice(i, 1);
      if (previo && previo.isConnected && !document.querySelector("[data-a11y-modal]")) previo.focus?.({ preventScroll: true });
    }
  }
}

function manejarTeclado(event) {
  const actual = modalesAbiertos[modalesAbiertos.length - 1];
  if (!actual || !actual.overlay.isConnected) return;
  const { overlay } = actual;
  if (event.key === "Escape") {
    const cerrar = Array.from(overlay.querySelectorAll("button")).find((b) =>
      /cerrar|cancelar|close/i.test(`${b.getAttribute("aria-label") || ""} ${b.getAttribute("title") || ""} ${b.textContent || ""}`)
      || tieneClase(b, /close/i));
    if (cerrar) {
      event.preventDefault();
      cerrar.click();
    }
    return;
  }
  if (event.key === "Tab") {
    const foco = Array.from(overlay.querySelectorAll(FOCUSABLES)).filter(esVisible);
    if (!foco.length) return;
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    if (event.shiftKey && (document.activeElement === primero || !overlay.contains(document.activeElement))) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && (document.activeElement === ultimo || !overlay.contains(document.activeElement))) {
      event.preventDefault();
      primero.focus();
    }
  }
}

export default function AccesibilidadGlobal() {
  useEffect(() => {
    let pendiente = 0;
    const aplicar = () => {
      pendiente = 0;
      asociarEtiquetas(document.body);
      nombrarIconos(document.body);
      marcarAvisos(document.body);
      prepararModales(document.body);
    };
    const programar = () => {
      if (!pendiente) pendiente = requestAnimationFrame(aplicar);
    };
    aplicar();
    const observador = new MutationObserver(programar);
    observador.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", manejarTeclado, true);
    return () => {
      observador.disconnect();
      document.removeEventListener("keydown", manejarTeclado, true);
      if (pendiente) cancelAnimationFrame(pendiente);
    };
  }, []);

  return null;
}
