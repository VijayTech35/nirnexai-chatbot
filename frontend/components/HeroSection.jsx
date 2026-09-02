"use client";

import { motion } from "framer-motion";
import {
  IconCalendar,
  IconChevronRight,
  IconGlobe,
  IconMessage,
  IconSparkles
} from "../lib/icons";
import { useSettings } from "../lib/settings";

const ease = [0.21, 1.02, 0.73, 1];

export default function HeroSection({ onStart, onBookDemo }) {
  const { settings } = useSettings();
  return (
    <section className="relative overflow-hidden px-1 pb-6 pt-16 sm:pt-20">
      <div className="aurora" aria-hidden>
        <div
          className="aurora-blob"
          style={{
            top: "-180px",
            left: "12%",
            background: "radial-gradient(circle at center, color-mix(in srgb, var(--accent) 45%, transparent), transparent 70%)",
            animation: "auroraA 14s ease-in-out infinite"
          }}
        />
        <div
          className="aurora-blob"
          style={{
            top: "-60px",
            right: "6%",
            background: "radial-gradient(circle at center, color-mix(in srgb, #6366f1 32%, transparent), transparent 70%)",
            animation: "auroraB 18s ease-in-out infinite"
          }}
        />
      </div>
      <div className="hera-grid absolute inset-0 -z-0" aria-hidden />

      <div className="relative z-10 mx-auto max-w-3xl pt-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)]/60 px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-soft)] backdrop-blur"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-veil)]">
            <IconSparkles size={11} />
          </span>
          Official platform assistant · Uses your knowledge base
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.06 }}
          className="text-[clamp(2rem,5.6vw,3.5rem)] font-extrabold leading-[1.08] tracking-tight text-[var(--ink)]"
        >
          {settings.heroHeading}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.12 }}
          className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--ink-2)] sm:text-base"
        >
          {settings.heroSub}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.18 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <button onClick={onStart} className="btn-primary">
            Start Chat
            <IconMessage size={16} />
          </button>
          <button onClick={onBookDemo} className="btn-ghost">
            <IconCalendar size={16} />
            Book Demo
          </button>
          <a
            href="https://nirnexai.com"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost group"
          >
            View Website
            <IconChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32, duration: 0.5 }}
          className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--ink-3)]"
        >
          <IconGlobe size={12} />
          Grounded in official docs · sources cited on every answer
        </motion.p>
      </div>
    </section>
  );
}