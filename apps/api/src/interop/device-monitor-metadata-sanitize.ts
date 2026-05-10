/**
 * Phase 11C — allowlisted audit / log metadata for device observation pipeline stubs.
 *
 * Does **not** permit numeric vitals, notes, raw payloads, names, or MRN.
 * @see docs/DEVICE_MONITOR_INTEGRATION_ARCHITECTURE.md §9–10
 */

const ALLOWED_KEYS = new Set([
  "facilityId",
  "deviceId",
  "encounterId",
  "patientId",
  "observationStatus",
  "matchConfidence",
  "sourceKind",
  "measurementTypes",
  "receivedAt",
]);

const MAX_SCALAR_LEN = 128;
/** Exported for tests — max `measurementTypes` array length in audit metadata. */
export const MAX_DEVICE_MEASUREMENT_TYPES_IN_AUDIT = 32;
const MAX_TYPE_TOKEN_LEN = 48;

function truncateString(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max);
}

function sanitizeMeasurementTypes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const item of value) {
    if (out.length >= MAX_DEVICE_MEASUREMENT_TYPES_IN_AUDIT) break;
    if (typeof item !== "string") continue;
    const t = truncateString(item, MAX_TYPE_TOKEN_LEN);
    if (t.length === 0) continue;
    out.push(t);
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Returns shallow allowlisted metadata for device observation audit stubs.
 */
export function sanitizeDeviceObservationAuditMetadata(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of ALLOWED_KEYS) {
    if (key === "measurementTypes") {
      const mt = sanitizeMeasurementTypes(src[key]);
      if (mt) out.measurementTypes = mt;
      continue;
    }
    const v = src[key];
    if (v === null || typeof v === "boolean" || typeof v === "number") {
      out[key] = v;
      continue;
    }
    if (typeof v === "string") {
      const s = truncateString(v, MAX_SCALAR_LEN);
      if (s.length > 0) out[key] = s;
    }
  }

  return out;
}

export function deviceObservationAuditMetadataAllowlist(): ReadonlySet<string> {
  return ALLOWED_KEYS;
}
