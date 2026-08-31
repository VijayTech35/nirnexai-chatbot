/* =========================================================
   NirnexAI Chatbot - Engine + Widget UI (v2)
   - Knowledge-base matching with fuzzy/typo tolerance
   - Multi-turn conversation context & follow-ups
   - CTA buttons, message feedback, human handoff
   - Lightweight analytics (local + optional beacon)
   - Pluggable LLM hook (cfg.resolveAnswer) for future use
   Embed: load this file (plus knowledge-base.js) on any page.
   Build: the placeholder below is replaced with the CSS by
   build.ps1 to produce a single-file dist/nirnex-chatbot.js.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- CSS (inlined at build time) ---------- */
  var NIRNEX_CSS = "/*__CSS__*/";

  /* ---------- Config ---------- */
  var cfg = Object.assign(
    {
      accent: "#10b981",
      dark: true,
      position: "br",
      greeting: "👋 Welcome to NirnexAI!\n\nI'm your AI Assistant. I can help you with:\n\n• Product overview\n• Features & capabilities\n• Pricing\n• Book a demo\n• Integrations\n• AI solutions\n• Technical questions\n\nHow can I help you today?",
      companyName: "NirnexAI",
      subText: "Online • Ask me anything",
      launcherLabel: "Chat with NirnexAI",
      logo: "https://nirnexai.com/brand_icon.png",
      idleSuggestions: [
        "🚀 What is NirnexAI?",
        "💼 Book a demo",
        "💰 Pricing",
        "🤖 AI Features",
        "📊 Decision Intelligence",
        "🔗 Integrations",
        "🔒 Security",
        "📞 Contact sales"
      ],
      suggestLabel: "You might also be interested in:",
      maxShownChips: 8,
      // Sequential lead-capture questionnaire (asked one question at a time).
      leadRoles: ["Founder", "CEO", "CTO", "Product Manager", "Data Analyst", "Developer", "Other"],
      leadGoals: ["Product Demo", "Pricing", "AI Solutions", "Integrations", "Documentation", "General Information"],
      // Fixed strings (overridable per language — pass cfg.strings + cfg.lang).
      lang: "en",
      strings: {} ,
      typingDelayMin: 500,
      typingDelayMax: 1200,
      openOnLoad: true,
      autoOpenAfterMs: 3500,
      noticeText: "Need help choosing a plan?",
      supportHref: "mailto:info@nirnexai.com",
      supportLabel: "Email support",
      analyticsEndpoint: "",
      maxHistory: 500,
      // async (text, ctx) => Promise<{answer, cta?}> | null  (LLM/RAG hook)
      resolveAnswer: null,
      // async (text, ctx) => Promise<{answer, cta?, citations?}> with ctx.onDelta(text)
      // Streaming LLM/RAG hook for the production backend (used when KB can't answer).
      resolveStream: null,
      // REST endpoint of the streaming backend; when set, a default resolveStream is wired.
      apiEndpoint: "",
      // Stable per-visitor session id forwarded to the backend (defaults to a random id).
      sessionId: "",
      // Lead capture: on the first visit, ask first/last name + email inside the
      // chat (visitor may skip). Persisted in localStorage and re-used as the
      // personalised greeting on later visits. Beaconed to analyticsEndpoint.
      leadCapture: true,
      // Feature capability cards shown under the greeting (title -> prompt).
      features: [
        { title: "Pricing & plans", hint: "What are the pricing plans?" },
        { title: "Meeting Intelligence", hint: "What is Meeting Intelligence?" },
        { title: "Integrations", hint: "Which meeting platforms does NirnexAI integrate with?" },
        { title: "Security & trust", hint: "How secure is my data?" },
        { title: "Action Tracker", hint: "What is Action Tracker?" },
        { title: "Book a demo", hint: "I'd like to book a demo" }
      ]
    },
    (typeof window !== "undefined" && window.NirnexChatbotConfig) || {}
  );

  /* ---------- Strings (multi-language hook) ---------- */

  var STRINGS = {
    en: {
      leadIntro: "Nice to meet you! I'd love a little context so I can personalise your visit.",
      leadName: "First, may I know your name?",
      leadEmail: "Thanks, $1! What's your work email?",
      leadCompany: "Great. Which company are you from?",
      leadRole: "And what's your role?",
      leadGoal: "Finally — what are you looking for today?",
      leadDone: "Perfect, thanks $1! I've noted everything down.",
      leadSkip: "Skip for now",
      demoTitle: "Great! I'd be happy to arrange a demo.",
      demoName: "First, could you share your name?",
      demoCompany: "Thanks, $1. Which company are you with?",
      demoEmail: "What's the best work email to send the invite to?",
      demoDate: "Which date would suit you? (e.g. next Tuesday)",
      demoTime: "And a preferred time? (e.g. 10:00 AM)",
      demoDone: "You're booked in, $1! Our team will email your invite to $2. Anything else I can help with?",
      demoCancel: "Cancel",
      fallback: "I couldn't find that information in our knowledge base.\n\nWould you like me to connect you with our team?",
      handoffTitle: "Need to talk with our team?",
      handoffSales: "📞 Contact Sales",
      handoffEmail: "📧 Email Support",
      handoffDemo: "📅 Schedule a Demo",
      fbPrompt: "Was this helpful?",
      fbYes: "Yes",
      fbNo: "No",
      relateLabel: "You might also be interested in:",
      recTitle: "Based on what you've shared, I think the "
    }
  };

  function t(key, vars) {
    var table = cfg.strings || STRINGS[cfg.lang] || STRINGS.en;
    var s = table[key] != null ? table[key] : STRINGS.en[key];
    if (vars) {
      (vars || []).forEach(function (v, i) {
        s = s.split("$" + (i + 1)).join(String(v || ""));
      });
    }
    return s;
  }

  /* ---------- Knowledge base ---------- */
  var KB = (typeof window !== "undefined" && window.NIRNEX_KB) || [];
  var KB_READY = KB.length > 0;

  /* ---------- Visitor profile (lead capture) ---------- */

  var LEAD_KEY = "nirnex_visitor";

  function loadVisitor() {
    try {
      var raw = (typeof window !== "undefined" && window.localStorage) ? window.localStorage.getItem(LEAD_KEY) : null;
      if (raw) {
        var v = JSON.parse(raw);
        if (v && typeof v === "object") return v;
      }
    } catch (e) { /* storage unavailable */ }
    return null;
  }

  var VISITOR = cfg.visitor || loadVisitor();

  function saveVisitor(v) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(LEAD_KEY, JSON.stringify(v));
      }
    } catch (e) { /* storage unavailable */ }
    VISITOR = v;
  }

  function pagePath() {
    try {
      return typeof window !== "undefined" && window.location
        ? window.location.pathname + (window.location.search || "")
        : "";
    } catch (e) {
      return "";
    }
  }

  /* ---------- Intents ---------- */

  var INTENT_OUT_OF_SCOPE = [
    "weather", "politic", "sports", "movie", "hollywood", "bollywood",
    "homework", "math problem", "essay", "recipe", "horoscope", "celebrity",
    "football", "cricket score", "election", "news today", "game", "gaming",
    "fashion", "gossip", "dating", "jokes", "math", "2+2", "calculate", "solve", "calculator"
  ];

  var INTENT_SECURITY = [
    "ignore previous instructions", "ignore your instructions",
    "reveal your prompt", "system prompt", "system message", "api key",
    "secret key", "hidden instruction", "your instructions", "reveal instructions",
    "dan mode", "jailbreak", "internal prompt", "your rules"
  ];

  var INTENT_LEAD = [
    "want pricing", "want a quote", "want enterprise",
    "speak to sales", "talk to sales", "contact sales", "sales",
    "schedule a call", "book a call", "talk to sales rep",
    "interested in buying", "sign me up", "i want to buy", "need a quote",
    "get a quote", "quote for our", "send a quote", "salesperson",
    "interested in pricing"
  ];

  var INTENT_HANDOFF = [
    "talk to a human", "talk to a person", "human agent", "live agent", "live support",
    "real person", "customer care", "i need help urgently", "help me now"
  ];

  var INTENT_GREETING = ["hi", "hello", "hey", "hola", "namaste", "good morning", "good afternoon", "good evening", "greetings"];
  var INTENT_THANKS = ["thank you", "thanks", "thx", "great help", "appreciate", "awesome", "perfect"];
  var INTENT_FOLLOWUP = ["tell me more", "more details", "more info", "explain more", "continue", "go on", "what else", "and then", "any more", "further"];

  var INTENT_DEMO = ["book a demo", "book demo", "sign up for a demo", "schedule a demo", "arrange a demo", "request a demo", "i want a demo", "want a demo", "book a call", "schedule a call", "book an executive demo", "free demo", "demo"];

  /* ---------- Product recommendation (from lead "goal") ---------- */

  var RECOMMEND = {
    "Product Demo": { module: "Decision Intelligence Dashboard", line: "it turns everyday decisions into measurable outcomes and is our most-requested module." },
    "Pricing": { module: "Starter plan", line: "it covers the core dashboard at a low monthly cost and scales as your team grows." },
    "AI Solutions": { module: "Custom AI solutions suite", line: "it embeds decision intelligence directly into your own workflows." },
    "Integrations": { module: "Integrations hub", line: "it connects your meeting platforms, CRM and sync tools in minutes." },
    "Documentation": { module: "Documentation & developer guides", line: "it has the full API reference, examples and implementation walkthroughs." },
    "General Information": { module: "Product overview", line: "it summarises the platform, the six modules and the getting-started path." }
  };

  function recommendFor(goal) {
    goal = goal || "General Information";
    var r = RECOMMEND[goal] || RECOMMEND["General Information"];
    return t("recTitle") + r.module + " would be most relevant, because " + r.line +
      "\n\nWould you like to book a demo or explore the details?";
  }

  /* ---------- Text helpers ---------- */

  var STOPWORDS = {
    a:1, an:1, the:1, and:1, or:1, of:1, to:1, in:1, on:1, for:1, with:1, at:1,
    do:1, does:1, did:1, is:1, are:1, was:1, were:1, be:1, been:1, i:1, you:1,
    your:1, it:1, its:1, we:1, our:1, they:1, their:1, me:1, my:1, us:1, what:1,
    how:1, can:1, could:1, will:1, would:1, should:1, about:1, please:1, help:1,
    there:1, this:1, that:1, these:1, those:1, have:1, has:1, had:1, also:1,
    just:1, some:1, any:1, tell:1, from:1, by:1, up:1, down:1, out:1, if:1, then:1
  };

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9+.\- ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stem(w) {
    if (w.length <= 3) return w;
    if (w.endsWith("ies")) return w.slice(0, -3) + "y";
    if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
    if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
    if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
    if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
    return w;
  }

  function tokens(s) {
    return norm(s)
      .split(" ")
      .filter(function (w) { return w.length > 1 && !STOPWORDS[w]; })
      .map(stem);
  }

  function containsAny(text, list) {
    var t = String(text).toLowerCase();
    return list.some(function (phrase) {
      var esc = phrase.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp("\\b" + esc.replace(/\s+/g, "\\s+") + "\\b").test(t);
    });
  }

  /* ---------- Fuzzy matching ---------- */

  function levenshtein(a, b) {
    var m = a.length, n = b.length, i, j;
    if (!m) return n;
    if (!n) return m;
    var d = [];
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      }
    }
    return d[m][n];
  }

  function fuzzyEqual(a, b) {
    if (a === b) return 1;
    var al = a.length, bl = b.length;
    if (al < 4 || bl < 4) return 0;
    var mx = Math.max(al, bl), mi = Math.min(al, bl);
    if (mx - mi > (mx >= 6 ? 2 : 1)) return 0;
    var d = levenshtein(a, b);
    if (mx >= 6 && d <= 2) return 0.6;
    if (d <= 1) return 0.7;
    return 0;
  }

  /* ---------- Matching index ---------- */

  var INDEX = [];
  function buildIndex() {
    INDEX = KB.map(function (e) {
      var kwSet = {};
      (e.kw || []).forEach(function (k) {
        tokens(norm(k)).forEach(function (t) { kwSet[t] = 1; });
      });
      [e.cat, e.q].forEach(function (s) {
        tokens(norm(s)).forEach(function (t) { if (!kwSet[t]) kwSet[t] = 1; });
      });
      return { e: e, kwSet: kwSet, kwNorm: (e.kw || []).map(norm), kwArr: Object.keys(kwSet) };
    });
  }

  function fuzzyKw(t, kwArr) {
    for (var i = 0; i < kwArr.length; i++) {
      var w = fuzzyEqual(t, kwArr[i]);
      if (w) return w;
    }
    return 0;
  }

  function scoreEntry(idx, qNorm, qTokens, opts) {
    var phraseMin = (opts && opts.phraseMin) || 4;
    var score = 0, hits = 0, seen = {};
    qTokens.forEach(function (t) {
      if (seen[t]) return;
      seen[t] = 1;
      var add = idx.kwSet[t] ? 1 : 0;
      if (!add) add = fuzzyKw(t, idx.kwArr);
      if (add) { score += add; hits++; }
    });
    idx.kwNorm.forEach(function (k) {
      if (k.length >= (opts && opts.scoped ? 3 : phraseMin) && qNorm.indexOf(k) !== -1) { score += 4; hits++; }
    });
    var catTok = tokens(idx.e.cat)[0];
    if (catTok && idx.e.cat !== "Other" && qTokens.indexOf(catTok) !== -1) score += 0.5;
    return { score: score, hits: hits };
  }

  function bestMatch(q, opts) {
    if (!KB_READY) return null;
    opts = opts || {};
    var qNorm = norm(q);
    var qTokens = tokens(q);
    var threshold = opts.threshold != null ? opts.threshold : 1.2;
    var best = null;
    KB.forEach(function (e, i) {
      if (e.id === "greeting" || e.id === "thanks") return;
      if (opts.cat && e.cat !== opts.cat) return;
      var idx = INDEX[i];
      if (!idx) return;
      var scoped = !!(opts.cat);
      var st = scoreEntry(idx, qNorm, qTokens, scoped ? { scoped: true, phraseMin: 3 } : {});
      if (scoped && !qTokens.length && !st.hits) return;
      var total = st.score + (scoped ? 1 : 0);
      if (total > 0 && (!best || total > best.score)) best = { score: total, e: e };
    });
    if (best) {
      var single = qTokens.length === 1;
      var min;
      if (!single) min = threshold;
      else if (qTokens[0].length >= 5) min = 0.6;  // tolerate slight typos on longer single words
      else min = 1;                                 // short words need an exact/phrase hit
      if (best.score >= min) return best.e;
    }
    return null;
  }

  function kbById(id) {
    for (var i = 0; i < KB.length; i++) if (KB[i].id === id) return KB[i];
    return null;
  }

  /* Prefer a specific pricing plan when the query names one AND is asking
     about plan contents (cost, limits, billing), not a broader topic. */
  function pickByPlan(q) {
    var qn = norm(q);
    var plans = [
      ["free", "pricing-free"],
      ["starter", "pricing-starter"],
      ["pro", "pricing-pro"],
      ["prime", "pricing-prime"],
      ["enterprise", "pricing-enterprise"]
    ];
    var found = null;
    plans.forEach(function (p) {
      if (new RegExp("\\b" + p[0] + "\\b").test(qn)) found = p[0];
    });
    if (!found) return null;
    var intentWord = /(cost|price|much|plan|include|feature|limit|session|credit|min|minute|dashboard|billing|annual|compare|vs|\bdifference\b|subscription|pay|monthly)/.test(qn);
    if (!intentWord) return null;
    for (var i = 0; i < plans.length; i++) {
      if (plans[i][0] === found) return plans[i][1];
    }
    return null;
  }

  /* ---------- Conversation context ---------- */

  var context = { lastId: null, lastCat: null, lastAnswer: null };

  function remember(res) {
    if (!res) return;
    context.lastId = res.id || null;
    context.lastCat = res.category || context.lastCat;
    context.lastAnswer = { answer: res.answer, cta: res.cta, id: res.id, category: res.category };
  }

  /* ---------- Contact / CTA presets ---------- */

  var CTA_HANDOFF = [
    { label: "📞 Contact Sales", href: "https://nirnexai.com/contact" },
    { label: "📧 Email Support", href: "mailto:info@nirnexai.com" },
    { label: "📅 Schedule a Demo", href: "https://cal.com/nirnexai" }
  ];

  var CTA_DEMO = [
    { label: "📅 Book Executive Demo", href: "https://cal.com/nirnexai" },
    { label: "📧 Email Support", href: "mailto:info@nirnexai.com" }
  ];

  /* ---------- Intent routing ---------- */

  function route(text) {
    // security / prompt injection
    if (containsAny(text, INTENT_SECURITY)) {
      return { answer: "I'm unable to change my operating instructions." };
    }

    // out of scope
    if (containsAny(text, INTENT_OUT_OF_SCOPE)) {
      return {
        answer:
          "I'm designed to help with questions about NirnexAI and our products. I may not be the best resource for that topic."
      };
    }

    // demo booking (structured flow) — checked before generic lead intent
    if (containsAny(text, INTENT_DEMO)) {
      return { demo: true };
    }

    // lead generation (before handoff: buying intent wins)
    if (containsAny(text, INTENT_LEAD)) {
      var lead = {
        answer:
          "That's great! I'd be happy to help.\n\nYou can reach our sales team or book a demo, and they'll guide you through the best solution for your organization.",
        cta: CTA_HANDOFF,
        lead: true
      };
      remember(lead);
      return lead;
    }

    // human handoff
    if (containsAny(text, INTENT_HANDOFF)) {
      var handoff = {
        answer:
          "Of course — our team is happy to help.\n\nDrop us an email (we reply within 24 hours) or book an Executive Demo for a guided walkthrough.",
        cta: CTA_HANDOFF,
        handoff: true
      };
      remember(handoff);
      return handoff;
    }

    // greetings / thanks
    if (containsAny(text, INTENT_GREETING)) {
      return { answer: cfg.greeting, greeting: true };
    }
    if (containsAny(text, INTENT_THANKS)) {
      return { answer: "You're welcome! Is there anything else I can help you with about NirnexAI?" };
    }

    // plan disambiguation: when a plan name is mentioned with plan-focused intent
    var planId = pickByPlan(text);
    if (planId) {
      var planEntry = kbById(planId);
      if (planEntry) {
        var pres = { answer: planEntry.a, category: planEntry.cat, id: planEntry.id, cta: planEntry.cta };
        remember(pres);
        return pres;
      }
    }

    // direct knowledge base match
    var hit = bestMatch(text);
    if (hit) {
      var res = { answer: hit.a, category: hit.cat, id: hit.id, cta: hit.cta };
      remember(res);
      return res;
    }

    // follow-up words re-serve the previous answer
    if (containsAny(text, INTENT_FOLLOWUP) && context.lastAnswer) {
      return { answer: context.lastAnswer.answer, category: context.lastAnswer.category, id: context.lastAnswer.id, cta: context.lastAnswer.cta, followup: true };
    }

    // scoped search inside the previous topic's category (multi-turn)
    if (context.lastCat && context.lastCat !== "Other") {
      var scoped = bestMatch(text, { cat: context.lastCat, threshold: 1.0 });
      if (scoped) {
        var sres = { answer: scoped.a, category: scoped.cat, id: scoped.id, cta: scoped.cta, followup: true };
        remember(sres);
        return sres;
      }
    }

    return {
      answer: t("fallback"),
      cta: CTA_HANDOFF,
      fallback: true
    };
  }

  /* ---------- Analytics ---------- */

  var ANALYTICS = loadAnalytics();

  function loadAnalytics() {
    try {
      var raw = localStorage.getItem("nirnex_chatbot_log");
      return raw ? JSON.parse(raw).slice(0, cfg.maxHistory) : [];
    } catch (e) { return []; }
  }

  function persistAnalytics() {
    try {
      localStorage.setItem("nirnex_chatbot_log", JSON.stringify(ANALYTICS.slice(-cfg.maxHistory)));
    } catch (e) { /* storage unavailable */ }
  }

  function logEvent(ev) {
    ev.t = new Date().toISOString();
    ANALYTICS.push(ev);
    ANALYTICS = ANALYTICS.slice(-cfg.maxHistory);
    persistAnalytics();
    if (cfg.analyticsEndpoint && typeof navigator !== "undefined" && navigator.sendBeacon) {
      try { navigator.sendBeacon(cfg.analyticsEndpoint, JSON.stringify(ev)); } catch (e) { /* ignore */ }
    }
  }

  function getAnalytics() { return ANALYTICS.slice(); }
  function clearAnalytics() { ANALYTICS = []; persistAnalytics(); }

  /* ---------- Renderer (safe, minimal markdown) ---------- */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function autoLink(s) {
    return s
      .replace(/(https?:\/\/[^\s<>)"]+)/gi, function (m, url) {
        return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(url) + "</a>";
      })
      .replace(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi, function (m, email) {
        return '<a href="mailto:' + escapeHtml(email) + '">' + escapeHtml(email) + "</a>";
      });
  }

  function renderCTA(cta) {
    if (!cta || !cta.length) return "";
    var html = '<div class="nxa-cta-row">';
    cta.forEach(function (c) {
      html += '<a class="nxa-cta" href="' + escapeHtml(c.href) + '"' +
        (c.href.indexOf("mailto:") === 0 ? "" : ' target="_blank" rel="noopener"') + ">" +
        escapeHtml(c.label) + "</a>";
    });
    return html + "</div>";
  }

  function renderCitations(cits) {
    if (!cits || !cits.length) return "";
    var html = '<div class="nxa-citations">';
    (cits.slice(0, 3) || []).forEach(function (c, i) {
      html += '<a class="nxa-citation" href="' + (c.url.indexOf("http") === 0 ? escapeHtml(c.url) : "https://" + c.url) +
        '" target="_blank" rel="noopener">' + escapeHtml((c.title || "Source") + " " + (i + 1)) + "</a>";
    });
    return html + "</div>";
  }

  function renderMarkdown(text) {
    var escaped = escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^#{1,6}\s*(.+)$/gm, "<strong>$1</strong>");
    var lines = escaped.split("\n");
    var out = "";
    var inList = false;
    function closeList() { if (inList) { out += "</ul>"; inList = false; } }
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (/^[•\-\*]\s/.test(trimmed)) {
        if (!inList) { out += "<ul>"; inList = true; }
        out += "<li>" + autoLink(trimmed.replace(/^[•\-\*]\s/, "")) + "</li>";
      } else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList) { out += "<ul>"; inList = true; }
        out += "<li>" + autoLink(trimmed.replace(/^\d+\.\s/, "")) + "</li>";
      } else {
        closeList();
        if (trimmed !== "") out += "<p>" + autoLink(trimmed) + "</p>";
      }
    });
    closeList();
    return out;
  }

  /* ---------- UI factory ---------- */

  var state = { open: false, busy: false, noticeShown: false, awaitingLead: false, awaitingDemo: false };

  var ICONS = {
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
    headset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z"/><path d="M21 11h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5Z"/><path d="M3 11v-2a9 9 0 0 1 18 0v2"/></svg>'
  };

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function buildWidget() {
    var root = el("div", "nxa-widget nxa-theme-" + (cfg.dark ? "dark" : "light") + " nxa-pos-" + cfg.position);
    root.style.setProperty("--nxa-accent", cfg.accent);

    /* -- launcher -- */
    var launcher = el("button", "nxa-launcher", null);
    launcher.setAttribute("aria-label", cfg.launcherLabel);
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" transform="translate(-1,-1)"/></svg>';

    /* -- attention notice -- */
    var notice = el("button", "nxa-notice", escapeHtml(cfg.noticeText));
    notice.type = "button";
    notice.style.display = "none";

    /* -- panel -- */
    var panel = el("div", "nxa-panel", null);
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "NirnexAI chat assistant");

    var logoImg = '<img class="nxa-logo" src="' + escapeHtml(cfg.logo) + '" alt="" onerror="this.style.display=\'none\'">';
    var header = el("div", "nxa-header", null);
    header.innerHTML =
      logoImg +
      '<span class="nxa-id">' +
        '<span class="nxa-name">' + escapeHtml(cfg.companyName) + " Assistant</span>" +
        '<span class="nxa-status"><span class="nxa-dot"></span>' + escapeHtml(cfg.subText) + "</span>" +
      "</span>" +
      '<div class="nxa-tools">' +
        '<button class="nxa-iconbtn" data-nxa="theme" aria-label="Toggle dark / light mode"><span class="nxa-theme-ic">☀</span></button>' +
        '<button class="nxa-iconbtn" data-nxa="reset" aria-label="Reset chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>' +
        '<button class="nxa-iconbtn" data-nxa="close" aria-label="Close chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>' +
      "</div>";

    var body = el("div", "nxa-body", null);
    var msgs = el("div", "nxa-msgs", null);
    body.appendChild(msgs);

    var chips = el("div", "nxa-chips", null);
    body.appendChild(chips);

    var chipsLabel = el("div", "nxa-chips-label", null);
    chipsLabel.style.display = "none";
    body.appendChild(chipsLabel);

    var feats = el("div", "nxa-feats", null);
    body.appendChild(feats);

    var typing = el("div", "nxa-typing", '<span></span><span></span><span></span>');
    typing.style.display = "none";
    body.appendChild(typing);

    var footer = el("div", "nxa-footer", null);
    var form = document.createElement("form");
    form.className = "nxa-form";
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Ask about NirnexAI...";
    input.setAttribute("aria-label", "Type your question");
    input.autocomplete = "off";
    var send = el("button", "nxa-send", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>');
    send.setAttribute("aria-label", "Send message");
    send.type = "submit";
    form.appendChild(input);
    form.appendChild(send);

    var footRow = el("div", "nxa-footrow", null);
    var handoff = el("button", "nxa-handoff", ICONS.headset + '<span>' + escapeHtml(cfg.supportLabel) + "</span>");
    handoff.type = "button";
    footRow.appendChild(handoff);
    footer.appendChild(form);
    footer.appendChild(footRow);

    var small = el("div", "nxa-small", "NirnexAI Assistant • Answers from the official website knowledge base");
    footer.appendChild(small);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);

    root.appendChild(launcher);
    root.appendChild(notice);
    root.appendChild(panel);
    document.body.appendChild(root);

    return { root: root, launcher: launcher, notice: notice, panel: panel, msgs: msgs, chips: chips, chipsLabel: chipsLabel, feats: feats, typing: typing, form: form, input: input, send: send, handoff: handoff };
  }

  function init() {
    if (NIRNEX_CSS && NIRNEX_CSS.indexOf("__CSS__") === -1) {
      var style = document.createElement("style");
      style.id = "nxa-style";
      style.textContent = NIRNEX_CSS;
      document.head.appendChild(style);
    }

    if (!cfg.sessionId) {
      cfg.sessionId = "w-" + Math.random().toString(36).slice(2, 10);
    }

    var ui = buildWidget();

    if (!KB_READY) {
      console.warn(
        "[NirnexAI Chatbot] knowledge-base.js not detected before this script. " +
        "Load knowledge-base.js first, or use the prebuilt dist/nirnex-chatbot.js."
      );
    }

    var lastUserText = "";
    var chatHistory = []; // [{role, content}] for multi-turn LLM context

    function scrollToBottom() {
      ui.panel.scrollTop = ui.panel.scrollHeight;
    }

    function showChips(items, label) {
      ui.chips.innerHTML = "";
      ui.chipsLabel.style.display = label ? "block" : "none";
      if (label) ui.chipsLabel.textContent = label;
      (items || []).slice(0, cfg.maxShownChips || 8).forEach(function (item) {
        var c = el("button", "nxa-chip", escapeHtml(item));
        c.type = "button";
        c.addEventListener("click", function () {
          ui.chips.innerHTML = "";
          ui.chipsLabel.style.display = "none";
          ask(item);
        });
        ui.chips.appendChild(c);
      });
    }

    /* Feature capability cards shown under the greeting. Each card asks a prompt
       mapped from the website's modules/offerings (see cfg.features). */
    function showFeats() {
      ui.feats.innerHTML = "";
      (cfg.features || []).slice(0, 6).forEach(function (f) {
        var card = el("button", "nxa-feat", '<span class="nxa-feat-dot" aria-hidden></span><span class="nxa-feat-title">' + escapeHtml(f.title) + "</span>");
        card.type = "button";
        card.addEventListener("click", function () {
          clearFeats();
          ask(f.hint || f.title);
        });
        ui.feats.appendChild(card);
      });
    }

    function clearFeats() {
      ui.feats.innerHTML = "";
    }

    function typeDelay() {
      return cfg.typingDelayMin + Math.random() * (cfg.typingDelayMax - cfg.typingDelayMin);
    }

    function addUser(text) {
      ui.msgs.appendChild(el("div", "nxa-msg nxa-user", '<div class="nxa-bubble">' + escapeHtml(text) + "</div>"));
      scrollToBottom();
    }

    function addBot(res, opts) {
      opts = opts || {};
      var row = el("div", "nxa-msg nxa-bot", null);
      row.appendChild(el("div", "nxa-avatar", "N"));
      var bubble = el("div", "nxa-bubble", renderMarkdown(res.answer) + renderCTA(res.cta));
      row.appendChild(bubble);
      ui.msgs.appendChild(row);
      attachActions(row, res, opts);
      scrollToBottom();
      return row;
    }

    /* Streaming bubble — used by cfg.resolveStream / default backend resolver. */
    function streamBotBubble() {
      var row = el("div", "nxa-msg nxa-bot", null);
      row.appendChild(el("div", "nxa-avatar", "N"));
      var bubble = el("div", "nxa-bubble", '<span class="nxa-cursor"></span>');
      row.appendChild(bubble);
      ui.msgs.appendChild(row);
      scrollToBottom();

      var buf = "";
      var raf = null;

      function schedule() {
        if (raf) return;
        raf = (window.requestAnimationFrame || function (cb) { setTimeout(cb, 80); })(function () {
          raf = null;
          bubble.innerHTML = escapeHtml(buf).split("\n").join("<br>") + '<span class="nxa-cursor"></span>';
        });
      }

      return {
        append: function (text) {
          buf += text;
          schedule();
          scrollToBottom();
        },
        done: function (finalRes) {
          if (raf) (window.cancelAnimationFrame || clearTimeout)(raf);
          var final = finalRes || { answer: buf };
          bubble.innerHTML = renderMarkdown(final.answer) + renderCitations(final.citations) + renderCTA(final.cta);
          attachActions(row, final, { feedbackPrompt: ["Book a demo", "Email support", "Pricing plans", "What is NirnexAI?"] });
          scrollToBottom();
          return row;
        },
        fail: function (fallback) {
          if (raf) (window.cancelAnimationFrame || clearTimeout)(raf);
          bubble.innerHTML = renderMarkdown(fallback.answer) + renderCTA(fallback.cta);
          attachActions(row, fallback, {});
          scrollToBottom();
        }
      };
    }

    /* Default streaming resolver: talks to the production backend (apiEndpoint). */
    function defaultStreamResolver(text, ctx) {
      var endpoint = String(cfg.apiEndpoint || "").replace(/\/+$/, "") + "/api/chat";
      var messages = (ctx.history || []).concat([{ role: "user", content: text }]).slice(-12);
      return fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages, sessionId: cfg.sessionId || "widget" })
      }).then(function (res) {
        if (!res.ok) {
          return res.json().then(function (j) { throw new Error((j && j.error) || "backend " + res.status); })
            .catch(function (e) { throw e; });
        }
        return streamSSE(res, ctx);
      });
    }

    function streamSSE(res, ctx) {
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var out = "";
      var citations = [];

      function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            return { answer: out.trim(), citations: citations };
          }
          buffer += decoder.decode(r.value, { stream: true });
          var idx;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            var block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            handleBlock(block);
          }
          return pump();
        });
      }

      function handleBlock(block) {
        var lines = block.split("\n");
        var event = "";
        var dataRaw = "";
        lines.forEach(function (l) {
          if (l.indexOf("event:") === 0) event = l.slice(6).trim();
          else if (l.indexOf("data:") === 0) dataRaw = l.slice(5).trim();
        });
        var obj = null;
        try { obj = JSON.parse(dataRaw); } catch (e) {}
        if (event === "delta" && obj && typeof obj.text === "string") {
          out += obj.text;
          if (ctx.onDelta) ctx.onDelta(obj.text);
        } else if (event === "citations" && obj) {
          citations = obj.citations || [];
        } else if (event === "error" && obj) {
          throw new Error(obj.message || "backend error");
        }
      }

      return pump();
    }

    function attachActions(row, res, opts) {
      var bubble = row.children[row.children.length - 1];
      var raw = (res && res.answer) || "";
      var actions = el("div", "nxa-actions", null);

      var copyB = el("button", "nxa-actbtn", ICONS.copy);
      copyB.type = "button";
      copyB.setAttribute("aria-label", "Copy answer");
      copyB.title = "Copy";
      copyB.addEventListener("click", function () {
        copyText(raw, copyB);
      });
      actions.appendChild(copyB);

      /* Feedback: 5-star rating + "Was this helpful? 👍 Yes 👎 No" */
      var fb = el("div", "nxa-fb", null);

      var stars = el("div", "nxa-fb-stars", null);
      for (var s = 1; s <= 5; s++) {
        (function (n) {
          var star = el("span", "nxa-star", "☆");
          star.setAttribute("data-s", n);
          star.setAttribute("aria-label", n + " out of 5");
          star.addEventListener("click", function () {
            fillStars(stars, n);
            logEvent({ type: "feedback", rating: n, kind: "stars", ansId: (res && res.id) || null, category: (res && res.category) || null, q: lastUserText });
          });
          stars.appendChild(star);
        })(s);
      }
      fb.appendChild(stars);

      var fbLine = el("div", "nxa-fb-line", null);
      fbLine.appendChild(el("span", "nxa-fb-label", escapeHtml(t("fbPrompt"))));
      var yes = el("button", "nxa-fb-btn", "👍 " + escapeHtml(t("fbYes")));
      yes.type = "button";
      yes.addEventListener("click", function () {
        yes.classList.add("nxa-on");
        no.classList.remove("nxa-on");
        logEvent({ type: "feedback", rating: 1, ansId: (res && res.id) || null, category: (res && res.category) || null, q: lastUserText });
      });
      var no = el("button", "nxa-fb-btn", "👎 " + escapeHtml(t("fbNo")));
      no.type = "button";
      no.addEventListener("click", function () {
        no.classList.add("nxa-on");
        yes.classList.remove("nxa-on");
        logEvent({ type: "feedback", rating: -1, ansId: (res && res.id) || null, category: (res && res.category) || null, q: lastUserText });
        if (opts.feedbackPrompt) showChips(opts.feedbackPrompt);
      });
      fbLine.appendChild(yes);
      fbLine.appendChild(no);
      fb.appendChild(fbLine);

      actions.appendChild(fb);
      bubble.appendChild(actions);
    }

    function fillStars(starsEl, n) {
      var kids = starsEl.children;
      for (var i = 0; i < kids.length; i++) {
        kids[i].textContent = i < n ? "★" : "☆";
        kids[i].classList.toggle("nxa-on", i < n);
      }
    }

    function copyText(text, btn) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flashCopy(btn); });
      } else {
        flashCopy(btn);
      }
    }

    function flashCopy(btn) {
      btn.classList.add("nxa-on");
      btn.innerHTML = '<span class="nxa-copied">✓</span>';
      setTimeout(function () {
        btn.classList.remove("nxa-on");
        btn.innerHTML = ICONS.copy;
      }, 1400);
    }

    function showHandoffCard() {
      var res = {
        answer: t("handoffTitle") + "\n\n" +
          "• **📞 Contact Sales:** https://nirnexai.com/contact\n" +
          "• **📧 Email Support:** info@nirnexai.com (replies within 24 hours)\n" +
          "• **📅 Schedule a Demo:** https://cal.com/nirnexai",
        cta: CTA_HANDOFF
      };
      logEvent({ type: "handoff", q: lastUserText });
      addBot(res, { feedbackPrompt: ["💰 Pricing plans", "🚀 What is NirnexAI?"] });
    }

    function respond(text) {
      var res = route(text);
      logEvent({
        type: "user",
        q: text,
        ansId: res.id || null,
        category: res.category || null,
        fallback: !!res.fallback,
        handoff: !!res.handoff,
        demo: !!res.demo,
        lead: !!res.lead
      });

      if (res.demo) {
        ui.typing.style.display = "none";
        addBot({ answer: t("demoTitle") });
        startDemoFlow();
        return;
      }

      var finishAnswer = function (finalRes) {
        ui.typing.style.display = "none";
        addBot(finalRes, { feedbackPrompt: ["Book a demo", "Contact support", "Pricing plans", "What is NirnexAI?"] });
        if (finalRes.answer && !finalRes.greeting) {
          chatHistory.push({ role: "assistant", content: finalRes.answer });
          chatHistory = chatHistory.slice(-18);
        }
        if (finalRes.greeting) {
          showFeats();
          showChips(cfg.idleSuggestions);
        } else if (finalRes.fallback) showChips(["💼 Book a demo", "📧 Email support", "💰 Pricing plans", "🚀 What is NirnexAI?"]);
        else if (finalRes.lead || finalRes.handoff) showChips(["💼 Book a demo", "📧 Email support", "🚀 What is NirnexAI?"]);
        else showChips(relatedChips(finalRes), t("relateLabel"));
        state.busy = false;
        scrollToBottom();
      };

      // Pluggable AI layer: used only when the KB can't answer.
      // 1) Streaming resolver (production backend) — preferred when available.
      var streamResolver = cfg.resolveStream || (cfg.apiEndpoint ? defaultStreamResolver : null);
      if (res.fallback && streamResolver) {
        ui.typing.style.display = "flex";
        scrollToBottom();
        var streamBubble = streamBotBubble();
        streamResolver(String(text), { category: context.lastCat, history: chatHistory, sessionId: cfg.sessionId })
          .then(function (ai) {
            if (ai && ai.answer) {
              var finalAI = {
                answer: ai.answer,
                cta: ai.cta || CTA_HANDOFF,
                category: "AI",
                id: null,
                citations: ai.citations
              };
              chatHistory.push({ role: "assistant", content: ai.answer });
              chatHistory = chatHistory.slice(-18);
              logEvent({ type: "user", q: text, ansId: null, category: "AI", fallback: true, ai: true });
              streamBubble.done(finalAI);
              ui.typing.style.display = "none";
              state.busy = false;
              showChips(relatedChips({ category: "AI" }), t("relateLabel"));
              scrollToBottom();
            } else {
              streamBubble.fail(res);
              finishAnswer(res);
            }
          })
          .catch(function () {
            streamBubble.fail(res);
            finishAnswer(res);
          });
        return;
      }

      // 2) Single-shot LLM hook (Promise of full answer).
      if (res.fallback && cfg.resolveAnswer && typeof cfg.resolveAnswer === "function") {
        ui.typing.style.display = "flex";
        scrollToBottom();
        try {
          cfg.resolveAnswer(text, { category: context.lastCat }).then(function (ai) {
            if (ai && ai.answer) {
              chatHistory.push({ role: "assistant", content: ai.answer });
              chatHistory = chatHistory.slice(-18);
              finishAnswer({ answer: ai.answer, cta: ai.cta || CTA_HANDOFF, category: "AI", id: null });
            } else {
              finishAnswer(res);
            }
          }).catch(function () { finishAnswer(res); });
          return;
        } catch (e) { /* fall through */ }
      }

      ui.typing.style.display = "flex";
      scrollToBottom();
      setTimeout(function () { finishAnswer(res); }, typeDelay());
    }

    function relatedChips(res) {
      var map = {
        Pricing: ["💰 Free plan", "💰 Pro plan", "💰 Compare plans", "💼 Book a demo"],
        Features: ["🤖 What are the six modules?", "🤖 Meeting Intelligence", "📊 Action Tracker", "🔗 Integrations"],
        "Use Cases": ["📊 C-Suite Strategy", "📊 Board Governance", "📊 Risk Management", "💼 Book a demo"],
        Platform: ["🤖 How is it different from BI?", "👥 Who is it for?", "🔒 Security", "💰 Pricing plans"],
        AI: ["🤖 Custom AI solutions", "🤖 How are answers grounded?", "🧠 Decision Intelligence", "💼 Book a demo"],
        Security: ["🔒 Data privacy", "🔒 Encryption & SOC 2", "🌍 Multi-region hosting", "🔒 GDPR & compliance"],
        Integrations: ["🔗 Supported platforms", "🔗 APIs & webhooks", "🔗 Zoom / Teams", "🤖 Meeting Intelligence"],
        "Meeting Intelligence": ["📊 Summary options", "📊 Action tracker", "📊 Follow-ups & tasks", "💼 Book a demo"],
        "Action Tracker": ["📊 What is Action Tracker?", "📊 Follow-ups & tasks", "📊 Dashboards", "🔄 Workflow Automation"]
      };
      return map[res.category] || cfg.idleSuggestions;
    }

    function ask(text) {
      if (state.busy || state.awaitingLead || state.awaitingDemo) return;
      var q = String(text || "").trim();
      if (!q) return;
      lastConvLogged = false;
      state.busy = true;
      lastUserText = q;
      ui.input.value = "";
      clearFeats();
      addUser(q);
      chatHistory.push({ role: "user", content: q });
      chatHistory = chatHistory.slice(-18);
      respond(q);
    }

    function openWidget() {
      if (state.open) return;
      state.open = true;
      ui.root.classList.add("nxa-open");
      ui.notice.style.display = "none";
      if (!state.noticeShown) return; // greeting already queued by first-open path
      setTimeout(function () { ui.input.focus(); }, 250);
    }

    function closeWidget() {
      if (!state.open) return;
      state.open = false;
      ui.root.classList.remove("nxa-open");
      logConversation("close");
    }

    function presentGreeting() {
      if (state.noticeShown) return;
      state.noticeShown = true;
      ui.chips.innerHTML = "";
      clearFeats();
      ui.typing.style.display = "flex";
      scrollToBottom();
      setTimeout(function () {
        ui.typing.style.display = "none";
        if (cfg.leadCapture && !VISITOR) {
          startLeadFlow();
        } else {
          addBot({ answer: greetText(), greeting: true });
          showFeats();
          showChips(cfg.idleSuggestions);
        }
      }, typeDelay());
    }

    function greetText() {
      if (VISITOR && VISITOR.firstName) return "Hi " + VISITOR.firstName + "!\n\n" + cfg.greeting;
      return cfg.greeting;
    }

    /* ---------- Guided flows (lead capture + demo booking) ----------
       One question at a time. Typed replies and option buttons both feed
       submitFlow(); the visitor may skip a lead, or cancel a demo. */

    var lead = null;   // { step, data }
    var demo = null;   // { step, data }

    function flowActive() {
      return state.awaitingLead || state.awaitingDemo || !!lead || !!demo;
    }

    function flowBubble(text, opts) {
      var row = el("div", "nxa-msg nxa-bot", null);
      row.appendChild(el("div", "nxa-avatar", "N"));
      var bubble = el("div", "nxa-bubble", renderMarkdown(text));
      if (opts && opts.options && opts.options.length) {
        var optWrap = el("div", "nxa-opt-wrap", null);
        (opts.options || []).forEach(function (o) {
          if (!o) return;
          var b = el("button", "nxa-opt", escapeHtml(o));
          b.type = "button";
          b.addEventListener("click", function () { submitFlow(o); });
          optWrap.appendChild(b);
        });
        bubble.appendChild(optWrap);
      }
      if (opts && opts.skip) {
        var skipB = el("button", "nxa-opt-skip", escapeHtml(opts.skipLabel || t("leadSkip")));
        skipB.type = "button";
        skipB.addEventListener("click", function () { submitFlow("__skip__"); });
        bubble.appendChild(skipB);
      }
      row.appendChild(bubble);
      ui.msgs.appendChild(row);
      scrollToBottom();
      return row;
    }

    function submitFlow(v) {
      if (state.awaitingLead && lead) return leadAnswer(v);
      if (state.awaitingDemo && demo) return demoAnswer(v);
    }

    /* ----- Lead capture: name -> email -> company -> role -> goal ----- */

    function startLeadFlow() {
      if (state.awaitingLead) return;
      state.awaitingLead = true;
      lead = { step: 0, data: {} };
      ui.input.placeholder = t("leadName");
      setTimeout(function () {
        flowBubble(t("leadIntro"), {});
        setTimeout(askLeadStep, 260);
      }, 320);
    }

    function askLeadStep() {
      if (!lead) return;
      var d = lead.data;
      var msg = null, options = null;
      switch (lead.step) {
        case 0: msg = t("leadName"); break;
        case 1: msg = t("leadEmail", [d.firstName]); break;
        case 2: msg = t("leadCompany"); break;
        case 3: msg = t("leadRole"); options = cfg.leadRoles || []; break;
        case 4: msg = t("leadGoal"); options = cfg.leadGoals || []; break;
        default: return finishLead(false);
      }
      flowBubble(msg, { options: options, skip: true });
    }

    function leadAnswer(v) {
      if (!lead) return;
      if (v === "__skip__") { addUser(t("leadSkip")); return finishLead(true); }
      var d = lead.data;
      var val = String(v || "").trim();
      if (!val) return;
      switch (lead.step) {
        case 0:
          d.firstName = val.split(/\s+/)[0] || val;
          d.lastName = val.split(/\s+/).slice(1).join(" ") || "";
          break;
        case 1:
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            return flowBubble("That doesn't look like a valid email — could you double-check it?", { skip: true });
          }
          d.email = val.toLowerCase();
          break;
        case 2: d.company = val; break;
        case 3: d.role = val; break;
        case 4: d.goal = val; break;
      }
      addUser(v);
      lead.step++;
      askLeadStep();
    }

    function finishLead(skipped) {
      var d = lead ? lead.data : {};
      lead = null;
      state.awaitingLead = false;
      ui.input.placeholder = "Ask about NirnexAI...";
      if (!skipped && d.firstName) {
        var v = {
          firstName: d.firstName, lastName: d.lastName || "", email: d.email || "",
          company: d.company || "", role: d.role || "", goal: d.goal || "",
          at: new Date().toISOString()
        };
        saveVisitor(v);
        logEvent({ type: "lead", firstName: v.firstName, lastName: v.lastName, email: v.email, company: v.company, role: v.role, goal: v.goal, sessionId: cfg.sessionId, page: pagePath() });
        continueIntoChat(d.goal || "General Information");
      } else {
        saveVisitor({ skipped: true, at: new Date().toISOString() });
        logEvent({ type: "lead", skipped: true, sessionId: cfg.sessionId, page: pagePath() });
        continueIntoChat(null);
      }
    }

    /* ----- Demo booking: name -> company -> email -> date -> time ----- */

    function startDemoFlow() {
      if (state.awaitingDemo) return;
      state.awaitingDemo = true;
      demo = { step: 0, data: {} };
      ui.input.placeholder = t("demoName");
      setTimeout(function () { askDemoStep(); }, 320);
    }

    function askDemoStep() {
      if (!demo) return;
      var d = demo.data;
      var msg = null;
      switch (demo.step) {
        case 0: msg = t("demoName"); break;
        case 1: msg = t("demoCompany", [d.name]); break;
        case 2: msg = t("demoEmail"); break;
        case 3: msg = t("demoDate"); break;
        case 4: msg = t("demoTime"); break;
        default: return finishDemo();
      }
      flowBubble(msg, { skip: true, skipLabel: t("demoCancel") });
    }

    function demoAnswer(v) {
      if (!demo) return;
      if (v === "__skip__") { addUser(t("demoCancel")); return finishDemo(); }
      var d = demo.data;
      var val = String(v || "").trim();
      if (!val) return;
      switch (demo.step) {
        case 0: d.name = val; break;
        case 1: d.company = val; break;
        case 2:
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            return flowBubble("That doesn't look like a valid email — could you double-check it?", { skip: true, skipLabel: t("demoCancel") });
          }
          d.email = val.toLowerCase();
          break;
        case 3: d.date = val; break;
        case 4: d.time = val; break;
      }
      addUser(v);
      demo.step++;
      askDemoStep();
    }

    function finishDemo() {
      var d = demo ? demo.data : {};
      demo = null;
      state.awaitingDemo = false;
      ui.input.placeholder = "Ask about NirnexAI...";
      if (d.name && d.email) {
        addBot({ answer: t("demoDone", [d.name, d.email]), cta: CTA_DEMO });
        logEvent({ type: "demo", name: d.name, company: d.company || "", email: d.email, date: d.date || "", time: d.time || "", sessionId: cfg.sessionId, page: pagePath() });
      }
      showChips(["💼 Book a different time", "💰 Pricing", "📞 Contact sales"], t("relateLabel"));
    }

    /* ----- After the lead flow: personalised greeting + recommendation ----- */

    function continueIntoChat(goal) {
      setTimeout(function () {
        addBot({ answer: greetText(), greeting: true });
        if (goal && goal !== "General Information") {
          addBot({ answer: recommendFor(goal), cta: CTA_DEMO, category: "Recommendation", id: null });
          logEvent({ type: "recommend", goal: goal });
        }
        showFeats();
        showChips(cfg.idleSuggestions);
        ui.input.focus();
        scrollToBottom();
      }, typeDelay());
    }

    /* ---------- Conversation history beacon (admin dashboard) ---------- */

    var lastConvLogged = false;
    function logConversation(end) {
      if (lastConvLogged || !chatHistory.length) return;
      lastConvLogged = true;
      logEvent({
        type: "conversation",
        end: end,
        qs: chatHistory.filter(function (m) { return m.role === "user"; }).slice(-20).map(function (m) { return m.content; }),
        qCount: chatHistory.filter(function (m) { return m.role === "user"; }).length,
        sessionId: cfg.sessionId,
        page: pagePath()
      });
    }

    function routeInput(v) {
      var q = String(v || "").trim();
      if (!q) return;
      ui.input.value = "";
      if (flowActive()) { submitFlow(q); return; }
      ask(q);
    }

    ui.form.addEventListener("submit", function (e) {
      e.preventDefault();
      routeInput(ui.input.value);
    });

    ui.launcher.addEventListener("click", function () {
      state.open = !state.open;
      ui.root.classList.toggle("nxa-open", state.open);
      ui.notice.style.display = "none";
      if (state.open) {
        presentGreeting();
        setTimeout(function () { ui.input.focus(); }, 250);
      }
    });

    ui.notice.addEventListener("click", function () {
      ui.notice.style.display = "none";
      openWidget();
      presentGreeting();
      setTimeout(function () { ui.input.focus(); }, 250);
    });

    ui.panel.querySelector("[data-nxa=close]").addEventListener("click", closeWidget);
    ui.panel.querySelector("[data-nxa=reset]").addEventListener("click", function () {
      logConversation("reset");
      ui.msgs.innerHTML = "";
      ui.chips.innerHTML = "";
      context = { lastId: null, lastCat: null, lastAnswer: null };
      chatHistory = [];
      state.busy = false;
      state.awaitingLead = false;
      state.awaitingDemo = false;
      lead = null;
      demo = null;
      lastConvLogged = false;
      ui.input.placeholder = "Ask about NirnexAI...";
      hmmReset();
    });

    /* Dark/light theme toggle (persisted per browser) */
    var THEME_KEY = "nxa_theme";
    function applyTheme(theme, save) {
      theme = theme === "light" ? "light" : "dark";
      cfg.dark = theme === "dark";
      ui.root.classList.toggle("nxa-theme-dark", theme === "dark");
      ui.root.classList.toggle("nxa-theme-light", theme === "light");
      var ic = themeBtn && themeBtn.querySelector(".nxa-theme-ic");
      if (ic) ic.textContent = theme === "dark" ? "☀" : "☾";
      if (save !== false) {
        try { window.localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
      }
    }
    var themeBtn = ui.panel.querySelector("[data-nxa=theme]");
    if (themeBtn) {
      var savedTheme = (function () {
        try { return window.localStorage.getItem(THEME_KEY); } catch (e) { return null; }
      })();
      applyTheme(savedTheme || (cfg.dark ? "dark" : "light"), false);
      themeBtn.setAttribute("aria-label", "Toggle dark / light mode");
      themeBtn.addEventListener("click", function () {
        applyTheme(cfg.dark ? "light" : "dark");
      });
    }

    /* Flow test hooks (merged into the harness object; harmless in prod) */
    if (typeof window !== "undefined") {
      var th = window.__NirnexChatbotTest || {};
      th.flowInput = function (v) { submitFlow(v); };
      th.isFlowActive = function () { return flowActive(); };
      th.getFlowState = function () {
        return {
          lead: lead ? { step: lead.step, data: lead.data } : null,
          demo: demo ? { step: demo.step, data: demo.data } : null
        };
      };
      window.__NirnexChatbotTest = th;
    }

    function hmmReset() {
      openWidget();
      presentGreeting();
      ui.input.focus();
    }

    ui.handoff.addEventListener("click", function () {
      showHandoffCard();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.open) closeWidget();
    });

    // Attention notice after a delay
    if (cfg.autoOpenAfterMs > 0) {
      setTimeout(function () {
        if (!state.open && !state.noticeShown) {
          ui.notice.style.display = "block";
        }
      }, cfg.autoOpenAfterMs);
    }

    if (cfg.openOnLoad) {
      setTimeout(function () {
        openWidget();
        presentGreeting();
      }, 600);
    }

    /* ---------- Public API ---------- */
    window.NirnexChatbot = {
      open: function () { openWidget(); presentGreeting(); },
      close: closeWidget,
      ask: ask,
      getAnalytics: getAnalytics,
      clearAnalytics: clearAnalytics,
      config: cfg
    };
  }

  /* ---------- Boot ---------- */
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  } else {
    console.warn("[NirnexAI Chatbot] requires a browser DOM.");
  }

  /* ---------- Test hook (used by the dev harness; harmless in prod) ---------- */
  if (typeof window !== "undefined") {
    window.__NirnexChatbotTest = { route: route, bestMatch: bestMatch, KB_READY: KB_READY, resetContext: function(){ context = { lastId:null, lastCat:null, lastAnswer:null }; } };
  }

  /* ---------- Build term index once ---------- */
  buildIndex();
})();