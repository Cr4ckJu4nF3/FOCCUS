import test from "node:test";
import assert from "node:assert/strict";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

test("sección plegable conserva el foco y oculta sus controles al cerrarse", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>");
  const anteriores = {
    window: globalThis.window,
    document: globalThis.document,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const vite = await createServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
    configFile: false,
    envFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "silent",
  });
  let root;
  try {
    const { default: SeccionDesplegable } = await vite.ssrLoadModule("/src/componentes/SeccionDesplegable.jsx");
    root = createRoot(document.getElementById("root"));
    await act(async () => root.render(createElement(SeccionDesplegable, { titulo: "ejemplo" },
      createElement("button", null, "Acción secundaria"))));
    const control = document.querySelector(".seccion-desplegable__toggle");
    const panel = document.getElementById(control.getAttribute("aria-controls"));
    assert.equal(control.getAttribute("aria-expanded"), "true");
    assert.equal(panel.hidden, false);
    control.focus();
    await act(async () => control.click());
    assert.equal(control.getAttribute("aria-expanded"), "false");
    assert.equal(panel.hidden, true);
    assert.equal(document.activeElement, control);
    await act(async () => control.click());
    assert.equal(panel.hidden, false);
    assert.equal(control.getAttribute("aria-expanded"), "true");
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    globalThis.window = anteriores.window;
    globalThis.document = anteriores.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = anteriores.act;
  }
});
