import test from "node:test";
import assert from "node:assert/strict";
import { nombreProvisionalGuion } from "./nombreGuion.js";
import { hayCambiosGuion } from "./guionBorrador.js";

test("el nombre provisional evita colisiones evidentes entre guiones cargados", () => {
  assert.equal(nombreProvisionalGuion([]), "Guion01");
  assert.equal(nombreProvisionalGuion([{ nombre: " guion01 " }, { nombre: "GUION02" }]), "Guion03");
  assert.equal(nombreProvisionalGuion([{ nombre: "Guion02" }]), "Guion01");
});

test("el nombre provisional por sí solo no activa la confirmación de salida", () => {
  const borrador = {
    vista: "crear-cero", contenidoInicial: "", escenasActivo: false, escenasBorrador: [],
    ceroForm: { nombre: "Guion01", descripcion: "" }, nombreInicialCero: "Guion01",
    cambiosEscenaPendientes: [], dialogoEscena: false,
  };
  assert.equal(hayCambiosGuion(borrador), false);
  assert.equal(hayCambiosGuion({ ...borrador, ceroForm: { nombre: "Otro", descripcion: "" } }), true);
  assert.equal(hayCambiosGuion({ ...borrador, ceroForm: { nombre: "Guion01", descripcion: "Nota" } }), true);
});
