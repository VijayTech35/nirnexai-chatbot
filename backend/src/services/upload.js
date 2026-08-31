import { inflateSync } from "zlib";
import { stripHtml } from "../utils/text.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const TEXT_EXT = ["txt", "md", "markdown", "csv", "js", "ts", "json", "xml", "html", "htm", "log"];
const PDF_EXT = ["pdf"];

export function isSupported(filename = "") {
  const ext = String(filename).split(".").pop()?.toLowerCase() || "";
  return TEXT_EXT.includes(ext) || PDF_EXT.includes(ext);
}

/**
 * Minimal PDF text extractor (works for standard text-based PDFs).
 * Handles uncompressed and FlateDecode (zlib) streams. Scanned/image-only
 * PDFs will yield little/no text — an error is raised so the UI can warn.
 */
export function extractPdfText(buffer) {
  const chunks = [];
  let pos = 0;
  while (pos < buffer.length) {
    // find stream objects
    const sIdx = buffer.indexOf(Buffer.from("stream"), pos);
    if (sIdx === -1) break;
    const eIdx = buffer.indexOf(Buffer.from("endstream"), sIdx + 6);
    if (eIdx === -1) break;

    const headStart = Math.max(0, sIdx - 200);
    const header = buffer.toString("latin1", headStart, sIdx);
    const startByte = buffer[sIdx + 6] === 0x0d ? sIdx + 8 : sIdx + 7; // skip \r\n or \n
    if (startByte >= eIdx) break;

    const data = buffer.subarray(startByte, eIdx);
    let raw = null;

    if (header.includes("FlateDecode") || header.includes("/Fl")) {
      try {
        raw = inflateSync(data);
      } catch {
        raw = null;
      }
    } else {
      raw = data;
    }

    if (raw) {
      const str = raw.toString("latin1").replace(/\r/g, "");
      // extract (text) from Tj/TJ operators, decode PDF hex strings and escapes
      const out = extractTextOps(str);
      if (out) chunks.push(out);
    }
    pos = eIdx + 9;
  }

  const text = chunks.join("\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("No extractable text found — the PDF may be scanned or image-based. Try a .txt or .md file.");
  return text;
}

function extractTextOps(str) {
  let result = "";
  // capture (...) strings used by Tj / TJ text show operators
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === "(") {
      let j = i + 1;
      let depth = 1;
      let seg = "";
      while (j < str.length && depth > 0) {
        const c = str[j];
        if (c === "\\") {
          const nxt = str[j + 1];
          seg += nxt === "n" ? "\n" : nxt === "t" ? " " : nxt === "r" ? " " : nxt === "(" ? "(" : nxt === ")" ? ")" : (nxt || "");
          j += 2;
          continue;
        }
        if (c === "(") { depth++; seg += c; }
        else if (c === ")") { depth--; if (depth === 0) break; else seg += c; }
        else seg += c;
        j++;
      }
      result += seg;
      i = j + 1;
    } else if (ch === "<") {
      const hexEnd = str.indexOf(">", i);
      if (hexEnd !== -1) {
        const hex = str.slice(i + 1, hexEnd).replace(/[^0-9a-fA-F]/g, "");
        const bytes = hex.match(/.{2}/g) || [];
        result += bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join("");
        i = hexEnd + 1;
      } else i++;
    } else {
      i++;
    }
  }
  return result;
}

/** Decode an uploaded file into plain text based on its extension. */
export function extractTextFromFile(filename, buffer) {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("File too large — max 5 MB.");
  }
  const ext = String(filename).split(".").pop()?.toLowerCase() || "";
  const lower = String(filename).toLowerCase();

  if (PDF_EXT.includes(ext)) {
    return extractPdfText(buffer);
  }
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    const html = buffer.toString("utf8");
    return stripHtml(html);
  }
  if (TEXT_EXT.includes(ext)) {
    let text = buffer.toString("utf8");
    // strip BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return text;
  }
  throw new Error(`Unsupported file type ".${ext}". Supported: txt, md, csv, json, html, pdf.`);
}

export const MAX_FILE_BYTES_B = MAX_FILE_BYTES;
