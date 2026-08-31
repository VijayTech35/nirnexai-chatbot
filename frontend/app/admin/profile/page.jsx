"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogout, getApiBase } from "../../../lib/chat-client";
import { useToast } from "../../../lib/toast";
import { Badge, SectionTitle } from "../../../components/ui";
import { IconLogout, IconUser } from "../../../lib/icons";

const base = getApiBase();

export default function AdminProfile() {
  const router = useRouter();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await adminLogout(base);
    toast.push("Signed out — session cleared.", "ok");
    setTimeout(() => router.refresh(), 300);
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Admin Profile" sub="Authenticated admin session for the backend." />

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
            <dt className="text-[var(--ink-2)]">Auth</dt>
            <dd><Badge kind="green">session cookie</Badge></dd>
          </div>
        </dl>

        <div>
          <button className="btn-ghost" onClick={signOut} disabled={signingOut}>
            <IconLogout className="h-4 w-4" /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>

      <p className="rounded-xl border border-dashed px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]" style={{ borderColor: "var(--line)" }}>
        Authentication uses a server-side session cookie (HTTP-only, 12h). All admin endpoints are authorized by that cookie.
      </p>
    </div>
  );
}
