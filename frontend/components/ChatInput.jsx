"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { IconMic, IconPaperclip, IconSend, IconSpinner, IconStop } from "../lib/icons";
import { useSettings } from "../lib/settings";
import { useToast } from "../lib/toast";
import { getApiBase } from "../lib/chat-client";
import { readAdminToken } from "../lib/admin-hook";

const MAX_CHARS = 512;
const ease = [0.21, 1.02, 0.73, 1];
const ACCEPT = ".txt,.md,.markdown,.csv,.json,.xml,.html,.htm,.log,.pdf";

export default function ChatInput({ inputRef, input, setInput, onSend, busy, onStop }) {
  const { settings } = useSettings();
  const { push } = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [input, inputRef]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting the same file
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);

      const res = await fetch(`${getApiBase()}/api/admin/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": readAdminToken() },
        body: JSON.stringify({ filename: file.name, content: b64 })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Upload failed (${res.status})`);
      }
      push(`Added "${file.name}" to the knowledge base (${json.chunks} chunk${json.chunks === 1 ? "" : "s"})`, "ok");
    } catch (err) {
      push(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease }}
      className="mx-auto w-full max-w-3xl px-4 pb-5"
    >
      {!busy && (
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
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            aria-hidden
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="icon-btn !h-10 !w-10 shrink-0 disabled:opacity-50"
            aria-label="Attach a file to the knowledge base"
            title="Add a file to the knowledge base (txt, md, csv, json, html, pdf)"
          >
            {uploading ? <IconSpinner className="animate-spin" size={17} /> : <IconPaperclip size={17} />}
          </button>

          <textarea
            ref={inputRef}
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
            <span className="hidden shrink-0 pb-1 text-[10px] font-medium text-[var(--ink-3)] sm:inline">
              {input.length}/{MAX_CHARS}
            </span>
          )}

          <button
            type="button"
            onClick={() => push("Voice input is coming soon", "info")}
            className="icon-btn hidden !h-10 !w-10 shrink-0 sm:inline-flex"
            aria-label="Voice input"
            title="Voice input"
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
            <button
              type="submit"
              disabled={!input.trim()}
              onClick={() => onSend()}
              className="btn-primary !rounded-xl !px-3.5 !py-2.5"
              aria-label="Send message"
            >
              <IconSend size={16} />
            </button>
          )}
        </div>
        <p className="mt-2.5 text-center text-[11px] text-[var(--ink-3)]">
          {settings.footerText} · Answers are AI-generated and cite official sources
        </p>
      </div>
    </motion.div>
  );
}