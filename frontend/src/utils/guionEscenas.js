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
    const encabezado = String(cambio?.form?.encabezado || escena.encabezado || "").trim();
    const descripcion = String(escena.descripcion || "").trim();
    const form = cambio?.form || {};
    let existente = cambio?.id_escena
      ? filas.find((fila) => String(fila.id_escena) === String(cambio.id_escena))
      : null;

    if (cambio?.id_escena && !existente) {
      errores.push(`No se encontró la escena ${cambio.id_escena} para actualizar; no se creó otra en su lugar.`);
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

    if (!existente) {
      const coincidenciasExactas = filas.filter((fila) =>
        !usadas.has(fila.id_escena)
        && String(fila.encabezado || "").trim().toLocaleUpperCase() === encabezado.toLocaleUpperCase(),
      );
      const exactaConMismoNumero = coincidenciasExactas.filter(
        (fila) => String(fila.numero_de_escena) === numero,
      );
      if (
        (cambio && exactaConMismoNumero.length > 1)
        || (!cambio && coincidenciasExactas.length > 1 && exactaConMismoNumero.length !== 1)
      ) {
        errores.push(`El encabezado «${encabezado}» corresponde a más de una escena; no se modificó para evitar confusiones.`);
        return;
      }
      if (exactaConMismoNumero.length === 1) existente = exactaConMismoNumero[0];
      else if (!cambio && coincidenciasExactas.length === 1) existente = coincidenciasExactas[0];
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
