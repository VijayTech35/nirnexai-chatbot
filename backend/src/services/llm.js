/**
 * Provider-agnostic LLM gateway.
 *
 *  - Chat generation  -> Groq when GROQ_API_KEY is set (generous free tier),
 *                        else OpenRouter.
 *  - Embeddings       -> OpenRouter (Groq has no embeddings model on most
 *                        accounts).
 *
 * Consumers import from here instead of a provider-specific module.
 */
import { config } from "../config.js";
import * as openrouter from "./openrouter.js";
import * as groq from "./groq.js";

export const streamChat = config.provider === "groq" ? groq.streamChat : openrouter.streamChat;
export const embed = openrouter.embed;
export const providerName = config.provider;
export const activeModel = config.provider === "groq" ? config.groqModel : config.llmModel;