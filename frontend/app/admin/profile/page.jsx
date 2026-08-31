"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearAdminToken, readAdminToken, saveAdminToken } from "../../../lib/admin-hook";
import { getApiBase } from "../../../lib/chat-client";
import { useToast } from "../../../lib/toast";
import { SectionTitle } from "../../../components/ui";
import { Badge } from "../../../components/ui";
import { IconLock, IconLogout, IconUser } from "../../../lib/icons";

const base = getApiBase();

export default function AdminProfile() {
  const router = useRouter();
  const toast = useToast();
  const [current] = useState(() => readAdminToken());
  const [next, setNext] = useState("");
  const [remember, setRemember] = useState(true);

  const masked = current.slice(0, 6) + "••••••••" + current.slice(-4);

  const change = (ev) => {
    ev.preventDefault();
    if (!next.trim()) return;
    saveAdminToken(next, remember);
    toast.push("ADMIN_TOKEN updated.", "ok");
    setNext("");
    setTimeout(() => router.refresh(), 300);
  };

  const signOut = () => {
    clearAdminToken();
    toast.push("Signed out — token removed.", "info");
    setTimeout(() => router.refresh(), 300);
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Admin Profile" sub="Credentials and session for the backend admin API." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--panel-3)] text-[var(--ink-2)]">
              <IconUser className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--ink)]">NirnexAI Admin</p>
              <p className="text-xs text-[var(--ink-2)]">Knowledge engine operator</p>
            </div>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--ink-2)]">Backend base</dt>
              <dd className="truncate font-medium text-[var(--ink)]">{base.replace(/^https?:\/\//, "")}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--ink-2)]">Role</dt>
              <dd><Badge kind="green">admin</Badge></dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--ink-2)]">Stored token</dt>
              <dd className="font-mono text-xs text-[var(--ink-2)]">{current ? masked : "none"}</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={change} className="card space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-[var(--ink)]">
            <IconLock className="h-4 w-4 text-[var(--accent)]" /> Update ADMIN_TOKEN
          </h3>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">New token</span>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Paste the new token from backend/.env"
              className="field"
              autoComplete="off"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink-2)]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Remember on this device
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={!next.trim()}>
              Update token
            </button>
            <button type="button" className="btn-ghost" onClick={signOut}>
              <IconLogout className="h-4 w-4" /> Sign out
            </button>
          </div>
        </form>
      </div>

      <p className="rounded-xl border border-dashed px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]" style={{ borderColor: "var(--line)" }}>
        The admin token matches <code className="md-code-inline">ADMIN_TOKEN</code> in <code className="md-code-inline">backend/.env</code> and is required for every /api/admin call. Tip: keep it secret, rotate it after sharing the repo.
      </p>
    </div>
  );
}