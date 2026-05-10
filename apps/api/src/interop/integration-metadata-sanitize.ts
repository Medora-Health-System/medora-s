/**
 * Phase 11B — allowlisted metadata keys for integration **audit stubs** and logs.
 * Strips unknown keys and truncates strings to reduce accidental PHI leakage.
 */

const ALLOWED_INTEGRATION_METADATA_KEYS = new Set([
  "sourceSystem",
  "messageKind",
  "correlationId",
  "externalMessageId",
  "codingSystem",
  "codingCode",
  "eventType",
  "hl7MessageType",
  "fhirResourceType",
]);

const MAX_STRING_LEN = 256;

/**
 * Returns a shallow object with only allowlisted keys. Nested objects and arrays
 * are omitted (future: explicit nested allowlist per integration type).
 */
export function sanitizeIntegrationAuditMetadata(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED_INTEGRATION_METADATA_KEYS.has(k)) continue;
    if (v === null || typeof v === "boolean" || typeof v === "number") {
      out[k] = v;
      continue;
    }
    if (typeof v === "string") {
      const s = v.trim().slice(0, MAX_STRING_LEN);
      if (s.length > 0) out[k] = s;
    }
  }
  return out;
}

/** Exported for tests / future allowlist extensions. */
export function integrationMetadataAllowlist(): ReadonlySet<string> {
  return ALLOWED_INTEGRATION_METADATA_KEYS;
}
