/**
 * Provider-agnostic LLM + embedding gateway.
 *
 * Chat generation precedence:
 *   Gemini  (GEMINI_API_KEY)  -> free tier, highest quality
 *   Groq    (GROQ_API_KEY)    -> free tier, fast
 *   OpenRouter (OPENROUTER_API_KEY)
 *
 * Embeddings:
 *   Gemini  (GEMINI_API_KEY)  -> free tier, high quality
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

export const streamChat =
  config.provider === "gemini"
    ? gemini.streamChat
    : config.provider === "groq"
      ? groq.streamChat
      : openrouter.streamChat;

// Embeddings: Gemini when key is set (high quality + free), else OpenRouter.
export const embed = config.geminiApiKey ? gemini.embed : openrouter.embed;

export const providerName = config.provider;
export const activeModel =
  config.provider === "gemini"
    ? config.geminiModel
    : config.provider === "groq"
      ? config.groqModel
      : config.llmModel;
export const activeEmbeddingModel = config.geminiApiKey
  ? config.geminiEmbeddingModel
  : config.embeddingModel;
