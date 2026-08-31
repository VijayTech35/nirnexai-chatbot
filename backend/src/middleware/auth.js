import { config } from "../config.js";
import {
  cookieValue,
  isValidSession,
  SESSION_COOKIE
} from "../utils/session.js";

/**
 * Shared admin auth middleware.
 * Accepts session cookie (primary) or legacy x-admin-token header (fallback).
 */
export function auth(req, res, next) {
  const cookieTok = cookieValue(req.headers.cookie, SESSION_COOKIE);
  const headerTok = req.headers["x-admin-token"];
  const ok =
    (cookieTok && isValidSession(cookieTok)) ||
    (headerTok && headerTok === config.adminToken);
  if (config.mock || ok) return next();
  return res.status(401).json({ error: "unauthorized: sign in first" });
}
