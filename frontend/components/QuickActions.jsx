"use client";

import { motion } from "framer-motion";
import {
  IconBook,
  IconCalendar,
  IconCode,
  IconLayers,
  IconPhone,
  IconPlug,
  IconShield,
  IconTag
} from "../lib/icons";

const actions = [
  {
    key: "pricing",
    icon: <IconTag size={19} />,
    title: "Pricing",
    desc: "Plans from Free to Enterprise",
    q: "What are the pricing plans?"
  },
  {
    key: "modules",
    icon: <IconLayers size={19} />,
    title: "Platform Modules",
    desc: "Chat, forecasting, dashboards",
    q: "What are the core platform modules?"
  },
  {
    key: "integrations",
    icon: <IconPlug size={19} />,
    title: "Integrations",
    desc: "Meet, Zoom, Teams & data",
    q: "Which meeting platforms does NirnexAI integrate with?"
  },
  {
    key: "docs",
    icon: <IconBook size={19} />,
    title: "Documentation",
    desc: "Guides, APIs and reference",
    q: "What documentation is available for NirnexAI?"
  },
  {
    key: "security",
    icon: <IconShield size={19} />,
    title: "Security",
    desc: "Encryption, residency, trust",
    q: "Is my data secure with NirnexAI?"
  },
  {
    key: "demo",
    icon: <IconCalendar size={19} />,
    title: "Book Demo",
    desc: "See the platform live",
    kind: "demo"
  },
  {
    key: "sales",
    icon: <IconPhone size={19} />,
    title: "Contact Sales",
    desc: "Talk to our team",
    kind: "lead"
  },
  {
    key: "api",
    icon: <IconCode size={19} />,
    title: "API Reference",
    desc: "Build on NirnexAI",
    q: "Does NirnexAI expose an API for developers?"
  }
];

export default function QuickActions({ onAsk, onDemo, onLead }) {
  return (
    <section className="mt-8">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)]"
      >
        Explore NirnexAI
      </motion.p>
      <div className="no-scrollbar touch-scroll mx-auto flex max-w-4xl snap-x snap-mandatory gap-3.5 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-4 lg:gap-3.5 lg:overflow-visible lg:px-0 lg:pb-0">
        {actions.map((a, i) => (
          <motion.button
            key={a.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.21, 1.02, 0.73, 1], delay: 0.2 + i * 0.04 }}
            className="sugg-card group min-w-[220px] snap-start lg:min-w-0"
            onClick={() => {
              if (a.kind === "demo") onDemo?.();
              else if (a.kind === "lead") onLead?.();
              else onAsk?.(a.q);
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="sugg-icon">{a.icon}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">{a.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-3)]">{a.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}