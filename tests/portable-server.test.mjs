import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPortableServer, resolveRequestFile } from "../scripts/serve-portable.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "arcane-portable-"));
  writeFileSync(join(root, "index.html"), "<!doctype html><title>Arcane</title>");
  writeFileSync(join(root, "app.js"), "export default true;");
  return root;
}

test("portable request resolution supports SPA routes and blocks traversal", () => {
  const root = fixture();
  try {
    assert.equal(resolveRequestFile(root, "/characters/active"), join(root, "index.html"));
    assert.equal(resolveRequestFile(root, "/app.js"), join(root, "app.js"));
    assert.equal(resolveRequestFile(root, "/%2e%2e/package.json"), null);
    assert.equal(resolveRequestFile(root, "/missing.png"), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("portable server exposes health, cache policy, security headers, and HEAD", async () => {
  const root = fixture();
  const server = createPortableServer(root);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.deepEqual(await health.json(), { status: "ok" });
    const page = await fetch(`http://127.0.0.1:${port}/character/demo`, { method: "HEAD" });
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("cache-control"), "no-cache");
    assert.match(page.headers.get("content-security-policy"), /api\.open5e\.com/);
    const asset = await fetch(`http://127.0.0.1:${port}/app.js`);
    assert.equal(asset.headers.get("x-content-type-options"), "nosniff");
    assert.match(asset.headers.get("content-type"), /text\/javascript/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});

test("desktop packaging bundles the production client and creates one-step shortcuts", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const desktopMain = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");

  assert.equal(packageJson.main, "desktop/main.mjs");
  assert.equal(packageJson.build.productName, "Arcane Observatory");
  assert.equal(packageJson.build.nsis.createDesktopShortcut, true);
  assert.equal(packageJson.build.nsis.createStartMenuShortcut, true);
  assert.ok(packageJson.build.files.includes("dist/client/**/*"));
  assert.match(desktopMain, /nodeIntegration:\s*false/);
  assert.match(desktopMain, /contextIsolation:\s*true/);
  assert.match(desktopMain, /sandbox:\s*true/);
  assert.match(desktopMain, /127\.0\.0\.1/);
  assert.match(desktopMain, /--smoke-test/);
});
