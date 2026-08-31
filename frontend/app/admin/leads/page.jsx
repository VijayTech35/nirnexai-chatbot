"use client";

export const dynamic = "force-dynamic";

import { useAdmin } from "../../../lib/admin-hook";
import { getApiBase } from "../../../lib/chat-client";
import { EmptyState, SectionTitle, Skeleton, StatCard } from "../../../components/ui";
import { IconBuilding, IconCalendar } from "../../../lib/icons";

const base = getApiBase();

export default function Leads() {
  const { summary, loading } = useAdmin(base, "");
  const leads = summary?.leads?.items || [];
  const demos = summary?.demos?.items || [];

  return (
    <div className="space-y-6">
      <SectionTitle title="Leads & Demos" sub="Lead captures and demo bookings sent from the chatbot." />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={<IconBuilding className="h-5 w-5" />} label="Leads captured" value={summary?.leads?.total ?? "…"} hint="name + email" />
        <StatCard icon={<IconCalendar className="h-5 w-5" />} label="Demo requests" value={summary?.demos?.total ?? "…"} hint="booked slots" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b px-5 py-3.5" style={{ borderColor: "var(--line)" }}>
            <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Captured leads</h3>
          </div>
          {loading && !leads.length ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : leads.length ? (
            <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
              {leads.map((l, i) => (
                <li key={i} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      {l.firstName} {l.lastName}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--ink-3)]">{l.at ? new Date(l.at).toLocaleString() : ""}</span>
                  </div>
                  <p className="truncate text-xs text-[var(--accent-soft)]">{l.email}</p>
                  {l.page && <p className="truncate text-[11px] text-[var(--ink-3)]">{l.page}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<IconBuilding className="h-5 w-5" />}
              title="No leads yet"
              sub="Lead capture is off until a visitor submits the lead form in the chatbot."
              className="m-5"
            />
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b px-5 py-3.5" style={{ borderColor: "var(--line)" }}>
            <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Demo bookings</h3>
          </div>
          {loading && !demos.length ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : demos.length ? (
            <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
              {demos.map((d, i) => (
                <li key={i} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-[var(--ink)]">{d.name}</span>
                    <span className="shrink-0 text-[11px] text-[var(--ink-3)]">{d.at ? new Date(d.at).toLocaleString() : ""}</span>
                  </div>
                  <p className="truncate text-xs text-[var(--accent-soft)]">{d.email}</p>
                  <p className="truncate text-[11px] text-[var(--ink-3)]">
                    {d.company || "—"} · {d.date || "no date"} {d.time && `· ${d.time}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<IconCalendar className="h-5 w-5" />}
              title="No demo bookings yet"
              sub="When visitors request a demo, the booked slots show up here."
              className="m-5"
            />
          )}
        </section>
      </div>
    </div>
  );
}