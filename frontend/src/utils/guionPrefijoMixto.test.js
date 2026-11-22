import test from "node:test";
import assert from "node:assert/strict";
import { analizarEncabezadoEscena, encabezadoDesdeCamposEscena } from "./guionEscenas.js";

test("un encabezado I/E conserva el lugar al abrirse y editarse", () => {
  const encabezado = "I/E. CASA - NOCHE";
  assert.deepEqual(analizarEncabezadoEscena(encabezado), {
    numero_de_escena: "",
    modo_vista: "Int/Ext",
    ubicacion: "CASA",
    momento_dia: "Noche",
  });
  assert.equal(encabezadoDesdeCamposEscena({
    numero_de_escena: "1",
    encabezado,
    modo_vista: "Int/Ext",
    momento_dia: "Noche",
    ciudad: "",
  }), "1 INT./EXT. CASA - NOCHE");
});
