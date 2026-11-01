// Utilidades del formato de guion por bloques tipados.
//
// El contenido de una versión de guion se guarda como HTML, pero ahora solo
// con "bloques": <p class="gb gb-TIPO">texto</p>. Los estilos (sangrías,
// mayúsculas, Courier 12) viven en CSS y los comparten el editor, el lector
// y el PDF. Referencia: docs/agentes/investigacion/2026-11-01-formato-guion.md

export const TIPOS_BLOQUE = [
  { id: "escena", etiqueta: "Escena" },
  { id: "accion", etiqueta: "Acción" },
  { id: "personaje", etiqueta: "Personaje" },
  { id: "parentesis", etiqueta: "Paréntesis" },
  { id: "dialogo", etiqueta: "Diálogo" },
  { id: "transicion", etiqueta: "Transición" },
];

const IDS_TIPO = new Set(TIPOS_BLOQUE.map((t) => t.id));
const TIPOS_MAYUSCULAS = new Set(["escena", "personaje", "transicion"]);

// Qué bloque sigue al pulsar Enter / Tab (comportamiento tipo Final Draft).
export const SIGUIENTE_ENTER = {
  escena: "accion",
  accion: "accion",
  personaje: "dialogo",
  parentesis: "dialogo",
  dialogo: "accion",
  transicion: "escena",
};
export const SIGUIENTE_TAB = {
  escena: "accion",
  accion: "personaje",
  personaje: "accion",
  parentesis: "dialogo",
  dialogo: "parentesis",
  transicion: "escena",
};

export const claseBloque = (tipo) => `gb gb-${IDS_TIPO.has(tipo) ? tipo : "accion"}`;

export const tipoDeElemento = (el) => {
  const clase = Array.from(el?.classList || []).find((c) => c.startsWith("gb-"));
  const tipo = clase ? clase.slice(3) : "";
  return IDS_TIPO.has(tipo) ? tipo : null;
};

const ETIQUETAS_PERMITIDAS = new Set([
  "P", "DIV", "BR", "HR", "H1", "H2", "H3", "UL", "OL", "LI",
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUB", "SUP", "MARK", "BLOCKQUOTE", "SPAN",
]);

const mayusculas = (nodo) => {
  const paseo = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT);
  while (paseo.nextNode()) {
    paseo.currentNode.nodeValue = (paseo.currentNode.nodeValue || "").toLocaleUpperCase("es");
  }
};

// Sanitiza el HTML del guion. Conserva los formatos que el editor puede
// producir o que traen guiones antiguos (negrita, cursiva, subrayado, tachado,
// súper/subíndice, resaltado, cita, listas) y las clases de bloque gb-*;
// quita scripts, atributos y etiquetas desconocidas.
export function limpiarHtmlGuion(html) {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = html || "";
  contenedor.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((nodo) => nodo.remove());

  const limpiarNodo = (nodo) => {
    Array.from(nodo.children).forEach(limpiarNodo);
    if (!ETIQUETAS_PERMITIDAS.has(nodo.tagName)) {
      nodo.replaceWith(...nodo.childNodes);
      return;
    }
    Array.from(nodo.attributes).forEach((atributo) => {
      if (atributo.name === "class") {
        const clases = atributo.value.split(/\s+/).filter((c) => /^gb(-[a-z]+)?$/.test(c));
        if (clases.length) nodo.setAttribute("class", clases.join(" "));
        else nodo.removeAttribute("class");
      } else if (atributo.name !== "style" || !/^text-align:\s*(left|center|right|justify)\s*;?$/i.test(atributo.value)) {
        nodo.removeAttribute(atributo.name);
      }
    });
  };
  Array.from(contenedor.children).forEach(limpiarNodo);

  // Reglas de formato por tipo de bloque
  contenedor.querySelectorAll("p[class*='gb-']").forEach((p) => {
    const tipo = tipoDeElemento(p);
    if (TIPOS_MAYUSCULAS.has(tipo)) mayusculas(p);
    if (tipo === "parentesis") {
      const texto = (p.textContent || "").trim();
      if (texto && !texto.startsWith("(")) p.insertBefore(document.createTextNode("("), p.firstChild);
      if (texto && !texto.endsWith(")")) p.appendChild(document.createTextNode(")"));
    }
  });
  return contenedor.innerHTML;
}

// HTML -> texto plano (validar vacío, descripciones de escena, etc.)
export function htmlATextoPlano(html) {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = html || "";
  const etiquetasBloque = new Set(["DIV", "H1", "H2", "H3", "LI", "P"]);
  const recorrer = (nodo) => {
    if (nodo.nodeType === Node.TEXT_NODE) return nodo.nodeValue || "";
    if (nodo.nodeType !== Node.ELEMENT_NODE) return "";
    if (nodo.tagName === "BR" || nodo.tagName === "HR") return "\n";
    const texto = Array.from(nodo.childNodes, recorrer).join("");
    return texto + (etiquetasBloque.has(nodo.tagName) ? "\n" : "");
  };
  return recorrer(contenedor).replace(/\n{3,}/g, "\n\n").trim();
}

