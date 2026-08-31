"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  IconBot,
  IconCog,
  IconGlobe,
  IconMenu,
  IconMessage,
  IconMoon,
  IconPlus,
  IconSun,
  IconX
} from "../lib/icons";
import { useSettings } from "../lib/settings";

const healthMeta = {
  live: { dot: "bg-[var(--accent)]", text: "Online" },
  mock: { dot: "bg-[var(--warn)]", text: "Mock mode" },
  offline: { dot: "bg-[var(--danger)]", text: "Offline" },
  checking: { dot: "bg-[var(--ink-3)]", text: "Connecting…" }
};

export default function AppHeader({ health, theme, onToggleTheme, onNewChat, onClose }) {
  const { settings } = useSettings();
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const meta = healthMeta[health] || healthMeta.checking;

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line-soft)] glass">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <div className="msg-avatar h-10 w-10 rounded-2xl text-base">
              <IconBot size={20} />
            </div>
            <span
              className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[var(--panel)] ${meta.dot}`}
            />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-[var(--ink)]">
              <span className="truncate">{settings.brandName || "NirnexAI"}</span>
              <span className="hidden text-[var(--ink-3)] sm:inline">·</span>
              <span className="hidden truncate text-sm font-medium text-[var(--ink-2)] sm:inline">
                {settings.assistantName}
              </span>
            </p>
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--ink-2)]">
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${health === "live" ? "" : "animate-pulse"}`} />
              {meta.text}
              <span className="hidden items-center gap-1 text-[var(--ink-3)] md:inline-flex">
                · <IconGlobe size={11} /> Powered by Official Knowledge Base
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="btn-ghost shrink-0 !px-3.5 !py-2 text-[13px]"
            aria-label="Start a new chat"
          >
            <IconPlus size={15} />
            <span className="hidden sm:inline">New chat</span>
          </button>
          <a
            href="https://nirnexai.com"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost hidden shrink-0 !px-3.5 !py-2 text-[13px] md:inline-flex"
            aria-label="Open nirnexai.com"
          >
            <IconGlobe size={15} />
            Website
          </a>
          <button
            onClick={onToggleTheme}
            className="icon-btn"
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            title="Toggle theme"
          >
            {theme === "light" ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>
          <div className="relative" ref={ref}>
            <button onClick={() => setMenu((m) => !m)} className="icon-btn" aria-label="Menu" aria-expanded={menu}>
              {menu ? <IconX size={17} /> : <IconMenu size={17} />}
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-xl"
                  role="menu"
                >
                  <MenuRow icon={<IconMessage size={16} />} label="New chat" onClick={() => { setMenu(false); onNewChat(); }} />
                  <MenuRow
                    icon={theme === "light" ? <IconSun size={16} /> : <IconMoon size={16} />}
                    label={theme === "light" ? "Light theme" : "Dark theme"}
                    onClick={() => { setMenu(false); onToggleTheme(); }}
                  />
                  <MenuRow
                    icon={<IconCog size={16} />}
                    label="Admin dashboard"
                    href="/admin"
                    onClick={() => setMenu(false)}
                  />
                  <div className="my-1 h-px bg-[var(--line-soft)]" />
                  <button
                    onClick={() => {
                      setMenu(false);
                      onClose?.();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--danger)] transition hover:bg-[var(--accent-veil)]"
                  >
                    Clear conversation
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuRow({ icon, label, onClick, href }) {
  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        role="menuitem"
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-2)] transition hover:bg-[var(--accent-veil)] hover:text-[var(--ink)]"
      >
        {icon}
        {label}
      </a>
    );
  }
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-2)] transition hover:bg-[var(--accent-veil)] hover:text-[var(--ink)]"
    >
      {icon}
      {label}
    </button>
  );
}