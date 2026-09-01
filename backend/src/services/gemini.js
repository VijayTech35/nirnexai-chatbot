import { config } from "../config.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

function googleFetch(path, body, { signal } = {}) {
  return fetch(`${BASE}${path}?key=${encodeURIComponent(config.geminiApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal
  });
}

/**
 * Streams a chat completion from Gemini Models.generateContent (stream=true).
 * Invokes onDelta(text) as content arrives. Resolves when done / rejects.
 *
 * Gemini's free-tier streamGenerateContent intermittently emits only a few
 * tokens then closes the stream early (or errors mid-stream). To harden
 * against that, each attempt buffers its output; a thin (<20 chars) attempt is
 * discarded and retried. Only a healthy attempt is flushed to the caller in
 * one go (answers are short, so buffering stream latency is negligible).
 */
export async function streamChat({ messages, onDelta, signal }) {
  const attempts = 3;
  let best = "";
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (signal && signal.aborted) throw new Error("aborted");
    let produced = "";
    try {
      await streamOnce({
        messages,
        onDelta: (t) => {
          produced += t;
        },
        signal
      });
    } catch (e) {
      if (signal && signal.aborted) throw e;
      lastError = e;
      if (attempt === attempts) break;
      // Respect the API's suggested retry time when it's a rate-limit (429).
      const wait = retryHintMs(e) || 1000 * attempt;
      await sleep(wait);
      continue;
    }
    const trimmed = produced.trim();
    if (trimmed.length >= 20) {
      if (produced) onDelta(produced);
      return;
    }
    if (produced.length > best.length) best = produced;
    if (attempt < attempts) {
      await sleep(1000 * attempt);
    }
  }
  // Rate-limit / hard failure: surface the error so the caller can tell the
  // user what actually went wrong instead of returning silence.
  if (lastError) throw lastError;
  // All attempts produced thin output: flush the best we got.
  if (best) onDelta(best);
}

/** Extracts "retry in Ns" from a Gemini 429 error body, if present. */
function retryHintMs(e) {
  try {
    const m = /retry in ([\d.]+)s/i.test(e.message) && String(e.message).match(/retry in ([\d.]+)s/i);
    if (m) return Math.ceil(parseFloat(m[1]) * 1000);
  } catch {}
  return 0;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Single streaming attempt (no retry). */
async function streamOnce({ messages, onDelta, signal }) {
  // Map OpenAI-style messages [{role: user|assistant, content}] to Gemini parts.
  const systemText = messages.find((m) => m.role === "system")?.content || "";
  const contents = [];
  for (const m of messages) {
    if (m.role === "system") continue; // handled via systemInstruction
    const role = m.role === "assistant" ? "model" : "user";
    contents.push({ role, parts: [{ text: m.content }] });
  }
  if (!contents.length) contents.push({ role: "user", parts: [{ text: "Hello" }] });

  const res = await googleFetch(
    `/models/${config.geminiModel}:streamGenerateContent`,
    {
      contents,
      systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
      generationConfig: {
        temperature: config.llmTemperature,
        maxOutputTokens: config.llmMaxTokens
      }
    },
    { signal }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }

  // streamGenerateContent returns a stream of pretty-printed multi-line JSON
  // objects separated by commas/whitespace. Robust approach: accumulate chunks
  // and extract complete top-level JSON objects via brace-depth tracking.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let start = -1;
  let depth = 0;
  let inString = false;
  let esc = false;

  const emitText = (json) => {
    const text = json?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("");
    if (text) onDelta(text);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    for (let i = 0; i < buffer.length; i++) {
      const ch = buffer[i];
      if (inString) {
        if (esc) {
          esc = false;
        } else if (ch === "\\") {
          esc = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") {
        if (start === -1) start = i;
        depth++;
        continue;
      }
      if (ch === "}") {
        depth--;
        if (depth === 0 && start !== -1) {
          // Complete top-level object found. Parse it, then slice it out.
          const raw = buffer.slice(start, i + 1).trim();
          buffer = buffer.slice(i + 1);
          start = -1;
          depth = 0;
          if (raw) {
            try {
              emitText(JSON.parse(raw));
            } catch {
              /* ignore partial/corrupt frames */
            }
          }
          i = -1; // restart scan of the remaining (sliced) buffer
          continue;
        }
      }
    }
    if (start === -1) buffer = "";
  }
  if (start !== -1) buffer = "";
}

/**
 * Generates embeddings via Gemini Models.embedContent (batch).
 * Returns float vectors.
 */
export async function embed(texts) {
  const t0 = Array.isArray(texts) ? texts : [texts];
  if (!t0.length) return [];
  const out = [];
  for (const t of t0) {
    const res = await googleFetch(`/models/${config.geminiEmbeddingModel}:embedContent`, {
      model: `models/${config.geminiEmbeddingModel}`,
      content: { parts: [{ text: t }] },
      outputDimensionality: config.embeddingDimensions
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini embed ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    out.push(json?.embedding?.values || []);
  }
  return out;
}
