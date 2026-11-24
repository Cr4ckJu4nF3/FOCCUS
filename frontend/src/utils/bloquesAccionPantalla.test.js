import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

test("pantalla de acciones muestra carga, vacío, error, búsqueda y aísla el proyecto", async () => {
  const anterior = globalThis.localStorage;
  globalThis.localStorage = { getItem: (clave) => ({ projectId: "p1", projectName: "Proyecto uno" })[clave] || null };
  const hooks = {
    name: "acciones-hooks-de-prueba",
    enforce: "pre",
    resolveId: (id) => id === "virtual:acciones-hooks" ? "\0acciones-hooks" : undefined,
    load: (id) => id === "\0acciones-hooks" ? `
      export function useEffect() {}
      export function useState() { return [globalThis.__accionesTestStates.shift(), () => {}]; }
    ` : undefined,
    transform(code, id) {
      if (id.replaceAll("\\", "/").endsWith("/src/screen/BloquesAccion.jsx")) {
        return code.replace('from "react";', 'from "virtual:acciones-hooks";');
      }
    },
  };
  const vite = await createServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
    configFile: false,
    envFile: false,
    plugins: [hooks, react()],
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "silent",
  });
  try {
    const { default: Pantalla } = await vite.ssrLoadModule("/src/screen/BloquesAccion.jsx");
    const renderizar = (resultado, busqueda = "") => {
      globalThis.__accionesTestStates = ["p1", resultado, busqueda, 0];
      return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Pantalla)));
    };
    const ok = (acciones = [], invalidos = 0) => ({ projectId: "p1", acciones, invalidos, error: "" });
    const accion = { id_catalogo_bloque: 1, texto: "Una puerta", html: '<p class="gb gb-accion">Una <strong>puerta</strong></p>' };
    assert.match(renderizar(null), /Cargando bloques de acción/);
    assert.match(renderizar(ok()), /Aún no hay bloques de acción/);
    assert.match(renderizar({ ...ok(), error: "Sin conexión" }), /Sin conexión[\s\S]*Reintentar/);
    assert.match(renderizar(ok([accion]), "puerta"), /<strong>puerta<\/strong>/);
    assert.match(renderizar(ok([accion]), "ventana"), /No hay acciones para esta búsqueda/);
    assert.match(renderizar(ok([], 1)), /no se pudieron mostrar/);
    const anteriorProyecto = renderizar({ ...ok([accion]), projectId: "p2" });
    assert.match(anteriorProyecto, /Cargando bloques de acción/);
    assert.doesNotMatch(anteriorProyecto, /Una puerta/);
    assert.match(renderizar(ok([accion])), /Catálogo de bloques[\s\S]*Ir a guiones/);
  } finally {
    delete globalThis.__accionesTestStates;
    if (anterior === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = anterior;
    await vite.close();
  }
});
