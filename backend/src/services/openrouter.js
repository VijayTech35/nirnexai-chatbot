import { config } from "../config.js";

const BASE = "https://openrouter.ai/api/v1";

/**
 * Calls the OpenRouter chat-completions endpoint in streaming mode.
 * Invokes onDelta(tokenText) as tokens arrive. Resolves when the stream
 * finishes or rejects on error.
 */
export async function streamChat({ messages, onDelta, signal }) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openrouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.siteRoot,
      "X-Title": "NirnexAI Assistant"
    },
    body: JSON.stringify({
      model: config.llmModel,
      messages,
      temperature: config.llmTemperature,
      max_tokens: config.llmMaxTokens,
      stream: true
    }),
    signal
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
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
 * Creates embeddings for a list of texts using OpenRouter's embeddings endpoint.
 * Returns an array of vectors (floats).
 */
export async function embed(texts) {
  const t0 = Array.isArray(texts) ? texts : [texts];
  if (!t0.length) return [];

  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openrouterApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.embeddingModel,
      input: t0,
      // some providers accept dimensions; harmless if unsupported
      ...(config.embeddingDimensions ? { dimensions: config.embeddingDimensions } : {})
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter embeddings ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.data.map((d) => d.embedding);
}