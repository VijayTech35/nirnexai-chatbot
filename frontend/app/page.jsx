"use client";

export const dynamic = "force-dynamic";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import AppHeader from "../components/AppHeader";
import ChatInput from "../components/ChatInput";
import Conversation from "../components/Conversation";
import HeroSection from "../components/HeroSection";
import QuickActions from "../components/QuickActions";
import { DEFAULT_SETTINGS, SettingsProvider, useSettings } from "../lib/settings";
import { ToastProvider, useToast } from "../lib/toast";
import { streamChat, beacon, getApiBase, normalizeError } from "../lib/chat-client";

const base = getApiBase();

const NIRNEX_CONSOLE_KEY = "nirnex_console_msgs";
const NIRNEX_SID_KEY = "nirnex_console_sid";

function newSessionId() {
  return Math.random().toString(36).slice(2);
}
function fmtTs() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function todayStr() {
  return new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function ChatPage() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <Chat />
      </ToastProvider>
    </SettingsProvider>
  );
}

function Chat() {
  const { settings, update } = useSettings();
  const { push } = useToast();

  const [messages, setMessages] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(NIRNEX_CONSOLE_KEY);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length && arr[0]?.role) return arr;
        }
      } catch {}
    }
    return [{ role: "assistant", content: DEFAULT_SETTINGS.welcomeMessage, ts: fmtTs(), date: todayStr() }];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem(NIRNEX_SID_KEY) || newSessionId();
      } catch {}
    }
    return newSessionId();
  });
  const [health, setHealth] = useState("checking");
  const [lead, setLead] = useState({ show: false, demo: false, submitting: false, sent: false, closed: false });
  const leadPrompted = useRef(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const activeCitations = useRef([]);
  const abortRef = useRef(null);

  useEffect(() => {
    fetch(`${base}/health`)
      .then((r) => r.json())
      .then((j) => setHealth(j.mock ? "mock" : "live"))
      .catch(() => setHealth("offline"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(NIRNEX_CONSOLE_KEY, JSON.stringify(messages));
      sessionStorage.setItem(NIRNEX_SID_KEY, sessionId);
    } catch {}
  }, [messages, sessionId]);

  // keyboard shortcut: "/" focuses the input
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !e.target.closest("input,textarea,select,[contenteditable]")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const addMessage = useCallback((role, content, extra = {}) => {
    setMessages((m) => [...m, { role, content, ts: fmtTs(), date: todayStr(), ...extra }]);
  }, []);

  const streamTurn = useCallback(
    async ({ q, sid, history, onFinal }) => {
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
          onMeta: (meta) => {
            uncertain = !!meta?.uncertain;
          },
          onDelta: (_delta, fullText) => {
            tail = fullText;
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last && last.streaming) copy[copy.length - 1] = { ...last, content: fullText };
              return copy;
            });
          },
          onCitations: (cits) => {
            activeCitations.current = cits;
          },
          onSuggestions: (s) => {
            suggestions = s;
          }
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
        onFinal?.(uncertain);
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
          if (ne.kind === "credits" || ne.kind === "backend" || ne.kind === "unknown") {
            copy[copy.length - 1] = { ...copy[copy.length - 1], error: ne.kind, detail: ne.detail };
          }
          return copy;
        });
        if (!tail && !manualStop && ne.kind !== "timeout" && ne.kind !== "stopped") {
          push(ne.kind === "credits" ? "AI credits exhausted — please try again later" : ne.friendly, "error");
        }
        onFinal?.(false);
      } finally {
        setBusy(false);
      }
    },
    [addMessage, push]
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
    [busy, input, messages, push, sessionId, streamTurn]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const newChat = useCallback(() => {
    if (busy) abortRef.current?.abort();
    const sid = newSessionId();
    setSessionId(sid);
    setMessages([{ role: "assistant", content: settings.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage, ts: fmtTs(), date: todayStr() }]);
    setLead({ show: false, demo: false, submitting: false, sent: false, closed: false });
    leadPrompted.current = false;
    try {
      sessionStorage.setItem(NIRNEX_SID_KEY, sid);
      sessionStorage.removeItem(NIRNEX_CONSOLE_KEY);
    } catch {}
    inputRef.current?.focus();
  }, [busy, settings.welcomeMessage]);

  const regenerate = useCallback(async () => {
    if (busy) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const sid = newSessionId();
    setSessionId(sid);
    setMessages([messages[0], { ...lastUser, ts: fmtTs(), date: todayStr() }]);
    leadPrompted.current = true;
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
        push("Answer copied to clipboard", "ok");
      } catch {
        push("Couldn't access clipboard", "error");
      }
    },
    [messages, push]
  );

  const shareMsg = useCallback(
    async (msgIdx) => {
      const msg = messages[msgIdx];
      if (!msg?.content) return;
      try {
        if (navigator.share) {
          await navigator.share({ title: "NirnexAI Assistant", text: msg.content });
        } else {
          await navigator.clipboard.writeText(msg.content);
          push("Answer copied — paste anywhere to share", "ok");
        }
      } catch {
        /* user dismissed share sheet */
      }
    },
    [messages, push]
  );

  const downloadTranscript = useCallback(
    (msgIdx) => {
      const slice = msgIdx == null ? messages : messages.slice(0, msgIdx + 1);
      const text = slice
        .filter((m) => m.content)
        .map((m) => `${m.role === "user" ? "You" : "NirnexAI Assistant"}\n${m.content}\n`)
        .join("\n\n");
      const blob = new Blob([`# NirnexAI Assistant transcript\n\n${text}`], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nirnexai-transcript.md";
      a.click();
      URL.revokeObjectURL(url);
      push("Transcript downloaded", "ok");
    },
    [messages, push]
  );

  const openLead = useCallback((demo = false) => {
    setLead((L) => ({ ...L, show: true, demo, sent: false }));
  }, []);

  const submitLead = useCallback(
    async (details) => {
      setLead((L) => ({ ...L, submitting: true }));
      try {
        await beacon(base, {
          type: details.demo ? "demo" : "lead",
          sessionId,
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          company: details.company,
          role: details.title,
          goal: details.demo ? "Demo" : "Interested",
          page: typeof window !== "undefined" ? window.location.href : ""
        });
      } catch {
        /* analytics is best-effort */
      }
      setLead((L) => ({ ...L, submitting: false, sent: true, show: false, closed: true }));
      push(details.demo ? "Demo request sent — we'll reach out shortly" : "Thanks! We'll be in touch shortly", "ok");
    },
    [sessionId, push]
  );

  const closeLead = useCallback(() => {
    setLead((L) => ({ ...L, show: false, closed: true }));
  }, []);

  const isStart = messages.length <= 1 && !busy;
  const lastError = [...messages].reverse().find((m) => m.error);
  // Do NOT force lead capture automatically. The lead card (demo/contact form)
  // only appears when the user opts in via the "Book Demo" quick action or
  // explicit intent — never automatically after a certain number of messages.
  const showLeadCard = lead.show && !lead.sent;

  return (
    <div className="t-bg flex min-h-dvh flex-col">
      <AppHeader
        health={health}
        theme={settings.theme === "light" ? "light" : "dark"}
        onToggleTheme={() => update({ theme: settings.theme === "light" ? "dark" : "light" })}
        onNewChat={newChat}
        onClose={newChat}
      />

      <div className="mx-auto w-full max-w-5xl flex-1 px-0 sm:px-6">
        <AnimatePresence mode="wait">
          {isStart ? (
            <motion.main
              key="start"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.21, 1.02, 0.73, 1] }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <HeroSection
                onStart={() => inputRef.current?.focus()}
                onBookDemo={() => openLead(true)}
                onAsk={(t) => {
                  setInput(t);
                  setTimeout(() => inputRef.current?.focus(), 30);
                }}
                health={health}
              />
              <QuickActions onAsk={send} onDemo={() => openLead(true)} onLead={() => openLead(false)} />
              <div className="flex-1" />
              <div className="mt-8">
<ChatInput inputRef={inputRef} input={input} setInput={setInput} onSend={() => send()} busy={busy} onStop={stop} showSuggestionChips={isStart} />
              </div>
            </motion.main>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.21, 1.02, 0.73, 1] }}
              className="flex min-h-0 flex-col gap-3 pb-4 pt-4 sm:pt-6"
            >
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
                lead={{
                  show: showLeadCard && !lead.sent,
                  demo: lead.demo,
                  submitting: lead.submitting,
                  sent: lead.sent,
                  onClose: closeLead
                }}
                onLeadSubmit={submitLead}
                onShare={shareMsg}
                onDownload={downloadTranscript}
              />
              <ChatInput inputRef={inputRef} input={input} setInput={setInput} onSend={() => send()} busy={busy} onStop={stop} showSuggestionChips={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
