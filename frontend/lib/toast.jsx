"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext({ push: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, kind = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[80] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.21, 1.02, 0.73, 1] }}
              className={`pointer-events-auto flex w-full items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md ${
                t.kind === "ok"
                  ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
                  : t.kind === "error"
                    ? "border-red-500/30 bg-red-950/80 text-red-200"
                    : "bg-[var(--panel)] border-[var(--line)] text-[var(--ink)]"
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  t.kind === "ok" ? "bg-emerald-400" : t.kind === "error" ? "bg-red-400" : "bg-[var(--accent)]"
                }`}
              />
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}