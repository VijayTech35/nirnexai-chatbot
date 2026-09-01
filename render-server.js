/**
 * Render single-service supervisor.
 *
 * Runs the whole NirnexAI stack as ONE Render web service behind a single
 * origin so the admin session cookie (SameSite=Strict) works:
 *
 *   1. The Express backend on an internal port (default 4000).
 *   2. The Next.js standalone server on the public PORT (set by Render).
 *
 * Next's rewrites() routes /api/* and /health to the backend via
 * INTERNAL_API_URL, so the browser only ever talks to this one origin.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;

const PUBLIC_PORT = parseInt(process.env.PORT || "3000", 10);

// The Next.js rewrites() proxy is baked at BUILD time (default
// http://127.0.0.1:4000), so the backend MUST run on this exact loopback
// port at runtime. Keep in sync with frontend/next.config.mjs.
const INTERNAL_PORT = parseInt(process.env.INTERNAL_API_PORT || "4000", 10);

// --- backend ---
// In production the backend requires an explicit (non-*) CORS_ORIGIN. In this
// single-origin setup the browser never calls the backend cross-origin (Next
// proxies /api server-side), so we satisfy the check with the app's own public
// URL when available; direct cross-origin hits stay workspace-scoped off by
// default. On Render, RENDER_EXTERNAL_URL is the deployed app URL.
const backendCors =
  process.env.CORS_ORIGIN ||
  process.env.RENDER_EXTERNAL_URL ||
  (process.env.NODE_ENV === "production" ? "http://localhost" : undefined);
const backend = spawn(process.execPath, ["src/index.js"], {
  cwd: path.join(root, "backend"),
  env: {
    ...process.env,
    PORT: String(INTERNAL_PORT),
    ...(backendCors ? { CORS_ORIGIN: backendCors } : {}),
    // The frontend proxies client traffic to us server-side, so no CORS
    // origin is needed; allow any here only matters if hit directly.
    NODE_ENV: process.env.NODE_ENV
  },
  stdio: ["ignore", "pipe", "pipe"]
});

backend.stdout.on("data", (d) => console.log(`[backend] ${d.toString().trimEnd()}`));
backend.stderr.on("data", (d) => console.error(`[backend:err] ${d.toString().trimEnd()}`));

// --- frontend (Next standalone) ---
const standaloneDir = path.join(root, "frontend", ".next", "standalone");
const frontend = spawn(process.execPath, ["server.js"], {
  cwd: standaloneDir,
  env: {
    ...process.env,
    PORT: String(PUBLIC_PORT),
    HOSTNAME: "0.0.0.0",
    INTERNAL_API_URL: `http://127.0.0.1:${INTERNAL_PORT}`,
    NODE_ENV: process.env.NODE_ENV
  },
  stdio: ["ignore", "pipe", "pipe"]
});

frontend.stdout.on("data", (d) => console.log(`[frontend] ${d.toString().trimEnd()}`));
frontend.stderr.on("data", (d) => console.error(`[frontend:err] ${d.toString().trimEnd()}`));

backend.on("exit", (code, sig) => {
  console.error(`[backend] exited code=${code} signal=${sig}`);
  shutdown(code ?? 1);
});
frontend.on("exit", (code, sig) => {
  console.error(`[frontend] exited code=${code} signal=${sig}`);
  shutdown(code ?? 1);
});

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of [backend, frontend]) {
    if (child.exitCode == null) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

console.log(`[render-server] starting backend :${INTERNAL_PORT} and frontend :${PUBLIC_PORT}`);
