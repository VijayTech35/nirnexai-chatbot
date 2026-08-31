import { createHash } from "node:crypto";

/** Content fingerprint used for index drift detection (no API call involved). */
export function sha1(value) {
  return createHash("sha1").update(String(value ?? "")).digest("hex");
}