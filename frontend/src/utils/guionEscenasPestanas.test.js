import test from "node:test";
import assert from "node:assert/strict";
import { sincronizarEscenasDocumento } from "./guionEscenas.js";

function servidorSimulado(filas = []) {
  const lotes = [];
  return {
    filas,
    lotes,
    cargarPersistidas: async () => filas,
    enviarAcciones: async (acciones) => {
      lotes.push(acciones);
      acciones.forEach(({ payload }) => filas.push({ id_escena: `esc${filas.length + 1}`, ...payload }));
    },
  };
}

test("una pestaña sin encabezado se guarda con todo su texto en un solo lote", async () => {
  const servidor = servidorSimulado();
  const resultado = await sincronizarEscenasDocumento({
    escenasDocumento: [],
    pestanasSinEncabezados: [{ numero: 1, texto: "Primera línea\nOtra línea" }],
    ...servidor,
  });
  assert.equal(resultado.cantidad, 1);
  assert.deepEqual(servidor.lotes, [[{
    tipo: "crear",
    payload: { numero_de_escena: "1", encabezado: "Primera línea", descripcion: "Primera línea\nOtra línea" },
  }]]);
});

test("varias pestañas sin encabezado incluyen incluso las vacías y no duplican tras un reintento", async () => {
  const servidor = servidorSimulado();
  const opciones = {
    escenasDocumento: [],
    pestanasSinEncabezados: [
      { numero: 1, texto: "Una acción\nDiálogo" },
      { numero: 2, texto: "" },
      { numero: 3, texto: "Otra acción" },
    ],
    ...servidor,
  };
  await assert.rejects(sincronizarEscenasDocumento({
    ...opciones,
    enviarAcciones: async (acciones) => {
      await servidor.enviarAcciones(acciones);
      throw new Error("Respuesta perdida");
    },
  }), /Respuesta perdida/);
  const resultado = await sincronizarEscenasDocumento(opciones);
  assert.equal(resultado.cantidad, 0);
  assert.equal(servidor.lotes.length, 1);
  assert.deepEqual(servidor.filas.map(({ numero_de_escena, encabezado, descripcion }) => (
    { numero_de_escena, encabezado, descripcion }
  )), [
    { numero_de_escena: "1", encabezado: "Una acción", descripcion: "Una acción\nDiálogo" },
    { numero_de_escena: "2", encabezado: "ESCENA 2", descripcion: "" },
    { numero_de_escena: "3", encabezado: "Otra acción", descripcion: "Otra acción" },
  ]);
});

test("fallo antes de persistir permite reintentar el mismo lote completo", async () => {
  const servidor = servidorSimulado();
  const opciones = {
    escenasDocumento: [],
    pestanasSinEncabezados: [{ numero: 1, texto: "A" }, { numero: 2, texto: "B" }],
    ...servidor,
  };
  await assert.rejects(sincronizarEscenasDocumento({
    ...opciones,
    enviarAcciones: async () => { throw new Error("Sin conexión"); },
  }), /Sin conexión/);
  assert.equal(servidor.filas.length, 0);
  assert.equal((await sincronizarEscenasDocumento(opciones)).cantidad, 2);
  assert.equal(servidor.lotes.length, 1);
});

test("una ficha diferente con el mismo número detiene el lote sin modificar ninguna", async () => {
  const original = { id_escena: "existente", numero_de_escena: "2", encabezado: "Otra", descripcion: "No tocar" };
  const servidor = servidorSimulado([original]);
  await assert.rejects(sincronizarEscenasDocumento({
    escenasDocumento: [],
    pestanasSinEncabezados: [{ numero: 1, texto: "A" }, { numero: 2, texto: "B" }],
    ...servidor,
  }), /ficha distinta/);
  assert.deepEqual(servidor.lotes, []);
  assert.deepEqual(servidor.filas, [original]);
});

test("con encabezados se usa únicamente el plan normal, sin crear fichas por pestaña", async () => {
  const servidor = servidorSimulado();
  const opciones = {
    escenasDocumento: [
      { numero: 1, encabezado: "INT. CASA - DÍA", descripcion: "Acción" },
      { numero: 2, encabezado: "EXT. CALLE - NOCHE", descripcion: "Diálogo" },
    ],
    pestanasSinEncabezados: [{ numero: 1, texto: "No debe utilizarse" }],
    ...servidor,
  };
  assert.equal((await sincronizarEscenasDocumento(opciones)).cantidad, 2);
  assert.equal((await sincronizarEscenasDocumento(opciones)).cantidad, 0);
  assert.equal(servidor.lotes.length, 1);
  assert.deepEqual(servidor.filas.map((fila) => fila.encabezado), ["INT. CASA - DÍA", "EXT. CALLE - NOCHE"]);
});

test("sin pestañas ni encabezados se conservan las fichas anteriores", async () => {
  const servidor = servidorSimulado([{ id_escena: "existente", numero_de_escena: "1", encabezado: "Anterior" }]);
  const resultado = await sincronizarEscenasDocumento({ escenasDocumento: [], ...servidor });
  assert.equal(resultado.cantidad, 0);
  assert.match(resultado.advertencias[0], /se conservaron 1/);
  assert.deepEqual(servidor.lotes, []);
});
