/* =========================================================
   NirnexAI Chatbot - Knowledge Base
   Source of truth: https://nirnexai.com/ (Home, About, Pricing,
   Contact, Blog). Facts below are taken only from the site.
   Universal module: works in the browser (window.NIRNEX_KB)
   and in Node.js (module.exports) for the RAG backend.
   ========================================================= */
(function (root, factory) {
  var kb = factory();
  if (typeof define === "function" && define.amd) {
    define([], function () { return kb; });
  } else {
    if (typeof module !== "undefined" && module.exports) module.exports = kb;
    if (root) root.NIRNEX_KB = kb;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var KB = [
    /* ---------------- PLATFORM / GENERAL ---------------- */

    {
      id: "what-is-nirnexai",
      cat: "Platform",
      q: "What is NirnexAI?",
      kw: ["what is nirnexai", "nirnexai", "about nirnexai", "what does nirnexai do", "platform", "what is it", "company overview", "introduce", "what can it do"],
      a: "**NirnexAI** is an AI-powered **Decision Intelligence Platform** that connects your business data and meetings to deliver clear insights, structured decisions, and actionable outcomes, all in one platform.\n\nIt is built to help enterprise teams move from **insight to action**:\n• Ask questions in plain English and get data-backed answers\n• Automatically capture and summarize meetings\n• Track decisions and action items automatically\n• See everything in executive dashboards and visual infographics"
    },

    {
      id: "how-it-works",
      cat: "Platform",
      q: "How does NirnexAI work?",
      kw: ["how it works", "how does it work", "how does nirnexai work", "mechanism", "workflow", "process", "how", "journey", "data discussion decision action outcome"],
      a: "NirnexAI connects your **business data** and **meetings** into one intelligent layer that follows a clear journey:\n\n**Data → Discussion → Decision → Action → Outcome**\n\n• **Data Intelligence** turns complex data into clear, actionable insights\n• **Meeting Intelligence** captures and summarizes discussions into decisions\n• **Decision Intelligence** structures reasoning so you can decide confidently and act faster\n\nThe platform replaces fragmented tools with a single intelligent layer that links what you know with what you decide."
    },

    {
      id: "decision-intelligence-layer",
      cat: "Platform",
      q: "How does the Decision Intelligence Layer work?",
      kw: ["decision intelligence layer", "decision layer", "dil", "architecture", "how does it work internally", "how is it built"],
      a: "The public documentation describes the Decision Intelligence Layer as the single intelligent layer that **connects your business data with executive conversations**, transforming both into one unified intelligence system.\n\nIt powers every stage of the documented journey: **Data → Discussion → Decision → Action → Outcome**.\n\nDetailed technical specifications behind this layer are not published in the available documentation."
    },

    {
      id: "traditional-bi-difference",
      cat: "Platform",
      q: "How is NirnexAI different from traditional BI tools?",
      kw: ["traditional bi", "compare to bi", "bi tools", "power bi", "difference", "vs bi", "instead of bi", "legacy", "tableau", "old bi"],
      a: "NirnexAI was built to solve the gap that legacy BI tools leave behind.\n\n**Traditional BI tools:**\n• Siloed dashboards with no context\n• Decisions lost in email threads\n• Manual reporting and follow-ups\n• No connection between data and action\n\n**NirnexAI Platform:**\n• Unified data + meeting intelligence\n• AI-structured decisions with context\n• Automated action tracking & alerts\n• One platform from insight to outcome\n\nIn short: legacy tools create data but not decisions. NirnexAI bridges the gap."
    },

    {
      id: "who-is-it-for",
      cat: "Platform",
      q: "Who is NirnexAI built for?",
      kw: ["who is it for", "target audience", "for whom", "who uses", "who should use", "built for", "who can use", "cxo", "ceo", "cfo", "coo", "leaders", "executive", "analyst", "finance controller"],
      a: "NirnexAI is designed for forward-thinking professionals and organizations, including:\n\n• **CXOs** (CEOs, COOs, CFOs)\n• **Strategy & Operations Leaders**\n• **Finance Controllers**\n• **Business & Data Analysts**\n• **Enterprise Organizations**\n\nIt is purpose-built for executive teams who need clarity, speed, and accountability."
    },

    {
      id: "meeting-recorder",
      cat: "Platform",
      q: "Is NirnexAI a meeting recorder?",
      kw: ["meeting recorder", "just a recorder", "notetaker only", "recording", "nyenotes", "is it a recorder"],
      a: "NirnexAI is much more than a meeting recorder. Meeting Intelligence automatically captures, transcribes, and summarizes meetings into clear notes — but that is just one of six modules.\n\nThe full platform also includes Decision Intelligence Chat, Predictive Forecasting, Executive Dashboards, Visual Infographics, and an Action Tracker, turning meetings and data into structured decisions and outcomes."
    },

    {
      id: "natural-language",
      cat: "Platform",
      q: "Can I ask questions in natural language?",
      kw: ["natural language", "plain english", "ask questions", "ask anything", "chat ai", "query", "nl", "how do i ask", "voice question"],
      a: "Yes. **Chat AI** and the **Decision Intelligence Chat** module let you ask questions in plain English and get instant, data-backed answers.\n\nExample questions you can ask:\n• *What were last quarter's top risks?*\n• *Summarize Monday's board meeting*\n• *Show revenue forecast for Q3*\n• *Which action items are overdue?*\n\nPress **⌘K** anywhere in the app to bring up the ask box."
    },

    {
      id: "security-enterprise",
      cat: "Security",
      q: "Is NirnexAI secure for enterprise use?",
      kw: ["secure", "security", "enterprise ready", "safe", "compliance", "is it secure", "data security", "trust", "protection"],
      a: "NirnexAI markets itself as **enterprise-ready** and its status page lists **24/7 Global Ops** and **Compliance** with all systems nominal.\n\nFrom the pricing documentation:\n• **Data residency in India** is available on the Pro (30 days) and Prime (60 days) plans, with **custom residency** on Enterprise\n• **Data retention** ranges from 7 to 60 days depending on your plan\n• **Enterprise** includes advanced security and dedicated infrastructure\n\nFor detailed security specifics, contact the sales team.",
      cta: [{ label: "Contact Sales", href: "https://nirnexai.com/contact" }]
    },

    {
      id: "two-intelligence-pillars",
      cat: "Platform",
      q: "What are the two intelligence pillars?",
      kw: ["two intelligence pillars", "two pillars", "pillars", "intelligence pillars", "what are the pillars"],
      a: "The FAQ asks about two intelligence pillars, but the public documentation lists **three** intelligence capabilities:\n\n• **Data Intelligence** – turning complex data into clear, actionable insights\n• **Decision Intelligence** – structuring reasoning and enabling confident choices\n• **Meeting Intelligence** – capturing, summarizing, and converting discussions into decisions\n\nThe exact definition of the \"two pillars\" is not available in the published docs."
    },

    {
      id: "fabricate-insights",
      cat: "Platform",
      q: "Does NirnexAI fabricate insights?",
      kw: ["fabricate", "hallucinate", "make up", "fake insights", "incorrect", "wrong answers", "accurate", "accurate answers"],
      a: "The public documentation does not explicitly address how NirnexAI handles fabricated or hallucinated insights.\n\nWhat is documented is that Chat AI answers questions about your **own data and past meetings**, and that Predictive Forecasting identifies trends and risks using AI power. For a definitive answer, our support team can help."
    },

    {
      id: "replace-existing-bi",
      cat: "Platform",
      q: "Does NirnexAI replace our existing BI system?",
      kw: ["replace bi", "replace existing", "replacement", "existing bi system", "do we need bi", "coexist", "compatible with bi"],
      a: "The documentation does not explicitly state whether NirnexAI replaces existing BI systems.\n\nWhat is documented:\n• Executive Dashboards provide **customizable KPI views with data sync**, and Dashboards can be **unlimited** on paid plans\n• The platform offers **Predictive Forecasting** and live **Risk Alerts**\n• It is positioned as \"one platform from insight to outcome,\" replacing **fragmented tools** with a single intelligent layer\n\nFor migration guidance, the sales team is the best point of contact."
    },

    {
      id: "data-sources",
      cat: "Platform",
      q: "What data sources does NirnexAI support?",
      kw: ["data source", "data sources", "databases", "connect data", "connect my data", "file types", "upload", "sql", "csv", "excel", "supported data", "connect data sources"],
      a: "Based on the public documentation, NirnexAI connects **business data** and **meetings** in one place:\n\n• **Meeting data** from Google Meet, Zoom, and Microsoft Teams (Meeting Intelligence)\n• **Business/KPI data** synced into Executive Dashboards with real-time variance analysis\n• **Chat AI** answers questions from your past meetings and connected data\n\nThe documentation does not list specific file types or database connectors. Our sales team can confirm the full list."
    },

    {
      id: "data-training",
      cat: "Security",
      q: "Is our data used to train public AI models?",
      kw: ["train ai", "training", "train models", "public models", "llm training", "data used to train", "opensource models"],
      a: "The public documentation does not specify whether customer data is used to train public AI models.\n\nFor exact details on data usage and privacy, please contact our team at **info@nirnexai.com** or book a call with sales."
    },

    {
      id: "meeting-confidentiality",
      cat: "Security",
      q: "Are my meetings and data confidential?",
      kw: ["confidential", "confidentiality", "private", "privacy", "meeting privacy", "who can see", "shared", "nda", "secret"],
      a: "The documentation positions NirnexAI as **enterprise-ready** with data controls:\n\n• **Data residency (India)** available on Pro (30 days) and Prime (60 days), custom on Enterprise\n• **Data retention** from 7 to 60 days depending on the plan\n• **Enterprise** includes advanced security and dedicated infrastructure\n\nFor exact confidentiality and data-handling terms, refer to the Privacy Policy at **https://nirnexai.com/privacy-policy** or email **info@nirnexai.com**."
    },

    {
      id: "delete-my-data",
      cat: "Security",
      q: "Can I delete my data from NirnexAI?",
      kw: ["delete data", "remove data", "delete account", "erase", "delete history", "remove my data", "gdpr", "right to delete"],
      a: "The public documentation does not describe an explicit self-serve data-deletion flow.\n\nData retention periods apply across plans (7 to 60 days, custom on Enterprise). For account or data deletion, contact support at **info@nirnexai.com** and they'll assist you."
    },

    {
      id: "multi-department",
      cat: "Platform",
      q: "Can NirnexAI operate across multiple departments?",
      kw: ["departments", "multi department", "multiple departments", "teams", "cross team", "organization wide", "whole company", "business units"],
      a: "The documentation shows NirnexAI is designed for **enterprise-wide** use:\n\n• **C-Suite Strategy** aligns executive decisions across all business units\n• Dashboards and data can be **unlimited** on Starter and above\n• **Enterprise** plans support custom limits, advanced security, and dedicated infrastructure\n• It can be used across departments such as Finance, Operations, and Risk\n\nSpecific multi-department workspace controls are not detailed in the public docs."
    },

    {
      id: "export-insights",
      cat: "Platform",
      q: "Can insights be exported?",
      kw: ["export", "export insights", "download", "pdf", "share insights", "csv export", "report"],
      a: "I couldn't find that information in NirnexAI's knowledge base.\n\nIf you'd like, I can connect you with our support team."
    },

    {
      id: "get-started",
      cat: "Platform",
      q: "How do I get started with NirnexAI?",
      kw: ["get started", "start", "begin", "setup", "getting started", "first steps", "start using", "sign up", "how to start"],
      a: "Getting started is easy:\n\n1. **Sign up free** at **https://app.nirnexai.com** — the Free plan is ₹0 forever\n2. **Connect your data** — business/KPI data and meeting platforms such as Google Meet, Zoom, and Microsoft Teams\n3. **Ask a question** — use Chat AI in plain English (press **⌘K** for the ask box)\n4. **Review outputs** — dashboards, infographics, action items, and decision summaries appear automatically\n\nSelf-serve onboarding is included on the Free plan, and guided onboarding is available on Prime and above."
    },

    {
      id: "credits-sessions",
      cat: "Platform",
      q: "What are credits and sessions in NirnexAI?",
      kw: ["credits", "sessions", "what is a credit", "what is a session", "analysis credit", "usage units", "limits"],
      a: "Credits and sessions are the **usage limits** on NirnexAI plans:\n\n• **Credits** = Data Analysis actions (e.g. running a data query or analysis)\n• **Sessions** = individual chat/usage sessions\n\nPlan allowances (monthly):\n• **Free** – 30 credits, 7 sessions\n• **Starter** – 300 credits, 30 sessions\n• **Pro** – 400 credits, 45 sessions\n• **Prime** – 800 credits, 75 sessions\n• **Enterprise** – custom limits"
    },

    {
      id: "run-out-credits",
      cat: "Platform",
      q: "What happens when I run out of credits?",
      kw: ["out of credits", "run out", "no credits", "credits exhausted", "exceed limits", "limit reached"],
      a: "The public documentation doesn't describe the exact behavior when you run out of credits.\n\nEach plan includes a monthly allowance of credits and sessions — upgrading to a higher plan increases your limits. For details on what happens at the limit, our support team can help: **info@nirnexai.com** or the **https://nirnexai.com/contact** page."
    },

    {
      id: "mobile-app",
      cat: "Platform",
      q: "Is there a mobile app for NirnexAI?",
      kw: ["mobile app", "app store", "android", "ios", "iphone", "smartphone", "phone app", "mobile", "desktop app"],
      a: "The public documentation doesn't mention a dedicated mobile or desktop app.\n\nNirnexAI is accessible from any browser at **https://app.nirnexai.com**. For the latest info on mobile support, contact the sales team."
    },

    {
      id: "languages",
      cat: "Platform",
      q: "What languages does NirnexAI support?",
      kw: ["languages", "language", "english", "hindi", "multilingual", "translate", "localization", "localized"],
      a: "The public documentation does not list the languages supported by the platform.\n\nFor details on language availability, contact our team at **info@nirnexai.com**."
    },

    {
      id: "api-access",
      cat: "Platform",
      q: "Does NirnexAI have an API for developers?",
      kw: ["api", "developers", "integration api", "webhooks", "sdk", "developer", "code", "automation"],
      a: "The public documentation does not describe a developer API or SDK.\n\nFor integration and developer options, the sales team can help — book a call at **https://cal.com/nirnexai** or email **info@nirnexai.com**."
    },

    {
      id: "vs-chatgpt",
      cat: "Platform",
      q: "How is NirnexAI different from ChatGPT?",
      kw: ["chatgpt", "vs chatgpt", "chat bot", "generic ai", "difference", "general purpose", "copilot", "other ai"],
      a: "NirnexAI is **purpose-built for business decision-making**, not a general-purpose chatbot:\n\n• **Answers from YOUR context** – Chat AI answers questions about your **own data and past meetings**, not the open internet\n• **Meeting-first** – automatically captures, transcribes, and summarizes your meetings\n• **Decision-focused** – structures reasoning and tracks action items so decisions actually get executed\n• **Executive dashboards** – connects insights to real-time KPIs and forecasts\n\nIn short: ChatGPT answers the world's questions; NirnexAI answers *your business's* questions and drives decisions to action."
    },

    {
      id: "auto-join-meetings",
      cat: "Platform",
      q: "Can the AI join my meetings automatically?",
      kw: ["join meetings", "auto join", "automatic", "attend meetings", "ai in meetings", "bot joins", "calendar"],
      a: "**Meeting Intelligence** works with your major meeting platforms — **Google Meet, Zoom, and Microsoft Teams** — to automatically capture, transcribe, and summarize meetings.\n\nIntegrations for all three are included on the **Pro** and **Prime** plans. Meeting time is metered per plan (e.g. 45 min/mo on Free, up to 1,200 min/mo on Prime)."
    },

    {
      id: "replace-notetaker",
      cat: "Platform",
      q: "Does NirnexAI replace manual notetaking?",
      kw: ["notetaker", "note taking", "notes", "minutes", "summaries", "replace notetaking", "capture notes", "no more notes"],
      a: "Yes — **Meeting Intelligence** automatically captures, transcribes, and summarizes meetings into clear notes, so your team doesn't have to take manual minutes.\n\nIt extracts:\n• Meeting minutes\n• Key decisions\n• Summary points\n• Action items\n• Key notes & questions\n\nPacked with the **Action Tracker**, follow-ups are captured and tracked automatically too."
    },

    /* ---------------- MODULES & FEATURES ---------------- */

    {
      id: "modules-overview",
      cat: "Features",
      q: "What are the core platform modules?",
      kw: ["modules", "core modules", "platform modules", "features list", "what are the modules", "all features", "six modules", "how many modules"],
      a: "NirnexAI has **six integrated modules** that work together to transform decision-making:\n\n1. **Decision Intelligence Chat** – interact with your business context in natural language\n2. **Predictive Forecasting** – forecast trends and identify risks before they materialize\n3. **Executive Dashboards** – customizable KPI views with real-time variance analysis and data sync\n4. **Visual Infographics** – transform dense minutes and raw data into clear, visual stories\n5. **Meeting Intelligence** – automated extraction of minutes, key decisions, and summary points\n6. **Action Tracker** – automated tracking of commitments to bridge decision and execution"
    },

    {
      id: "module-chat",
      cat: "Features",
      q: "Decision Intelligence Chat module",
      kw: ["decision intelligence chat", "chat module", "ask module", "chat ai module", "data chat", "intelligence chat"],
      a: "**Decision Intelligence Chat** lets you interact with your business context using natural language for instant, data-backed answers. It is one of the six core modules of the platform and complements the **Chat AI** feature, which answers questions in plain English from your data and past meetings."
    },

    {
      id: "module-forecasting",
      cat: "Features",
      q: "Predictive Forecasting module",
      kw: ["forecasting", "forecast", "predictive", "predict", "trends", "scenario", "scenario analysis", "revenue forecast", "risk prediction", "future", "predictive forecasting"],
      a: "**Predictive Forecasting** uses AI to forecast trends and identify risks **before they materialize**.\n\nIt supports scenario-type analysis of your business data — for example, asking *\"Show revenue forecast for Q3\"* — and pairs with live **Risk Alerts**, such as *\"Revenue dip detected in APAC region.\"*"
    },

    {
      id: "module-dashboards",
      cat: "Features",
      q: "Executive Dashboards module",
      kw: ["dashboard", "dashboards", "kpi", "executive dashboard", "charts", "visual dashboard", "metrics", "kpis", "variance"],
      a: "**Executive Dashboards** provide customizable **KPI views** with real-time variance analysis and data sync.\n\nExample executive KPIs shown on the site:\n• Revenue (e.g. $2.4M, +12.5%)\n• Active Users (e.g. 18,429, +8.3%)\n• Churn Rate (e.g. 2.1%, -0.4%)\n• NPS Score (e.g. 72, +5)\n\nUnlimited dashboards are included on **Starter** and above; the Free plan includes **10**."
    },

    {
      id: "module-infographics",
      cat: "Features",
      q: "Visual Infographics module",
      kw: ["infographic", "infographics", "visual", "visuals", "graphics", "images", "image", "visual stories", "visual representation"],
      a: "**Visual Infographics** transform dense meeting minutes and raw data into clear, ready-to-share **visual stories**.\n\nThis module is a step above standard charts — it turns complex discussions into simple, presentable graphics. Image generation is metered on plans (3 on Free, up to 60 per month on Prime)."
    },

    {
      id: "module-meeting",
      cat: "Features",
      q: "Meeting Intelligence module",
      kw: ["meeting intelligence", "meeting", "meetings", "transcribe", "transcription", "summary", "summarize meeting", "minutes", "notetaker", "ai notetaker", "meeting assistant", "sessions", "notes", "capture"],
      a: "**Meeting Intelligence** automatically captures, transcribes, and summarizes your meetings into clear notes.\n\nIt extracts:\n• Meeting minutes\n• Key decisions\n• Summary points\n• Action items\n• Key notes & questions\n\nIt works with all major meeting platforms — **Google Meet, Zoom, and Microsoft Teams**. Meeting time is metered: 45 min/mo on Free, up to 1200 min/mo on Prime.",
      cta: [{ label: "Open Meeting Intelligence", href: "https://app.nirnexai.com/mom" }]
    },

    {
      id: "module-action-tracker",
      cat: "Features",
      q: "Action Tracker module",
      kw: ["action tracker", "action items", "actions", "tasks", "next steps", "to do", "follow up", "track tasks", "track action", "commitments", "overdue"],
      a: "**Action Tracker** keeps track of tasks and next steps so nothing falls through the cracks. It bridges the gap between **decision and execution** with automated tracking of commitments.\n\nIt powers alerts like *\"Action item overdue: Q3 budget review\"* and lets you ask questions such as *\"Which action items are overdue?\"*"
    },

    {
      id: "core-features",
      cat: "Features",
      q: "What are the five core features?",
      kw: ["five features", "core features", "main features", "feature list", "top features", "everything in one place"],
      a: "NirnexAI bundles **five powerful features** that work seamlessly together:\n\n1. **Chat AI** – plain-English questions with instant answers from your data and past meetings\n2. **Dashboards** – clear, interactive visuals of your team's data\n3. **Infographics** – complex discussions turned into simple, shareable visuals\n4. **Action Tracker** – tasks and next steps, tracked automatically\n5. **Meeting Intelligence** – automatic capture, transcription, and summarization of meetings"
    },

    {
      id: "integrations",
      cat: "Features",
      q: "What meeting platforms does NirnexAI integrate with?",
      kw: ["integrations", "integration", "google meet", "zoom", "teams", "microsoft teams", "meeting apps", "connect apps", "compatible apps", "integrate with", "apps"],
      a: "NirnexAI Meeting Intelligence works with all **major meeting platforms**:\n\n• **Google Meet**\n• **Zoom**\n• **Microsoft Teams**\n\nIntegration support for Google Meet, Zoom, and Teams is included on the **Pro** and **Prime** plans."
    },

    {
      id: "alerts-notifications",
      cat: "Features",
      q: "Does NirnexAI send alerts and notifications?",
      kw: ["alerts", "notifications", "risk alerts", "warnings", "real-time alerts", "notify", "reminders", "real time"],
      a: "Yes — the platform includes **live, real-time alerts** tied to your data and decisions:\n\n• **Risk Alerts** such as *\"Revenue dip detected in APAC region\"*\n• **Action Tracker** alerts like *\"Action item overdue: Q3 budget review\"*\n• **Real-time variance analysis** on Executive Dashboards\n\nThese are part of Predictive Forecasting and the Action Tracker modules."
    },

    {
      id: "data-analysis-credit",
      cat: "Features",
      q: "What counts as a 'Data Analysis' credit?",
      kw: ["data analysis", "analysis credit", "what uses credits", "credit usage", "analysis action", "how credits used"],
      a: "**Credits** on NirnexAI plans are described as **Data Analysis** usage — they power the data-analysis actions you run, such as querying your data or running analyses in Chat AI.\n\nPlan credits (monthly):\n• **Free** – 30 credits\n• **Starter** – 300 credits\n• **Pro** – 400 credits\n• **Prime** – 800 credits\n• **Enterprise** – custom limits"
    },

    /* ---------------- USE CASES ---------------- */

    {
      id: "use-cases-overview",
      cat: "Use Cases",
      q: "What are the use cases for NirnexAI?",
      kw: ["use cases", "use case", "industries", "sectors", "examples of use", "who uses it for what", "what for", "applications"],
      a: "NirnexAI is **built for executive teams** with six purpose-built use cases:\n\n• **C-Suite Strategy** – align decisions with real-time data and AI insights\n• **Board Governance** – structured meeting intelligence with minutes, decisions, and compliance tracking\n• **M&A Due Diligence** – faster deal analysis with AI data synthesis and risk assessment\n• **Financial Planning** – connect forecasts with meeting outcomes for accurate resource allocation\n• **Operations Reviews** – turn weekly ops meetings into structured action plans\n• **Risk Management** – proactive risk detection combining data signals with meeting context"
    },

    {
      id: "use-case-csuite",
      cat: "Use Cases",
      q: "C-Suite Strategy use case",
      kw: ["c-suite", "csuite", "c suite", "executive strategy", "leadership strategy", "strategy", "executive team"],
      a: "**C-Suite Strategy** aligns executive decisions with real-time data and AI-generated insights across all business units — giving CXOs clarity across finance, operations, and growth in one place."
    },

    {
      id: "use-case-board",
      cat: "Use Cases",
      q: "Board Governance use case",
      kw: ["board", "board governance", "board meeting", "governance", "minutes", "compliance", "boardroom", "audit"],
      a: "**Board Governance** delivers structured meeting intelligence with automated minutes, decisions, and compliance tracking — built for board meetings and governance workflows."
    },

    {
      id: "use-case-mna",
      cat: "Use Cases",
      q: "M&A Due Diligence use case",
      kw: ["m&a", "m and a", "merger", "acquisition", "due diligence", "deal", "ma", "investment"],
      a: "**M&A Due Diligence** accelerates deal analysis with AI-powered data synthesis and risk assessment frameworks — helping deal teams move faster and more confidently."
    },

    {
      id: "use-case-finance",
      cat: "Use Cases",
      q: "Financial Planning use case",
      kw: ["financial planning", "finance", "budget", "fp&a", "resource allocation", "financial", "planning"],
      a: "**Financial Planning** connects forecasting models with meeting outcomes to drive more accurate resource allocation — helping finance teams tie numbers to decisions."
    },

    {
      id: "use-case-ops",
      cat: "Use Cases",
      q: "Operations Reviews use case",
      kw: ["operations", "operations review", "weekly ops", "ops meetings", "operations team", "ops review"],
      a: "**Operations Reviews** transforms weekly operations meetings into structured action plans with automated follow-ups — turning recurring reviews into measurable outcomes."
    },

    {
      id: "use-case-risk",
      cat: "Use Cases",
      q: "Risk Management use case",
      kw: ["risk", "risk management", "risk detection", "risks", "warnings", "alerts", "risk signals", "compliance risk"],
      a: "**Risk Management** provides proactive risk detection that combines data signals with contextual meeting intelligence — for example, real-time alerts like *\"Revenue dip detected in APAC region.\"*"
    },

    /* ---------------- PRICING ---------------- */

    {
      id: "pricing-overview",
      cat: "Pricing",
      q: "What are the pricing plans?",
      kw: ["pricing", "price", "plans", "cost", "subscription", "how much", "plan", "rates", "fee", "pay", "billing", "charges", "pricing plans", "credits", "credit", "usage", "units", "what do i get"],
      a: "NirnexAI offers **five pricing plans** (priced in INR, monthly or annual billing):\n\n• **Free** – ₹0 forever (basic limits)\n• **Starter** – ₹1,519/mo, billed ₹18,230/yr\n• **Pro** – ₹2,199/mo, billed ₹26,390/yr *(Most Popular)*\n• **Prime** – ₹4,199/mo, billed ₹50,390/yr *(Best Value)*\n• **Enterprise** – **Custom** pricing, contact sales\n\nYou save **~20% with annual billing**. Get started free at **https://app.nirnexai.com**.",
      cta: [
        { label: "Book Executive Demo", href: "https://cal.com/nirnexai" },
        { label: "Get Started Free", href: "https://app.nirnexai.com" }
      ]
    },

    {
      id: "pricing-free",
      cat: "Pricing",
      q: "What is included in the Free plan?",
      kw: ["free plan", "free tier", "free", "free forever", "basic", "no cost", "free trial", "start free"],
      a: "The **Free** plan is ₹0 forever and includes:\n\n• 30 Credits (Data Analysis)\n• 7 Sessions\n• 3 Image Generations\n• 10 Dashboards\n• 45 min Meeting Intelligence\n• Self-serve onboarding\n• Email support\n\nGet started at **https://app.nirnexai.com**."
    },

    {
      id: "pricing-starter",
      cat: "Pricing",
      q: "What is included in the Starter plan?",
      kw: ["starter", "starter plan", "growing professionals", "starter pricing"],
      a: "**Starter** (₹1,519/mo, billed ₹18,230/yr) is built **for growing professionals** and includes:\n\n• 300 Credits (Data Analysis)\n• 30 Sessions\n• 30 Image Generations\n• Unlimited Dashboards\n• 360 min Meeting Intelligence\n• Email support\n\nThat's ~4,320 meeting minutes per year."
    },

    {
      id: "pricing-pro",
      cat: "Pricing",
      q: "What is included in the Pro plan?",
      kw: ["pro", "pro plan", "most popular", "pro pricing", "professional plan"],
      a: "**Pro** (₹2,199/mo, billed ₹26,390/yr) is the **Most Popular** plan and includes:\n\n• 400 Credits (Data Analysis)\n• 45 Sessions\n• 40 Image Generations\n• Unlimited Dashboards\n• 540 min Meeting Intelligence (~6,480 min/yr)\n• **45 min max meeting length**\n• **Google Meet, Zoom, and Teams** integrations\n• **30 days data residency (India)**\n• Email support"
    },

    {
      id: "pricing-prime",
      cat: "Pricing",
      q: "What is included in the Prime plan?",
      kw: ["prime", "prime plan", "best value", "scaling", "prime pricing", "higher capacity"],
      a: "**Prime** (₹4,199/mo, billed ₹50,390/yr) is the **Best Value** plan **for scaling organizations needing extra capacity**. It includes:\n\n• 800 Credits (Data Analysis)\n• 75 Sessions\n• 60 Image Generations\n• Unlimited Dashboards\n• 1200 min Meeting Intelligence (~14,400 min/yr)\n• **90 min max meeting length**\n• **60 days data residency (India)**\n• **Priority email support**\n• **Guided onboarding**"
    },

    {
      id: "pricing-enterprise",
      cat: "Pricing",
      q: "What is the Enterprise plan?",
      kw: ["enterprise", "enterprise plan", "custom", "corporate", "dedicated infrastructure", "csm", "sales", "enterprise pricing", "organization"],
      a: "The **Enterprise** plan offers **custom limits, advanced security, and dedicated infrastructure**.\n\nIncluded:\n• Custom Credits / Analysis limit\n• Custom Data Retention & Residency\n• Priority Support & **CSM (Customer Success Manager)**\n\nPricing is **custom** — contact sales for details via the Contact page or book a demo at **https://cal.com/nirnexai**.",
      cta: [
        { label: "Contact Sales", href: "https://nirnexai.com/contact" },
        { label: "Book Executive Demo", href: "https://cal.com/nirnexai" }
      ]
    },

    {
      id: "pricing-recommendation",
      cat: "Pricing",
      q: "Which plan should I choose?",
      kw: ["which plan", "recommend", "best plan", "suggest plan", "what plan", "recommendation", "choose plan", "which one"],
      a: "Here's how to choose, based on the plan labels documented on the pricing page:\n\n• **Free** – perfect to try NirnexAI, ₹0 forever\n• **Starter** – for growing professionals who need more capacity (₹1,519/mo)\n• **Pro** – the **Most Popular** choice for most teams (₹2,199/mo)\n• **Prime** – the **Best Value** for scaling organizations needing extra capacity (₹4,199/mo)\n• **Enterprise** – custom limits, security, and a CSM\n\nNot sure? Book a demo and sales will guide you — **https://cal.com/nirnexai**.",
      cta: [
        { label: "View Pricing Page", href: "https://nirnexai.com/pricing" },
        { label: "Book a Demo", href: "https://cal.com/nirnexai" }
      ]
    },

    {
      id: "pricing-billing",
      cat: "Pricing",
      q: "How does monthly vs annual billing work?",
      kw: ["monthly", "annual", "annual billing", "billing", "yearly", "save 20%", "save money", "discount", "billed", "invoice", "payment"],
      a: "NirnexAI plans can be billed **monthly** or **annually**. Choosing annual billing saves you **~20%**:\n\n• Starter: ₹1,519/mo or ₹18,230/yr\n• Pro: ₹2,199/mo or ₹26,390/yr\n• Prime: ₹4,199/mo or ₹50,390/yr\n\nPrices are in **INR (₹)**."
    },

    {
      id: "pricing-currency",
      cat: "Pricing",
      q: "In what currency are prices shown?",
      kw: ["currency", "inr", "rupees", "indian", "usd", "dollars", "pricing currency"],
      a: "Public prices are shown in **Indian Rupees (INR, ₹)**. For international or enterprise pricing, contact the sales team."
    },

    {
      id: "data-retention",
      cat: "Pricing",
      q: "What is the data retention period?",
      kw: ["retention", "data retention", "how long data kept", "storage period", "delete data", "history", "keep data", "data residency", "residency", "where is data stored", "where data stored"],
      a: "Data retention depends on your plan (applies to both Chat and Meeting Intelligence):\n\n• **Free** – 7 days\n• **Starter** – 14 days\n• **Pro** – 30 days\n• **Prime** – 60 days\n• **Enterprise** – custom retention\n\n**Data residency (India)** is available on Pro (30 days) and Prime (60 days), and Enterprise supports custom residency."
    },

    {
      id: "free-trial",
      cat: "Pricing",
      q: "Is there a free trial?",
      kw: ["free trial", "try free", "trial", "try", "start free", "demo free", "free account", "get started"],
      a: "Yes! You can **Try NirnexAI for free** — the Free plan is ₹0 forever with 30 credits, 7 sessions, 3 image generations, 10 dashboards, and 45 minutes of Meeting Intelligence.\n\nGet started at **https://app.nirnexai.com**.",
      cta: [{ label: "Start Free Trial", href: "https://app.nirnexai.com" }]
    },

    {
      id: "upgrade-downgrade",
      cat: "Pricing",
      q: "Can I change my plan later?",
      kw: ["upgrade", "downgrade", "change plan", "switch plan", "change billing", "move plans", "plan change"],
      a: "The public documentation doesn't describe a specific upgrade/downgrade flow, but plans are structured so you can move up as you grow — all paid plans include **unlimited dashboards** from Starter onwards, and Enterprise offers **custom limits**.\n\nFor help changing plans, contact sales at **https://nirnexai.com/contact**."
    },

    {
      id: "cancel-anytime",
      cat: "Pricing",
      q: "Can I cancel my subscription anytime?",
      kw: ["cancel", "cancel subscription", "cancellation", "cancel plan", "stop billing", "unsubscribe"],
      a: "The public documentation does not describe the cancellation policy.\n\nTo cancel or change your subscription, contact support at **info@nirnexai.com** and they'll guide you through it."
    },

    {
      id: "payment-methods",
      cat: "Pricing",
      q: "What payment methods does NirnexAI accept?",
      kw: ["payment", "pay", "payment methods", "credit card", "debit card", "upi", "bank transfer", "invoice", "net banking", "how to pay"],
      a: "The public documentation does not list accepted payment methods.\n\nPlans are billed monthly or annually in **INR (₹)**. For payment options, contact sales at **info@nirnexai.com**."
    },

    {
      id: "credit-card-free",
      cat: "Pricing",
      q: "Do I need a credit card for the Free plan?",
      kw: ["credit card required", "free plan card", "card needed", "payment for free", "no card", "free signup"],
      a: "The Free plan is **₹0 forever**, so no payment is required to get started.\n\nWhether a card is needed at signup isn't stated in the docs — try it at **https://app.nirnexai.com** and it's free."
    },

    {
      id: "team-seats",
      cat: "Pricing",
      q: "How many team members can use NirnexAI?",
      kw: ["seats", "team members", "users", "number of users", "per seat", "team size", "members", "collaborators"],
      a: "NirnexAI is designed for **enterprise-wide** teams — C-Suite, strategy, finance, ops, and risk can all work together across business units.\n\nSpecific per-seat pricing isn't documented in the public plans (they're credit/session-based). For team and seat details, contact sales."
    },

    {
      id: "onboarding-support",
      cat: "Pricing",
      q: "Do you help with onboarding setup?",
      kw: ["onboarding", "setup help", "guided onboarding", "implementation", "training", "help setting up", "support team"],
      a: "Yes — onboarding support scales with your plan:\n\n• **Free** – self-serve onboarding\n• **Prime** – **guided onboarding** included\n• **Enterprise** – priority support and a dedicated **CSM (Customer Success Manager)**\n\nNeed help sooner? Email **info@nirnexai.com** or book a demo at **https://cal.com/nirnexai**."
    },

    /* ---------------- LEAD GEN / DEMO / CONTACT ---------------- */

    {
      id: "book-demo",
      cat: "Contact",
      q: "Book a demo",
      kw: ["demo", "book a demo", "executive demo", "schedule demo", "see it live", "walkthrough", "book executive demo", "request demo"],
      a: "Great choice! You can book an **Executive Demo** directly at:\n\n**https://cal.com/nirnexai**\n\nOur sales team will guide you through the best solution for your organization.",
      cta: [{ label: "Book Executive Demo", href: "https://cal.com/nirnexai" }]
    },

    {
      id: "contact",
      cat: "Contact",
      q: "Contact information",
      kw: ["contact", "contact us", "email", "phone", "reach", "support", "get in touch", "talk to someone", "call", "reach out"],
      a: "Here's how to reach NirnexAI:\n\n• **Email:** info@nirnexai.com (response under 24 hours)\n• **Demo:** https://cal.com/nirnexai\n• **LinkedIn:** linkedin.com/company/nirnexai\n• **X/Twitter:** @NirnexAI\n• **YouTube:** @NirnexAI_Official\n• **Contact page:** https://nirnexai.com/contact\n\nOperations run **24/7** globally.",
      cta: [
        { label: "Email: info@nirnexai.com", href: "mailto:info@nirnexai.com" },
        { label: "Contact Page", href: "https://nirnexai.com/contact" }
      ]
    },

    {
      id: "lead-gen",
      cat: "Contact",
      q: "Talk to sales / enterprise inquiry",
      kw: ["i want a demo", "want pricing", "enterprise quote", "i want to talk", "talk to sales", "sales team", "buy", "purchase", "sign up", "subscribe", "upgrade", "deal", "quote", "proposal", "talk to a human", "representative"],
      a: "That's great! I'd be happy to help.\n\nYou can schedule a demo or contact our sales team, and they'll guide you through the best solution for your organization:\n\n• **Book an Executive Demo:** https://cal.com/nirnexai\n• **Email:** info@nirnexai.com\n• **Contact page:** https://nirnexai.com/contact"
    },

    /* ---------------- COMPANY ---------------- */

    {
      id: "company-about",
      cat: "Company",
      q: "About the company",
      kw: ["about", "company", "who made", "founded", "founders", "story", "history", "team", "organisation", "organization"],
      a: "**NirnexAI** is an AI-powered Decision Intelligence Platform founded to solve one problem: critical decisions get lost because insights, discussions, and actions live in silos.\n\n**Vision:** To become the leading AI-powered Decision Intelligence Platform that transforms business data and executive discussions into structured, high-quality decisions and measurable outcomes.\n\n**Mission:**\n• Enable CXOs and leadership teams to see clearly through unified insights\n• Empower them to decide confidently with structured AI reasoning\n• Help organizations act faster through automated execution tracking\n\nNirnexAI is operated by **Anvika Digitech Solutions**, headquartered in Jharkhand, India."
    },

    {
      id: "company-hq",
      cat: "Company",
      q: "Headquarters address",
      kw: ["address", "headquarters", "hq", "location", "office", "where are you", "registered", "india", "jamshedpur", "seraikela", "kharsawan"],
      a: "**NirnexAI – Global Headquarters**\nAnvika Digitech Solutions\n93, Kansari Tola, Ward No -5, PO / PS - Seraikella,\nDistrict - Seraikella - Kharsawan,\nJharkhand - 833219, India"
    },

    {
      id: "mission-vision",
      cat: "Company",
      q: "What is NirnexAI's vision and mission?",
      kw: ["vision", "mission", "goals", "values", "believes", "purpose", "culture"],
      a: "**Vision:** To become the leading AI-powered Decision Intelligence Platform that turns business data and executive discussions into structured, high-quality decisions and measurable outcomes.\n\n**Mission:**\n1. Help CXOs and leadership teams see clearly through unified insights\n2. Empower them to decide confidently with structured AI reasoning\n3. Help organizations act faster through automated execution tracking\n\n**What they believe:** great organizations are built on clear thinking, confident decision-making, and disciplined execution — insights, discussions, and actions should never live in silos."
    },

    {
      id: "blog",
      cat: "Company",
      q: "What's on the NirnexAI blog?",
      kw: ["blog", "articles", "news", "insights", "resources", "updates", "content", "posts"],
      a: "The NirnexAI blog covers AI automation, intelligent agents, and the future of work. Recent posts:\n\n• **NirnexAI Review – The AI-Powered Decision Intelligence Platform for Modern Businesses (2026)**\n• **Top 3 AI Productivity Tools in 2026**\n• **Summarize Meetings with NirnexAI – Optimize Boardroom Workflow**\n\nRead them at **https://nirnexai.com/blog**."
    },

    {
      id: "legal",
      cat: "Company",
      q: "Privacy policy and terms",
      kw: ["privacy", "privacy policy", "terms", "terms of service", "legal", "gdpr", "policy", "compliance legal"],
      a: "NirnexAI provides a **Privacy Policy** and **Terms of Service**:\n\n• Privacy Policy: https://nirnexai.com/privacy-policy\n• Terms of Service: https://nirnexai.com/terms-of-service"
    },

    {
      id: "app-access",
      cat: "Company",
      q: "How do I access the platform?",
      kw: ["login", "sign in", "log in", "app", "access", "get access", "use the platform", "open app", "platform access"],
      a: "You can access NirnexAI at **https://app.nirnexai.com**.\n\nDirect module links:\n• **Data Intelligence:** https://app.nirnexai.com/chat\n• **Meeting Intelligence:** https://app.nirnexai.com/mom\n• **Executive Dashboard:** https://app.nirnexai.com/dashboard\n\nStart free at **https://app.nirnexai.com**."
    },

    {
      id: "company-partners",
      cat: "Company",
      q: "Is NirnexAI available to enterprise organizations?",
      kw: ["enterprise organizations", "large companies", "big teams", "corporate", "fortune", "enterprise sale", "enterprise cs"],
      a: "Yes — NirnexAI is designed for **enterprise-wide** use:\n\n• **Enterprise plan** includes custom limits, advanced security, dedicated infrastructure, and a **CSM (Customer Success Manager)**\n• **Use cases** include C-Suite strategy, Board Governance, M&A Due Diligence, Financial Planning, Operations Reviews, and Risk Management\n\nTalk to sales at **https://cal.com/nirnexai** or **info@nirnexai.com**."
    },

    {
      id: "setup-time",
      cat: "Company",
      q: "How long does NirnexAI take to set up?",
      kw: ["setup time", "how long", "implementation time", "time to set up", "deploy quickly", "fast setup", "rollout"],
      a: "The documentation touts **self-serve onboarding** on the Free plan and **guided onboarding** on Prime and above, suggesting you can get started quickly.\n\nExact setup timelines aren't published. For an estimate tailored to your organization, book a demo at **https://cal.com/nirnexai**."
    },

    /* ---------------- GREETINGS / SMALL TALK ---------------- */

    {
      id: "greeting",
      cat: "Other",
      q: "Greeting",
      kw: [],
      a: "Hello! Welcome to NirnexAI.\n\nI'm here to help you learn about our platform, products, features, pricing, integrations, and documentation.\n\nHow can I help you today?"
    },

    {
      id: "what-can-you-do",
      cat: "Other",
      q: "What can you help me with?",
      kw: ["what can you do", "help", "help me", "capabilities", "what do you know", "assist", "guidance", "what can i ask"],
      a: "I can help you with everything about NirnexAI:\n\n• **Platform** – what it is and how it works\n• **Features** – Chat AI, Dashboards, Infographics, Action Tracker, Meeting Intelligence\n• **Pricing** – plans, features, and choosing the right one\n• **Use cases** – C-Suite strategy, board governance, M&A, finance, ops, risk\n• **Integrations** – Google Meet, Zoom, Microsoft Teams\n• **Company & contact** – about us, demos, support\n\nWhat would you like to explore?"
    },

    {
      id: "thanks",
      cat: "Other",
      q: "Thanks / welcome",
      kw: ["thank", "thanks", "thx", "appreciate", "great", "awesome", "cool", "nice", "perfect", "welcome"],
      a: "You're welcome! Is there anything else I can help you with about NirnexAI?"
    }
  ];

  return KB;
});