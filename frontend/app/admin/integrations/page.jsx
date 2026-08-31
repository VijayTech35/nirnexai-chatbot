"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "../../../lib/admin-hook";
import { getApiBase } from "../../../lib/chat-client";
import { useToast } from "../../../lib/toast";
import { SectionTitle, Toggle } from "../../../components/ui";
import { IconLink, IconLock, IconMail, IconPlug, IconWrench } from "../../../lib/icons";

const base = getApiBase();
const KEY = "nirnex_integrations";

const INTEGRATIONS = [
  { id: "analytics", label: "Google Analytics", sub: "Beacon pageviews and lead events to GA4 via gtag.", Icon: IconLink, env: "NEXT_PUBLIC_GA_ID" },
  { id: "oa", label: "OpenRouter · OpenAI", sub: "Live LLM traffic for answers and embeddings.", Icon: IconLock, env: "OPENROUTER_API_KEY" },
  { id: "firecrawl", label: "Firecrawl crawler", sub: "Crawl seed URLs into the knowledge base.", Icon: IconWrench, env: "FIRECRAWL_API_KEY" },
  { id: "webhook", label: "Webhook notify", sub: "POST new leads and demos to your endpoint.", Icon: IconMail, env: "NIRNEX_WEBHOOK_URL" },
  { id: "slack", label: "Slack alerts", sub: "Notify a channel when the index needs attention.", Icon: IconPlug, env: "NIRNEX_SLACK_WEBHOOK" }
];

function readToggles() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export default function Integrations() {
  const { status } = useAdmin(base, "");
  const toast = useToast();
  const [on, setOn] = useState(null);

  useEffect(() => {
    if (!on) setOn(readToggles());
  }, [on]);

  const toggle = (id) => (v) => {
    const next = { ...(on || {}), [id]: v };
    setOn(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    toast.push(v ? `${labelOf(id)} enabled.` : `${labelOf(id)} disabled.`, v ? "ok" : "info");
  };

  const labelOf = (id) => INTEGRATIONS.find((i) => i.id === id)?.label || id;

  const backendSet = (id) => {
    if (id === "oa") return !!status?.llm;
    if (id === "firecrawl") return !!status?.firecrawl;
    return null;
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Integrations" sub="Adapters for analytics, LLM providers, crawling, and notifications. Toggles persist to this browser; provider keys live in backend/.env." />

      <div className="space-y-3">
        {INTEGRATIONS.map((it) => {
          const active = on?.[it.id];
          const backend = backendSet(it.id);
          const effective = backend == null ? active : backend;
          return (
            <div key={it.id} className="card flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-veil)] text-[var(--accent)]">
                <it.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--ink)]">{it.label}</p>
                <p className="text-xs text-[var(--ink-2)]">{it.sub}</p>
                <code className="mt-1 inline-block rounded bg-[var(--panel-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-3)]">{it.env}</code>
              </div>
              {backend != null && (
                <span className={`badge ${backend ? "badge-green" : "badge-gray"}`}>{backend ? "live on backend" : "not configured"}</span>
              )}
              <Toggle checked={!!effective} onChange={toggle(it.id)} label={it.label} disabled={backend != null} />
            </div>
          );
        })}
      </div>

      <p className="rounded-xl border border-dashed px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]" style={{ borderColor: "var(--line)" }}>
        Provider-backed rows reflect the running backend (greyed out). Demo toggles (analytics, webhook, slack) are stored per browser so the console can react without changing backend APIs.
      </p>
    </div>
  );
}