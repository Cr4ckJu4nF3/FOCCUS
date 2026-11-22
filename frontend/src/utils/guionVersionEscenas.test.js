import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { extraerEscenas } from "./guionBloques.js";
import {
  clonarHtmlEscena,
  crearHtmlCopiaEscena,
  desvincularPestanaSinEncabezados,
  extraerFragmentosEscena,
  encontrarEscenaEnRango,
  htmlDesdePestanas,
  planificarAccionesVersionEscenas,
  quitarEscenaLocal,
  retirarCambioEscena,
} from "./guionEscenas.js";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.NodeFilter = dom.window.NodeFilter;

test("copia una escena por id, conserva formato del texto y no copia vínculos", () => {
  const origen = [
    '<p class="gb gb-escena" data-escena-id="esc0001">INT. CASA - DÍA</p>',
    '<p class="gb gb-accion"><strong>Entra</strong> al salón.</p>',
    '<p class="gb gb-dialogo"><em>No te vayas.</em></p>',
    '<p class="gb gb-escena" data-escena-id="esc0002">EXT. CALLE - NOCHE</p>',
    '<p class="gb gb-accion">Otra escena.</p>',
  ].join("");

  const copia = clonarHtmlEscena(origen, "esc0001", "copia-1");

  assert.match(copia, /<strong>Entra<\/strong>/);
  assert.match(copia, /<em>No te vayas\.<\/em>/);
  assert.match(copia, /data-escena-key="copia-1"/);
  assert.doesNotMatch(copia, /data-escena-id/);
  assert.doesNotMatch(copia, /Otra escena/);
  assert.doesNotMatch(copia, /rodaje|desglose|galeria/i);
});

test("quitar de versión conserva la ficha persistida y el texto de las demás escenas", () => {
  const html = [
    '<p class="gb gb-escena" data-escena-id="esc0001">INT. CASA</p>',
    '<p class="gb gb-accion">Texto que se retira de esta versión.</p>',
    '<p class="gb gb-escena" data-escena-id="esc0002">EXT. PARQUE</p>',
    '<p class="gb gb-accion">Texto que permanece.</p>',
  ].join("");
  const fichas = [
    { id_escena: "esc0001", numero_de_escena: "1", encabezado: "INT. CASA" },
    {
      id_escena: "esc0002",
      numero_de_escena: "2",
      encabezado: "EXT. PARQUE",
      descripcion: "Texto que permanece.",
    },
  ];

  const actualizado = quitarEscenaLocal(html, { id_escena: "esc0001" });
  const plan = planificarAccionesVersionEscenas(extraerEscenas(actualizado), fichas);

  assert.match(actualizado, /Texto que permanece/);
  assert.doesNotMatch(actualizado, /Texto que se retira/);
  assert.deepEqual(plan.acciones, []);
  assert.deepEqual(plan.errores, []);
  assert.equal(fichas.length, 2);
});

test("quitar una escena conserva los cambios de otras fichas y ajusta sus posiciones", () => {
  const cambios = [
    { indice: 0, id_escena: "esc1", client_key: null, form: { ciudad: "A" } },
    { indice: 1, id_escena: "esc2", client_key: null, form: { ciudad: "B" } },
    { indice: 2, id_escena: null, client_key: "nueva", form: { ciudad: "C" } },
  ];
  assert.deepEqual(retirarCambioEscena(cambios, { id_escena: "esc1" }, 0), [
    { ...cambios[1], indice: 0 },
    { ...cambios[2], indice: 1 },
  ]);
  assert.deepEqual(retirarCambioEscena(cambios, { client_key: "nueva" }, 2), cambios.slice(0, 2));
  assert.equal(cambios[1].indice, 1);
});

test("localiza la escena con el cursor en el límite entre bloques sin adivinar al inicio", () => {
  const editor = document.createElement("div");
  editor.innerHTML = '<p class="gb gb-escena" data-escena-key="primera">INT. CASA</p>'
    + '<p class="gb gb-accion">Acción</p>'
    + '<p class="gb gb-escena" data-escena-key="segunda">EXT. CALLE</p>';
  const rango = document.createRange();
  rango.setStart(editor, 1);
  rango.collapse(true);
  assert.equal(encontrarEscenaEnRango(editor, rango)?.dataset.escenaKey, "primera");
  rango.setStart(editor, 0);
  assert.equal(encontrarEscenaEnRango(editor, rango), null);
  rango.setStart(editor, 2);
  assert.equal(encontrarEscenaEnRango(editor, rango), null);
  rango.setStart(editor.children[1].firstChild, 2);
  assert.equal(encontrarEscenaEnRango(editor, rango)?.dataset.escenaKey, "primera");
});

test("un encabezado sin asociación explícita da error, sin adivinar por posición", () => {
  const escenas = extraerEscenas(
    '<p class="gb gb-escena">INT. CASA</p><p class="gb gb-accion">Acción</p>',
  );
  const plan = planificarAccionesVersionEscenas(escenas, [
    { id_escena: "esc0001", numero_de_escena: "1", encabezado: "INT. CASA" },
  ]);

  assert.deepEqual(plan.acciones, []);
  assert.match(plan.errores.join(" "), /no tiene una ficha asociada/);
});

