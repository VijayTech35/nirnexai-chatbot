"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatInput from "../../components/ChatInput";
import Conversation from "../../components/Conversation";
import { DEFAULT_SETTINGS, SettingsProvider, useSettings } from "../../lib/settings";
import { ToastProvider, useToast } from "../../lib/toast";
import { streamChat, beacon, getApiBase, normalizeError } from "../../lib/chat-client";
import { IconBot, IconCheck, IconX } from "../../lib/icons";

const base = getApiBase();

function newSessionId() {
  return Math.random().toString(36).slice(2);
}
function fmtTs() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function todayStr() {
  return new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function useQueryParam(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    return new URLSearchParams(window.location.search).get(key) || fallback;
  } catch {
    return fallback;
  }
}

export default function WidgetPage() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <WidgetChat />
      </ToastProvider>
    </SettingsProvider>
  );
}

function WidgetChat() {
  const { settings, update } = useSettings();
  const { push } = useToast();
  const accent = useQueryParam("accent", "");
  const greeting = useQueryParam("greeting", "");
  const assistantName = useQueryParam("name", "");

  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      content: greeting || settings.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage,
      ts: fmtTs(),
      date: todayStr()
    }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [health, setHealth] = useState("checking");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const activeCitations = useRef([]);
  const abortRef = useRef(null);

  useEffect(() => {
    if (accent) {
      try {
        document.documentElement.style.setProperty("--accent", accent);
        document.documentElement.style.setProperty("--accent-soft", accent);
        document.documentElement.style.setProperty("--accent-glow", accent + "88");
        document.documentElement.style.setProperty("--accent-veil", accent + "18");
      } catch {}
    }
  }, [accent]);

  useEffect(() => {
    fetch(`${base}/health`)
      .then((r) => r.json())
      .then((j) => setHealth(j.mock ? "mock" : "live"))
      .catch(() => setHealth("offline"));
  }, []);

  useEffect(() => {
    const onMsg = (e) => {
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d?.type === "nirnex-theme") update({ theme: d.theme });
      } catch {}
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [update]);

  const notifyParent = useCallback((type, payload = {}) => {
    try {
      window.parent.postMessage({ type, ...payload }, "*");
    } catch {}
  }, []);

  const handleClose = useCallback(() => {
    notifyParent("nirnex-close");
  }, [notifyParent]);

  const addMessage = useCallback((role, content, extra = {}) => {
    setMessages((m) => [...m, { role, content, ts: fmtTs(), date: todayStr(), ...extra }]);
  }, []);

  const streamTurn = useCallback(
    async ({ q, sid, history }) => {
      setBusy(true);
      activeCitations.current = [];
      beacon(base, { type: "user", q, sessionId: sid });
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let tail = "";
      let uncertain = false;
      let suggestions = [];
      addMessage("assistant", "", { streaming: true });
      try {
        await streamChat({
          messages: history,
          sessionId: sid,
          base,
          signal: ctrl.signal,
          onMeta: (meta) => { uncertain = !!meta?.uncertain; },
          onDelta: (_delta, fullText) => {
            tail = fullText;
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last && last.streaming) copy[copy.length - 1] = { ...last, content: fullText };
              return copy;
            });
          },
          onCitations: (cits) => { activeCitations.current = cits; },
          onSuggestions: (s) => { suggestions = s; }
        });
        setMessages((m) => {
          const copy = [...m];
          if (copy.length) {
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              streaming: false,
              cits: activeCitations.current,
              uncertain,
              suggestions
            };
          }
          return copy;
        });
        notifyParent("nirnex-unread");
      } catch (err) {
        const manualStop = err?.name === "AbortError";
        const ne = manualStop ? { kind: "stopped", friendly: "Streaming stopped.", detail: "" } : normalizeError(err);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            streaming: false,
            content: tail || ne.friendly
          };
          return copy;
        });
        if (!tail && !manualStop && ne.kind !== "timeout" && ne.kind !== "stopped") {
          push(ne.kind === "credits" ? "AI credits exhausted — try again later" : ne.friendly, "error");
        }
      } finally {
        setBusy(false);
      }
    },
    [addMessage, push, notifyParent]
  );

  const send = useCallback(
    async (evOrText) => {
      const q = (typeof evOrText === "string" ? evOrText : input).trim();
      if (!q || busy) return;
      setInput("");
      const history = [...messages, { role: "user", content: q }]
        .filter((m) => m.role !== "assistant" || m.content)
        .map((m) => ({ role: m.role, content: String(m.content || "") }))
        .slice(-12);
      addMessage("user", q);
      await streamTurn({ q, sid: sessionId, history });
    },
    [busy, input, messages, sessionId, streamTurn, addMessage]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const rate = useCallback(
    (msgIdx, rating) => {
      const msg = messages[msgIdx];
      if (!msg) return;
      beacon(base, { type: "feedback", sessionId, rating, ansId: msg.ts });
      setMessages((m) => {
        const copy = [...m];
        copy[msgIdx] = { ...copy[msgIdx], rated: rating };
        return copy;
      });
    },
    [messages, sessionId]
  );

  const copyMsg = useCallback(
    async (msgIdx) => {
      const msg = messages[msgIdx];
      if (!msg?.content) return;
      try {
        await navigator.clipboard.writeText(msg.content);
        push("Copied", "ok");
      } catch {}
    },
    [messages, push]
  );

  const regenerate = useCallback(async () => {
    if (busy) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const sid = newSessionId();
    setSessionId(sid);
    setMessages([messages[0], { ...lastUser, ts: fmtTs(), date: todayStr() }]);
    await streamTurn({ q: lastUser.content, sid, history: [{ role: "user", content: lastUser.content }] });
  }, [busy, messages, streamTurn]);

  const startEdit = useCallback(() => {
    if (busy) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages(messages.slice(0, messages.indexOf(lastUser)));
    setInput(lastUser.content);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [busy, messages]);

  const shareMsg = useCallback(async (msgIdx) => {
    const msg = messages[msgIdx];
    if (!msg?.content) return;
    try {
      if (navigator.share) await navigator.share({ title: "NirnexAI", text: msg.content });
      else { await navigator.clipboard.writeText(msg.content); push("Copied", "ok"); }
    } catch {}
  }, [messages, push]);

  const downloadTranscript = useCallback(
    (msgIdx) => {
      const slice = msgIdx == null ? messages : messages.slice(0, msgIdx + 1);
      const text = slice.filter((m) => m.content).map((m) => `${m.role === "user" ? "You" : "NirnexAI"}\n${m.content}\n`).join("\n\n");
      const blob = new Blob([`# NirnexAI transcript\n\n${text}`], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "nirnexai-transcript.md"; a.click();
      URL.revokeObjectURL(url);
      push("Downloaded", "ok");
    },
    [messages, push]
  );

  const lastError = [...messages].reverse().find((m) => m.error);

  return (
    <div className="widget-root flex h-dvh min-h-0 flex-col bg-[var(--bg)] font-[var(--font-inter)] text-[var(--ink)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--line-soft)] bg-[var(--panel)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="msg-avatar !h-7 !w-7 !text-[11px]">
            <IconBot size={14} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--ink)]">
              {assistantName || settings.assistantName}
            </span>
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                health === "offline" ? "bg-red-400" : health === "checking" ? "bg-amber-400" : "bg-[var(--accent)]"
              }`}
            />
          </div>
        </div>
        <button
          onClick={handleClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-3)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label="Close chat"
        >
          <IconX size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <Conversation
          messages={messages}
          busy={busy}
          onRate={rate}
          onCopy={copyMsg}
          onRegenerate={regenerate}
          onEdit={startEdit}
          onStop={stop}
          streamTurnBusy={busy}
          scrollRef={scrollRef}
          fill
          health={health}
          lastError={lastError}
          onRetry={regenerate}
          onAsk={send}
          lead={{ show: false, onClose: () => {} }}
          onShare={shareMsg}
          onDownload={downloadTranscript}
        />
      </div>

      <ChatInput
        inputRef={inputRef}
        input={input}
        setInput={setInput}
        onSend={() => send()}
        busy={busy}
        onStop={stop}
        showSuggestionChips={false}
      />
    </div>
  );
}
