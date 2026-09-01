/**
 * Simple keyword-based sentiment and intent detection for the chat route.
 * No external dependencies — runs entirely on keyword matching.
 */

const GREETING_RE = /^(hi|hello|hey|good\s*(morning|afternoon|evening|day)|namaste|howdy|yo|hola|sup|what's up)[\s!.?]*$/i;

const BUYING_INTENT = [
  "want to buy", "want to purchase", "how do i buy", "how do i pay", "how to pay",
  "sign up", "subscribe", "upgrade", "start my plan", "get started now",
  "talk to sales", "talk to a human", "speak to someone", "talk to someone",
  "i want to buy", "i want to subscribe", "i want to purchase",
  "book a demo", "schedule a demo", "request a demo",
  "enterprise", "enterprise plan", "enterprise pricing",
  "buy nirnex", "purchase nirnex", "order", "checkout"
];

const FRUSTRATED = [
  "waste", "stupid", "terrible", "unhelpful", "useless", "hate",
  "worst", "horrible", "awful", "pathetic", "garbage", "trash",
  "this sucks", "you suck", "doesnt work", "doesn't work", "not working",
  "broken", "bug", "problem", "issue", "error", "fail", "failed",
  "frustrated", "annoying", "ridiculous", "nonsense"
];

const POSITIVE = [
  "great", "awesome", "helpful", "love", "amazing", "perfect",
  "excellent", "fantastic", "wonderful", "brilliant", "superb",
  "thanks", "thank you", "thx", "appreciate", "nice", "cool",
  "impressive", "outstanding", "good job", "well done"
];

const CONFUSED = [
  "i don't understand", "i dont understand", "confused", "unclear",
  "what do you mean", "can you explain", "elaborate", "simplify",
  "in simple terms", "i'm lost", "too complex", "hard to understand"
];

export function detectSentiment(text) {
  const lower = (text || "").toLowerCase();
  const result = { sentiment: "neutral", intent: "general", greeting: false };

  if (GREETING_RE.test(lower.trim())) {
    result.greeting = true;
    result.intent = "greeting";
  }

  if (BUYING_INTENT.some((k) => lower.includes(k))) {
    result.intent = "buying";
  }

  if (FRUSTRATED.some((k) => lower.includes(k))) {
    result.sentiment = "negative";
  } else if (POSITIVE.some((k) => lower.includes(k))) {
    result.sentiment = "positive";
  } else if (CONFUSED.some((k) => lower.includes(k))) {
    result.sentiment = "confused";
  }

  return result;
}

/**
 * Generate context-aware follow-up suggestions based on the matched KB
 * entry's category and the user's question. Returns an array of strings.
 */
const CATEGORY_SUGGESTIONS = {
  Platform: [
    "How does NirnexAI work?",
    "Who is NirnexAI built for?",
    "How is it different from traditional BI?",
    "What data sources does it support?"
  ],
  Features: [
    "Tell me about Meeting Intelligence",
    "What modules does NirnexAI have?",
    "Does it integrate with Zoom?",
    "How does the Action Tracker work?"
  ],
  Pricing: [
    "What's included in the Free plan?",
    "Which plan should I choose?",
    "How does annual billing work?",
    "Is there a free trial?"
  ],
  "Use Cases": [
    "How can it help with C-Suite strategy?",
    "Does it support board governance?",
    "Tell me about Financial Planning use case",
    "What about Risk Management?"
  ],
  Contact: [
    "Book a demo",
    "What are the pricing plans?",
    "How do I get started?",
    "Talk to sales"
  ],
  Company: [
    "About NirnexAI",
    "Where are you headquartered?",
    "What's on the blog?",
    "How do I access the platform?"
  ],
  Security: [
    "Is my data confidential?",
    "What's the data retention period?",
    "Is NirnexAI secure for enterprise?",
    "Can I delete my data?"
  ],
  Other: [
    "What is NirnexAI?",
    "What are the pricing plans?",
    "How do I get started?",
    "Book a demo"
  ]
};

export function getSuggestions(category, userQuestion, allKb = []) {
  const pool = CATEGORY_SUGGESTIONS[category] || CATEGORY_SUGGESTIONS.Other;
  const qLower = (userQuestion || "").toLowerCase();

  // Filter out the user's current question and already-asked questions
  const filtered = pool.filter((s) => s.toLowerCase() !== qLower);

  // If we have KB entries, try to add a specific follow-up from the same category
  if (allKb.length && category) {
    const sameCat = allKb.filter(
      (e) => e.cat === category && !qLower.includes((e.q || "").toLowerCase())
    );
    if (sameCat.length) {
      // Pick a random one that's not already in the pool
      const extra = sameCat[Math.floor(Math.random() * sameCat.length)];
      if (extra && !filtered.includes(extra.q)) {
        filtered.push(extra.q);
      }
    }
  }

  return filtered.slice(0, 3);
}
