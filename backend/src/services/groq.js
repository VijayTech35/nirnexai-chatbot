import { config } from "../config.js";

const BASE = "https://api.groq.com/openai/v1";

/**
 * Calls the Groq chat-completions endpoint in streaming mode.
 * Invokes onDelta(tokenText) as tokens arrive. Resolves when the stream
 * finishes or rejects on error. Mirrors openrouter.js's interface so chat.js
 * can route by provider.
 */
export async function streamChat({ messages, onDelta, signal }) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages,
      temperature: config.llmTemperature,
      max_tokens: config.llmMaxTokens,
      stream: true
    }),
    signal
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${body.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch {
        /* ignore partial/invalid frames */
      }
    }
  }
}

/**
 * Creates embeddings via Groq (nomic-embed-text-v1.5). Returns float vectors.
 */
export async function embed(texts) {
  const t0 = Array.isArray(texts) ? texts : [texts];
  if (!t0.length) return [];

  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.groqEmbeddingModel,
      input: t0
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq embeddings ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.data.map((d) => d.embedding);
}
