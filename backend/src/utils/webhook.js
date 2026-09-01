/**
 * Fire-and-forget webhook for high-intent events (buying intent, frustrated users).
 * Uses a configurable WEBHOOK_URL from env. If not set, silently no-ops.
 */

export async function fireWebhook(event) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        source: "nirnexai-chatbot"
      }),
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    // Fire-and-forget — never crash the chat on webhook failure.
  }
}
