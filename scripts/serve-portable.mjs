import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2",
};

export function resolveRequestFile(rootDirectory, requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname); }
  catch { return null; }
  if (pathname.includes("\0")) return null;
  const root = resolve(rootDirectory);
  const relative = normalize(pathname.replace(/^[/\\]+/, ""));
  const candidate = resolve(join(root, relative));
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  if (!extname(pathname)) return join(root, "index.html");
  return null;
}

export function createPortableServer(rootDirectory) {
  const root = resolve(rootDirectory);
  return createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      return response.end();
    }
    if (request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      return response.end(JSON.stringify({ status: "ok" }));
    }
    const file = resolveRequestFile(root, request.url || "/");
    if (!file || !existsSync(file)) { response.writeHead(404); return response.end("Not found"); }
    const extension = extname(file).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.open5e.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    });
    if (request.method === "HEAD") return response.end();
    createReadStream(file).pipe(response);
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = resolve(process.argv[2] || "dist/client");
  if (!existsSync(join(root, "index.html"))) {
    console.error("Production files are missing. Run `npm run build` first.");
    process.exit(1);
  }
  const port = Number(process.env.ARCANE_PORT || 4173);
  createPortableServer(root).listen(port, "127.0.0.1", () => {
    console.log(`Arcane Observatory is ready at http://127.0.0.1:${port}/`);
    console.log("Press Ctrl+C to stop.");
  }).on("error", (error) => {
    console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use.` : error.message);
    process.exit(1);
  });
}
