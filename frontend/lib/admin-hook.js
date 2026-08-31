"use client";

import { useCallback, useEffect, useState } from "react";
import { adminReindex, adminStatus, adminSummary } from "./chat-client";

export const TOKEN_SESSION = "nirnex_admin_token_session";
export const TOKEN_LOCAL = "nirnex_admin_token";

export function readAdminToken() {
  if (typeof window === "undefined") return "";
  return (
    window.sessionStorage.getItem(TOKEN_SESSION) ||
    window.localStorage.getItem(TOKEN_LOCAL) ||
    ""
  );
}

export function saveAdminToken(token, remember) {
  try {
    window.sessionStorage.setItem(TOKEN_SESSION, token.trim());
    if (remember) window.localStorage.setItem(TOKEN_LOCAL, token.trim());
    else window.localStorage.removeItem(TOKEN_LOCAL);
  } catch {}
}

export function clearAdminToken() {
  try {
    window.sessionStorage.removeItem(TOKEN_SESSION);
    window.localStorage.removeItem(TOKEN_LOCAL);
  } catch {}
}

export function useAdmin(base, token) {
  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [st, sm] = await Promise.all([
        adminStatus(base, token.trim()),
        adminSummary(base, token.trim())
      ]);
      setStatus(st);
      setSummary(sm);
    } catch (err) {
      setError(`Failed to load admin data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [base, token]);

  const reindex = useCallback(
    async ({ clear = false } = {}) => {
      if (!token.trim()) return;
      setBusy(true);
      setError(null);
      try {
        const res = await adminReindex(base, token.trim(), { clear, seed: true });
        await refresh();
        return res;
      } catch (err) {
        setError(`Reindex failed: ${err.message}`);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [base, token, refresh]
  );

  const warmup = useCallback(async () => {
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${base}/api/admin/warmup`, {
        method: "POST",
        headers: { "x-admin-token": token.trim() }
      });
      if (!r.ok) throw new Error(`warmup ${r.status}`);
      return await r.json();
    } catch (err) {
      setError(`Warmup failed: ${err.message}`);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [base, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, summary, loading, error, busy, refresh, reindex, warmup };
}