"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const SETTINGS_KEY = "nirnex_settings";

export const DEFAULT_SETTINGS = {
  assistantName: "NirnexAI Assistant",
  welcomeMessage:
    "Hi! I'm **NirnexAI Assistant** — I can help you with pricing, features, modules, integrations, security, and use cases. What would you like to know?",
  brandName: "NirnexAI",
  logoUrl: "",
  theme: "dark",
  accent: "#10B981",
  heroHeading: "Ask Anything About NirnexAI",
  heroSub:
    "Get instant answers about pricing, features, integrations, security, documentation and more — grounded in the official knowledge base.",
  footerText: "Powered by NirnexAI · © Anvika Digitech Solutions",
  suggestedQuestions: [
    "What is NirnexAI?",
    "Pricing",
    "Book Demo",
    "Integrations",
    "Security",
    "Meeting Intelligence",
    "Dashboard",
    "API"
  ],
  leadCapture: true,
  leadCaptureAfter: 2,
  bookDemo: true,
  contactButton: true,
  sourceCitations: true,
  showRelated: true,
  streaming: true,
  showCharacterCount: true
};

function readSettings() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return null;
}

const SettingsContext = createContext({ settings: DEFAULT_SETTINGS, update: () => {}, reset: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => readSettings() || DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
    const root = document.documentElement;
    root.style.setProperty("--accent", settings.accent || DEFAULT_SETTINGS.accent);
    const theme = settings.theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("nirnex_theme", theme);
    } catch {}
  }, [settings]);

  const update = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings({ ...DEFAULT_SETTINGS }), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}