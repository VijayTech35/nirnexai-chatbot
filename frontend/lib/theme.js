"use client";

import { useCallback, useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const t = window.localStorage.getItem("nirnex_theme");
      if (t === "light") return "light";
      const s = JSON.parse(window.localStorage.getItem("nirnex_settings") || "{}");
      if (s && s.theme) return s.theme;
    } catch {}
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("nirnex_theme", theme);
      const s = JSON.parse(window.localStorage.getItem("nirnex_settings") || "{}");
      window.localStorage.setItem("nirnex_settings", JSON.stringify({ ...s, theme }));
    } catch {}
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  return { theme, setTheme, toggle };
}