test("no copia si el vínculo de origen falta, se repite o es ambiguo", () => {
  assert.throws(
    () => clonarHtmlEscena('<p class="gb gb-escena">INT. CASA</p>', "esc0001", "copia-1"),
    /No se encontró el vínculo/,
  );
  assert.throws(
    () => clonarHtmlEscena(
      '<p class="gb gb-escena" data-escena-id="esc0001">A</p><p class="gb gb-escena" data-escena-id="esc0001">B</p>',
      "esc0001",
      "copia-1",
    ),
    /más de una vez/,
  );
});

test("una versión antigua sin data-escena-id permite elegir manualmente el fragmento con vista previa fiel", () => {
  const antiguo = [
    "<p>INT. CASA - DÍA</p>",
    '<p><strong>Abre</strong> la puerta.</p>',
    '<p><em>No entres.</em></p>',
    "<p>EXT. CALLE - NOCHE</p>",
    "<p>La segunda escena.</p>",
  ].join("");
  const fragmentos = extraerFragmentosEscena(antiguo);

  assert.equal(fragmentos.length, 2);
  assert.equal(fragmentos[0].tieneTexto, true);
  assert.match(fragmentos[0].html, /<strong>Abre<\/strong>/);
  assert.match(fragmentos[0].html, /<em>No entres\.<\/em>/);

  const copia = clonarHtmlEscena(antiguo, "esc0001", "copia-antigua", 0);
  assert.match(copia, /data-escena-key="copia-antigua"/);
  assert.match(copia, /<strong>Abre<\/strong>/);
  assert.match(copia, /<em>No entres\.<\/em>/);
  assert.doesNotMatch(copia, /data-escena-id/);
  assert.doesNotMatch(copia, /segunda escena/i);
});

test("encabezados repetidos y vínculos duplicados requieren que el usuario elija el fragmento exacto", () => {
  const repetidas = [
    '<p class="gb gb-escena">INT. CASA - DÍA</p>',
    '<p class="gb gb-accion">Versión A.</p>',
    '<p class="gb gb-escena">INT. CASA - DÍA</p>',
    '<p class="gb gb-accion"><b>Versión B.</b></p>',
  ].join("");
  assert.throws(
    () => clonarHtmlEscena(repetidas, "esc0001", "copia-1"),
    /No se encontró el vínculo/,
  );
  assert.match(clonarHtmlEscena(repetidas, "esc0001", "copia-1", 1), /Versión B\./);
  assert.doesNotMatch(clonarHtmlEscena(repetidas, "esc0001", "copia-1", 1), /Versión A\./);

  const idsDuplicados = [
    '<p class="gb gb-escena" data-escena-id="esc0001">INT. CASA</p>',
    '<p class="gb gb-accion">Primera aparición.</p>',
    '<p class="gb gb-escena" data-escena-id="esc0001">INT. CASA</p>',
    '<p class="gb gb-accion">Segunda aparición.</p>',
  ].join("");
  assert.throws(
    () => clonarHtmlEscena(idsDuplicados, "esc0001", "copia-1"),
    /más de una vez/,
  );
  assert.match(clonarHtmlEscena(idsDuplicados, "esc0001", "copia-1", 1), /Segunda aparición/);
});

test("no inventa texto y cancelar antes de confirmar no genera una copia", () => {
  const sinCuerpo = '<p class="gb gb-escena">INT. CASA</p>';
  assert.equal(extraerFragmentosEscena(sinCuerpo)[0].tieneTexto, false);
  assert.throws(
    () => clonarHtmlEscena(sinCuerpo, null, "copia-1", 0),
    /no contiene texto/,
  );
  assert.equal(crearHtmlCopiaEscena({
    html: '<p class="gb gb-escena">INT. CASA</p><p class="gb gb-accion">Acción.</p>',
    clientKey: "copia-1",
    indiceFragmento: 0,
    confirmado: false,
  }), null);
});

test("una pestaña creada explícitamente queda vinculada sin inferir otras pestañas", () => {
  const html = htmlDesdePestanas([
    { numero: 1, client_key: "nueva-1", texto: '<p class="gb gb-accion"><b>Acción</b></p>' },
    { numero: 2, texto: '<p class="gb gb-escena">INT. ANTIGUA</p>' },
  ]);
  const escenas = extraerEscenas(html);

  assert.equal(escenas[0].client_key, "nueva-1");
  assert.equal(escenas[1].client_key, null);
});

test("una pestaña vaciada al quitar su escena no vuelve a crear un encabezado al guardar", () => {
  const pestana = { numero: 1, client_key: "clave-pestana", texto: "" };
  const vaciada = desvincularPestanaSinEncabezados(pestana, "");
  assert.equal(extraerEscenas(htmlDesdePestanas([vaciada])).length, 0);
  const conOtra = desvincularPestanaSinEncabezados(pestana, '<p class="gb gb-escena" data-escena-key="otra">EXT. CALLE</p>');
  assert.equal(conOtra.client_key, "clave-pestana");
});
