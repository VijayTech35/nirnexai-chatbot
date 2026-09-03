"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconCalendar,
  IconFile,
  IconImage,
  IconMic,
  IconPaperclip,
  IconPlug,
  IconSend,
  IconShield,
  IconSmile,
  IconSparkles,
  IconStop,
  IconTag,
  IconTrash,
  IconX
} from "../lib/icons";
import { useSettings } from "../lib/settings";

const MAX_CHARS = 512;
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 20;
const ease = [0.21, 1.02, 0.73, 1];

const ACCEPTED =
  "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,.pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx";

const EMOJIS = [
  "😀", "😄", "😊", "🙂", "😉", "🥳", "😅", "🤔",
  "👍", "👎", "🙌", "👏", "🙏", "💪", "🤝", "👋",
  "✅", "❌", "⭐", "🔥", "💡", "🚀", "📅", "💬",
  "💰", "🏷️", "🔒", "🔗", "📄", "📊", "🛠️", "👥"
];

const COMMANDS = [
  { key: "pricing", label: "Pricing plans", desc: "What do pricing plans look like?", icon: IconTag },
  { key: "demo", label: "Book a demo", desc: "I'd like to book a product demo", icon: IconCalendar },
  { key: "features", label: "Top features", desc: "What are NirnexAI's top features?", icon: IconSparkles },
  { key: "security", label: "Data & security", desc: "How is my data kept secure?", icon: IconShield },
  { key: "support", label: "Support options", desc: "What support options are available?", icon: IconPlug }
];

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

function fmtBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileName(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export default function ChatInput({ inputRef, input, setInput, onSend, busy, onStop, showSuggestionChips = true }) {
  const { settings } = useSettings();
  const inputRef_ = inputRef;
  const [cmdIdx, setCmdIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState(null);
  const [files, setFiles] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [dragging, setDragging] = useState(false);
  const recRef = useRef(null);
  const voiceNoteTimer = useRef(null);
  const fileInputRef = useRef(null);
  const emojiRef = useRef(null);
  const dragDepth = useRef(0);
  const filesRef = useRef([]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const flashVoiceNote = useCallback((note) => {
    setVoiceNote(note);
    clearTimeout(voiceNoteTimer.current);
    voiceNoteTimer.current = setTimeout(() => setVoiceNote(null), 2600);
  }, []);

  const stopListening = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try { rec.stop(); } catch {}
      recRef.current = null;
    }
    setListening(false);
  }, []);

  const toggleVoice = useCallback(() => {
    if (busy) return;
    if (listening) { stopListening(); return; }
    const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    if (!SR) { flashVoiceNote("unsupported"); return; }
    let rec;
    try { rec = new SR(); } catch { flashVoiceNote("error"); return; }
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
    try { rec.start(); } catch {
      recRef.current = null;
      setListening(false);
      flashVoiceNote("error");
    }
  }, [busy, listening, stopListening, flashVoiceNote, setInput]);

  useEffect(() => () => stopListening(), [stopListening]);

  // ---- file helpers ----
  const buildFile = useCallback((file) => new Promise((resolve) => {
    const base = { file, name: file.name, size: file.size, type: file.type || "", id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}` };
    if (IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = () => resolve({ ...base, preview: reader.result });
      reader.onerror = () => resolve(base);
      reader.readAsDataURL(file);
    } else {
      resolve(base);
    }
  }), []);

  const addFiles = useCallback(async (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    if (incoming.some((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)) {
      flashVoiceNote("size");
      return;
    }
    if (filesRef.current.length >= MAX_FILES) {
      flashVoiceNote("limit");
      return;
    }
    const resolved = await Promise.all(incoming.map(buildFile));
    setFiles((prev) => {
      const room = MAX_FILES - prev.length;
      if (room <= 0) return prev;
      return [...prev, ...resolved.slice(0, room)];
    });
  }, [buildFile, flashVoiceNote]);

  const removeFile = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleFileInput = useCallback((e) => {
    addFiles(e.target.files);
    e.target.value = "";
  }, [addFiles]);

  // ---- drag & drop ----
  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }, []);
  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); }
  }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(e.dataTransfer?.files);
  }, [addFiles]);

  // close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const onClick = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showEmoji]);

  const insertEmoji = useCallback((emoji) => {
    const el = inputRef_.current;
    if (!el) { setInput((p) => p + emoji); return; }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const next = input.slice(0, start) + emoji + input.slice(end);
    setInput(next.slice(0, MAX_CHARS));
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  }, [input, inputRef_, setInput]);

  const cmd = input.trim();
  const needle = cmd.startsWith("/") ? cmd.slice(1).toLowerCase() : "";
  const filtered = needle === "" ? COMMANDS : COMMANDS.filter(
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

  const handleSend = () => {
    if (busy) return;
    if (files.length) {
      const names = files.map((f) => f.name).join(", ");
      const composed = `${input.trim()}\n\n[Attached: ${names}]`.trim();
      setFiles([]);
      onSend(composed);
    } else {
      onSend();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      if (showCmd) { e.preventDefault(); setInput(""); return; }
      if (showEmoji) { setShowEmoji(false); return; }
      return;
    }
    if (showCmd) {
      if (e.key === "ArrowDown") { e.preventDefault(); setCmdIdx((i) => (i + 1) % filtered.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setCmdIdx((i) => (i - 1 + filtered.length) % filtered.length); return; }
      if (e.key === "Tab") { e.preventDefault(); run(filtered[cmdIdx % filtered.length]); return; }
      if (e.key === "Enter") { e.preventDefault(); run(filtered[cmdIdx % filtered.length]); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">Quick commands</p>
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
            <p className="border-t border-[var(--line-soft)] px-3 py-1.5 text-[10px] text-[var(--ink-3)]">↑↓ navigate · Enter run · Tab complete · Esc close</p>
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
                : voiceNote === "limit"
                  ? `You can attach up to ${MAX_FILES} files at once.`
                  : voiceNote === "size"
                    ? `Each file must be under ${MAX_FILE_SIZE_MB} MB.`
                    : "Couldn't start voice input — please try again."}
          </span>
        </div>
      )}

      {/* upload preview chips */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mb-2 flex flex-wrap gap-2"
          >
            {files.map((f) => (
              <motion.span
                key={f.id}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] py-1 pl-1.5 pr-1 text-xs text-[var(--ink-2)]"
                title={`${f.name} · ${fmtBytes(f.size)}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--panel-3)] text-[var(--accent)]">
                  {f.preview ? (
                    <img src={f.preview} alt={f.name} className="h-full w-full object-cover" />
                  ) : IMAGE_TYPES.includes(f.type) ? (
                    <IconImage size={13} />
                  ) : (
                    <IconFile size={13} />
                  )}
                </span>
                <span className="max-w-[120px] truncate sm:max-w-[160px]">{fileName(f.name)}</span>
                <span className="hidden shrink-0 text-[10px] text-[var(--ink-3)] sm:inline">{fmtBytes(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[var(--ink-3)] transition hover:bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] hover:text-[var(--danger)]"
                  aria-label={`Remove ${f.name}`}
                >
                  <IconX size={12} />
                </button>
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="floating-input relative"
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* drag & drop overlay */}
        <AnimatePresence>
          {dragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--accent)] bg-[var(--accent-veil)] backdrop-blur-sm"
            >
              <span className="flex items-center gap-2 rounded-xl bg-[var(--panel)] px-4 py-2 text-sm font-semibold text-[var(--accent)] shadow-lg">
                <IconPaperclip size={16} /> Drop files to attach
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)] transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_4px_var(--accent-veil),0_18px_50px_-20px_rgba(0,0,0,0.55)]">
          <div className="flex items-end gap-1">
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
              className="max-h-[140px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
              aria-label="Your question"
            />

            {settings.showCharacterCount && input.length > 0 && (
              <span className={`hidden shrink-0 pb-1 text-[10px] font-medium sm:inline ${input.length >= MAX_CHARS ? "text-[var(--warn)]" : "text-[var(--ink-3)]"}`}>
                {input.length}/{MAX_CHARS}
              </span>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className={`icon-btn relative hidden !h-10 !w-10 shrink-0 sm:inline-flex ${busy ? "cursor-not-allowed opacity-45" : ""}`}
              aria-label="Attach files"
              title="Attach files"
            >
              <IconPaperclip size={17} />
            </button>

            <div className="relative" ref={emojiRef}>
              <button
                type="button"
                onClick={() => setShowEmoji((s) => !s)}
                disabled={busy}
                className={`icon-btn relative hidden !h-10 !w-10 shrink-0 sm:inline-flex ${showEmoji ? "!border-[var(--accent)] !text-[var(--accent)]" : ""} ${busy ? "cursor-not-allowed opacity-45" : ""}`}
                aria-label="Emoji picker"
                title="Emoji"
              >
                <IconSmile size={17} />
              </button>
              <AnimatePresence>
                {showEmoji && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.16, ease }}
                    className="absolute bottom-12 right-0 z-30 w-60 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-md"
                  >
                    <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">Emoji</p>
                    <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
                      {EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => insertEmoji(em)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[17px] transition hover:bg-[var(--accent-veil)]"
                          aria-label={`Insert ${em}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
                type="button"
                disabled={!input.trim() && files.length === 0}
                onClick={handleSend}
                whileHover={{ scale: input.trim() || files.length ? 1.05 : 1 }}
                whileTap={{ scale: 0.93 }}
                className="btn-primary !rounded-xl !px-3.5 !py-2.5"
                aria-label="Send message"
              >
                <IconSend size={16} />
              </motion.button>
            )}
          </div>

          {/* attachment + action row (mobile-visible) */}
          <div className="flex items-center justify-between gap-2 border-t border-[var(--line-soft)] px-1 pb-0.5 pt-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className={`icon-btn !h-8 !w-8 sm:hidden ${busy ? "cursor-not-allowed opacity-45" : ""}`}
                aria-label="Attach files"
                title="Attach files"
              >
                <IconPaperclip size={16} />
              </button>
              <span className="hidden items-center gap-1.5 pl-0.5 text-[11px] text-[var(--ink-3)] sm:flex">
                <IconPaperclip size={13} /> Attach docs or images · drag &amp; drop
              </span>
            </div>
            <div className="flex items-center gap-1">
              {settings.showCharacterCount && input.length > 0 && (
                <span className={`shrink-0 text-[10px] font-medium sm:hidden ${input.length >= MAX_CHARS ? "text-[var(--warn)]" : "text-[var(--ink-3)]"}`}>
                  {input.length}/{MAX_CHARS}
                </span>
              )}
              <button
                type="button"
                onClick={toggleVoice}
                disabled={busy}
                className={`icon-btn !h-8 !w-8 sm:hidden ${listening ? "mic-live !border-[var(--accent)] !text-[var(--accent)]" : ""} ${busy ? "cursor-not-allowed opacity-45" : ""}`}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                title="Voice input"
              >
                <IconMic size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          onChange={handleFileInput}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        <div className="mt-2 flex items-center justify-center gap-2 px-1 text-center text-[11px] text-[var(--ink-3)]">
          {files.length > 0 ? (
            <span className="flex items-center gap-1.5">
              <IconTrash size={12} />
              {files.length} attached — they'll be included with your message
            </span>
          ) : (
            <span>Answers are based on the official NirnexAI knowledge base</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
