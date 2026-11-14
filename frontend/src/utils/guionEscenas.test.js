import test from "node:test";
import assert from "node:assert/strict";
import {
  analizarEncabezadoEscena,
  encabezadoDesdeCamposEscena,
  formatearEncabezadoEscena,
  planificarSincronizacionEscenas,
} from "./guionEscenas.js";

test("reconoce y vuelve a formar un encabezado INT/EXT estándar", () => {
  const campos = analizarEncabezadoEscena("INT./EXT. Café Central - Mañana");
  assert.deepEqual(campos, {
    numero_de_escena: "",
    modo_vista: "Int/Ext",
    ubicacion: "Café Central",
    momento_dia: "Mañana",
  });
  assert.equal(formatearEncabezadoEscena(campos), "INT./EXT. CAFÉ CENTRAL - MAÑANA");
});

test("no inventa parámetros cuando el encabezado no tiene el formato esperado", () => {
  assert.equal(analizarEncabezadoEscena("FLASHBACK A CASA"), null);
});

test("al editar, los campos activos se escriben en el encabezado sin perder número ni duplicar al reabrir", () => {
  let form = {
    numero_de_escena: "12",
    encabezado: "INT. CASA - NOCHE",
    modo_vista: "Int",
    momento_dia: "Noche",
    ciudad: "",
  };
  const editados = new Set();

  form = { ...form, ciudad: "Bogotá" };
  editados.add("ciudad");
  form.encabezado = encabezadoDesdeCamposEscena(form, editados);
  assert.equal(form.encabezado, "12 INT. BOGOTÁ - NOCHE");
  assert.deepEqual(analizarEncabezadoEscena(form.encabezado), {
    numero_de_escena: "12",
    modo_vista: "Int",
    ubicacion: "BOGOTÁ",
    momento_dia: "Noche",
  });

  form = { ...form, numero_de_escena: "13", modo_vista: "Ext" };
  editados.add("numero_de_escena");
  editados.add("modo_vista");
  form.encabezado = encabezadoDesdeCamposEscena(form, editados);
  assert.equal(form.encabezado, "13 EXT. BOGOTÁ - NOCHE");

  form = { ...form, momento_dia: "" };
  editados.add("momento_dia");
  form.encabezado = encabezadoDesdeCamposEscena(form, editados);
  assert.equal(form.encabezado, "13 EXT. BOGOTÁ");

  form = { ...form, modo_vista: "" };
  editados.add("modo_vista");
  form.encabezado = encabezadoDesdeCamposEscena(form, editados);
  assert.equal(form.encabezado, "13. BOGOTÁ");

  const reabierto = analizarEncabezadoEscena(form.encabezado);
  const formularioReabierto = {
    ...form,
    ...reabierto,
    encabezado: form.encabezado,
    numero_de_escena: reabierto.numero_de_escena,
    ciudad: reabierto.ubicacion,
  };
  assert.equal(encabezadoDesdeCamposEscena(formularioReabierto), "13. BOGOTÁ");

  formularioReabierto.ciudad = "";
  assert.equal(
    encabezadoDesdeCamposEscena(formularioReabierto, ["ciudad"]),
    "13.",
  );
});

test("la sincronización conserva metadatos existentes y evita borrar filas", () => {
  const filas = [{
    id_escena: "esc0001",
    numero_de_escena: "1",
    encabezado: "INT. SALA - DÍA",
    descripcion: "Antes",
    ciudad: "Bogotá",
    estado: "Finalizada",
  }];
  const plan = planificarSincronizacionEscenas(
    [{ numero: 1, encabezado: "INT. SALA - DÍA", descripcion: "Después" }],
    filas,
  );
  assert.deepEqual(plan.acciones, [{
    tipo: "actualizar",
    id_escena: "esc0001",
    payload: { descripcion: "Después" },
  }]);
  assert.deepEqual(plan.noRelacionadas, []);
  assert.equal(filas[0].ciudad, "Bogotá");
  assert.equal(filas[0].estado, "Finalizada");
});

test("una colisión de número o encabezado es reportada en vez de duplicar o reemplazar", () => {
  const filas = [
    { id_escena: "esc0001", numero_de_escena: "1", encabezado: "INT. SALA - DÍA" },
    { id_escena: "esc0002", numero_de_escena: "2", encabezado: "EXT. PARQUE - NOCHE" },
  ];
  const plan = planificarSincronizacionEscenas(
    [{ numero: 2, encabezado: "INT. CASA - NOCHE", descripcion: "Acción" }],
    filas,
  );
  assert.equal(plan.acciones.length, 0);
  assert.match(plan.errores[0], /número 2 ya corresponde/);
});

test("dos encabezados iguales se relacionan por número, sin confundir sus fichas", () => {
  const filas = [
    { id_escena: "esc0001", numero_de_escena: "1", encabezado: "INT. CASA - DÍA", descripcion: "A" },
    { id_escena: "esc0002", numero_de_escena: "2", encabezado: "INT. CASA - DÍA", descripcion: "B" },
  ];
  const plan = planificarSincronizacionEscenas(
    [
      { numero: 1, encabezado: "INT. CASA - DÍA", descripcion: "A corregida" },
      { numero: 2, encabezado: "INT. CASA - DÍA", descripcion: "B corregida" },
    ],
    filas,
  );
  assert.deepEqual(plan.acciones.map((accion) => accion.id_escena), ["esc0001", "esc0002"]);
  assert.deepEqual(plan.errores, []);
});

test("una sola operación evita numeraciones duplicadas entre escenas nuevas", () => {
  const plan = planificarSincronizacionEscenas(
    [
      { numero: 1, encabezado: "INT. CASA - DÍA", descripcion: "" },
      { numero: 2, encabezado: "EXT. PARQUE - NOCHE", descripcion: "" },
    ],
    [],
    [
      { indice: 0, form: { numero_de_escena: "4", encabezado: "INT. CASA - DÍA" } },
      { indice: 1, form: { numero_de_escena: "4", encabezado: "EXT. PARQUE - NOCHE" } },
    ],
  );
  assert.equal(plan.errores.length, 1);
  assert.match(plan.errores[0], /número 4/);
});
