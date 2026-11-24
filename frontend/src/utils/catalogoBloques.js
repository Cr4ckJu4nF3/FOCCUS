import { claseBloque, htmlABloques, limpiarHtmlGuion } from "./guionBloques.js";

export const TIPOS_CATALOGO = ["accion", "dialogo", "parentesis", "transicion"];

const htmlDeBloque = (bloque) => {
  const estilo = bloque.estilo && /^text-align:\s*(left|center|right|justify)\s*;?$/i.test(bloque.estilo)
    ? ` style="${bloque.estilo}"` : "";
  return limpiarHtmlGuion(`<p class="${claseBloque(bloque.tipo)}"${estilo}>${bloque.html}</p>`);
};

// Solo se envían bloques completos, no caracteres ni eventos individuales.
export function bloquesParaCatalogo(html) {
  return htmlABloques(html)
    .filter((bloque) => TIPOS_CATALOGO.includes(bloque.tipo))
    .map((bloque) => ({
      tipo: bloque.tipo,
      html: htmlDeBloque(bloque),
    }));
}

// La respuesta de red no es HTML confiable, tampoco al insertarla en el editor.
export function bloqueCatalogoSeguro(item, projectId) {
  if (!item || String(item.id_project) !== String(projectId) || !TIPOS_CATALOGO.includes(item.tipo) || typeof item.html !== "string") return null;
  const bloques = htmlABloques(item.html);
  if (bloques.length !== 1 || bloques[0].tipo !== item.tipo) return null;
  const html = htmlDeBloque(bloques[0]);
  return { ...item, html, texto: bloques[0].texto };
}

// La galería externa solo muestra acciones válidas del proyecto solicitado.
export function accionesDelCatalogo(items, projectId) {
  if (!Array.isArray(items)) throw new Error("La respuesta del catálogo no es válida.");
  let invalidos = 0;
  const acciones = [];
  for (const item of items) {
    if (item?.tipo !== "accion") continue;
    const seguro = bloqueCatalogoSeguro(item, projectId);
    if (seguro) acciones.push(seguro);
    else invalidos += 1;
  }
  return { acciones, invalidos };
}

// Una cola por proyecto: deduplica únicamente confirmaciones y mantiene fallos
// para reintento. Los snapshots programados agrupan la escritura con debounce.
export function crearColaCatalogo({ extraer, enviar, notificar, demora = 1200 }) {
  const pendientes = new Map();
  const confirmados = new Set();
  let timer = null;
  let programado = null;
  let enviando = false;
  let error = "";
  let rafagaDestructiva = false;
  let rafagaEdicion = false;
  const clave = (b) => JSON.stringify([b.tipo, b.html]);
  const avisar = () => notificar({ pendientes: pendientes.size + (programado === null ? 0 : 1), enviando, error });

  const procesar = async () => {
    if (enviando || error) return;
    enviando = true;
    avisar();
    try {
      for (const [id, bloque] of pendientes) {
        await enviar(bloque);
        pendientes.delete(id);
        confirmados.add(id);
        avisar();
      }
    } catch (e) {
      error = e?.message || "No se pudo guardar en el catálogo.";
    } finally {
      enviando = false;
      avisar();
    }
  };
  const capturar = (html) => {
    for (const bloque of extraer(html || "")) {
      const id = clave(bloque);
      if (!confirmados.has(id) && !pendientes.has(id)) pendientes.set(id, bloque);
    }
    avisar();
    void procesar();
  };
  const vaciarProgramado = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    const html = programado;
    programado = null;
    rafagaDestructiva = false;
    rafagaEdicion = false;
    if (html !== null) capturar(html);
    else avisar();
  };
  return {
    capturar,
    antesDeEditar(html) {
      if (!rafagaEdicion) capturar(html);
      rafagaEdicion = true;
      rafagaDestructiva = false;
    },
    antesDeRetirar(html) {
      if (!rafagaDestructiva) capturar(html);
      rafagaDestructiva = true;
    },
    programar(html) {
      programado = html;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(vaciarProgramado, demora);
      avisar();
    },
    vaciar: vaciarProgramado,
    reintentar() { error = ""; avisar(); void procesar(); },
    estado() { return { pendientes: pendientes.size + (programado === null ? 0 : 1), enviando, error }; },
  };
}
