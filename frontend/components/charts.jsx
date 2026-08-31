"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight dependency-free SVG charts tuned to the app's design tokens.
 * No charting library required.
 */

const PALETTE = ["#10B981", "#6366F1", "#F59E0B", "#EC4899", "#06B6D4"];

function useAccent() {
  const [accent, setAccent] = useState("#10B981");
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    if (v) setAccent(v);
  }, []);
  return accent;
}

/** Series descriptor helper for legends. */
export function makeSeries(defs) {
  return defs.map((d, i) => ({ key: d.key, label: d.label, color: PALETTE[i % PALETTE.length] }));
}

/** Filled area/line chart of one or more series over discrete x points. */
export function AreaChart({ data = [], series, height = 240, xLabel }) {
  const W = 600;
  const H = height;
  const PAD = { l: 46, r: 16, t: 16, b: 30 };
  const accent = useAccent();

  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const values = series.flatMap((s) => data.map((d) => d[s.key] || 0));
  let max = Math.max(1, ...values);
  max = Math.ceil(max / 10) * 10;

  const nx = data.length || 1;
  const x = (i) => PAD.l + (chartW * i) / Math.max(1, nx - 1);
  const y = (v) => PAD.t + chartH * (1 - v / max);

  const grid = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.max(1, Math.floor(nx / 7));

  const lineFor = (key) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[key] || 0)}`).join(" ");
  const areaFor = (col) =>
    data.length
      ? `${data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[col] || 0)}`).join(" ")} L${x(data.length - 1)},${PAD.t + chartH} L${x(0)},${PAD.t + chartH} Z`
      : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Usage over time">
      {grid.map((g, i) => (
        <g key={`g${i}`}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(max * g)} y2={y(max * g)} stroke="var(--line)" strokeWidth="1" strokeDasharray={i > 0 ? "4 4" : undefined} />
          <text x={PAD.l - 8} y={y(max * g) + 3} textAnchor="end" fontSize="10" fill="var(--ink-3)">
            {Math.round(max * g)}
          </text>
        </g>
      ))}

      {series.map((s) => {
        const col = s.key === series[0].key ? accent : s.color;
        return (
          <g key={s.key}>
            <path d={areaFor(s.key)} fill={col} opacity="0.12" stroke="none" />
            <path d={lineFor(s.key)} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}

      {data.map((d, i) => (
        (i === data.length - 1 || i % step === 0) && (
          <text key={`l${i}`} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--ink-3)">
            {d[xLabel]}
          </text>
        )
      ))}

      {(series.length === 1) && data.map((d, i) => (
        <circle key={`c${i}`} cx={x(i)} cy={y(d[series[0].key] || 0)} r="3" fill={accent} stroke="var(--panel)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/** Horizontal bar chart for ranked values (e.g. top questions). */
export function BarChart({ items = [], height = 260, valueKey = "count", labelKey = "q" }) {
  const max = Math.max(1, ...items.map((i) => i[valueKey] || 0));
  const accent = useAccent();
  const rowH = 30;
  const H = Math.max(height, items.length * rowH + 16);

  return (
    <svg viewBox={`0 0 520 ${H}`} className="w-full" role="img" aria-label="Ranked items">
      {items.map((it, i) => {
        const w = ((it[valueKey] || 0) / max) * 430;
        const label = String(it[labelKey] ?? "").slice(0, 36);
        return (
          <g key={i} transform={`translate(0,${i * rowH})`}>
            <text x={0} y={14} fontSize="11.5" fill="var(--ink-2)">{label}</text>
            <rect x={0} y={19} width={Math.max(2, w)} height="9" rx="4.5" fill={accent} opacity="0.85" />
            <text x={Math.min(w + 6, 500)} y={27} fontSize="10.5" fill="var(--ink-3)">{it[valueKey]}</text>
          </g>
        );
      })}
      {!items.length && (
        <text x={260} y={60} textAnchor="middle" fontSize="12" fill="var(--ink-3)">No data yet</text>
      )}
    </svg>
  );
}

/** Small legend row for multi-series charts. */
export function ChartLegend({ series }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-2)]">
          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
