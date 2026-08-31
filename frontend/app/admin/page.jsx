"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { getApiBase } from "../../lib/chat-client";
import { readAdminToken, useAdmin } from "../../lib/admin-hook";
import { useToast } from "../../lib/toast";
import { Badge, SectionTitle, Skeleton, StatCard } from "../../components/ui";
import { AreaChart, BarChart, ChartLegend, makeSeries } from "../../components/charts";
import {
  IconActivity,
  IconBook,
  IconChart,
  IconRefresh,
  IconShield,
  IconSparkles,
  IconWrench
} from "../../lib/icons";

const base = getApiBase();

export default function AdminDashboard() {
  const { status, summary, loading, error, busy, refresh, reindex, warmup } = useAdmin(base, useStoredToken());
  const toast = useToast();
  const [clear, setClear] = useState(false);

  const cards = useMemo(() => {
    if (!status) return null;
    return [
      { icon: IconBook, label: "Documents indexed", value: status.storeSize, hint: `store · ${status.store}` },
      {
        icon: IconChart,
        label: "Questions logged",
        value: summary?.total ?? 0,
        hint: `${summary?.feedback?.helpful ?? 0} helpful · ${summary?.feedback?.notHelpful ?? 0} not helpful`
      },
      { icon: IconSparkles, label: "LLM model", value: status.llm || "—", hint: status.mock ? "mock mode" : "OpenRouter live" },
      { icon: IconShield, label: "Embeddings", value: status.embeddings || "—", hint: "index embedding model" },
      {
        icon: IconActivity,
        label: "Auto-index on boot",
        value: status.autoIndex ? "On" : "Off",
        hint: "content-hash drift refresh"
      },
      {
        icon: IconWrench,
        label: "Firecrawl crawler",
        value: status.firecrawl ? "Enabled" : "Unset",
        hint: status.firecrawl ? "seed + crawl" : "seed only"
      }
    ];
  }, [status, summary]);

  const onReindex = async () => {
    if (busy) return;
    toast.push("Rebuilding vector index…", "info");
    try {
      const res = await reindex({ clear });
      toast.push(`Index rebuilt → ${res?.added ?? "?"} added, ${res?.total ?? status?.storeSize} total.`, "ok");
    } catch {
      toast.push("Reindex failed — check backend logs.", "error");
    }
  };

  const onWarmup = async () => {
    if (busy) return;
    toast.push("Warming indexes…", "info");
    try {
      const res = await warmup();
      toast.push("Warmup complete.", "ok");
    } catch {
      toast.push("Warmup failed — check backend logs.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Overview"
        sub="Live state of the NirnexAI knowledge engine and its console signals."
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

      {cards ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <StatCard key={c.label} icon={<c.icon className="h-5 w-5" />} label={c.label} value={c.value} hint={c.hint} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="stat-card space-y-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Usage over time</h3>
              <p className="mt-0.5 text-xs text-[var(--ink-2)]">Daily chats, questions & leads from the analytics beacon</p>
            </div>
            <Badge kind="green">live</Badge>
          </div>
          {summary?.series?.length ? (
            <>
              <AreaChart
                data={summary.series}
                xLabel="date"
                series={makeSeries([
                  { key: "questions", label: "Questions" },
                  { key: "chats", label: "Chats" },
                  { key: "leads", label: "Leads" }
                ])}
              />
              <ChartLegend
                series={[
                  { key: "questions", label: "Questions", color: "#10B981" },
                  { key: "chats", label: "Chats", color: "#6366F1" },
                  { key: "leads", label: "Leads", color: "#F59E0B" }
                ]}
              />
            </>
          ) : (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Top questions</h3>
            <p className="mt-0.5 text-xs text-[var(--ink-2)]">Most-asked questions across all sessions</p>
          </div>
          {summary?.topQuestions?.length ? (
            <BarChart items={summary.topQuestions.slice(0, 8)} />
          ) : (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Index health</h3>
              <p className="mt-0.5 text-xs text-[var(--ink-2)]">Vector store integrity at a glance</p>
            </div>
            {status ? (
              <Badge kind="green">healthy</Badge>
            ) : (
              <Skeleton className="h-5 w-16 rounded-full" />
            )}
          </div>
          {status ? (
            <ul className="space-y-2.5 text-sm">
              <Row k="Vector store" v={status.store} />
              <Row k="Embedding model" v={status.embeddings} />
              <Row k="LLM" v={status.llm || "—"} />
              <Row k="Mock mode" v={String(status.mock)} />
              <Row k="Auto-index (hash drift)" v={status.autoIndex ? "enabled" : "disabled"} />
              <Row k="Crawler" v={status.firecrawl ? "firecrawl configured" : "not configured"} />
            </ul>
          ) : (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Maintenance</h3>
            <p className="mt-0.5 text-xs text-[var(--ink-2)]">Re-seed the vector index or warm query caches</p>
          </div>

          <label className="mb-4 flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3" style={{ borderColor: "var(--line)" }}>
            <span className="text-sm text-[var(--ink-2)]">Clear existing index first</span>
            <input
              type="checkbox"
              checked={clear}
              onChange={(e) => setClear(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={onReindex} disabled={busy}>
              {busy ? (
                <>
                  <IconRefresh className="h-4 w-4 animate-spin" /> Rebuilding…
                </>
              ) : (
                "Rebuild index (seed + crawl)"
              )}
            </button>
            <button className="btn-ghost" onClick={onWarmup} disabled={busy}>
              Warm caches
            </button>
          </div>

          <p className="mt-4 rounded-xl border border-dashed px-3.5 py-3 text-xs leading-relaxed text-[var(--ink-2)]" style={{ borderColor: "var(--line)" }}>
            Reindexing can take a few minutes: it embeds every seeded document via {status?.embeddings || "the embedding model"} and persists the store to <code className="md-code-inline">backend/data/vectors.json</code>. Drift refresh on boot re-embeds only documents whose content hash changed.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b pb-2 text-sm" style={{ borderColor: "var(--line)" }}>
      <span className="text-[var(--ink-2)]">{k}</span>
      <span className="truncate font-medium text-[var(--ink)]">{v}</span>
    </li>
  );
}

function useStoredToken() {
  const [token] = useState(() =>
    typeof window === "undefined" ? "" : readAdminToken()
  );
  return token;
}