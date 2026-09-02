"use client";

import { useSettings } from "../../../lib/settings";
import { useToast } from "../../../lib/toast";
import { Badge, SectionTitle } from "../../../components/ui";
import { Toggle } from "../../../components/ui";
import { IconCheck, IconMoon, IconRefresh, IconSun } from "../../../lib/icons";

const SWATCHES = [
  "#10B981",
  "#22D3EE",
  "#818CF8",
  "#F472B6",
  "#FBBF24",
  "#F87171",
  "#A78BFA",
  "#34D399"
];

export default function Appearance() {
  const { settings, update } = useSettings();
  const toast = useToast();

  const pick = (accent) => {
    update({ accent });
    toast.push("Accent updated — previewing live.", "ok");
  };

  const pickTheme = (theme) => {
    update({ theme });
    toast.push(`Switched to ${theme} theme.`, "info");
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Appearance" sub="Theme and accent for the assistant console. Every change previews live here and on the chat page." />

      <section className="card p-5">
        <h3 className="mb-4 text-sm font-bold tracking-tight text-[var(--ink)]">Theme</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: "dark", label: "Dark", sub: "Deep charcoal surfaces", Icon: IconMoon },
            { id: "light", label: "Light", sub: "Bright, airy surfaces", Icon: IconSun }
          ].map((t) => {
            const active = (settings.theme || "dark") === t.id;
            return (
              <button
                key={t.id}
                onClick={() => pickTheme(t.id)}
                className={`relative flex items-center gap-3 rounded-2xl border p-5 text-left transition-all duration-300 ${
                  active ? "border-[var(--accent)]" : ""
                }`}
                style={{ borderColor: active ? "var(--accent)" : "var(--line)", background: "var(--panel)" }}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${active ? "bg-[var(--accent-veil)] text-[var(--accent)]" : "bg-[var(--panel-3)] text-[var(--ink-2)]"}`}>
                  <t.Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">{t.label}</p>
                  <p className="text-xs text-[var(--ink-2)]">{t.sub}</p>
                </div>
                {active && (
                  <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--ink)]">
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Accent color</h3>
            <p className="mt-0.5 text-xs text-[var(--ink-2)]">
              Applied to buttons, links, highlights and the switcher. Current: <span className="font-mono">{settings.accent}</span>
            </p>
          </div>
          <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => pick("#10B981")}>
            <IconRefresh className="h-4 w-4" /> Brand green
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {SWATCHES.map((c) => {
            const active = (settings.accent || "#10B981").toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                onClick={() => pick(c)}
                aria-label={`Accent ${c}`}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-200 hover:scale-110"
                style={{ background: c }}
              >
                {active && (
                  <span className="flex h-full w-full items-center justify-center text-white drop-shadow">
                    <IconCheck className="h-5 w-5" />
                  </span>
                )}
              </button>
            );
          })}
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-2xl border px-4 text-sm" style={{ borderColor: "var(--line)" }}>
            <span className="text-[var(--ink-2)]">Custom</span>
            <input
              type="color"
              value={(settings.accent || "#10B981").toLowerCase()}
              onChange={(e) => pick(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-bold tracking-tight text-[var(--ink)]">Assistant instructions</h3>
        <p className="mb-4 text-xs text-[var(--ink-2)]">
          Custom instructions shape how the assistant talks and behaves. These are sent to the AI on every reply and override the default voice where they conflict. Works on both the chat page and the embedded widget.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {[
            {
              label: "Friendly & concise",
              value: "Keep replies short and upbeat, like a helpful teammate. Use warm, casual language and minimal bullet points."
            },
            {
              label: "Professional",
              value: "Reply in a polished, professional tone as an enterprise support assistant. Be precise, structured, and slightly formal."
            },
            {
              label: "Sell subtly",
              value: "Gently steer answers toward NirnexAI's value: highlight the right feature or plan for the user's situation and mention a demo when it fits naturally."
            }
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => update({ instructions: preset.value })}
              className="rounded-full border px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] transition-colors"
              style={{ borderColor: "var(--line)", background: "var(--panel)" }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <textarea
          value={settings.instructions || ""}
          onChange={(e) => update({ instructions: e.target.value })}
          rows={6}
          placeholder="e.g. Always answer in 2-3 short sentences. Never mention pricing unless asked. End with a question back to the visitor only when it's genuinely useful."
          className="w-full resize-y rounded-2xl border bg-transparent p-4 text-sm leading-relaxed text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)]"
          style={{ borderColor: "var(--line)" }}
        />
        <p className="mt-2 text-right text-xs text-[var(--ink-3)]">{String(settings.instructions || "").length} / 2000 chars</p>
      </section>

      <section className="card p-5">
        <h3 className="mb-4 text-sm font-bold tracking-tight text-[var(--ink)]">Live preview</h3>
        <div className="rounded-2xl p-5" style={{ background: "var(--bg)", border: "1px solid var(--line)" }}>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary">Primary action</button>
            <button className="btn-ghost">Secondary</button>
            <Toggle checked label="Switch" onChange={() => {}} />
            <Badge kind="green">accent badge</Badge>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--accent-veil)", color: "var(--accent-soft)" }}>
              pill · {settings.accent}
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--panel-3)]">
              <div className="h-full w-2/3 rounded-full" style={{ background: "linear-gradient(90deg, var(--accent-strong), var(--accent-soft))" }} />
            </div>
          </div>
          <p className="mt-4 text-sm text-[var(--ink-2)]">
            Buttons, toggles, badges, pills, dots and progress bars all track <span className="font-mono text-[var(--accent-soft)]">--accent</span> — including the console hero and message bubbles.
          </p>
        </div>
      </section>
    </div>
  );
}