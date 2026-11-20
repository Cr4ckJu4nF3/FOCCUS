import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

test("solo el administrador ve controles de fotos en el historial", async () => {
  // Simula los estados posteriores a la carga sin consultar la API ni la BD.
  const hooksSimulados = {
    name: "galeria-hooks-de-prueba",
    enforce: "pre",
    resolveId(id) {
      if (id === "virtual:galeria-hooks") return "\0galeria-hooks";
    },
    load(id) {
      if (id === "\0galeria-hooks") {
        return `
          export { useCallback, useMemo, useRef } from "react";
          export function useEffect() {}
          export function useState() {
            return [globalThis.__galeriaTestStates.shift(), () => {}];
          }
        `;
      }
    },
    transform(code, id) {
      if (id.replaceAll("\\", "/").endsWith("/src/screen/Galeria.jsx")) {
        return code.replace(
          'import { useCallback, useEffect, useMemo, useRef, useState } from "react";',
          'import { useCallback, useEffect, useMemo, useRef, useState } from "virtual:galeria-hooks";',
        );
      }
    },
  };
  const vite = await createServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
    configFile: false,
    envFile: false,
    plugins: [hooksSimulados, react()],
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "silent",
  });
  try {
    const { GalleryDetails } = await vite.ssrLoadModule("/src/screen/Galeria.jsx");
    const versiones = [
      { id_version: 1, numero_version: 1, detalles_uso: "Primera toma", foto_pendiente: true },
      { id_version: 2, numero_version: 2, detalles_uso: "Segunda toma", archivo_path: "prueba.jpg" },
    ];
    const renderizar = (isAdmin, error = "") => {
      globalThis.__galeriaTestStates = [versiones, false, error, "", null, {}];
      return renderToStaticMarkup(createElement(GalleryDetails, {
        item: { id_galeria: 1, id_project: "prueba", nombre: "Ficha", tipo: "objeto", estado: "Disponible" },
        characters: [], locations: [], scripts: [], scenes: [],
        isAdmin, onClose: () => {}, onItemUpdate: () => {},
      }));
    };

    const miembro = renderizar(false);
    assert.match(miembro, /Primera toma/);
    assert.match(miembro, /Segunda toma/);
    assert.match(miembro, /Imagen pendiente de subir/);
    assert.match(miembro, /Imagen de la versión 2/);
    assert.doesNotMatch(miembro, /type="file"|type="checkbox"|Subir imagen|Cambiar imagen|Actualizar también la imagen principal/);

    const admin = renderizar(true);
    assert.match(admin, /Subir imagen/);
    assert.match(admin, /Cambiar imagen/);
    assert.match(admin, /Actualizar también la imagen principal/);
    assert.equal((admin.match(/type="file"/g) || []).length, 2);

    assert.match(renderizar(false, "Error de prueba"), /Error de prueba/);
    assert.match(renderizar(true, "Error de prueba"), /Error de prueba/);
  } finally {
    delete globalThis.__galeriaTestStates;
    await vite.close();
  }
});
