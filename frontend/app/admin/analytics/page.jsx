"use client";

export const dynamic = "force-dynamic";

import { useAdmin } from "../../../lib/admin-hook";
import { getApiBase } from "../../../lib/chat-client";
import { EmptyState, SectionTitle, Skeleton, StatCard } from "../../../components/ui";
import { IconActivity, IconChart, IconMessage, IconThumbsDown, IconThumbsUp } from "../../../lib/icons";

const base = getApiBase();

function Bar({ value, max, tone }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--panel-3)]">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${pct}%`, background: tone || "linear-gradient(90deg, var(--accent-strong), var(--accent-soft))" }}
      />
    </div>
  );
}

export default function Analytics() {
  const { summary, loading } = useAdmin(base, "");
  const maxQ = Math.max(1, ...(summary?.topQuestions || []).map((t) => t.count));
  const helpful = summary?.feedback?.helpful || 0;
  const notHelpful = summary?.feedback?.notHelpful || 0;
  const totalFb = helpful + notHelpful;

  return (
    <div className="space-y-6">
      <SectionTitle title="Analytics" sub="Signal from the official knowledge base assistant." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<IconMessage className="h-5 w-5" />} label="Questions" value={summary?.total ?? "…"} hint="all time" />
        <StatCard icon={<IconThumbsUp className="h-5 w-5" />} label="Helpful" value={helpful} hint={totalFb ? `${Math.round((helpful / totalFb) * 100)}% of feedback` : "awaiting feedback"} />
        <StatCard icon={<IconThumbsDown className="h-5 w-5" />} label="Not helpful" value={notHelpful} hint={totalFb ? `${Math.round((notHelpful / totalFb) * 100)}% of feedback` : "awaiting feedback"} />
        <StatCard icon={<IconActivity className="h-5 w-5" />} label="Recent fallbacks" value={summary?.recentFallbacks?.length ?? 0} hint="nearest logged" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Feedback balance</h3>
            <IconChart className="h-4 w-4 text-[var(--ink-3)]" />
          </div>
          {loading && !summary ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
          ) : totalFb ? (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-[var(--ink)]">Helpful</span>
                  <span className="text-[var(--ink-2)]">{helpful}</span>
                </div>
                <Bar value={helpful} max={totalFb} />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-[var(--ink)]">Not helpful</span>
                  <span className="text-[var(--ink-2)]">{notHelpful}</span>
                </div>
                <Bar value={notHelpful} max={totalFb} tone="linear-gradient(90deg, var(--danger), color-mix(in srgb, var(--danger) 60%, transparent))" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-3)]">No feedback recorded yet.</p>
          )}
        </section>

        <section className="card p-5">
          <h3 className="mb-4 text-sm font-bold tracking-tight text-[var(--ink)]">Recent fallbacks</h3>
          {loading && !summary ? (
            <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
          ) : summary?.recentFallbacks?.length ? (
            <ul className="space-y-2">
              {summary.recentFallbacks.slice(-8).map((f, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                  <span className="text-[var(--ink-3)]">“</span>
                  <span className="truncate text-[var(--ink-2)]">{f.q}</span>
                  <span className="text-[var(--ink-3)]">”</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<IconActivity className="h-5 w-5" />} title="No fallbacks" sub="Every question is being answered from the knowledge base. Nice." />
          )}
        </section>
      </div>

      <section className="card p-5">
        <h3 className="mb-4 text-sm font-bold tracking-tight text-[var(--ink)]">Top questions</h3>
        {loading && !summary ? (
          <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : summary?.topQuestions?.length ? (
          <ul className="space-y-3">
            {summary.topQuestions.slice(0, 10).map((t, i) => (
              <li key={i} className="grid grid-cols-[1.5rem_1fr_2.5rem] items-center gap-3">
                <span className="text-xs font-semibold text-[var(--ink-3)]">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="mb-1 truncate text-sm text-[var(--ink)]">{t.q}</p>
                  <Bar value={t.count} max={maxQ} />
                </div>
                <span className="text-right text-sm font-semibold text-[var(--ink-2)]">{t.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<IconChart className="h-5 w-5" />} title="No questions yet" sub="Top questions will appear once visitors start asking." />
        )}
      </section>
    </div>
  );
}