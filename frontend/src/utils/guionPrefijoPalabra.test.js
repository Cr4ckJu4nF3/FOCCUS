import test from "node:test";
import assert from "node:assert/strict";
import { analizarEncabezadoEscena, encabezadoDesdeCamposEscena } from "./guionEscenas.js";

test("no confunde el comienzo del nombre de un lugar con INT o EXT", () => {
  for (const lugar of ["INTERNADO", "EXTERIOR DEL TEATRO"]) {
    const encabezado = `${lugar} - DÍA`;
    assert.deepEqual(analizarEncabezadoEscena(encabezado), {
      numero_de_escena: "",
      modo_vista: "",
      ubicacion: lugar,
      momento_dia: "Día",
    });

    assert.equal(encabezadoDesdeCamposEscena({
      numero_de_escena: "1",
      encabezado,
      modo_vista: "",
      momento_dia: "Día",
      ciudad: "",
    }), `1. ${lugar} - DÍA`);
  }
});

test("sigue reconociendo abreviaturas de escena con y sin punto", () => {
  for (const [encabezado, modo] of [
    ["INT. CASA - DÍA", "Int"],
    ["INT.CASA - DÍA", "Int"],
    ["EXT PARQUE - DÍA", "Ext"],
    ["INT./EXT. CASA - DÍA", "Int/Ext"],
    ["EXT/INT CASA - DÍA", "Ext/Int"],
  ]) {
    assert.equal(analizarEncabezadoEscena(encabezado).modo_vista, modo);
  }
});
