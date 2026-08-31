/**
 * Tiny in-memory fixed-window rate limiter (no external deps).
 *
 *   const limiter = rateLimit({ windowMs: 15 * 60_000, max: 30 });
 *   router.post("/", limiter, handler);
 *
 * Responds 429 with a Retry-After header when a key exceeds `max` requests
 * within `windowMs`.
 */
export function rateLimit({ windowMs = 15 * 60_000, max = 30, keyFn, name = "rate" } = {}) {
  const hits = new Map(); // key -> [timestamps]

  // periodic sweep keeps the map bounded
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of hits) {
      while (arr.length && now - arr[0] > windowMs) arr.shift();
      if (!arr.length) hits.delete(k);
    }
  }, Math.min(windowMs, 60_000));
  if (typeof sweep.unref === "function") sweep.unref();

  return (req, res, next) => {
    const key = keyFn
      ? keyFn(req)
      : `${req.ip || req.socket?.remoteAddress || req.headers["x-forwarded-for"] || "unknown"}:${name}`;
    const now = Date.now();
    const arr = hits.get(key) || [];
    while (arr.length && now - arr[0] > windowMs) arr.shift();
    if (arr.length >= max) {
      const retry = Math.max(1, Math.ceil((arr[0] + windowMs - now) / 1000));
      res.set("Retry-After", String(retry));
      return res.status(429).json({ error: `rate limited — try again in ${retry}s` });
    }
    arr.push(now);
    hits.set(key, arr);
    next();
  };
}