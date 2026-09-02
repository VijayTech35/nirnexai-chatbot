"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { IconMic, IconSend, IconStop } from "../lib/icons";
import { useSettings } from "../lib/settings";

const MAX_CHARS = 512;
const ease = [0.21, 1.02, 0.73, 1];

export default function ChatInput({ inputRef, input, setInput, onSend, busy, onStop, showSuggestionChips = true }) {
  const { settings } = useSettings();
  const inputRef_ = inputRef;

  useEffect(() => {
    const el = inputRef_.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [input, inputRef_]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease }}
      className="mx-auto w-full max-w-3xl px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      {showSuggestionChips && !busy && (
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

      <div className="floating-input">
        <div className="flex items-end gap-1 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)] transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_4px_var(--accent-veil),0_18px_50px_-20px_rgba(0,0,0,0.55)]">
          <textarea
            ref={inputRef_}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={1}
            placeholder="Ask anything about NirnexAI…"
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
            <kbd className="shrink-0 rounded border border-[var(--line)] bg-[var(--panel-2)] px-1 py-px text-[10px] font-semibold">Enter</kbd>
            <span className="hidden sm:inline">to send ·</span>
            <kbd className="hidden shrink-0 rounded border border-[var(--line)] bg-[var(--panel-2)] px-1 py-px text-[10px] font-semibold md:inline">Shift+Enter</kbd>
            <span className="hidden md:inline">new line</span>
          </span>
          <span className="hidden truncate sm:inline">{settings.footerText} · answers cite official sources</span>
        </div>
      </div>
    </motion.div>
  );
}