/** Keys whose values must never be persisted or returned to clients. */
const SENSITIVE_KEY = /(password|secret|token|apikey|api_key|authorization|credential|private[_-]?key)/i;

export function scrubValueForPersistence(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[MAX_DEPTH]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length > 4000) return `${value.slice(0, 4000)}…[truncated]`;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((v) => scrubValueForPersistence(v, depth + 1));
  }
  if (typeof value === "object") {
    return scrubRecordForPersistence(value as Record<string, unknown>, depth + 1);
  }
  return String(value);
}

export function scrubRecordForPersistence(
  record: Record<string, unknown>,
  depth = 0
): Record<string, unknown> {
  if (depth > 8) return { _scrub: "[MAX_DEPTH]" };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = "[REDACTED]";
      continue;
    }
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = scrubRecordForPersistence(v as Record<string, unknown>, depth + 1);
    } else if (Array.isArray(v)) {
      out[k] = scrubValueForPersistence(v, depth + 1);
    } else {
      out[k] = scrubValueForPersistence(v, depth + 1);
    }
  }
  return out;
}
