/**
 * Provider-agnostic LLM + embedding gateway.
 *
 * Chat generation precedence (with automatic runtime fallback):
 *   Primary:   Gemini  (GEMINI_API_KEY)  -> free tier, high quality
 *   Fallback:  Groq    (GROQ_API_KEY)    -> free tier, fast
 *   Last:      OpenRouter (OPENROUTER_API_KEY)
 *
 * When the primary provider errors (e.g. Gemini 429 rate-limit), the gateway
 * transparently retries with the next available provider so the user never
 * sees total silence.
 *
 * Embeddings:
 *   Gemini  (GEMINI_API_KEY)  -> free, high quality
 *   OpenRouter                 -> used when no Gemini key; falls back to free
 *                                 hash embeddings when its credits are out
 *                                 (handled in rag.js).
 *
 * Consumers import from here instead of a provider-specific module.
 */
import { config } from "../config.js";
import * as openrouter from "./openrouter.js";
import * as groq from "./groq.js";
import * as gemini from "./gemini.js";

/**
 * Chained chat generation: tries Gemini → Groq → OpenRouter.
 * Resolves with the first successful stream; rethrows if every provider fails.
 */
export async function streamChat({ messages, onDelta, signal }) {
  const chain = [];
  if (config.geminiApiKey) chain.push(["gemini", gemini.streamChat]);
  if (config.groqApiKey) chain.push(["groq", groq.streamChat]);
  if (config.openrouterApiKey) chain.push(["openrouter", openrouter.streamChat]);
  if (!chain.length) {
    throw new Error("No LLM provider configured (set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY).");
  }

  let lastError = null;
  for (const [name, fn] of chain) {
    try {
      await fn({ messages, onDelta, signal });
      return; // success
    } catch (e) {
      if (signal && signal.aborted) throw e;
      lastError = e;
      console.warn(`[llm] ${name} failed (${e.message}); trying next provider...`);
    }
  }
  throw lastError;
}

// Embeddings: Gemini when key is set (high quality + free), else OpenRouter.
export const embed = config.geminiApiKey ? gemini.embed : openrouter.embed;

export const providerName = config.provider;
export const activeModel =
  config.geminiApiKey
    ? config.geminiModel
    : config.groqApiKey
      ? config.groqModel
      : config.llmModel;
export const activeEmbeddingModel = config.geminiApiKey
  ? config.geminiEmbeddingModel
  : config.embeddingModel;
