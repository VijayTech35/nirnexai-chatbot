"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useEffect, useRef, useState } from "react";
import MarkdownMenuItem from "../lib/markdown";
import {
  IconArrowUp,
  IconBot,
  IconBuilding,
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconMail,
  IconThumbsDown,
  IconThumbsUp,
  IconUser,
  IconX
} from "../lib/icons";
import { useSettings } from "../lib/settings";

const motionEase = [0.21, 1.02, 0.73, 1];

export default function Conversation({
  messages,
  busy,
  onRate,
  onCopy,
  onRegenerate,
  onEdit,
  onStop,
  streamTurnBusy,
  scrollRef,
  fill,
  health,
  lastError,
  onRetry,
  onAsk,
  lead,
  onLeadSubmit
}) {
  const { settings } = useSettings();
  const stickRef = useRef(true);
  const [jump, setJump] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTo({ top: el.scrollHeight });
  }, [messages, streamTurnBusy, scrollRef]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    stickRef.current = near;
    setJump(!near);
  };

  const jumpLatest = () => {
    stickRef.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
    setJump(false);
  };

  const offline = health === "offline";

  return (
    <section className={`console relative flex flex-col ${fill ? "min-h-[420px] flex-1" : ""}`}>
      <div className="console-head">
        <div className="flex items-center gap-2">
          <div className="msg-avatar h-7 w-7 rounded-lg text-[13px]">
            <IconBot size={15} />
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-2)]">
            {settings.assistantName}
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                offline ? "bg-[var(--danger)]" : health === "checking" ? "bg-[var(--warn)]" : "bg-[var(--accent)]"
              }`}
              aria-hidden
            />
          </p>
        </div>
        {streamTurnBusy && (
          <button onClick={onStop} className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
            ■ Stop
          </button>
        )}
      </div>

      {streamTurnBusy && <div className="stream-bar" aria-hidden />}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className={`overflow-y-auto px-3 py-5 sm:px-5 ${fill ? "min-h-0 flex-1" : "h-[52vh] min-h-[360px]"}`}
      >
        <div className="mx-auto max-w-2xl">
          {(offline || lastError) && (
            <Banner offline={offline} error={lastError} onRetry={onRetry} />
          )}

          {messages.map((m, i) => (
            <Fragment key={i}>
              {(i === 0 || (messages[i - 1]?.date ?? new Date().toDateString()) !== (m.date ?? new Date().toDateString())) && (
                <DaySeparator label={m.date ?? "Today"} />
              )}
              <Message
                m={m}
                i={i}
                last={i === messages.length - 1}
                showEdit={m.role === "user" && i === messages.length - 2}
                showRegen={m.role === "assistant" && !m.streaming && i === messages.length - 1}
                onRate={onRate}
                onCopy={onCopy}
                onRegenerate={onRegenerate}
                onEdit={onEdit}
                onAsk={onAsk}
              />
            </Fragment>
          ))}

          {lead.show && !lead.sent && (
            <LeadCard
              submitting={lead.submitting}
              onDone={onLeadSubmit}
              onClose={lead.onClose}
              demo={lead.demo}
            />
          )}

          {jump && (
            <button
              onClick={jumpLatest}
              className="sticky bottom-3 left-full z-10 -mt-10 mb-3 ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-2)] shadow-lg transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              aria-label="Jump to latest message"
            >
              <IconArrowUp size={16} className="rotate-180" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Banner({ offline, error, onRetry }) {
  const kind = error?.error || error?.kind;
  const line = offline
    ? "Connection to the backend is down — I can't answer right now."
    : kind === "credits"
      ? "I'm currently out of AI processing credits. Try again shortly."
      : kind === "backend"
        ? "I couldn't reach the AI service. Please try again."
        : "I hit an error answering that. Retry, or edit your question above.";
  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-300">
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />
      <span className="min-w-0 flex-1">{line}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 rounded-lg border border-amber-500/40 px-2.5 py-1 font-semibold transition hover:bg-amber-500/10">
          Retry
        </button>
      )}
    </div>
  );
}

function DaySeparator({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: motionEase }}
      className="mb-4 mt-2 flex items-center justify-center gap-3"
    >
      <span className="h-px w-10 bg-[var(--line)]" />
      <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
        {label}
      </span>
      <span className="h-px w-10 bg-[var(--line)]" />
    </motion.div>
  );
}

function Message({ m, i, last, showEdit, showRegen, onRate, onCopy, onRegenerate, onEdit, onAsk }) {
  const isUser = m.role === "user";
  const streaming = !!m.streaming;
  const content = m.content || (streaming ? "" : "");
  const cits = Array.isArray(m.cits) ? m.cits.filter((c) => c && c.url) : [];
  const related = Array.isArray(m.suggestions) && m.suggestions.length ? m.suggestions.slice(0, 2) : [];
  const showSources = !isUser && !streaming && cits.length > 0;
  const showRelated = !isUser && !streaming && last && related.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: motionEase }}
      className={`group mb-3 flex gap-2 sm:gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {isUser ? (
        <span className="msg-avatar msg-avatar-user !h-8 !w-8 !text-[12px] mt-0.5 sm:!h-9 sm:!w-9">
          <IconUser size={15} />
        </span>
      ) : (
        <span className="msg-avatar !h-8 !w-8 mt-0.5 sm:!h-9 sm:!w-9">
          <IconBot size={16} />
        </span>
      )}

      <div className={`min-w-0 max-w-[86%] sm:max-w-[78%] ${isUser ? "text-right" : ""}`}>
        {isUser ? (
          <>
            <div className="flex justify-end">
              <div className="msg-bubble msg-user anim-show">{m.content}</div>
            </div>
            {showEdit && (
              <button onClick={onEdit} className="mt-1 pr-1 text-[11px] font-medium text-[var(--ink-3)] transition hover:text-[var(--accent)]">
                Edit & resend
              </button>
            )}
          </>
        ) : (
          <div className="inline-block">
            {streaming && !content ? (
              <div className="msg-bubble msg-bot msg-streaming anim-show">
                <div className="inline-flex items-center gap-2 py-0.5">
                  <span className="relative flex h-3.5 w-3.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-40" />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[var(--accent)]/20" />
                  </span>
                  <span className="text-xs font-medium text-[var(--ink-2)]">
                    Gathering sources &amp; drafting your answer…
                  </span>
                </div>
              </div>
            ) : (
              <div className={`msg-bubble msg-bot anim-show ${streaming ? "msg-streaming" : ""}`}>
                <div className="md">
                  <MarkdownMenuItem text={content} />
                  {streaming && <span className="stream-cursor" aria-hidden />}
                </div>
                {m.error && (
                  <p className="mt-2 text-xs text-amber-400">
                    {m.error === "credits"
                      ? "AI credits exhausted — try again later."
                      : m.error === "backend"
                        ? "Couldn't reach the AI service — try again."
                        : "That answer failed — retry or edit your question."}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className={`msg-time ${isUser ? "justify-end pr-1" : "justify-start pl-1"}`}>
          <span>{m.ts ?? ""}</span>
          {isUser && (
            <span className="msg-check" aria-label="Delivered">
              ✓✓
            </span>
          )}
          {!isUser && streaming && <span className="font-medium text-[var(--accent)]">typing…</span>}
        </div>

        {showSources && (
          <SourceChips cits={cits} />
        )}

        {!isUser && !streaming && (
          <div className={last ? "msg-actions msg-actions-last" : "msg-actions"}>
            <FeedbackRow
              m={m}
              i={i}
              showRegen={showRegen}
              onRate={onRate}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
            />
          </div>
        )}

        {showRelated && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <AnimatePresence>
              {related.map((q, ri) => (
                <motion.button
                  key={q}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * ri, duration: 0.2, ease: motionEase }}
                  onClick={() => onAsk?.(q)}
                  className="rel-pill"
                >
                  {q}
                  <IconChevronRight size={12} />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SourceChips({ cits }) {
  const [open, setOpen] = useState(false);
  const seen = new Set();
  const unique = cits.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-soft)] bg-[var(--panel)]/60 px-2.5 py-1 text-[11px] font-medium text-[var(--ink-3)] transition-colors hover:text-[var(--ink-2)]"
        aria-expanded={open}
      >
        <IconChevronRight size={12} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        Sources · {unique.length}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap gap-2 overflow-hidden pt-2"
          >
            {unique.slice(0, 3).map((c, ci) => {
              let host = "";
              try {
                host = new URL(c.url).hostname.replace(/^www\./, "") || c.url;
              } catch {
                host = c.url;
              }
              return (
                <motion.a
                  key={c.url}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="src-card"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * ci, duration: 0.2, ease: motionEase }}
                >
                  <span className="max-w-[160px] truncate">{c.title || host}</span>
                </motion.a>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeedbackRow({ m, i, showRegen, onRate, onCopy, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopy(i);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.25 }}
        className="mt-1 flex items-center gap-1 px-0.5"
      >
        <button
          onClick={() => onRate(i, 1)}
          className={`msg-act p-1 ${m.rated === 1 ? "!text-[var(--accent)]" : ""}`}
          aria-label="Helpful"
          title="Helpful"
          aria-pressed={m.rated === 1}
        >
          <IconThumbsUp size={14} />
        </button>
        <button
          onClick={() => onRate(i, -1)}
          className={`msg-act p-1 ${m.rated === -1 ? "!text-[var(--warn)]" : ""}`}
          aria-label="Not helpful"
          title="Not helpful"
          aria-pressed={m.rated === -1}
        >
          <IconThumbsDown size={14} />
        </button>
        <span className="mx-1 h-4 w-px bg-[var(--line)]" />
        <button onClick={handleCopy} className={`msg-act p-1 ${copied ? "!text-[var(--accent)]" : ""}`} aria-label="Copy answer" title="Copy">
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.12 }}
              >
                <IconCheck size={14} />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <IconCopy size={14} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

function LeadCard({ submitting, onDone, onClose, demo }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", title: "" });
  const valid = form.email.includes("@");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: motionEase }}
      className="mb-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-lg"
    >
      <div className="border-b border-[var(--line-soft)] bg-[var(--accent-veil)] px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--ink)]">
              {demo ? "Book a personalized demo" : "See NirnexAI in action"}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-2)]">
              {demo
                ? "Tell us a bit about you — our team will schedule a walkthrough."
                : "Share your details and get a tailored walkthrough of the platform."}
            </p>
          </div>
          <button onClick={onClose} className="icon-btn !h-7 !w-7 shrink-0" aria-label="Dismiss">
            <IconX size={14} />
          </button>
        </div>
      </div>

      <form
        className="grid gap-2.5 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onDone?.({ ...form, demo: !!demo });
        }}
      >
        <input className="field" placeholder="First name" aria-label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        <input className="field" placeholder="Last name" aria-label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        <input className="field sm:col-span-2" type="email" placeholder="Work email" aria-label="Work email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="relative">
          <IconBuilding size={15} className="pointer-events-none absolute left-3 top-3 text-[var(--ink-3)]" />
          <input className="field !pl-9" placeholder="Company name" aria-label="Company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div className="relative">
          <IconUserIcon size={15} className="pointer-events-none absolute left-3 top-3 text-[var(--ink-3)]" />
          <input className="field !pl-9" placeholder="Job title" aria-label="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="mt-1 flex flex-col gap-2.5 sm:col-span-2">
          <button type="submit" disabled={!valid || submitting} className="btn-primary w-full">
            <IconMail size={15} />
            {submitting ? "Sending…" : demo ? "Request demo" : "Send my details"}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--ink-3)]">
            <IconCheck size={12} className="text-[var(--accent)]" />
            No spam — we only respond about your request.
          </div>
        </div>
      </form>
    </motion.div>
  );
}

function IconUserIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}