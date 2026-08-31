/**
 * Text utilities: HTML -> text, chunking, token heuristic.
 */

export function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

/** Very rough heuristic: ~4 chars per token. */
export function approxTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}

/**
 * Splits text into overlapping chunks, splitting on headings/paragraphs.
 * @param {string} text
 * @param {number} chunkChars target chars per chunk
 * @param {number} overlapChars overlap between chunks
 * @returns {Array<{index:number,text:string,heading:string|null}>}
 */
export function chunkText(text, chunkChars = 1400, overlapChars = 180) {
  const clean = stripHtml(String(text || "")).trim();
  if (!clean) return [];

  // Split into blocks on double newlines (paragraphs / sections).
  const blocks = clean
    .split(/\n{2,}/)
    .map((b) => b.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);

  const chunks = [];
  let buffer = "";
  let lastHeading = null;

  const flush = () => {
    if (!buffer.trim()) return;
    chunks.push({ index: chunks.length, text: buffer.trim(), heading: lastHeading });
    // keep tail of buffer for overlap
    buffer = buffer.trim().slice(-overlapChars);
  };

  for (const block of blocks) {
    // Track headings (lines that look like headings) for context
    if (/^#{1,6}\s/.test(block) || (block.length < 90 && /[.:]$/.test(block) === false && block.split(" ").length <= 12 && /^[A-Z0-9]/.test(block))) {
      lastHeading = block.replace(/^#{1,6}\s*/, "");
    }
    if (buffer.length + block.length + 2 > chunkChars) flush();
    buffer += (buffer ? "\n\n" : "") + block;
  }
  flush();
  return chunks;
}