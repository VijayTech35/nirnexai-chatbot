"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  IconCalendar,
  IconChevronRight,
  IconMessage,
  IconSparkles
} from "../lib/icons";
import { useSettings } from "../lib/settings";

const ease = [0.21, 1.02, 0.73, 1];

const PROMPTS = [
  "What do pricing plans look like?",
  "Can NirnexAI forecast sales?",
  "How fast is onboarding?",
  "Does it connect to my CRM?",
  "Book me a product demo"
];

function RotatingPrompt({ onAsk }) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      setTyped(PROMPTS[0]);
      return;
    }
    const cur = PROMPTS[i];
    let t;
    if (!del) {
      if (typed.length < cur.length) {
        t = setTimeout(() => setTyped(cur.slice(0, typed.length + 1)), 38);
      } else {
        t = setTimeout(() => setDel(true), 2100);
      }
    } else if (typed.length > 0) {
      t = setTimeout(() => setTyped(typed.slice(0, -1)), 14);
    } else {
      setDel(false);
      setI((n) => (n + 1) % PROMPTS.length);
    }
    return () => clearTimeout(t);
  }, [typed, del, i]);

  return (
    <motion.button
      type="button"
      onClick={() => onAsk?.()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.24, duration: 0.5 }}
      className="group mx-auto mt-5 flex items-baseline justify-center gap-2 text-[15px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink-2)]"
      aria-label="Try an example question"
    >
      <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)] sm:inline">
        Try asking
      </span>
      <span className="text-[var(--ink-2)] transition-colors group-hover:text-[var(--accent)]">{typed}</span>
      <span className="stream-cursor" aria-hidden />
    </motion.button>
  );
}

function ChainRow({ health }) {
  const dot =
    health === "offline" ? "live-dot offline" : health === "checking" ? "live-dot checking" : "live-dot";
  const label = health === "offline" ? "Reconnecting" : health === "checking" ? "Connecting" : "Live";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.36, duration: 0.5 }}
      className="mt-7 flex flex-wrap items-center justify-center gap-2"
    >
      <span className="chain-pill">
        <IconSparkles size={12} className="text-[var(--accent)]" />
        Multi-model engine
      </span>
      <span className="chain-arrow" aria-hidden>→</span>
      <span className="chain-pill">Gemini</span>
      <span className="chain-arrow" aria-hidden>→</span>
      <span className="chain-pill">Groq</span>
      <span className="chain-arrow" aria-hidden>→</span>
      <span className="chain-pill">OpenRouter</span>
      <span className="chain-pill">
        <span className={dot} aria-hidden />
        {label}
      </span>
      <span className="hidden w-full justify-center text-[11px] text-[var(--ink-3)] sm:flex">
        Grounded in official docs · sources cited on every answer
      </span>
    </motion.div>
  );
}

export default function HeroSection({ onStart, onBookDemo, onAsk, health }) {
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

        <RotatingPrompt onAsk={onAsk} />

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

        <ChainRow health={health} />
      </div>
    </section>
  );
}