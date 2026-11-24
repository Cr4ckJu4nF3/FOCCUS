import test from "node:test";
import assert from "node:assert/strict";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

test("el logo vuelve al panel correspondiente conservando el proyecto", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/" });
  const anteriores = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
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
    const { default: ModuleLayout } = await vite.ssrLoadModule("/src/componentes/ModuleLayout.jsx");
    function Panel() {
      const location = useLocation();
      return createElement("output", null, JSON.stringify({ path: location.pathname, state: location.state }));
    }

    localStorage.setItem("projectId", "42");
    localStorage.setItem("projectName", "La última escena");
    localStorage.setItem("project_role_project_id", "42");
    root = createRoot(document.getElementById("root"));
    for (const [role, destination] of [["1001", "/admin-dashboard"], ["1002", "/proyecto-dashboard"]]) {
      localStorage.setItem("project_role", role);
      await act(async () => root.render(createElement(MemoryRouter, { key: role, initialEntries: ["/guion"] },
        createElement(Routes, null,
          createElement(Route, { element: createElement(ModuleLayout) },
            createElement(Route, { path: "/guion", element: createElement("p", null, "Guion") })),
          createElement(Route, { path: destination, element: createElement(Panel) })))));

      const link = document.querySelector(".module-layout__brand-link");
      assert.equal(link.getAttribute("href"), destination);
      assert.match(link.getAttribute("aria-label"), /FOCCUS: volver al .* La última escena/);
      assert.equal(link.querySelector("img").getAttribute("alt"), "");
      assert.equal(document.querySelector(".module-layout__brand > span").textContent, "La última escena");
      await act(async () => link.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })));
      assert.deepEqual(JSON.parse(document.querySelector("output").textContent), {
        path: destination,
        state: { projectName: "La última escena", projectId: "42" },
      });
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close();
    dom.window.close();
    globalThis.window = anteriores.window;
    globalThis.document = anteriores.document;
    globalThis.localStorage = anteriores.localStorage;
    globalThis.IS_REACT_ACT_ENVIRONMENT = anteriores.act;
  }
});
