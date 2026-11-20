import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { getActiveRole } from "../api.js";

test("las notas permiten escribir solo al administrador del proyecto activo", async () => {
  const anterior = globalThis.localStorage;
  const datos = new Map([
    ["projectId", "proyecto-1"],
    ["project_role_project_id", "proyecto-1"],
    ["id_rol", "1001"],
  ]);
  globalThis.localStorage = { getItem: (clave) => datos.get(clave) ?? null };
  const servidor = await createServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
    configFile: false,
    envFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: "custom",
    logLevel: "silent",
  });

  await test("miembros y administradores conservan lectura y errores de notas", async () => {
    const hooksSimulados = {
      name: "notas-hooks-de-prueba",
      enforce: "pre",
      resolveId(id) {
        if (id === "virtual:notas-hooks") return "\0notas-hooks";
      },
      load(id) {
        if (id === "\0notas-hooks") {
          return `
            export { useRef } from "react";
            export function useEffect() {}
            export function useState() {
              return [globalThis.__notasTestStates.shift(), () => {}];
            }
          `;
        }
      },
      transform(code, id) {
        if (id.replaceAll("\\", "/").endsWith("/src/screen/Guion.jsx")) {
          return code.replace(
            'import { useEffect, useRef, useState } from "react";',
            'import { useEffect, useRef, useState } from "virtual:notas-hooks";',
          );
        }
      },
    };
    const servidor = await createServer({
      root: fileURLToPath(new URL("../../", import.meta.url)),
      configFile: false,
      envFile: false,
      plugins: [hooksSimulados, react()],
      server: { middlewareMode: true, hmr: false },
      optimizeDeps: { noDiscovery: true, include: [] },
      logLevel: "silent",
    });
    try {
      const { NotasVersion } = await servidor.ssrLoadModule("/src/screen/Guion.jsx");
      const renderizar = (esAdmin, error = "") => {
        globalThis.__notasTestStates = [
          error ? [] : [{ id_nota: 1, contenido: "Nota de prueba", id_user: 12 }],
          "", false, false, error, Boolean(error), "", 0,
        ];
        return renderToStaticMarkup(React.createElement(NotasVersion, {
          version: { id_guion_version: 12, numero_de_version: 2 },
          projectId: "prueba", esAdmin,
        }));
      };
      for (const esAdmin of [false, true]) {
        assert.match(renderizar(esAdmin), /Nota de prueba/);
        const error = renderizar(esAdmin, "Error de prueba");
        assert.match(error, /Error de prueba/);
        assert.match(error, /Volver a cargar notas/);
      }
    } finally {
      delete globalThis.__notasTestStates;
      await servidor.close();
    }
  });

  try {
    const { NotasVersion } = await servidor.ssrLoadModule("/src/screen/Guion.jsx");
    const renderizar = () => renderToStaticMarkup(React.createElement(NotasVersion, {
      version: { id_guion_version: 12, numero_de_version: 2 },
      projectId: "proyecto-1",
      esAdmin: getActiveRole() === 1001,
    }));

    datos.set("project_role", "1005");
    const usuario = renderizar();
    assert.match(usuario, /Notas de la versión 2/);
    assert.match(usuario, /Cargando notas/);
    assert.doesNotMatch(usuario, /Agregar nota a esta versión|<textarea|Guardar nota|<form/);

    datos.set("project_role", "1001");
    const admin = renderizar();
    assert.match(admin, /Notas de la versión 2/);
    assert.match(admin, /Agregar nota a esta versión/);
    assert.match(admin, /<textarea/);
    assert.match(admin, /Guardar nota/);
    assert.match(admin, /disabled/);

    datos.set("project_role", "0");
    assert.doesNotMatch(renderizar(), /<form|<textarea|Guardar nota/);
  } finally {
    await servidor.close();
    if (anterior === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = anterior;
  }
});
