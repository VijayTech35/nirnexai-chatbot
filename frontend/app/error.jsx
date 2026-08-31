"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Chat error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-[var(--bg)]">
      <div className="card max-w-sm space-y-4 p-6 text-center">
        <p className="text-3xl">⚠</p>
        <h1 className="text-lg font-bold text-[var(--ink)]">Something went wrong</h1>
        <p className="text-sm text-[var(--ink-2)]">
          The chat hit an unexpected error. You can try again.
        </p>
        <button onClick={reset} className="btn-primary w-full justify-center">
          Try again
        </button>
      </div>
    </div>
  );
}
