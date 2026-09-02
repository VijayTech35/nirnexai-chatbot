"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  IconCalendar,
  IconMic,
  IconPlug,
  IconSend,
  IconShield,
  IconSparkles,
  IconStop,
  IconTag
} from "../lib/icons";
import { useSettings } from "../lib/settings";

const MAX_CHARS = 512;
const ease = [0.21, 1.02, 0.73, 1];

const COMMANDS = [
  { key: "pricing", label: "Pricing plans", desc: "What do pricing plans look like?", icon: IconTag },
  { key: "demo", label: "Book a demo", desc: "I'd like to book a product demo", icon: IconCalendar },
  { key: "features", label: "Top features", desc: "What are NirnexAI's top features?", icon: IconSparkles },
  { key: "security", label: "Data & security", desc: "How is my data kept secure?", icon: IconShield },
  { key: "support", label: "Support options", desc: "What support options are available?", icon: IconPlug }
];

export default function ChatInput({ inputRef, input, setInput, onSend, busy, onStop, showSuggestionChips = true }) {
  const { settings } = useSettings();
  const inputRef_ = inputRef;
  const [cmdIdx, setCmdIdx] = useState(0);

  const cmd = input.trim();
  const needle = cmd.startsWith("/") ? cmd.slice(1).toLowerCase() : "";
  const filtered = needle === ""
    ? COMMANDS
    : COMMANDS.filter(
        (c) => c.key.startsWith(needle) || c.key.includes(needle) || c.label.toLowerCase().includes(needle)
      ).slice(0, 5);
  const showCmd = cmd.startsWith("/") && filtered.length > 0;

  useEffect(() => {
    const el = inputRef_.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [input, inputRef_]);

  const run = (c) => {
    setInput("");
    setCmdIdx(0);
    onSend(c.desc);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      if (showCmd) {
        e.preventDefault();
        setInput("");
      }
      return;
    }
    if (showCmd) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCmdIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCmdIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        run(filtered[cmdIdx % filtered.length]);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        run(filtered[cmdIdx % filtered.length]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease }}
      className="mx-auto w-full max-w-3xl px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      {showSuggestionChips && !busy && !showCmd && (
        <div className="mb-2 flex flex-wrap justify-center gap-2">
          {settings.suggestedQuestions.slice(0, 6).map((q, i) => (
            <motion.button
              key={q}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, duration: 0.25, ease }}
              onClick={() => setInput(q)}
              className="chip !px-3 !py-1 text-[12.5px]"
              aria-label={`Fill input: ${q}`}
            >
              {q}
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCmd && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.16, ease }}
            className="cmd-menu mb-2 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-md"
            role="listbox"
            aria-label="Quick commands"
          >
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Quick commands
            </p>
            {filtered.map((c, ci) => (
              <button
                key={c.key}
                type="button"
                role="option"
                aria-selected={ci === cmdIdx % filtered.length}
                onMouseEnter={() => setCmdIdx(ci)}
                onClick={() => run(c)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  ci === cmdIdx % filtered.length ? "bg-[var(--accent-veil)] text-[var(--ink)]" : "text-[var(--ink-2)]"
                }`}
              >
                <c.icon size={15} className="shrink-0 text-[var(--accent)]" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{c.label}</span>
                  <span className="ml-2 text-xs text-[var(--ink-3)]">{c.desc}</span>
                </span>
              </button>
            ))}
            <p className="border-t border-[var(--line-soft)] px-3 py-1.5 text-[10px] text-[var(--ink-3)]">
              ↑↓ navigate · Enter run · Tab complete · Esc close
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="floating-input">
        <div className="flex items-end gap-1 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)] transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_4px_var(--accent-veil),0_18px_50px_-20px_rgba(0,0,0,0.55)]">
          <textarea
            ref={inputRef_}
            value={input}
            onChange={(e) => {
              setInput(e.target.value.slice(0, MAX_CHARS));
              setCmdIdx(0);
            }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask anything about NirnexAI…  (try typing / )"
            className="max-h-[140px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
            aria-label="Your question"
          />

          {settings.showCharacterCount && input.length > 0 && (
            <span className={`hidden shrink-0 pb-1 text-[10px] font-medium sm:inline ${input.length >= MAX_CHARS ? "text-[var(--warn)]" : "text-[var(--ink-3)]"}`}>
              {input.length}/{MAX_CHARS}
            </span>
          )}

          <button
            type="button"
            disabled
            className="icon-btn hidden !h-10 !w-10 shrink-0 cursor-not-allowed opacity-45 sm:inline-flex"
            aria-label="Voice input (coming soon)"
            title="Voice input — coming soon"
          >
            <IconMic size={17} />
          </button>

          {busy ? (
            <button
              type="button"
              onClick={onStop}
              className="btn-ghost shrink-0 !px-3.5 !py-2.5 text-sm"
              aria-label="Stop generating"
            >
              <IconStop size={15} />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <motion.button
              type="submit"
              disabled={!input.trim()}
              onClick={() => onSend()}
              whileHover={{ scale: input.trim() ? 1.05 : 1 }}
              whileTap={{ scale: 0.93 }}
              className="btn-primary !rounded-xl !px-3.5 !py-2.5"
              aria-label="Send message"
            >
              <IconSend size={16} />
            </motion.button>
          )}
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 px-1 text-[11px] text-[var(--ink-3)]">
          <span className="flex min-w-0 items-center gap-1.5">
            <kbd className="shrink-0 rounded border border-[var(--line)] bg-[var(--panel-2)] px-1 py-px text-[10px] font-semibold">/</kbd>
            <span className="hidden sm:inline">commands ·</span>
            <kbd className="hidden shrink-0 rounded border border-[var(--line)] bg-[var(--panel-2)] px-1 py-px text-[10px] font-semibold sm:inline">Enter</kbd>
            <span className="hidden sm:inline">to send</span>
            <kbd className="hidden shrink-0 rounded border border-[var(--line)] bg-[var(--panel-2)] px-1 py-px text-[10px] font-semibold md:inline">Shift+Enter</kbd>
            <span className="hidden md:inline">new line</span>
          </span>
          <span className="hidden truncate sm:inline">{settings.footerText} · answers cite official sources</span>
        </div>
      </div>
    </motion.div>
  );
}