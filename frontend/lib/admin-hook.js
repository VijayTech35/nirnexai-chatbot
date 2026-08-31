"use client";

import { useCallback, useEffect, useState } from "react";
import { adminReindex, adminStatus, adminSummary } from "./chat-client";

// Legacy token storage keys – retained only to purge any stale token left on
// disk by the pre-cookie-auth builds. Auth is now purely cookie-based.
const TOKEN_SESSION = "nirnex_admin_token_session";
const TOKEN_LOCAL = "nirnex_admin_token";

/** Remove any legacy admin token from storage (safe no-op). */
export function clearAdminToken() {
  try {
    window.sessionStorage.removeItem(TOKEN_SESSION);
    window.localStorage.removeItem(TOKEN_LOCAL);
  } catch {}
}

export function useAdmin(base, _token) {
  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const token = "";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, sm] = await Promise.all([
        adminStatus(base, token),
        adminSummary(base, token)
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
      setBusy(true);
      setError(null);
      try {
        const res = await adminReindex(base, token, { clear, seed: true });
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
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${base}/api/admin/warmup`, {
        method: "POST",
        credentials: "include"
      });
      if (!r.ok) throw new Error(`warmup ${r.status}`);
      return await r.json();
    } catch (err) {
      setError(`Warmup failed: ${err.message}`);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [base]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, summary, loading, error, busy, refresh, reindex, warmup };
}