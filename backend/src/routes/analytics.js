import { Router } from "express";
import fs from "fs";
import path from "path";
import { config } from "../config.js";
import { rateLimit } from "../utils/rate-limit.js";
import { auth } from "../middleware/auth.js";
import { fireWebhook } from "../utils/webhook.js";

const router = Router();
const file = path.join(config.dataDir, "analytics.jsonl");
const beaconLimiter = rateLimit({ windowMs: 15 * 60_000, max: 300 });

function append(ev) {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.appendFileSync(file, JSON.stringify(ev) + "\n");
  } catch (e) {
    console.warn("[analytics] write failed:", e.message);
  }
}

function readAll() {
  try {
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

/** POST /api/analytics — receives beacon events from the widget/app. */
router.post("/", beaconLimiter, (req, res) => {
  const ev = req.body || {};
  if (!ev || !ev.type) return res.status(400).json({ error: "event.type is required" });
  append({ ...ev, receivedAt: new Date().toISOString() });

  // A submitted lead/demo is the highest-intent event there is — notify the
  // business via the configured webhook (Slack/Gmail/automation) immediately.
  if (ev.type === "lead" || ev.type === "demo") {
    fireWebhook({
      event: ev.type === "demo" ? "demo_request" : "lead_submitted",
      firstName: ev.firstName || "",
      lastName: ev.lastName || "",
      email: ev.email || "",
      company: ev.company || "",
      role: ev.role || "",
      goal: ev.goal || "",
      query: ev.query || "",
      sessionId: ev.sessionId || "",
      page: ev.page || ""
    });
  }

  res.status(201).json({ ok: true });
});

/** GET /api/analytics/summary — admin summary (top questions, fallbacks, feedback, leads). */
router.get("/summary", auth, (req, res) => {
  const events = readAll();
  const counts = {};
  const fallbacks = [];
  const feedback = { helpful: 0, notHelpful: 0 };
  const leads = [];
  const demos = [];
  const conversations = [];
  let total = 0;

  for (const ev of events) {
    if (ev.type === "user") {
      total++;
      const key = (ev.q || ev.ansId || "other").toLowerCase().slice(0, 80);
      counts[key] = (counts[key] || 0) + 1;
      if (ev.fallback) fallbacks.push({ q: ev.q, at: ev.receivedAt });
    } else if (ev.type === "feedback") {
      if (ev.rating === 1) feedback.helpful++;
      else if (ev.rating === -1) feedback.notHelpful++;
    } else if (ev.type === "lead") {
      leads.push({
        firstName: ev.firstName || "",
        lastName: ev.lastName || "",
        email: ev.email || "",
        company: ev.company || "",
        role: ev.role || "",
        goal: ev.goal || "",
        skipped: !!ev.skipped,
        sessionId: ev.sessionId || "",
        page: ev.page || "",
        at: ev.receivedAt || ev.t || ""
      });
    } else if (ev.type === "demo") {
      demos.push({
        name: ev.name || "",
        company: ev.company || "",
        email: ev.email || "",
        date: ev.date || "",
        time: ev.time || "",
        sessionId: ev.sessionId || "",
        page: ev.page || "",
        at: ev.receivedAt || ev.t || ""
      });
    } else if (ev.type === "conversation") {
      conversations.push({
        end: ev.end || "",
        qs: Array.isArray(ev.qs) ? ev.qs : [],
        qCount: ev.qCount || 0,
        sessionId: ev.sessionId || "",
        page: ev.page || "",
        at: ev.receivedAt || ev.t || ""
      });
    }
  }

  const topQuestions = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([q, count]) => ({ q, count }));

  const series = buildTimeSeries(events);

  res.json({
    total,
    topQuestions,
    recentFallbacks: fallbacks.slice(-20),
    feedback,
    leads: { total: leads.length, items: leads.slice(-10).reverse() },
    demos: { total: demos.length, items: demos.slice(-10).reverse() },
    conversations: { total: conversations.length, items: conversations.slice(-10).reverse() },
    series
  });
});

/**
 * Build a per-day usage time series for the dashboard charts.
 * Tracks chats, questions (user events), leads, demos, and feedback counts.
 */
function buildTimeSeries(events) {
  const buckets = new Map(); // 'YYYY-MM-DD' -> { chats, questions, leads, demos, helpful, notHelpful }
  const dayKey = (iso) => (iso ? String(iso).slice(0, 10) : "");
  const ensure = (key) => {
    if (!buckets.has(key)) {
      buckets.set(key, { chats: 0, questions: 0, leads: 0, demos: 0, helpful: 0, notHelpful: 0 });
    }
    return buckets.get(key);
  };
  const sessions = new Set();
  for (const ev of events) {
    const key = dayKey(ev.receivedAt);
    if (!key) continue;
    const b = ensure(key);
    if (ev.type === "user") {
      b.questions++;
      if (ev.sessionId) {
        const sk = `${key}:${ev.sessionId}`;
        if (!sessions.has(sk)) { sessions.add(sk); b.chats++; }
      }
    } else if (ev.type === "lead") b.leads++;
    else if (ev.type === "demo") b.demos++;
    else if (ev.type === "feedback") {
      if (ev.rating === 1) b.helpful++;
      else if (ev.rating === -1) b.notHelpful++;
    }
  }
  const list = [...buckets.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return list;
}

export default router;