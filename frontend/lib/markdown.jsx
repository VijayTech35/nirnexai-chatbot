/**
 * Lightweight Markdown renderer (no external deps, XSS-safe).
 * Supports: headings, paragraphs, fenced code, inline code, bold, italic,
 * strikethrough, links + bare URLs, ordered/unordered lists, blockquotes,
 * simple tables, horizontal rules.
 */
import React from "react";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const INLINE_RE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(~~[^~\n]+~~)|(!?\[[^\]]+\]\([^)\n]+\))|((?:^|[\s(])(?:https?:\/\/)[^\s<)(]+)/g;

/** Render inline markdown to React nodes. `deep` disables nesting bold inside bold. */
export function inline(text, key = "i", deep = true) {
  const t = esc(String(text));
  const out = [];
  let last = 0;
  let n = 0;
  let m;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(t))) {
    if (m.index > last) out.push(t.slice(last, m.index));
    const [, code, bold, ital, strike, link, url] = m;
    const k = `${key}-${n++}`;
    if (code) {
      out.push(
        <code key={k} className="md-code-inline">
          {esc(code.slice(1, -1))}
        </code>
      );
    } else if (bold && deep) {
      out.push(
        <strong key={k}>
          {inline(bold.slice(2, -2), k, false)}
        </strong>
      );
    } else if (ital && deep) {
      out.push(
        <em key={k}>
          {inline(ital.slice(1, -1), k, false)}
        </em>
      );
    } else if (strike && deep) {
      out.push(
        <del key={k}>
          {inline(strike.slice(2, -2), k, false)}
        </del>
      );
    } else if (link) {
      out.push(<AutoLink key={k} raw={link} />);
    } else if (url) {
      const href = url.trim().replace(/^[\s(]+/, "").replace(/[),;:\u2026]+$/, "");
      if (/^https?:\/\//.test(href)) {
        out.push(
          <a key={k} href={href} target="_blank" rel="noreferrer" className="md-link">
            {esc(href)}
          </a>
        );
      } else {
        out.push(url);
      }
    } else {
      out.push(m[0]);
    }
    last = m.index + m[0].length;
    // recursive inline() calls re-use this same global regex and reset
    // lastIndex (to 0 on a failed exec), which would otherwise make the
    // outer loop re-match the same token forever. Resume explicitly.
    INLINE_RE.lastIndex = last;
  }
  if (last < t.length) out.push(t.slice(last));
  return out;
}

const SAFE_PROTOCOLS = /^(https?:|mailto:|tel:)/i;

/** Allow only safe URL schemes for links/images rendered from markdown. */
function safeUrl(href) {
  const h = String(href || "").trim();
  return SAFE_PROTOCOLS.test(h) ? h : null;
}

function AutoLink({ raw, k }) {
  const m = raw.match(/^!?\[([^\]]*)\]\(([^)\n]+)\)$/);
  if (!m) return raw;
  const isImg = raw.startsWith("!");
  const href = m[2].trim();
  const safe = safeUrl(href);
  if (isImg) {
    // Only allow http(s) images; never inline data:/javascript:.
    if (!safe || !/^https?:\/\//i.test(safe)) return raw;
    return <img key={k} src={safe} alt={m[1]} className="md-img" loading="lazy" />;
  }
  if (!safe) return raw;
  return (
    <a key={k} href={safe} target="_blank" rel="noreferrer" className="md-link">
      {inline(m[1] || safe, k)}
    </a>
  );
}

const LIST_RE = /^\s*([-*+]|\d+[.)])\s+(.*)$/;

/** Block-level parse -> React tree. */
export function Markdown({ text }) {
  const lines = String(text).split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const l = lines[i];

    if (l.startsWith("```")) {
      const lang = l.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre key={blocks.length} className="md-pre">
          <code className={lang ? `lang-${lang}` : ""}>{esc(code.join("\n"))}</code>
        </pre>
      );
      continue;
    }

    if (/^\s*>\s?/.test(l)) {
      const q = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        q.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={blocks.length} className="md-quote">
          {q.map((ql, qi) => (
            <p key={qi}>{inline(ql, `q${qi}`)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    if (/^\s{0,3}#{1,6}\s/.test(l)) {
      const m = l.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
      const level = m[1].length;
      const Tag = `h${level}`;
      blocks.push(
        <Tag key={blocks.length} className={`md-h md-h${level}`}>
          {inline(m[2], `h${level}`)}
        </Tag>
      );
      i++;
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(l)) {
      blocks.push(<hr key={blocks.length} className="md-hr" />);
      i++;
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i].trim() || "|")) {
        rows.push(lines[i].trim());
        i++;
      }
      blocks.push(<MdTable key={blocks.length} rows={rows} />);
      continue;
    }

    if (LIST_RE.test(l)) {
      const items = [];
      while (i < lines.length && (LIST_RE.test(lines[i]) || /^\s{2,}(?=\S)/.test(lines[i]))) {
        const mm = lines[i].match(LIST_RE);
        if (mm) items.push({ ord: mm[1], text: mm[2] });
        i++;
      }
      const ordered = /^\d+/.test(items[0]?.ord || "");
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={blocks.length} className={`md-list ${ordered ? "md-ol" : "md-ul"}`}>
          {items.map((it, ii) => (
            <li key={ii}>{inline(it.text, `li${ii}`)}</li>
          ))}
        </Tag>
      );
      continue;
    }

    if (l.trim() === "") {
      i++;
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !/^\s{0,3}#{1,6}\s/.test(lines[i]) &&
      !LIST_RE.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={blocks.length} className="md-p">
        {inline(para.join(" "), `p${blocks.length}`)}
      </p>
    );
  }

  return <div className="md">{blocks}</div>;
}

function MdTable({ rows }) {
  const cells = (r) =>
    r
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
  const isSep = (r) => /^\s*:?-+:?\s*(\|\s*:?-+:?\s*)*$/.test(r);
  const header = cells(rows[0] || "");
  const body = rows.slice(1).filter((r) => !isSep(r)).map(cells);
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            {header.map((h, hi) => (
              <th key={hi}>{inline(h, `th${hi}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci}>{inline(c, `td${ri}-${ci}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Markdown;