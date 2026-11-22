import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { bloqueCatalogoSeguro, bloquesParaCatalogo } from "./catalogoBloques.js";

const dom = new JSDOM("");
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.NodeFilter = dom.window.NodeFilter;

test("extrae solo tipos reutilizables con formato, paréntesis y mayúsculas", () => {
  const bloques = bloquesParaCatalogo('<p class="gb gb-escena">INT. CASA</p><p class="gb gb-accion">Hola <strong>mundo</strong></p><p class="gb gb-dialogo"><em>Sí</em></p><p class="gb gb-parentesis">bajo</p><p class="gb gb-transicion">corte a:</p>');
  assert.deepEqual(bloques.map((b) => b.tipo), ["accion", "dialogo", "parentesis", "transicion"]);
  assert.match(bloques[0].html, /<strong>mundo<\/strong>/);
  assert.match(bloques[1].html, /<em>Sí<\/em>/);
  assert.match(bloques[2].html, /\(bajo\)/);
  assert.match(bloques[3].html, /CORTE A:/);
});

test("limpia HTML de red antes de la vista e inserción y conserva formato permitido", () => {
  const item = { id_project: 1, tipo: "accion", html: '<p class="gb gb-accion" onclick="alert(1)">Bien <b>hecho</b><img src=x onerror="alert(1)"><script>alert(1)</script><svg onload="alert(1)"></svg></p>' };
  const seguro = bloqueCatalogoSeguro(item, 1);
  assert.match(seguro.html, /<b>hecho<\/b>/);
  assert.doesNotMatch(seguro.html, /onclick|onerror|onload|script|svg|img/i);
});

test("rechaza proyecto, tipo y número de bloques inválidos", () => {
  const item = { id_project: 1, tipo: "accion", html: '<p class="gb gb-accion">Uno</p>' };
  assert.equal(bloqueCatalogoSeguro(item, 2), null);
  assert.equal(bloqueCatalogoSeguro({ ...item, tipo: "dialogo" }, 1), null);
  assert.equal(bloqueCatalogoSeguro({ ...item, html: `${item.html}${item.html}` }, 1), null);
});

test("mantiene la alineación del párrafo al guardar y volver a insertar", () => {
  const [bloque] = bloquesParaCatalogo('<p class="gb gb-dialogo" style="text-align: center;"><em>Hola</em></p>');
  assert.match(bloque.html, /style="text-align: center;"/);
  const recuperado = bloqueCatalogoSeguro({ ...bloque, id_project: 1 }, 1);
  assert.equal(recuperado.html, bloque.html);
});
