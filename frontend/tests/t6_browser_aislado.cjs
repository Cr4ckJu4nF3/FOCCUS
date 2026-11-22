// Ejecutar contra dist ya construido; no inicia Vite ni lee archivos .env.
const { chromium } = require(process.env.PW_MODULE);
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

async function main() {
  const root = path.resolve(process.env.FRONT_DIST);
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg" };
  let browser;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let file = path.resolve(root, decodeURIComponent(url.pathname).replace(/^\/+/, ""));
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Content-Security-Policy": "default-src 'self' data:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'none'",
    });
    fs.createReadStream(file).pipe(res);
  });
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH,
      headless: true,
      args: ["--disable-background-networking", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"],
    });
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", route => {
      if (route.request().url().startsWith(base + "/")) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.locator("button.cta-outline").click();
    await page.waitForURL("**/login");
    assert(await page.locator('input[type="email"]').first().isVisible());
    console.log("PASS inicio -> login; formulario visible");
    await page.goto(base + "/guion");
    await page.waitForURL(base + "/");
    assert(await page.locator("button.cta-outline").isVisible());
    console.log("PASS guion sin sesión -> inicio");
    console.log("Recorridos: 2; fallidos: 0");
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
