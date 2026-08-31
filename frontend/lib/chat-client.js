/**
 * Streaming chat client for the NirnexAI backend.
 * Works in both browser (whatwg fetch) and Node (undici).
 *
 * The backend responds with Server-Sent Events lines:
 *   event: meta | delta | citations | done | error
 *   data: { ...json... }
 */

export function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
}

/**
 * Parse an SSE buffer incrementally. Returns { events, rest } where events is
 * an array of { event, data } and rest is the unprocessed remainder.
 */
export function parseSSE(buf) {
  const events = [];
  let rest = buf;
  // one blank line separates event blocks
  let idx;
  while ((idx = rest.indexOf("\n\n")) !== -1) {
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    const lines = block.split("\n");
    const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim() || "message";
    const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim() ?? "";
    let data;
    try {
      data = JSON.parse(dataLine);
    } catch {
      data = dataLine;
    }
    events.push({ event, data });
  }
  return { events, rest };
}

/**
 * POST /api/chat and stream SSE events. Calls handlers as they arrive.
 * Resolves with { text, citations, meta } on completion.
 */
export async function streamChat({
  messages,
  sessionId,
  base = getApiBase(),
  onDelta = () => {},
  onMeta = () => {},
  onCitations = () => {},
  signal
}) {
  let reader;
  try {
    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, sessionId }),
      signal
    });

    if (!res.ok) {
      let errText = "";
      try {
        const j = await res.json();
        errText = j.error || j.message || "";
      } catch {}
      throw new Error(errText || `Backend responded with ${res.status}`);
    }
    if (!res.body) throw new Error("Backend returned no body stream");

    reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let citations = [];
    let meta = null;

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSSE(buffer);
        buffer = rest;
        for (const ev of events) {
          if (ev.event === "meta" && ev.data) {
            meta = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
            onMeta(meta);
          } else if (ev.event === "delta") {
            const d = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
            if (d && d.text) {
              text += d.text;
              onDelta(d.text, text);
            }
          } else if (ev.event === "citations") {
            citations = (typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data)?.citations || [];
            onCitations(citations);
          } else if (ev.event === "error") {
            throw new Error(
              (typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data)?.message || "Backend error"
            );
          } else if (ev.event === "done") {
            return { text, citations, meta };
          }
        }
      }
      return { text, citations, meta };
    };
    return await pump();
  } finally {
    if (reader) try { reader.releaseLock?.(); } catch {}
  }
}

/** Fire-and-forget analytics beacon. */
export function beacon(base, ev) {
  try {
    fetch(`${base}/api/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ev)
    }).catch(() => {});
  } catch {}
}

/**
 * Normalize an error into a { friendly, detail, kind } object so the UI can
 * show a helpful message instead of a raw backend/OpenRouter payload.
 * kind: "credits" | "timeout" | "abort" | "backend" | "unknown"
 */
export function normalizeError(err) {
  const msg = (err && err.message) || String(err || "");
  const low = msg.toLowerCase();
  if (err?.name === "AbortError" || low.includes("aborted") || low.includes("timed out")) {
    return { kind: "timeout", friendly: "That answer took too long to generate. Please try again.", detail: msg };
  }
  if (low.includes("402") || low.includes("credit") || low.includes("max_tokens") || low.includes("upgrade to a paid")) {
    return { kind: "credits", friendly: "I'm currently out of AI processing credits. Please try again shortly.", detail: msg };
  }
  if (low.includes("503") || low.includes("not configured") || low.includes("llm not configured") || low.includes("failed to fetch") || low.includes("network") || low.includes("backend")) {
    return { kind: "backend", friendly: "I can't reach the AI service right now. Please try again in a moment.", detail: msg };
  }
  return { kind: "unknown", friendly: "Sorry, something went wrong generating that answer. Please try again.", detail: msg };
}

/** Admin helpers. */
/**
 * Auth helper for admin requests: sends the session cookie via credentials.
 * (Token param retained only to avoid touching every call site; auth is
 * cookie-based, so no x-admin-token header is sent.)
 */
async function adminFetch(base, path, { method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  const r = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include"
  });
  return r;
}

export async function adminStatus(base, _token) {
  const r = await adminFetch(base, "/api/admin/status");
  if (!r.ok) throw new Error(`status ${r.status}`);
  return r.json();
}

export async function adminReindex(base, _token, { clear = false, seed = true } = {}) {
  const r = await adminFetch(base, "/api/admin/reindex", { method: "POST", body: { clear, seed } });
  if (!r.ok) throw new Error(`reindex ${r.status}`);
  return r.json();
}

export async function adminSummary(base, _token) {
  const r = await adminFetch(base, "/api/analytics/summary");
  if (!r.ok) throw new Error(`summary ${r.status}`);
  return r.json();
}

/** GET /api/admin/docs — uploaded documents. */
export async function adminDocs(base, _token) {
  const r = await adminFetch(base, "/api/admin/docs");
  if (!r.ok) throw new Error(`docs ${r.status}`);
  return r.json();
}

/** POST /api/admin/upload — ingest a file into the knowledge base. */
export async function adminUpload(base, _token, { filename, content }) {
  const r = await adminFetch(base, "/api/admin/upload", { method: "POST", body: { filename, content } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `upload ${r.status}`);
  return j;
}

/** DELETE /api/admin/docs/:id — remove an uploaded document. */
export async function adminDeleteDoc(base, _token, id) {
  const r = await adminFetch(base, `/api/admin/docs/${encodeURIComponent(id)}`, { method: "DELETE" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `delete ${r.status}`);
  return j;
}

/** POST /api/admin/login — username/password → session cookie. */
export async function adminLogin(base, { username, password }) {
  const r = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include"
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `login ${r.status}`);
  return j;
}

/** POST /api/admin/logout — clears the session cookie. */
export async function adminLogout(base) {
  await fetch(`${base}/api/admin/logout`, { method: "POST", credentials: "include" }).catch(() => {});
}

/** GET /api/admin/session — is the cookie session still valid? */
export async function adminSession(base) {
  const r = await fetch(`${base}/api/admin/session`, { credentials: "include" });
  if (!r.ok) throw new Error(`session ${r.status}`);
  return r.json();
}