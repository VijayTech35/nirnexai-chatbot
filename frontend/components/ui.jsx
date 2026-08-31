"use client";

import { motion } from "framer-motion";

export const Toggle = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className="switch"
    data-on={String(!!checked)}
  >
    <span className="switch-knob" />
  </button>
);

export const Badge = ({ kind = "gray", children }) => (
  <span className={`badge badge-${kind}`}>{children}</span>
);

export const Skeleton = ({ className = "" }) => <div className={`skeleton ${className}`} />;

export const StatCard = ({ icon, label, value, hint, trend, tone }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.21, 1.02, 0.73, 1] }}
    className="stat-card"
  >
    <div className="flex items-start justify-between gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-veil)] text-[var(--accent)]">
        {icon}
      </span>
      {trend != null && (
        <span className={`text-xs font-semibold ${trend >= 0 ? "stat-delta-up" : "stat-delta-down"}`}>
          {trend >= 0 ? "+" : ""}
          {trend}%
        </span>
      )}
    </div>
    <p className="mt-4 text-[13px] font-medium text-[var(--ink-2)]">{label}</p>
    <p className="mt-0.5 text-2xl font-bold tracking-tight text-[var(--ink)]">{value}</p>
    {hint && <p className="mt-1 truncate text-xs text-[var(--ink-3)]">{hint}</p>}
  </motion.div>
);

export const SectionTitle = ({ title, sub, right }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">{title}</h2>
      {sub && <p className="mt-1 text-sm text-[var(--ink-2)]">{sub}</p>}
    </div>
    {right}
  </div>
);

export const EmptyState = ({ icon, title, sub, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] px-6 py-14 text-center">
    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-veil)] text-[var(--accent)]">
      {icon}
    </span>
    <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
    {sub && <p className="mt-1 max-w-sm text-[13px] text-[var(--ink-2)]">{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);