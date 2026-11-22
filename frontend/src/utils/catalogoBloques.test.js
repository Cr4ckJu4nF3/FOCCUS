import test from "node:test";
import assert from "node:assert/strict";
import { crearColaCatalogo, TIPOS_CATALOGO } from "./catalogoBloques.js";

const esperar = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const extraer = (texto) => texto ? [{ tipo: "accion", html: texto }] : [];

test("tipos del catálogo no incluyen escena ni personaje", () => {
  assert.deepEqual(TIPOS_CATALOGO, ["accion", "dialogo", "parentesis", "transicion"]);
});

test("debounce guarda solo el snapshot final y evita duplicados confirmados", async () => {
  const enviados = [];
  const cola = crearColaCatalogo({ extraer, enviar: async (b) => enviados.push(b), notificar: () => {}, demora: 15 });
  cola.programar("H");
  cola.programar("Ho");
  cola.programar("Hola");
  await esperar(35);
  cola.capturar("Hola");
  await esperar();
  assert.deepEqual(enviados, [{ tipo: "accion", html: "Hola" }]);
  assert.equal(cola.estado().pendientes, 0);
});

test("captura el original antes de una ráfaga destructiva y el resultado al terminar", async () => {
  const enviados = [];
  const cola = crearColaCatalogo({ extraer, enviar: async (b) => enviados.push(b.html), notificar: () => {}, demora: 15 });
  cola.antesDeRetirar("Original");
  cola.programar("Origina");
  cola.antesDeRetirar("Origina");
  cola.programar("Origin");
  await esperar(35);
  assert.deepEqual(enviados, ["Original", "Origin"]);
});

test("una inserción seguida de borrado captura ambas versiones previas sin enviar cada tecla", async () => {
  const enviados = [];
  const cola = crearColaCatalogo({ extraer, enviar: async (b) => enviados.push(b.html), notificar: () => {}, demora: 15 });
  cola.antesDeEditar("Original");
  cola.programar("Original nuevo");
  cola.antesDeRetirar("Original nuevo");
  cola.programar("Original nuev");
  cola.antesDeRetirar("Original nuev");
  cola.programar("Original nue");
  await esperar(35);
  assert.deepEqual(enviados, ["Original", "Original nuevo", "Original nue"]);
});

test("blur fuerza snapshot sin esperar debounce", async () => {
  const enviados = [];
  const cola = crearColaCatalogo({ extraer, enviar: async (b) => enviados.push(b.html), notificar: () => {}, demora: 1000 });
  cola.programar("Borrador");
  cola.vaciar();
  await esperar();
  assert.deepEqual(enviados, ["Borrador"]);
});

test("error conserva bloques no confirmados y reintentar no repite los confirmados", async () => {
  const enviados = [];
  let falla = true;
  const cola = crearColaCatalogo({
    extraer: (html) => html.split("|").map((texto) => ({ tipo: "dialogo", html: texto })),
    enviar: async (b) => {
      enviados.push(b.html);
      if (b.html === "dos" && falla) throw new Error("Sin conexión");
    },
    notificar: () => {},
  });
  cola.capturar("uno|dos");
  await esperar();
  assert.equal(cola.estado().error, "Sin conexión");
  assert.equal(cola.estado().pendientes, 1);
  falla = false;
  cola.reintentar();
  await esperar();
  assert.deepEqual(enviados, ["uno", "dos", "dos"]);
  assert.equal(cola.estado().pendientes, 0);
});

test("las colas de proyectos no comparten deduplicación", async () => {
  const enviados = [];
  const crear = (proyecto) => crearColaCatalogo({ extraer, enviar: async (b) => enviados.push([proyecto, b.html]), notificar: () => {} });
  crear("1").capturar("texto");
  crear("2").capturar("texto");
  await esperar();
  assert.deepEqual(enviados, [["1", "texto"], ["2", "texto"]]);
});
