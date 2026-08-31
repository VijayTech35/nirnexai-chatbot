"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAdmin } from "../../../lib/admin-hook";
import { getApiBase } from "../../../lib/chat-client";
import { Badge, EmptyState, SectionTitle, Skeleton, StatCard } from "../../../components/ui";
import { IconMessage } from "../../../lib/icons";

const base = getApiBase();

export default function Conversations() {
  const { summary, loading } = useAdmin(base, "");
  const items = summary?.conversations?.items || [];
  const [sessions, setSessions] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetch(`${base}/api/admin/conversations`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((j) => setSessions(j.sessions || []))
      .catch(() => setSessions([]));
  }, [base]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Conversations" sub="Recent visitor sessions recorded by the analytics beacon." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<IconMessage className="h-5 w-5" />} label="Total sessions" value={summary?.conversations?.total ?? "…"} hint="session log" />
        <StatCard icon={<IconMessage className="h-5 w-5" />} label="Questions logged" value={summary?.total ?? "…"} hint="all questions" />
        <StatCard icon={<IconMessage className="h-5 w-5" />} label="Fallbacks" value={summary?.recentFallbacks?.length ?? "…"} hint="nearest recent" />
      </div>

      {sessions && sessions.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b px-5 py-3 text-sm font-semibold text-[var(--ink)]" style={{ borderColor: "var(--line)" }}>
            Persisted transcripts <span className="text-[var(--ink-3)]">({sessions.length})</span>
          </div>
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {sessions.map((s) => {
              const firstUser = s.messages?.find((m) => m.role === "user");
              return (
                <li key={s.sessionId} className="px-5 py-4">
                  <button
                    onClick={() => setOpen(open === s.sessionId ? null : s.sessionId)}
                    className="flex w-full flex-wrap items-center gap-2 text-left"
                  >
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      Session {s.sessionId.slice(0, 8)}…
                    </span>
                    <Badge kind="green">{s.messages?.length ?? 0} messages</Badge>
                    <span className="ml-auto shrink-0 text-[11px] text-[var(--ink-3)]">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : ""}
                    </span>
                  </button>
                  <p className="mt-1 truncate text-xs text-[var(--ink-2)]">“{firstUser?.content || "(no user text)"}”</p>
                  {open === s.sessionId && (
                    <div className="mt-3 space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
                      {s.messages?.map((m, i) => (
                        <div key={i} className="text-[13px] leading-relaxed">
                          <span className={m.role === "user" ? "font-semibold text-[var(--accent)]" : "font-semibold text-[var(--ink)]"}>
                            {m.role === "user" ? "User" : "NirnexAI"}:
                          </span>{" "}
                          <span className="text-[var(--ink-2)]">{m.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading && !items.length ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : items.length ? (
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {items.map((c, i) => (
              <li key={i} className="flex flex-wrap items-start gap-3 px-5 py-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-veil)] text-[var(--accent)]">
                  <IconMessage className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      {c.qCount} question{c.qCount === 1 ? "" : "s"}
                    </span>
                    <Badge kind={c.end === "greeting" ? "amber" : "gray"}>{c.end}</Badge>
                    <span className="ml-auto shrink-0 text-[11px] text-[var(--ink-3)]">
                      {c.at ? new Date(c.at).toLocaleString() : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {(c.qs || []).slice(-3).map((q, j) => (
                      <p key={j} className="truncate text-xs text-[var(--ink-2)]">“{q}”</p>
                    ))}
                  </div>
                  {c.page && <p className="mt-1 truncate text-[11px] text-[var(--ink-3)]">{c.page}</p>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<IconMessage className="h-5 w-5" />}
            title="No conversations yet"
            sub="When visitors start chatting, sessions appear here via the analytics beacon."
            className="m-5"
          />
        )}
      </div>
    </div>
  );
}