const RE_ESCENA = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?)(\s|$)/i;
const RE_TRANSICION = /^(CORTE|FUNDIDO|DISOLVENCIA|CUT|FADE|DISSOLVE)\b/;

// Para contenido antiguo (HTML libre) adivina el tipo de bloque.
function adivinarTipo(el, texto, tipoPrevio) {
  const t = texto.trim();
  const alinear = (el.style?.textAlign || "").toLowerCase();
  const esMayus = t === t.toLocaleUpperCase("es") && /[A-ZÁÉÍÓÚÑ]/.test(t);
  if (RE_ESCENA.test(t)) return "escena";
  if (esMayus && (alinear === "right" || (RE_TRANSICION.test(t) && t.length <= 40 && t.endsWith(":")))) return "transicion";
  if (t.startsWith("(") && t.endsWith(")")) return "parentesis";
  if (alinear === "center" && esMayus && t.length <= 40) return "personaje";
  if ((tipoPrevio === "personaje" || tipoPrevio === "parentesis") && t) return "dialogo";
  return "accion";
}

const escaparHtml = (valor) => String(valor || "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);

// HTML -> lista de bloques [{ tipo, texto, html }]. Los bloques sin clase gb-*
// (guiones antiguos) se clasifican con una heurística.
export function htmlABloques(html) {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = limpiarHtmlGuion(html);
  const bloques = [];
  const BLOQUES = new Set(["P", "H1", "H2", "H3", "LI", "BLOCKQUOTE", "DIV"]);

  const agregar = (el, htmlInterno) => {
    const nodo = document.createElement("div");
    nodo.innerHTML = htmlInterno;
    nodo.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    const texto = (nodo.textContent || "").replace(/\u00a0/g, " ");
    if (!texto.trim()) return;
    const previo = bloques.length ? bloques[bloques.length - 1].tipo : null;
    const tipo = tipoDeElemento(el) || adivinarTipo(el, texto, previo);
    bloques.push({ tipo, texto: texto.replace(/\n+$/, ""), html: htmlInterno });
  };

  const recorrer = (padre) => {
    padre.childNodes.forEach((hijo) => {
      if (hijo.nodeType === Node.TEXT_NODE) {
        hijo.nodeValue.split(/\r?\n/).forEach((linea) => {
          if (linea.trim()) agregar(document.createElement("p"), escaparHtml(linea));
        });
        return;
      }
      if (hijo.nodeType !== Node.ELEMENT_NODE) return;
      if (hijo.tagName === "BR" || hijo.tagName === "HR") return;
      if (hijo.tagName === "UL" || hijo.tagName === "OL") { recorrer(hijo); return; }
      if (BLOQUES.has(hijo.tagName)) {
        if (hijo.tagName === "DIV" && hijo.querySelector("p, div, h1, h2, h3, li")) recorrer(hijo);
        else agregar(hijo, hijo.innerHTML);
        return;
      }
      agregar(document.createElement("p"), hijo.outerHTML);
    });
  };
  recorrer(contenedor);
  return bloques;
}

// Lista de bloques -> HTML con clases gb-* (convierte contenido antiguo al
// abrirlo en el editor; el usuario puede revisar los tipos antes de guardar).
export const bloquesAHtml = (bloques) =>
  bloques.map((b) => `<p class="${claseBloque(b.tipo)}">${b.html}</p>`).join("");

export const normalizarHtmlGuion = (html) => bloquesAHtml(htmlABloques(html));

export const crearBloqueHtml = (tipo, texto = "") =>
  `<p class="${claseBloque(tipo)}">${texto ? escaparHtml(texto) : "<br>"}</p>`;

// Escenas del guion (para sincronizar la tabla `escenas`): cada bloque de
// tipo "escena" abre una escena; lo que sigue es su descripción en texto plano.
export function extraerEscenas(html) {
  const escenas = [];
  let actual = null;
  htmlABloques(html).forEach((b) => {
    if (b.tipo === "escena") {
      actual = { encabezado: b.texto.trim(), lineas: [] };
      escenas.push(actual);
    } else if (actual) {
      actual.lineas.push(b.texto);
    }
  });
  return escenas.map((e, i) => ({
    numero: i + 1,
    encabezado: e.encabezado,
    descripcion: e.lineas.join("\n"),
  }));
}

// ---------------------------------------------------------------- PDF
// Carta, Courier 12 pt (10 caracteres por pulgada), márgenes 1.5" izq y
// 1" der/sup/inf. Todas las sangrías se miden en columnas de 1 carácter.
const CARACTER_MM = 2.54; // 12 pt Courier = 0.1"
const LINEA_MM = 4.2333; // 12 pt
const COLUMNAS = {
  escena: { inicio: 0, ancho: 60 },
  accion: { inicio: 0, ancho: 60 },
  personaje: { inicio: 22, ancho: 33 },
  parentesis: { inicio: 16, ancho: 25 },
  dialogo: { inicio: 10, ancho: 35 },
  transicion: { inicio: 45, ancho: 15, derecha: true },
};

function envolver(texto, ancho) {
  const lineas = [];
  String(texto).split("\n").forEach((parrafo) => {
    let linea = "";
    parrafo.split(/\s+/).filter(Boolean).forEach((palabra) => {
      let p = palabra;
      while (p.length > ancho) {
        if (linea) { lineas.push(linea); linea = ""; }
        lineas.push(p.slice(0, ancho));
        p = p.slice(ancho);
      }
      if (!linea) linea = p;
      else if (linea.length + 1 + p.length <= ancho) linea += ` ${p}`;
      else { lineas.push(linea); linea = p; }
    });
    lineas.push(linea);
  });
  return lineas;
}

// Estimación de páginas (≈ 54 líneas por página ≈ 1 minuto de pantalla)
export function estimarPaginas(html) {
  const bloques = htmlABloques(html);
  let lineas = 0;
  bloques.forEach((b, i) => {
    lineas += envolver(b.texto, COLUMNAS[b.tipo].ancho).length;
    const sigue = bloques[i + 1];
    const pegado = (b.tipo === "personaje" || b.tipo === "parentesis") && sigue && (sigue.tipo === "dialogo" || sigue.tipo === "parentesis");
    if (!pegado) lineas += 1;
  });
  return Math.max(1, Math.ceil(lineas / 54));
}

export async function generarPdfGuion({ titulo, subtitulo, html, nombreArchivo }) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const anchoPagina = pdf.internal.pageSize.getWidth();
  const altoPagina = pdf.internal.pageSize.getHeight();
  const margenIzq = 38.1;
  const margenDer = 25.4;
  const margenSup = 25.4;
  const margenInf = 25.4;
  const lineasPorPagina = Math.floor((altoPagina - margenSup - margenInf) / LINEA_MM);

  // Portada (sin número de página)
  pdf.setFont("courier", "normal");
  pdf.setFontSize(12);
  let yTitulo = altoPagina / 3;
  envolver((titulo || "Guion").toLocaleUpperCase("es"), 40).forEach((l) => {
    pdf.text(l, anchoPagina / 2, yTitulo, { align: "center" });
    yTitulo += LINEA_MM;
  });
  if (subtitulo) pdf.text(subtitulo, margenIzq, altoPagina - margenInf - 2 * LINEA_MM);
  pdf.text(new Date().toLocaleDateString("es"), margenIzq, altoPagina - margenInf);

  // Cuerpo: la primera página no lleva número; desde la 2 "N." arriba a la derecha
  pdf.addPage();
  let lineaActual = 0;
  let paginaCuerpo = 1;
  const nuevaPagina = () => {
    pdf.addPage();
    paginaCuerpo += 1;
    lineaActual = 0;
    pdf.text(`${paginaCuerpo}.`, anchoPagina - margenDer, 15.9, { align: "right" });
  };
  const escribir = (tipo, texto) => {
    const col = COLUMNAS[tipo];
    const y = margenSup + (lineaActual + 1) * LINEA_MM - 1;
    if (col.derecha) pdf.text(texto, anchoPagina - margenDer, y, { align: "right" });
    else pdf.text(texto, margenIzq + col.inicio * CARACTER_MM, y);
    lineaActual += 1;
  };

  const bloques = htmlABloques(html);
  let personajeActual = "";
  bloques.forEach((b, i) => {
    const lineas = envolver(b.texto, COLUMNAS[b.tipo].ancho);
    const anterior = bloques[i - 1];
    const pegado = anterior && (anterior.tipo === "personaje" || anterior.tipo === "parentesis") && (b.tipo === "dialogo" || b.tipo === "parentesis");
    if (lineaActual > 0 && !pegado) lineaActual += 1; // línea en blanco entre bloques
    if (b.tipo === "personaje") personajeActual = b.texto.replace(/\s*\((CONT'D|MÁS)\)\s*$/i, "").trim();

    // Escena/personaje/paréntesis no se quedan solos al final de la página
    let necesarias = lineas.length;
    const siguiente = bloques[i + 1];
    if (["escena", "personaje", "parentesis"].includes(b.tipo) && siguiente) {
      necesarias += Math.min(2, envolver(siguiente.texto, COLUMNAS[siguiente.tipo].ancho).length);
    }
    if (b.tipo !== "dialogo" && lineaActual + necesarias > lineasPorPagina) nuevaPagina();

    lineas.forEach((linea, k) => {
      const reserva = b.tipo === "dialogo" && personajeActual && k > 0 ? 1 : 0; // espacio para (MÁS)
      if (lineaActual >= lineasPorPagina - reserva) {
        if (reserva) {
          escribir("dialogo", "(MÁS)");
          nuevaPagina();
          escribir("personaje", `${personajeActual} (CONT'D)`);
        } else {
          nuevaPagina();
        }
      }
      escribir(b.tipo, linea);
    });
  });

  pdf.save(`${nombreArchivo || "guion"}.pdf`);
}
