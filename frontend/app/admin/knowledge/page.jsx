"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { readAdminToken, useAdmin } from "../../../lib/admin-hook";
import { getApiBase } from "../../../lib/chat-client";
import { useToast } from "../../../lib/toast";
import { Badge, EmptyState, SectionTitle, StatCard } from "../../../components/ui";
import { IconBook, IconDatabase, IconRefresh, IconSearch, IconShield } from "../../../lib/icons";

const base = getApiBase();

export default function KnowledgeBase() {
  const token = useState(() => readAdminToken())[0];
  const { status, loading, busy, error, refresh, reindex } = useAdmin(base, token);
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [clear, setClear] = useState(false);

  const onReindex = async () => {
    toast.push("Rebuilding index…", "info");
    try {
      const res = await reindex({ clear });
      toast.push(`Index rebuilt → ${res?.total ?? "?"} documents.`, "ok");
    } catch {
      toast.push("Reindex failed — check backend logs.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Knowledge Base"
        sub="Documents embedded into the vector store that ground every answer."
        right={
          <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => refresh()} disabled={loading}>
            <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<IconBook className="h-5 w-5" />} label="Documents" value={status?.storeSize ?? "…"} hint="embedded + persisted" />
        <StatCard icon={<IconDatabase className="h-5 w-5" />} label="Vector store" value={status?.store ?? "…"} hint="store backend" />
        <StatCard icon={<IconShield className="h-5 w-5" />} label="Embedding model" value={status?.embeddings ?? "…"} hint={status?.autoIndex ? "hash-drift refresh on" : "refresh disabled"} />
      </div>

      <div className="card p-5">
        <label className="relative block">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the knowledge base…"
            className="field !pl-10"
          />
        </label>

        <div id="kb-doc-list" className="mt-5">
          {query.trim() ? (
            <EmptyState
              icon={<IconBook className="h-5 w-5" />}
              title="No document matches in this view"
              sub="The catalog editor lives on the backend. Documents are curated via the seed sources and Firecrawl, then embedded here automatically."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-veil)] text-[var(--accent)]">
                    <IconBook className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Official knowledge base seed</p>
                    <p className="text-xs text-[var(--ink-2)]">Seed URLs + crawled pages → embedded chunks</p>
                  </div>
                </div>
                <Badge kind="green">{status?.storeSize ?? "…"} docs</Badge>
              </div>

              <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)" }}>
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-[var(--panel-2)] text-xs uppercase tracking-wider text-[var(--ink-3)]" style={{ borderColor: "var(--line)" }}>
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Layer</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Content hashing</td>
                      <td className="px-4 py-3"><Badge kind="green">sha1 on boot</Badge></td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">Only changed documents are re-embedded</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Persistence</td>
                      <td className="px-4 py-3"><Badge kind="green">atomic</Badge></td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">vectors.json with .tmp + rename, crash recovery</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Embeddings</td>
                      <td className="px-4 py-3"><Badge kind={status?.llm ? "green" : "amber"}>{status?.llm ? "configured" : "pending"}</Badge></td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">{status?.embeddings}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Crawler</td>
                      <td className="px-4 py-3">
                        <Badge kind={status?.firecrawl ? "green" : "gray"}>{status?.firecrawl ? "enabled" : "not configured"}</Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">seed-only mode when Firecrawl is unset</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Maintain</h3>
        <p className="mt-0.5 text-xs text-[var(--ink-2)]">Reseed and re-embed the whole knowledge base.</p>
        <label className="mt-4 mb-3 flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3" style={{ borderColor: "var(--line)" }}>
          <span className="text-sm text-[var(--ink-2)]">Clear existing index first</span>
          <input
            type="checkbox"
            checked={clear}
            onChange={(e) => setClear(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>
        <button className="btn-primary" onClick={onReindex} disabled={busy}>
          {busy ? <><IconRefresh className="h-4 w-4 animate-spin" /> Rebuilding…</> : "Rebuild index (seed + crawl)"}
        </button>
      </div>
    </div>
  );
}