/**
 * Deterministic mock embedding (bag-of-char-n-grams hashed into a fixed-size
 * vector). Used only when config.mock = true so the whole RAG pipeline
 * (crawl -> index -> retrieve -> answer) works without API keys.
 */
export function hashEmbed(text, dims = 1024) {
  const vec = new Array(dims).fill(0);
  const t = String(text || "").toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const n = 3; // char trigram bag
  for (let i = 0; i + n <= t.length; i++) {
    const gram = t.slice(i, i + n);
    let h = 0;
    for (let j = 0; j < gram.length; j++) h = (h * 31 + gram.charCodeAt(j)) >>> 0;
    vec[h % dims] += 1;
  }
  // L2 normalize
  let sum = 0;
  for (let i = 0; i < dims; i++) sum += vec[i] * vec[i];
  sum = Math.sqrt(sum) || 1;
  for (let i = 0; i < dims; i++) vec[i] /= sum;
  return vec;
}

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}