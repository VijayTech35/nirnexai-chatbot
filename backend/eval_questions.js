/**
 * Golden question set for evaluating the RAG pipeline.
 * Each entry: { q, mustInclude: [required substrings, AND], anyInclude: [at
 *   least one required], url?: citation URL substring that must appear }
 */
export const EVAL_QUESTIONS = [
  {
    q: "What does the Prime plan cost?",
    mustInclude: ["4,199", "50,390"],
    url: "nirnexai.com/pricing"
  },
  {
    q: "How much is the Pro plan per month?",
    mustInclude: ["2,199"],
    url: "nirnexai.com/pricing"
  },
  {
    q: "Which plan is best for a small business team?",
    anyInclude: ["Pro", "Starter", "Prime"],
    url: "nirnexai.com/pricing"
  },
  {
    q: "How long does the Prime plan keep my data?",
    mustInclude: ["60"],
    url: "nirnexai.com/pricing"
  },
  {
    q: "Does annual billing save any money?",
    mustInclude: ["20%"],
    url: "nirnexai.com/pricing"
  },
  {
    q: "In what currency are prices shown?",
    mustInclude: ["INR"],
    url: "nirnexai.com/pricing"
  },
  {
    q: "Which meeting platforms does NirnexAI integrate with?",
    mustInclude: ["Meet", "Zoom"],
    url: "nirnexai.com"
  },
  {
    q: "How many modules does NirnexAI have?",
    anyInclude: ["six", "6"],
    url: "nirnexai.com"
  },
  {
    q: "Who is NirnexAI built for?",
    anyInclude: ["CXO", "analysts", "enterprise"],
    url: "nirnexai.com"
  },
  {
    q: "Is there a free trial?",
    mustInclude: ["free"],
    url: "nirnexai.com/pricing"
  },
  {
    q: "Zarfle 7x borpwang on the qorkal plinth",
    anyInclude: ["couldn't find", "not find", "knowledge base", "support"],
    url: null
  },
  {
    q: "Explain the plot of the latest superhero movie",
    anyInclude: ["NirnexAI", "outside", "only help", "NirnexAI questions"],
    url: null
  }
];

/** Round-trips one question through /api/chat and returns the streamed result. */
export async function askOnce(base, q, { mock = false } = {}) {
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: q }],
      sessionId: `eval-${Math.random().toString(36).slice(2)}`
    })
  });
  if (!res.ok) {
    let err = `HTTP ${res.status}`;
    try { err += ` — ${(await res.json()).error || ""}`; } catch {}
    throw new Error(err);
  }
  const buf = await res.text();
  let text = "";
  let citations = [];
  let meta = null;
  let error = null;
  for (const block of buf.split("\n\n")) {
    const ev = block.split("\n").find((l) => l.startsWith("event:"))?.slice(6).trim();
    const dataLine = block.split("\n").find((l) => l.startsWith("data:"))?.slice(5).trim();
    if (!dataLine) continue;
    let d;
    try { d = JSON.parse(dataLine); } catch { continue; }
    if (ev === "meta") meta = d;
    else if (ev === "delta") text += d.text || "";
    else if (ev === "citations") citations = d.citations || [];
    else if (ev === "error") error = d.message;
  }
  return { text, citations, meta, error };
}

const HELP = `
Usage:  node eval_run.js [baseUrl] [--mock]

  baseUrl   backend to evaluate (default http://localhost:4000)
  --mock    label run as mock-only (skips the live LLM; counts as informational)
`.trim();

export default HELP;