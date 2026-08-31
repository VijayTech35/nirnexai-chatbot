import crypto from "crypto";

/**
 * Tiny in-memory session store for the admin console. Sessions are bound to a
 * random token set as an HttpOnly cookie. NOT for multi-instance scale-out —
 * move to Redis for that.
 */
const sessions = new Map(); // token -> { createdAt, expiresAt }
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const MAX_SESSIONS = 200;

// opportunistic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [tok, s] of sessions) {
    if (s.expiresAt < now) sessions.delete(tok);
  }
  if (sessions.size > MAX_SESSIONS) {
    const latest = [...sessions.entries()].sort((a, b) => b[1].createdAt - a[1].createdAt).slice(0, MAX_SESSIONS);
    sessions.clear();
    for (const [tok, s] of latest) sessions.set(tok, s);
  }
}, 60_000).unref?.();

/** Create a session, return its token. */
export function createSession() {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

/** Validate a token. Returns true and refreshes expiry if valid. */
export function isValidSession(token) {
  if (!token) return false;
  const s = sessions.get(token);
  if (!s) return false;
  if (s.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  s.expiresAt = Date.now() + SESSION_TTL_MS;
  return true;
}

/** Destroy a session (logout). */
export function destroySession(token) {
  if (token) sessions.delete(token);
}

/** Extract a cookie value from a Cookie header. */
export function cookieValue(header, name) {
  if (!header) return null;
  const re = new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`);
  const m = header.match(re);
  return m ? decodeURIComponent(m[1]) : null;
}

export const SESSION_COOKIE = "nirnex_admin";
