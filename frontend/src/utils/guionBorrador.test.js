import test from "node:test";
import assert from "node:assert/strict";
import { hayCambiosGuion } from "./guionBorrador.js";

const base = {
  vista: "crear-cero", editandoContenido: false, contenidoInicial: "",
  escenasActivo: false, escenasBorrador: [], ceroForm: { nombre: "", descripcion: "" },
  versionForm: { estado: "Borrador" }, versionInicial: '{"estado":"Borrador"}',
  contenidoEditado: "<p>Texto</p>", contenidoOriginal: "<p>Texto</p>",
  cambiosEscenaPendientes: [], dialogoEscena: false, formEscena: {},
  escenaInicial: "{}",
};

test("crear detecta título, contenido y escenas sin tratar un borrador vacío como modificado", () => {
  assert.equal(hayCambiosGuion(base), false);
  assert.equal(hayCambiosGuion({ ...base, ceroForm: { nombre: "Título", descripcion: "" } }), true);
  assert.equal(hayCambiosGuion({ ...base, contenidoInicial: "<p>Texto</p>" }), true);
  assert.equal(hayCambiosGuion({ ...base, escenasActivo: true, escenasBorrador: [{ texto: "otra escena" }] }), true);
});

test("nueva versión detecta cambios de metadatos y edición compara con el original", () => {
  assert.equal(hayCambiosGuion({ ...base, vista: "crear-version" }), false);
  assert.equal(hayCambiosGuion({ ...base, vista: "crear-version", versionForm: { estado: "Aprobado" } }), true);
  assert.equal(hayCambiosGuion({ ...base, vista: "lector", editandoContenido: true }), false);
  assert.equal(hayCambiosGuion({ ...base, vista: "lector", editandoContenido: true, contenidoEditado: "<p><b>Texto</b></p>" }), true);
});

test("metadatos de escena aplicados o todavía en el diálogo se consideran pendientes", () => {
  assert.equal(hayCambiosGuion({ ...base, cambiosEscenaPendientes: [{}] }), true);
  assert.equal(hayCambiosGuion({ ...base, dialogoEscena: true, formEscena: { ciudad: "Cali" } }), true);
  assert.equal(hayCambiosGuion({ ...base, dialogoEscena: true }), false);
});
