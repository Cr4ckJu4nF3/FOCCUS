import {
  crearBloqueEscenaHtml,
  limpiarHtmlGuion,
  normalizarHtmlGuion,
  tipoDeElemento,
} from "./guionBloques.js";

const PREFIJOS_ESCENA = [
  [/^INT\.?\s*\/\s*EXT\.?\s*/i, "Int/Ext"],
  [/^EXT\.?\s*\/\s*INT\.?\s*/i, "Ext/Int"],
  [/^INT\.?\s*/i, "Int"],
  [/^EXT\.?\s*/i, "Ext"],
];
const MOMENTOS = ["DÍA", "DIA", "NOCHE", "AMANECER", "ATARDECER", "MAÑANA", "MANANA", "TARDE"];

export function analizarEncabezadoEscena(encabezado = "") {
  const texto = String(encabezado).trim().replace(/\s+/g, " ");
  if (!texto) return null;

  const numeroCoincidencia = texto.match(
    /^(\d+[A-Z]?)(?:\s*[.-]\s*|\s+(?=(?:INT|EXT|I\/E)(?:\.|\/|$)))/i,
  );
  const textoSinNumero = numeroCoincidencia ? texto.slice(numeroCoincidencia[0].length) : texto;
  const modo = PREFIJOS_ESCENA.find(([regex]) => regex.test(textoSinNumero));
  const ubicacionYMomento = modo ? textoSinNumero.replace(modo[0], "") : textoSinNumero;
  const finalMomento = new RegExp(`(?:^|\\s)-\\s+(${MOMENTOS.join("|")})$`, "i");
  const coincidencia = ubicacionYMomento.match(finalMomento);
  const ubicacion = (coincidencia
    ? ubicacionYMomento.replace(finalMomento, "")
    : ubicacionYMomento).trim();
  if ((!modo && !numeroCoincidencia && !coincidencia) || (!ubicacion && !coincidencia)) return null;

  const momento = coincidencia?.[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const momentoCanonico = !momento ? "" : momento === "DIA" ? "Día"
    : momento === "MANANA" ? "Mañana"
      : momento.charAt(0) + momento.slice(1).toLowerCase();
  return {
    numero_de_escena: numeroCoincidencia?.[1] || "",
    modo_vista: modo?.[1] || "",
    ubicacion,
    momento_dia: momentoCanonico,
  };
}

export function formatearEncabezadoEscena({
  numero_de_escena = "",
  modo_vista,
  ubicacion,
  momento_dia,
}) {
  const prefijo = {
    Int: "INT.",
    Ext: "EXT.",
    "Int/Ext": "INT./EXT.",
    "Ext/Int": "EXT./INT.",
  }[modo_vista];
  const lugar = String(ubicacion || "").trim();
  const momento = String(momento_dia || "").trim();
  const numero = String(numero_de_escena || "").trim();
  if (!prefijo && !lugar && !momento && !numero) return "";
  const partes = [];
  if (prefijo) partes.push(prefijo);
  if (lugar) partes.push(lugar.toLocaleUpperCase());
  let encabezado = partes.join(" ");
  if (momento) encabezado += ` - ${momento.toLocaleUpperCase()}`;
  if (!encabezado && momento) encabezado = `- ${momento.toLocaleUpperCase()}`;
  if (numero) return `${numero}${prefijo ? " " : ". "}${encabezado}`.trim();
  return encabezado;
}

// Construye el texto del bloque de escena a partir del formulario. Los campos
// que el usuario borró explícitamente no se recuperan del encabezado anterior.
export function encabezadoDesdeCamposEscena(form, camposEditados = []) {
  const editados = new Set(camposEditados);
  const anterior = analizarEncabezadoEscena(form.encabezado);
  const valorCampo = (campo, anteriorCampo) => (
    editados.has(campo) ? form[campo] : form[campo] || anterior?.[anteriorCampo]
  );
  const ubicacion = editados.has("ciudad")
    ? form.ciudad
    : anterior?.ubicacion || form.ciudad;
  return formatearEncabezadoEscena({
    numero_de_escena: form.numero_de_escena || anterior?.numero_de_escena,
    modo_vista: valorCampo("modo_vista", "modo_vista"),
    ubicacion,
    momento_dia: valorCampo("momento_dia", "momento_dia"),
  }) || String(form.encabezado || "").trim();
}

export function camposEscenaVacios(numero = "") {
  return {
    numero_de_escena: String(numero),
    encabezado: "",
    modo_vista: "",
    momento_dia: "",
    ciudad: "",
    pagina: "",
    fecha_de_grabacion: "",
    dia_dramatico: "",
    estado: "Pendiente",
  };
}

export function nuevaClaveEscena() {
  const aleatoria = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `nueva-${aleatoria}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
}

export function marcarEscenasNuevas(html) {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = limpiarHtmlGuion(html);
  contenedor.querySelectorAll("p.gb-escena").forEach((bloque) => {
    if (!bloque.dataset.escenaId && !bloque.dataset.escenaKey) {
      bloque.dataset.escenaKey = nuevaClaveEscena();
    }
  });
  return contenedor.innerHTML;
}

// Une las pestañas sin perder la identidad elegida explícitamente al crear
// una escena. Una pestaña nueva es una escena nueva; las pestañas cargadas
// desde texto existente no reciben identidad automáticamente.
export function htmlDesdePestanas(pestanas = []) {
  return pestanas.map(({ numero, texto = "", client_key: clientKey }) => {
    const contenedor = document.createElement("div");
    contenedor.innerHTML = limpiarHtmlGuion(texto);
    const encabezados = Array.from(contenedor.children)
      .filter((bloque) => tipoDeElemento(bloque) === "escena");

    if (clientKey && encabezados.length === 0) {
      contenedor.innerHTML = crearBloqueEscenaHtml(`ESCENA ${numero}`, { client_key: clientKey })
        + contenedor.innerHTML;
    } else if (clientKey && encabezados.length === 1) {
      const [encabezado] = encabezados;
      if (!encabezado.dataset.escenaId && !encabezado.dataset.escenaKey) {
        encabezado.dataset.escenaKey = clientKey;
      }
    }
    return contenedor.innerHTML;
  }).join("");
}

// Evita que una pestaña vaciada recree su escena implícita al guardar.
export function desvincularPestanaSinEncabezados(pestana, html) {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = limpiarHtmlGuion(html);
  const tieneEscenas = Array.from(contenedor.children)
    .some((bloque) => tipoDeElemento(bloque) === "escena");
  return pestana.client_key && !tieneEscenas ? { ...pestana, client_key: null } : pestana;
}

// Convierte una versión antigua al formato actual y agrupa cada encabezado
// con sus bloques hasta el siguiente encabezado. El índice solo sirve para
// identificar la selección explícita hecha por la persona; nunca se usa para
// elegir una ficha automáticamente.
export function extraerFragmentosEscena(html) {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = normalizarHtmlGuion(limpiarHtmlGuion(html));
  const fragmentos = [];
  let actual = null;
  const guardarActual = () => {
    if (!actual) return;
    const texto = actual.bloques
      .map((bloque) => bloque.textContent || "")
      .join("\n")
      .trim();
    fragmentos.push({
      indice: fragmentos.length,
      encabezado: actual.encabezado,
      id_escena: actual.id_escena,
      html: actual.elementos.map((bloque) => bloque.outerHTML).join(""),
      texto,
      tieneTexto: Boolean(texto),
    });
  };
  Array.from(contenedor.children).forEach((bloque) => {
    if (tipoDeElemento(bloque) === "escena") {
      guardarActual();
      actual = {
        encabezado: (bloque.textContent || "").trim(),
        id_escena: bloque.dataset.escenaId || null,
        elementos: [bloque],
        bloques: [],
      };
    } else if (actual) {
      actual.elementos.push(bloque);
      actual.bloques.push(bloque);
    }
  });
  guardarActual();
  return fragmentos;
}

export function clonarHtmlEscena(html, idEscena, clientKey, indiceFragmento = null) {
  const fragmentos = extraerFragmentosEscena(html);
  let seleccionado;
  if (Number.isInteger(indiceFragmento)) {
    seleccionado = fragmentos.find((fragmento) => fragmento.indice === indiceFragmento);
    if (!seleccionado) {
      throw new Error("El fragmento elegido ya no está en la versión de origen. Vuelve a seleccionarlo.");
    }
  } else {
    const coincidencias = fragmentos.filter(
      (fragmento) => String(fragmento.id_escena || "") === String(idEscena || ""),
    );
    if (coincidencias.length !== 1) {
      throw new Error(
        coincidencias.length
          ? "La escena aparece más de una vez en la versión de origen; no se copió sin una selección manual."
          : "No se encontró el vínculo entre la ficha y el texto de su versión actual. Selecciona manualmente un fragmento; no se copió por encabezado o posición.",
      );
    }
    [seleccionado] = coincidencias;
  }
  if (!seleccionado.tieneTexto) {
    throw new Error("El fragmento elegido no contiene texto de escena. No se inventó ni insertó contenido; vuelve al guion y usa «Nueva escena» para redactarlo.");
  }
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(clientKey || "")) {
    throw new Error("No se pudo crear una identidad nueva para la escena copiada.");
  }
  const copia = document.createElement("div");
  copia.innerHTML = seleccionado.html;
  const encabezado = copia.firstElementChild;
  if (!encabezado || tipoDeElemento(encabezado) !== "escena") {
    throw new Error("El fragmento elegido no tiene un encabezado de escena válido.");
  }
  Array.from(copia.children).forEach((bloque) => {
    bloque.removeAttribute("data-escena-id");
    bloque.removeAttribute("data-escena-key");
  });
  encabezado.dataset.escenaKey = clientKey;
  return copia.innerHTML;
}

// La copia solo se materializa cuando el usuario confirma la aplicación en el
// formulario. Cerrar/cancelar cualquiera de los diálogos no crea ni inserta
// contenido en el borrador.
export function crearHtmlCopiaEscena({
  html, idEscena, clientKey, indiceFragmento = null, confirmado = false,
}) {
  if (!confirmado) return null;
  return clonarHtmlEscena(html, idEscena, clientKey, indiceFragmento);
}

export function retirarCambioEscena(cambios, identidad, indiceEliminado) {
  return cambios.filter((cambio) => !(
    (identidad.id_escena && String(cambio.id_escena || "") === String(identidad.id_escena))
    || (identidad.client_key && String(cambio.client_key || "") === String(identidad.client_key))
  )).map((cambio) => (
    Number.isInteger(cambio.indice) && cambio.indice > indiceEliminado
      ? { ...cambio, indice: cambio.indice - 1 }
      : cambio
  ));
}

export function encontrarEscenaEnRango(editor, rango) {
  const inicio = rango?.startContainer;
  if (!editor || !inicio || !editor.contains(inicio)) return null;
  let bloque;
  if (inicio === editor) {
    const siguiente = editor.childNodes[rango.startOffset];
    if (tipoDeElemento(siguiente) === "escena") return null;
    bloque = editor.childNodes[rango.startOffset - 1] || null;
    while (bloque && bloque.nodeType !== Node.ELEMENT_NODE) bloque = bloque.previousSibling;
  } else {
    bloque = inicio;
    while (bloque && bloque.parentNode !== editor) bloque = bloque.parentNode;
  }
  while (bloque && tipoDeElemento(bloque) !== "escena") bloque = bloque.previousElementSibling;
  return bloque || null;
}

export function quitarEscenaLocal(html, identidad) {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = limpiarHtmlGuion(html);
  const atributo = identidad?.id_escena ? "escenaId" : "escenaKey";
  const valor = identidad?.id_escena || identidad?.client_key;
  if (!valor) throw new Error("No hay una identidad segura para quitar esta escena de la versión.");
  const coincidencias = Array.from(contenedor.children).filter(
    (bloque) => tipoDeElemento(bloque) === "escena"
      && String(bloque.dataset[atributo] || "") === String(valor),
  );
  if (coincidencias.length !== 1) {
    throw new Error("No se pudo identificar una única escena en esta versión; no se quitó ningún texto.");
  }
  const inicio = coincidencias[0];
  let bloque = inicio;
  while (bloque && (bloque === inicio || tipoDeElemento(bloque) !== "escena")) {
    const siguiente = bloque.nextElementSibling;
    bloque.remove();
    bloque = siguiente;
  }
  return contenedor.innerHTML;
}

export function planificarAccionesVersionEscenas(escenasDocumento, escenasPersistidas, cambios = []) {
  const filas = Array.isArray(escenasPersistidas) ? escenasPersistidas : [];
  const porId = new Map(filas.map((fila) => [String(fila.id_escena), fila]));
  const usadas = new Set();
  const claves = new Set();
  const acciones = [];
  const errores = [];

  escenasDocumento.forEach((escena) => {
    const cambio = cambios.find((item) => (
      (escena.id_escena && String(item.id_escena) === String(escena.id_escena))
      || (escena.client_key && String(item.client_key) === String(escena.client_key))
    ));
    const form = cambio?.form || {};
    if (escena.id_escena && escena.client_key) {
      errores.push("Un encabezado contiene dos identidades de escena; corrige el vínculo antes de guardar.");
      return;
    }
    if (escena.id_escena) {
      const id = String(escena.id_escena);
      const existente = porId.get(id);
      if (!existente) {
        errores.push(`La ficha ${id} ya no pertenece al guion. El texto se conserva, pero no se guardó una versión nueva.`);
        return;
      }
      if (usadas.has(id)) {
        errores.push(`La ficha ${id} está vinculada a más de un encabezado; no se guardó la versión.`);
        return;
      }
      usadas.add(id);
      const payload = {
        encabezado: escena.encabezado.slice(0, 250),
        descripcion: escena.descripcion,
      };
      if (form.numero_de_escena && String(form.numero_de_escena) !== String(existente.numero_de_escena)) {
        payload.numero_de_escena = String(form.numero_de_escena);
      }
      if (cambio) {
        payload.modo_vista = form.modo_vista || null;
        payload.momento_dia = form.momento_dia || null;
        payload.ciudad = form.ciudad?.trim() || null;
        payload.pagina = form.pagina ? Number(form.pagina) : null;
        payload.fecha_de_grabacion = form.fecha_de_grabacion || null;
        payload.dia_dramatico = form.dia_dramatico ? Number(form.dia_dramatico) : null;
        payload.estado = form.estado || existente.estado || "Pendiente";
      }
      const cambiosPayload = Object.fromEntries(
        Object.entries(payload).filter(([campo, valor]) => existente[campo] !== valor),
      );
      if (Object.keys(cambiosPayload).length) {
        acciones.push({ tipo: "actualizar", id_escena: id, payload: cambiosPayload });
      }
      return;
    }

    if (!escena.client_key) {
      errores.push(`El encabezado «${escena.encabezado || "(sin texto)"}» no tiene una ficha asociada. Selecciona una ficha existente o usa «Nueva escena»; no se inferirá por posición.`);
      return;
    }
    if (claves.has(escena.client_key)) {
      errores.push("Una clave temporal de escena aparece más de una vez; no se guardó la versión.");
      return;
    }
    claves.add(escena.client_key);
    const payload = {
      numero_de_escena: String(form.numero_de_escena || escena.numero),
      encabezado: String(form.encabezado || escena.encabezado).trim().slice(0, 250),
      descripcion: escena.descripcion,
    };
    if (cambio) {
      payload.modo_vista = form.modo_vista || null;
      payload.momento_dia = form.momento_dia || null;
      payload.ciudad = form.ciudad?.trim() || null;
      payload.pagina = form.pagina ? Number(form.pagina) : null;
      payload.fecha_de_grabacion = form.fecha_de_grabacion || null;
      payload.dia_dramatico = form.dia_dramatico ? Number(form.dia_dramatico) : null;
      payload.estado = form.estado || "Pendiente";
    }
    acciones.push({ tipo: "crear", client_key: escena.client_key, payload });
  });

  return { acciones, errores };
}

export function planificarSincronizacionEscenas(escenasGuion, escenasPersistidas, cambios = []) {
  const filas = Array.isArray(escenasPersistidas) ? escenasPersistidas : [];
  const porIndice = new Map(cambios.map((cambio) => [Number(cambio.indice), cambio]));
  const usadas = new Set();
  const numerosUsados = new Set(filas.map((fila) => String(fila.numero_de_escena)));
  const numerosPlaneados = new Set();
  const acciones = [];
  const errores = [];

  escenasGuion.forEach((escena, indice) => {
    const cambio = porIndice.get(indice);
    const numero = String(cambio?.form?.numero_de_escena || escena.numero);
    const form = cambio?.form || {};
    const encabezado = String(form.encabezado || escena.encabezado || "").trim();
    const descripcion = String(
      cambio?.forzarCreacion && form.descripcion !== undefined
        ? form.descripcion
        : escena.descripcion || "",
    ).trim();
    let existente = cambio?.id_escena
      ? filas.find((fila) => String(fila.id_escena) === String(cambio.id_escena))
      : null;

    if (cambio?.id_escena && !existente) {
      errores.push(`No se encontró la escena ${cambio.id_escena} para actualizar; no se creó otra en su lugar.`);
      return;
    }
    if (existente && usadas.has(existente.id_escena)) {
      errores.push(`La ficha ${existente.id_escena} se seleccionó más de una vez; no se reutilizó ni sobrescribió.`);
      return;
    }
    if (existente && filas.some(
      (fila) => String(fila.id_escena) !== String(existente.id_escena)
        && String(fila.numero_de_escena) === numero,
    )) {
      errores.push(`El número ${numero} ya pertenece a otra escena; no se cambió la numeración.`);
      return;
    }
    if (
      existente
      && cambio
      && String(existente.numero_de_escena) !== numero
      && numerosPlaneados.has(numero)
    ) {
      errores.push(`El número ${numero} ya fue asignado a otra escena en este formulario.`);
      return;
    }

    if (!existente && !cambio?.forzarCreacion) {
      const coincidenciasExactas = filas.filter((fila) =>
        !usadas.has(fila.id_escena)
        && String(fila.encabezado || "").trim().toLocaleUpperCase() === encabezado.toLocaleUpperCase(),
      );
      const exactaConMismoNumero = coincidenciasExactas.filter(
        (fila) => String(fila.numero_de_escena) === numero,
      );
      if (exactaConMismoNumero.length > 1) {
        errores.push(`El encabezado «${encabezado}» corresponde a más de una escena; no se modificó para evitar confusiones.`);
        return;
      }
      if (exactaConMismoNumero.length === 1) existente = exactaConMismoNumero[0];
      else if (coincidenciasExactas.length) {
        errores.push(`El encabezado «${encabezado}» coincide con otra ficha, pero el número no. Elige la ficha desde el selector para evitar asignarla a la identidad equivocada.`);
        return;
      }
    }

    if (cambio?.reutilizar) {
      if (!existente) {
        errores.push("No se pudo identificar la ficha elegida para reutilizarla; vuelve a seleccionar la escena.");
        return;
      }
      usadas.add(existente.id_escena);
      return;
    }

    if (!existente) {
      if (numerosUsados.has(numero)) {
        errores.push(`El número ${numero} ya corresponde a otra escena; no se sobrescribió ni duplicó.`);
        return;
      }
    }

    const payload = {
      numero_de_escena: numero,
      encabezado: encabezado.slice(0, 250),
      descripcion,
    };
    if (cambio) {
      payload.modo_vista = form.modo_vista || null;
      payload.momento_dia = form.momento_dia || null;
      payload.ciudad = form.ciudad?.trim() || null;
      payload.pagina = form.pagina ? Number(form.pagina) : null;
      payload.fecha_de_grabacion = form.fecha_de_grabacion || null;
      payload.dia_dramatico = form.dia_dramatico ? Number(form.dia_dramatico) : null;
      payload.estado = form.estado || "Pendiente";
    } else if (existente) {
      // Solo se sincronizan los campos que derivan del documento; los demás
      // metadatos de continuidad, rodaje y desglose quedan intactos.
      delete payload.numero_de_escena;
    }

    if (existente) {
      usadas.add(existente.id_escena);
      numerosUsados.add(numero);
      const cambiosPayload = Object.fromEntries(
        Object.entries(payload).filter(([clave, valor]) => existente[clave] !== valor),
      );
      if (Object.keys(cambiosPayload).length) {
        acciones.push({ tipo: "actualizar", id_escena: existente.id_escena, payload: cambiosPayload });
      }
    } else {
      if (numerosPlaneados.has(numero)) {
        errores.push(`El número ${numero} ya fue asignado a otra escena en este formulario.`);
        return;
      }
      acciones.push({ tipo: "crear", payload });
      numerosUsados.add(numero);
      numerosPlaneados.add(numero);
    }
    if (existente && cambio && String(existente.numero_de_escena) !== numero) {
      numerosPlaneados.add(numero);
    }
  });

  const noRelacionadas = filas.filter((fila) => !usadas.has(fila.id_escena));
  return { acciones, errores, noRelacionadas };
}

// Solo se usa al crear un guion en modo escenas y sin ningún encabezado.
// En un reintento, una ficha idéntica puede ser resultado de un lote que sí
// llegó al servidor aunque se perdiera la respuesta: nunca la modificamos.
export function planificarEscenasDePestanas(pestanas, persistidas) {
  const acciones = [];
  const errores = [];
  const usadas = new Set();
  const numeros = new Set();

  pestanas.forEach(({ numero, texto }) => {
    const numeroTexto = String(numero);
    const clave = numeroTexto.trim().toLocaleLowerCase();
    const descripcion = String(texto || "").trim();
    const encabezado = (descripcion.split("\n").map((linea) => linea.trim()).find(Boolean)
      || `ESCENA ${numeroTexto}`).slice(0, 250);
    if (numeros.has(clave)) {
      errores.push(`El número ${numeroTexto} aparece más de una vez en las pestañas.`);
      return;
    }
    numeros.add(clave);
    const coincidencias = persistidas.filter(
      (fila) => String(fila.numero_de_escena).trim().toLocaleLowerCase() === clave,
    );
    if (coincidencias.length) {
      const fila = coincidencias[0];
      if (coincidencias.length !== 1 || fila.encabezado !== encabezado || (fila.descripcion || "") !== descripcion) {
        errores.push(`El número ${numeroTexto} ya pertenece a una ficha distinta; no se modificó.`);
      } else {
        usadas.add(fila.id_escena);
      }
      return;
    }
    acciones.push({ tipo: "crear", payload: { numero_de_escena: numeroTexto, encabezado, descripcion } });
  });
  return { acciones, errores, noRelacionadas: persistidas.filter((fila) => !usadas.has(fila.id_escena)) };
}

export async function sincronizarEscenasDocumento({
  escenasDocumento, pestanasSinEncabezados, cambios, cargarPersistidas, enviarAcciones,
}) {
  const persistidas = await cargarPersistidas();
  if (!escenasDocumento.length && !pestanasSinEncabezados?.length) {
    return {
      cantidad: 0,
      advertencias: persistidas.length
        ? [`No se encontraron encabezados en el texto; se conservaron ${persistidas.length} ficha(s) de escena existentes.`]
        : [],
    };
  }
  const plan = escenasDocumento.length
    ? planificarSincronizacionEscenas(escenasDocumento, persistidas, cambios)
    : planificarEscenasDePestanas(pestanasSinEncabezados, persistidas);
  if (plan.errores.length) throw new Error(plan.errores.join(" "));
  if (plan.acciones.length) await enviarAcciones(plan.acciones);
  const advertencias = plan.noRelacionadas.length
    ? [`Se conservaron ${plan.noRelacionadas.length} escena(s) persistida(s) que no aparecen en esta versión; no se borró ningún dato.`]
    : [];
  return { cantidad: plan.acciones.length, advertencias };
}
