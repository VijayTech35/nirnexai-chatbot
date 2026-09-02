"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState(null);
  const recRef = useRef(null);
  const voiceNoteTimer = useRef(null);

  const flashVoiceNote = useCallback((note) => {
    setVoiceNote(note);
    clearTimeout(voiceNoteTimer.current);
    voiceNoteTimer.current = setTimeout(() => setVoiceNote(null), 2600);
  }, []);

  const stopListening = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {}
      recRef.current = null;
    }
    setListening(false);
  }, []);

  const toggleVoice = useCallback(() => {
    if (busy) return;
    if (listening) {
      stopListening();
      return;
    }
    const SR = typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
    if (!SR) {
      flashVoiceNote("unsupported");
      return;
    }
    let rec;
    try {
      rec = new SR();
    } catch {
      flashVoiceNote("error");
      return;
    }
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let final = "";
    rec.onresult = (e) => {
      let interim = "";
      const results = e.results;
      for (let i = e.resultIndex; i < results.length; i++) {
        const t = results[i][0].transcript;
        if (results[i].isFinal) final += t + " ";
        else interim += t;
      }
      setInput((prev) => {
        const base = prev.trim();
        return ((base ? base + " " : "") + final + interim).trimStart();
      });
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setVoiceNote(null);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") flashVoiceNote("grant");
      else if (e.error !== "aborted") flashVoiceNote("error");
      setListening(false);
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
      flashVoiceNote("error");
    }
  }, [busy, listening, stopListening, flashVoiceNote, setInput]);

  useEffect(() => () => stopListening(), [stopListening]);

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

      {voiceNote && (
        <div className="mb-2 flex justify-center">
          <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-[11px] font-medium text-[var(--ink-2)]">
            {voiceNote === "unsupported"
              ? "Voice input isn't supported in this browser — try Chrome."
              : voiceNote === "grant"
                ? "Microphone blocked — allow access in your browser to use voice."
                : "Couldn't start voice input — please try again."}
          </span>
        </div>
      )}

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
            onClick={toggleVoice}
            disabled={busy}
            className={`icon-btn relative hidden !h-10 !w-10 shrink-0 sm:inline-flex ${
              listening ? "mic-live !border-[var(--accent)] !text-[var(--accent)]" : ""
            } ${busy ? "cursor-not-allowed opacity-45" : ""}`}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            title={listening ? "Stop voice input" : "Voice input"}
          >
            <IconMic size={17} />
            {listening && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
            )}
          </button>

          {listening && (
            <span className="hidden shrink-0 items-center gap-1.5 pb-2 pr-1 text-[11px] font-semibold text-[var(--accent)] sm:flex">
              <span className="live-dot" aria-hidden />
              Listening
            </span>
          )}

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
        <div className="mt-2 flex justify-center px-1 text-center text-[11px] text-[var(--ink-3)]">
          Answers are based on the official NirnexAI knowledge base
        </div>
      </div>
    </motion.div>
  );
}