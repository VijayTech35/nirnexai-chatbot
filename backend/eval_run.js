/**
 * Golden-QA runner for the NirnexAI RAG pipeline.
 *
 *   node eval_run.js                # evaluate live backend (default)
 *   node eval_run.js --mock         # informational mock run
 *
 * Each question must contain every expected substring (case-insensitive) and,
 * when provided, a citation URL substring. Prints a per-question pass/fail row
 * and a summary. Exits non-zero when total pass rate is below 80%.
 */
import { EVAL_QUESTIONS, askOnce } from "./eval_questions.js";

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith("http")) || "http://localhost:4000").replace(/\/+$/, "");
const mock = args.includes("--mock");
const verbose = args.includes("--verbose");

console.log(`Eval run | base=${base} | mode=${mock ? "mock" : "live"} | questions=${EVAL_QUESTIONS.length}\n`);

let passed = 0;
const rows = [];
for (const [i, item] of EVAL_QUESTIONS.entries()) {
  const t0 = Date.now();
  try {
    const { text, citations, error } = await askOnce(base, item.q);
    const elapsed = Date.now() - t0;
    const lower = text.toLowerCase();
    const missingKw = (item.mustInclude || []).filter((kw) => !lower.includes(kw.toLowerCase()));
    const anyOk = !item.anyInclude?.length || item.anyInclude.some((kw) => lower.includes(kw.toLowerCase()));
    const urlOk = !item.url || (citations || []).some((c) => (c.url || "").includes(item.url));
    const ok = !error && missingKw.length === 0 && anyOk && urlOk;
    if (ok) passed++;
    rows.push({
      ok,
      i: i + 1,
      q: item.q.slice(0, 48),
      elapsed,
      len: text.length,
      missing: missingKw.join("|"),
      note: !missingKw.length && !anyOk ? "any-miss" : urlOk ? "" : `url ~${item.url}`,
      err: error || "",
      text
    });
  } catch (e) {
    rows.push({ ok: false, i: i + 1, q: item.q.slice(0, 48), elapsed: 0, len: 0, missing: "-", note: "", err: e.message, text: "" });
  }
}

for (const r of rows) {
  const mark = r.ok ? "PASS" : "FAIL";
  const extra = r.err ? ` !! ${r.err.slice(0, 120)}` : r.missing ? ` missing: ${r.missing}` : r.note ? ` note: ${r.note}` : "";
  console.log(`${mark.padEnd(4)} [${String(r.i).padStart(2)}] ${r.q.padEnd(50)} ${String(r.elapsed).padStart(5)}ms ${String(r.len).padStart(5)}c${extra}`);
  if (!r.ok && verbose && r.text) console.log(`        → ${r.text.replace(/\n/g, " ").slice(0, 260)}`);
}

const pct = Math.round((passed / rows.length) * 100);
console.log(`\n${passed}/${rows.length} passed (${pct}%)`);
process.exit(pct >= 80 ? 0 : 1);