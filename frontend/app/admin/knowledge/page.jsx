"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdmin } from "../../../lib/admin-hook";
import { adminDocs, adminDeleteDoc, adminUpload, adminAddKb, adminListKb, getApiBase } from "../../../lib/chat-client";
import { useToast } from "../../../lib/toast";
import { Badge, EmptyState, SectionTitle, StatCard } from "../../../components/ui";
import { IconBook, IconDatabase, IconPaperclip, IconPlus, IconRefresh, IconSearch, IconShield, IconSpinner, IconTrash } from "../../../lib/icons";

const base = getApiBase();

function formatBytes(chars) {
  if (chars < 1024) return `${chars} chars`;
  return `${(chars / 1024).toFixed(1)}k chars`;
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function KnowledgeBase() {
  const { status, loading, busy, error, refresh, reindex } = useAdmin(base, "");
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [clear, setClear] = useState(false);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const fileRef = useRef(null);

  const [kbEntries, setKbEntries] = useState([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbForm, setKbForm] = useState({ cat: "Platform", q: "", a: "" });
  const [savingKb, setSavingKb] = useState(false);

  const loadKbEntries = useCallback(async () => {
    setKbLoading(true);
    try {
      const r = await adminListKb(base, "");
      setKbEntries(r.entries || []);
    } catch { setKbEntries([]); }
    setKbLoading(false);
  }, []);

  useEffect(() => { loadDocs(); loadKbEntries(); }, [loadDocs, loadKbEntries]);

  const onAddKb = async (e) => {
    e.preventDefault();
    if (!kbForm.q.trim() || !kbForm.a.trim()) {
      toast.push("Question and answer are required.", "error");
      return;
    }
    setSavingKb(true);
    try {
      const res = await adminAddKb(base, "", [{
        cat: kbForm.cat,
        q: kbForm.q.trim(),
        a: kbForm.a.trim(),
        ...(kbForm.kw?.trim() ? { kw: kbForm.kw.trim().split(",").map((k) => k.trim()).filter(Boolean) } : {})
      }]);
      toast.push(res.added ? "KB entry added & embedded." : "Entry already exists in the KB.", res.added ? "ok" : "info");
      setKbForm({ cat: kbForm.cat, q: "", a: "", kw: "" });
      loadKbEntries();
      refresh();
    } catch (err) {
      toast.push(`Add KB entry failed: ${err.message}`, "error");
    } finally {
      setSavingKb(false);
    }
  };

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const r = await adminDocs(base, "");
      setDocs(r.documents || []);
    } catch { setDocs([]); }
    setDocsLoading(false);
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const onReindex = async () => {
    toast.push("Rebuilding index…", "info");
    try {
      const res = await reindex({ clear });
      toast.push(`Index rebuilt → ${res?.total ?? "?"} documents.`, "ok");
      loadDocs();
    } catch {
      toast.push("Reindex failed — check backend logs.", "error");
    }
  };

  const onFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    toast.push(`Uploading ${file.name}…`, "info");
    try {
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = reader.result.split(",")[1] || "";
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await adminUpload(base, "", { filename: file.name, content });
      toast.push(`${file.name} ingested — ${res.chunks} chunks added.`, "ok");
      loadDocs();
      refresh();
    } catch (err) {
      toast.push(`Upload failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (doc) => {
    setDeletingId(doc.id);
    try {
      await adminDeleteDoc(base, "", doc.id);
      toast.push(`Removed "${doc.filename}".`, "ok");
      loadDocs();
      refresh();
    } catch (err) {
      toast.push(`Delete failed: ${err.message}`, "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Knowledge Base"
        sub="Documents embedded into the vector store that ground every answer."
        right={
          <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => { refresh(); loadDocs(); }} disabled={loading || docsLoading}>
            <IconRefresh className={`h-4 w-4 ${(loading || docsLoading) ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<IconBook className="h-5 w-5" />} label="Documents" value={status?.storeSize ?? "…"} hint="embedded + persisted" />
        <StatCard icon={<IconDatabase className="h-5 w-5" />} label="Vector store" value={status?.store ?? "…"} hint="store backend" />
        <StatCard icon={<IconShield className="h-5 w-5" />} label="Embedding model" value={status?.embeddings ?? "…"} hint={status?.autoIndex ? "hash-drift refresh on" : "refresh disabled"} />
      </div>

      {/* Add KB entry */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Add a QA entry</h3>
            <p className="mt-0.5 text-xs text-[var(--ink-2)]">Appends a curated question/answer to the seed KB and embeds it immediately. Total seed entries: {kbLoading ? "…" : kbEntries.length}</p>
          </div>
        </div>

        <form onSubmit={onAddKb} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-2)]">Category</label>
              <select
                value={kbForm.cat}
                onChange={(e) => setKbForm((f) => ({ ...f, cat: e.target.value }))}
                className="field !py-2"
              >
                {["Platform", "Features", "Pricing", "Use Cases", "Company", "Security", "Contact", "Other"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-2)]">Keywords (comma-separated, optional)</label>
              <input
                value={kbForm.kw || ""}
                onChange={(e) => setKbForm((f) => ({ ...f, kw: e.target.value }))}
                placeholder="pricing, plans, cost"
                className="field !py-2"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-2)]">Question</label>
            <input
              value={kbForm.q}
              onChange={(e) => setKbForm((f) => ({ ...f, q: e.target.value }))}
              placeholder="What can the chatbot answer?"
              className="field !py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-2)]">Answer</label>
            <textarea
              value={kbForm.a}
              onChange={(e) => setKbForm((f) => ({ ...f, a: e.target.value }))}
              placeholder="Write the grounded answer here. Markdown is supported."
              rows={4}
              className="field !py-2"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary text-sm" disabled={savingKb}>
              {savingKb ? (
                <><IconSpinner className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><IconPlus className="h-4 w-4" /> Add entry</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Upload section */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Upload documents</h3>
            <p className="mt-0.5 text-xs text-[var(--ink-2)]">Supported: .txt, .md, .csv, .json, .html, .pdf</p>
          </div>
          <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.html,.pdf" className="hidden" onChange={onFilePick} />
          <button
            className="btn-primary text-sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><IconSpinner className="h-4 w-4" /> Uploading…</>
            ) : (
              <><IconPaperclip className="h-4 w-4" /> Upload file</>
            )}
          </button>
        </div>
      </div>

      {/* Uploaded docs list */}
      <div className="card p-5">
        <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Uploaded documents</h3>
        <p className="mt-0.5 text-xs text-[var(--ink-2)]">Files uploaded via the console or admin panel.</p>

        <div className="mt-4">
          {docsLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-[var(--ink-2)]">
              <IconSpinner className="h-4 w-4 animate-spin" /> Loading documents…
            </div>
          ) : docs.length === 0 ? (
            <EmptyState
              icon={<IconBook className="h-5 w-5" />}
              title="No uploaded documents"
              sub="Upload a file above to add custom knowledge to the base."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)" }}>
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-[var(--panel-2)] text-xs uppercase tracking-wider text-[var(--ink-3)]" style={{ borderColor: "var(--line)" }}>
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Filename</th>
                    <th className="px-4 py-2.5 font-semibold">Chunks</th>
                    <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Size</th>
                    <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Indexed</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {docs.map((doc) => (
                    <tr key={doc.id} className="group transition-colors hover:bg-[var(--panel-2)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-veil)] text-[var(--accent)]">
                            <IconBook className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-medium text-[var(--ink)] truncate max-w-[220px]" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge kind="green">{doc.chunks}</Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">
                        {formatBytes(doc.chars)}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">
                        {formatTime(doc.indexedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--danger)] opacity-60 transition-all hover:bg-[var(--danger)]/10 hover:opacity-100 disabled:opacity-30"
                          onClick={() => onDelete(doc)}
                          disabled={deletingId === doc.id}
                          title={`Remove ${doc.filename}`}
                        >
                          {deletingId === doc.id ? (
                            <IconSpinner className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <IconTrash className="h-3.5 w-3.5" />
                          )}
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Search + Maintain */}
      <div className="card p-5">
        <label className="relative block">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the knowledge base…"
            className="field !pl-10"
          />
        </label>

        <div id="kb-doc-list" className="mt-5">
          {query.trim() ? (
            <EmptyState
              icon={<IconBook className="h-5 w-5" />}
              title="No document matches in this view"
              sub="The search is for display only — semantic search runs at query time on the backend."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-veil)] text-[var(--accent)]">
                    <IconBook className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Official knowledge base seed</p>
                    <p className="text-xs text-[var(--ink-2)]">Seed URLs + crawled pages → embedded chunks</p>
                  </div>
                </div>
                <Badge kind="green">{status?.storeSize ?? "…"} docs</Badge>
              </div>

              <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)" }}>
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-[var(--panel-2)] text-xs uppercase tracking-wider text-[var(--ink-3)]" style={{ borderColor: "var(--line)" }}>
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Layer</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Content hashing</td>
                      <td className="px-4 py-3"><Badge kind="green">sha1 on boot</Badge></td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">Only changed documents are re-embedded</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Persistence</td>
                      <td className="px-4 py-3"><Badge kind="green">atomic</Badge></td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">vectors.json with .tmp + rename, crash recovery</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Embeddings</td>
                      <td className="px-4 py-3"><Badge kind={status?.llm ? "green" : "amber"}>{status?.llm ? "configured" : "pending"}</Badge></td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">{status?.embeddings}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Crawler</td>
                      <td className="px-4 py-3">
                        <Badge kind={status?.firecrawl ? "green" : "gray"}>{status?.firecrawl ? "enabled" : "not configured"}</Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-[var(--ink-2)] sm:table-cell">seed-only mode when Firecrawl is unset</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold tracking-tight text-[var(--ink)]">Maintain</h3>
        <p className="mt-0.5 text-xs text-[var(--ink-2)]">Reseed and re-embed the whole knowledge base.</p>
        <label className="mt-4 mb-3 flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3" style={{ borderColor: "var(--line)" }}>
          <span className="text-sm text-[var(--ink-2)]">Clear existing index first</span>
          <input
            type="checkbox"
            checked={clear}
            onChange={(e) => setClear(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>
        <button className="btn-primary" onClick={onReindex} disabled={busy}>
          {busy ? <><IconRefresh className="h-4 w-4 animate-spin" /> Rebuilding…</> : "Rebuild index (seed + crawl)"}
        </button>
      </div>
    </div>
  );
}
