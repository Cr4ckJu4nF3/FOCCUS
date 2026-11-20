import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

test("el formulario muestra y filtra escenas usando su identificador real", async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
    configFile: false,
    envFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "silent",
  });
  try {
    const { GalleryModal } = await vite.ssrLoadModule("/src/screen/Galeria.jsx");
    const scenes = [
      { id_escena: "esc0001", id_guion: 10, numero_de_escena: "1", encabezado: "INT. CASA - DÍA" },
      { id_escena: "esc0002", id_guion: 20, numero_de_escena: "2", encabezado: "EXT. PARQUE - NOCHE" },
      { id_escena: "esc0003", id_guion: 10, numero_de_escena: "3", encabezado: "" },
    ];
    const props = {
      characters: [], locations: [], scripts: [], scenes,
      onClose: () => {}, onSave: () => {},
    };
    const render = (item) => renderToStaticMarkup(createElement(GalleryModal, { ...props, item }));
    const nuevo = render(null);
    assert.match(nuevo, /<option value="esc0001">Escena 1 — INT\. CASA - DÍA<\/option>/);
    assert.match(nuevo, /<option value="esc0002">Escena 2 — EXT\. PARQUE - NOCHE<\/option>/);
    assert.match(nuevo, /<option value="esc0003">Escena 3<\/option>/);

    const editado = render({
      tipo: "objeto", descripcion: "", id_guion: "10", id_escena: "esc0001",
    });
    assert.match(editado, /<option value="esc0001" selected="">Escena 1 — INT\. CASA - DÍA<\/option>/);
    assert.match(editado, /<option value="esc0003">Escena 3<\/option>/);
    assert.doesNotMatch(editado, /value="esc0002"/);
    assert.equal(scenes[0].encabezado, "INT. CASA - DÍA");
    assert.equal(scenes[0].id_escena, "esc0001");
  } finally {
    await vite.close();
  }
});
