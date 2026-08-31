"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, useSettings } from "../../../lib/settings";
import { useToast } from "../../../lib/toast";
import { SectionTitle } from "../../../components/ui";
import { Toggle } from "../../../components/ui";
import { IconRefresh } from "../../../lib/icons";

function Field({ label, hint, value, onChange, textarea, rows = 2 }) {
  const cls = "field";
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      {hint && <span className="mt-1 block text-xs text-[var(--ink-3)]">{hint}</span>}
    </label>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3" style={{ borderColor: "var(--line)" }}>
      <div>
        <p className="text-sm font-medium text-[var(--ink)]">{label}</p>
        {hint && <p className="text-xs text-[var(--ink-3)]">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export default function ChatbotSettings() {
  const { settings, update, reset } = useSettings();
  const toast = useToast();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!form && settings) setForm(JSON.parse(JSON.stringify(settings)));
  }, [settings, form]);

  if (!form) return null;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    update(form);
    toast.push("Chatbot settings saved to this browser.", "ok");
  };

  const doReset = () => {
    reset();
    setForm(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    toast.push("Restored default settings.", "info");
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Chatbot Settings"
        sub="What the assistant says and how it behaves. Saved to this browser and shared with the chatbot console."
        right={
          <div className="flex gap-2">
            <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={doReset}>
              <IconRefresh className="h-4 w-4" /> Reset
            </button>
            <button className="btn-primary !px-4 !py-1.5 text-sm" onClick={save}>
              Save changes
            </button>
          </div>
        }
      />

      <section className="card space-y-5 p-5">
        <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Identity</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Brand name" value={form.brandName} onChange={set("brandName")} />
          <Field label="Assistant name" value={form.assistantName} onChange={set("assistantName")} />
          <Field label="Logo URL" value={form.logoUrl} onChange={set("logoUrl")} hint="Optional. Falls back to the bot mark." />
        </div>
      </section>

      <section className="card space-y-5 p-5">
        <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Copy</h3>
        <Field label="Welcome message" textarea rows={4} value={form.welcomeMessage} onChange={set("welcomeMessage")} hint="Markdown supported. Shown as the first assistant message." />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Hero heading" value={form.heroHeading} onChange={set("heroHeading")} />
          <Field label="Hero subtitle" textarea rows={2} value={form.heroSub} onChange={set("heroSub")} />
          <Field label="Footer text" value={form.footerText} onChange={set("footerText")} />
        </div>
      </section>

      <section className="card space-y-5 p-5">
        <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Suggested questions</h3>
        <Field
          label="Quick-action chips (one per line)"
          textarea
          rows={5}
          value={form.suggestedQuestions.join("\n")}
          onChange={(v) => setForm((f) => ({ ...f, suggestedQuestions: v.split("\n").map((s) => s.trim()).filter(Boolean) }))}
          hint="First 6 appear as chips above the console input."
        />
      </section>

      <section className="card space-y-3 p-5">
        <h3 className="mb-1 text-sm font-bold tracking-tight text-[var(--ink)]">Behavior</h3>
        <ToggleRow label="Lead capture" hint="Show the lead form after a few messages" checked={form.leadCapture} onChange={set("leadCapture")} />
        <ToggleRow label="Book a demo" hint="Quick action and lead form can request demos" checked={form.bookDemo} onChange={set("bookDemo")} />
        <ToggleRow label="Contact button" hint="CTA surface for contact sales" checked={form.contactButton} onChange={set("contactButton")} />
        <ToggleRow label="Source citations" hint="Show source chips under answers" checked={form.sourceCitations} onChange={set("sourceCitations")} />
        <ToggleRow label="Related questions" hint="Suggest follow-up questions after answers" checked={form.showRelated} onChange={set("showRelated")} />
        <ToggleRow label="Live streaming" hint="Stream answers token-by-token" checked={form.streaming} onChange={set("streaming")} />
        <ToggleRow label="Character counter" hint="Show the character limit below the input" checked={form.showCharacterCount} onChange={set("showCharacterCount")} />
        <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3" style={{ borderColor: "var(--line)" }}>
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">Ask for lead after</p>
            <p className="text-xs text-[var(--ink-3)]">Number of user messages before prompting</p>
          </div>
          <input
            type="number"
            min={1}
            max={10}
            value={form.leadCaptureAfter}
            onChange={(e) => setForm((f) => ({ ...f, leadCaptureAfter: Math.max(1, Number(e.target.value) || 2) }))}
            className="field !w-20 text-right"
          />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={() => setForm(JSON.parse(JSON.stringify(settings)))}>
          Discard
        </button>
        <button className="btn-primary" onClick={save}>
          Save changes
        </button>
      </div>
    </div>
  );
}