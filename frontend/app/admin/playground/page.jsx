"use client";

import { useRef, useState } from "react";
import { streamChat, getApiBase } from "../../../lib/chat-client";
import { SectionTitle } from "../../../components/ui";
import Markdown from "../../../lib/markdown";
import { IconSend, IconSparkles, IconStop } from "../../../lib/icons";

const base = getApiBase();

const SAMPLES = [
  "What is NirnexAI?",
  "Does NirnexAI have a meeting intelligence module?",
  "What integrations are available?",
  "How does NirnexAI handle data security?"
];

export default function Playground() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const run = async (question) => {
    const text = (question || q).trim();
    if (!text || busy) return;
    setQ(text);
    setAnswer("");
    setCitations([]);
    setError(null);
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await streamChat({
        messages: [{ role: "user", content: text }],
        sessionId: "admin-playground",
        base,
        signal: ac.signal,
        onDelta: (_d, full) => setAnswer(full),
        onCitations: (c) => setCitations(c || [])
      });
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const stop = () => abortRef.current?.abort();

  return (
    <div className="space-y-6">
      <SectionTitle title="Playground" sub="Test the live RAG engine without leaving the admin. Runs through the same /api/chat pipe the console uses." />

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button key={s} className="chip" onClick={() => run(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>

      <div className="card flex items-end gap-3 p-4">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              run();
            }
          }}
          rows={2}
          placeholder="Ask the knowledge base anything…"
          className="field flex-1 resize-none"
        />
        {busy ? (
          <button className="icon-btn" onClick={stop} title="Stop">
            <IconStop className="h-5 w-5" />
          </button>
        ) : (
          <button className="btn-primary" onClick={() => run()} title="Send">
            <IconSend className="h-4 w-4" />
          </button>
        )}
      </div>

      {busy && !answer && (
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
            <IconSparkles className="h-4 w-4 animate-pulse text-[var(--accent)]" /> Streaming from {base.replace(/^https?:\/\//, "")}…
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {answer && (
        <div className="card p-6">
          <div className="md">
            <Markdown text={answer} />
          </div>

          {citations.length > 0 && (
            <>
              <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">Sources</p>
              <div className="flex flex-wrap gap-2">
                {citations.map((c, i) => (
                  <a
                    key={i}
                    href={c.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="src-card"
                  >
                    <span className="truncate max-w-xs">{c.title || c.url}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!answer && !busy && !error && (
        <p className="text-center text-sm text-[var(--ink-3)]">
          Ask a question or pick a sample above. Answers stream in token by token.
        </p>
      )}
    </div>
  );
}