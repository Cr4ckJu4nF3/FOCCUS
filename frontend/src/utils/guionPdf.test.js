import test from "node:test";
import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import {
  crearDocumentoPdfGuion,
  crearOpcionesPdfGuion,
} from "./guionBloques.js";

test("las opciones del PDF usan el título y el contenido de la versión seleccionada", () => {
  const versiones = [
    { id_guion_version: 10, numero_de_version: 1, estado: "Borrador", contenido: "CONTENIDO-V1" },
    {
      id_guion_version: 11,
      numero_de_version: 2,
      estado: "Aprobado",
      contenido: '<p class="gb gb-escena">INT. CASA - NOCHE</p><p class="gb gb-dialogo">TEXTO-V2</p>',
    },
  ];
  const versionSeleccionada = versiones.find((version) => version.id_guion_version === 11);
  const opciones = crearOpcionesPdfGuion(
    { nombre: "La película" },
    versionSeleccionada,
  );

  assert.deepEqual(opciones, {
    titulo: "La película",
    subtitulo: "Versión 2 · Aprobado",
    html: versionSeleccionada.contenido,
    nombreArchivo: "La película-v2",
  });
});

test("el PDF conserva todo el texto sintético en varias páginas Carta numeradas con Courier 12", () => {
  const tipos = [
    ["escena", "ESC"],
    ["accion", "ACC"],
    ["personaje", "PER"],
    ["parentesis", "PAR"],
    ["dialogo", "DIA"],
    ["transicion", "TRA"],
  ];
  const bloques = [];
  for (let grupo = 1; grupo <= 24; grupo += 1) {
    tipos.forEach(([tipo, etiqueta]) => {
      const marcador = `B${String(grupo).padStart(2, "0")}-${etiqueta}`;
      bloques.push({ tipo, texto: marcador });
    });
  }

  const version = {
    id_guion_version: 27,
    numero_de_version: 3,
    estado: "Aprobado",
    contenido: "HTML SINTÉTICO DE LA VERSIÓN SELECCIONADA",
  };
  const opciones = crearOpcionesPdfGuion(
    { nombre: "Prueba de varias páginas" },
    version,
  );
  const pdf = crearDocumentoPdfGuion(jsPDF, {
    titulo: opciones.titulo,
    subtitulo: opciones.subtitulo,
    bloques,
  });

  assert.ok(pdf.getNumberOfPages() > 2, "el cuerpo debe desbordar la página inicial");
  assert.ok(Math.abs(pdf.internal.pageSize.getWidth() - 215.9) < 0.01);
  assert.ok(Math.abs(pdf.internal.pageSize.getHeight() - 279.4) < 0.01);
  assert.equal(pdf.internal.getPageInfo(1).pageContext.mediaBox.topRightX, 612);
  assert.equal(pdf.internal.getPageInfo(1).pageContext.mediaBox.topRightY, 792);
  assert.equal(pdf.getFont().fontName, "courier");
  assert.equal(pdf.getFontSize(), 12);

  const portada = pdf.internal.pages[1].join("\n");
  assert.ok(portada.includes("(PRUEBA DE VARIAS PÁGINAS) Tj"));
  assert.ok(portada.includes("(Versión 3 · Aprobado) Tj"));
  assert.doesNotMatch(portada, /\(1\.\) Tj/);

  const paginasCuerpo = pdf.internal.pages.slice(2);
  assert.ok(paginasCuerpo[0].join("\n").includes("B01-ESC"));
  assert.doesNotMatch(paginasCuerpo[0].join("\n"), /\(2\.\) Tj/);
  assert.ok(paginasCuerpo[1].join("\n").includes("(2.) Tj"));
  assert.ok(paginasCuerpo[2].join("\n").includes("(3.) Tj"));

  const textoCuerpo = paginasCuerpo.flat().join("\n");
  bloques.forEach(({ texto }) => {
    assert.ok(textoCuerpo.includes(texto), `falta el texto ${texto}`);
  });
  const pdfSerializado = pdf.output();
  bloques.forEach(({ texto }) => {
    assert.ok(pdfSerializado.includes(texto), `el PDF serializado omite ${texto}`);
  });
  const comandosTexto = pdf.internal.pages.flat().filter((comando) => /\bTj/.test(comando));
  assert.ok(comandosTexto.length > 0);
  comandosTexto.forEach((comando) => assert.match(comando, /\/F\d+ 12 Tf/));
});
