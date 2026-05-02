/**
 * S18 — PHI-safe projection of `AuditLog.metadata` for admin dashboards.
 * Allowlist only; no free-text clinical fields, no raw nested JSON blobs beyond tiny enums.
 */

const SAFE_METADATA_KEYS = new Set([
  "actorRole",
  "source",
  "scope",
  "format",
  "schemaVersion",
  "exportBatchId",
  "automationEvent",
  "delivery",
  "phase",
  "date",
  "facilityCount",
  "encounterCount",
  "rowCount",
  "documentationGapOverride",
  "dispositionSafetyOverride",
  "deficiencyCodes",
  "workflowTransition",
  "procedureCapture",
  "captureItemId",
  "reasonCode",
  "exportCategory",
  "itemCount",
  "type",
  "critical",
  "orderType",
  "billingCaptureJsonUpdated",
  "procedureCaptureDuplicateBlocked",
  "encounterIntake",
  "reportType",
  "rowCount",
]);

const MAX_SCALAR_LEN = 120;

function truncateScalar(s: string): string {
  if (s.length <= MAX_SCALAR_LEN) return s;
  return `${s.slice(0, MAX_SCALAR_LEN - 3)}...`;
}

/**
 * Returns a small string-keyed summary safe to show operators (no patient narrative, names from metadata, etc.).
 */
export function summarizeAuditMetadata(raw: unknown): Record<string, string | number | boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const src = raw as Record<string, unknown>;
  const out: Record<string, string | number | boolean> = {};

  for (const [key, v] of Object.entries(src)) {
    if (key === "encounterIds" && Array.isArray(v)) {
      const n = v.filter((x) => typeof x === "string").length;
      out.encounterIdCount = n;
      continue;
    }
    if (!SAFE_METADATA_KEYS.has(key)) continue;

    if (typeof v === "boolean") {
      out[key] = v;
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = v;
      continue;
    }
    if (v === null) {
      out[key] = "null";
      continue;
    }
    if (typeof v === "string") {
      out[key] = truncateScalar(v);
      continue;
    }
    if (Array.isArray(v)) {
      if (key === "deficiencyCodes" && v.every((x) => typeof x === "string" && (x as string).length < 48)) {
        out[key] = truncateScalar((v as string[]).slice(0, 20).join(","));
        continue;
      }
      out[key] = truncateScalar(`[${v.length} items]`);
      continue;
    }
    if (typeof v === "object" && key === "workflowTransition") {
      try {
        out[key] = truncateScalar(JSON.stringify(v));
      } catch {
        /* skip */
      }
    }
  }

  return out;
}

export function auditHighlightTags(input: {
  action: string;
  entityType: string;
  metadataRaw: unknown;
}): string[] {
  const tags = new Set<string>();
  const { action, entityType } = input;
  const meta =
    input.metadataRaw && typeof input.metadataRaw === "object" && !Array.isArray(input.metadataRaw)
      ? (input.metadataRaw as Record<string, unknown>)
      : {};

  if (entityType === "EXTERNAL_BILLING_EXPORT") tags.add("billing_export");
  if (entityType === "EXTERNAL_BILLING_AUTO_EXPORT") tags.add("billing_auto_export");

  if (action === "ENCOUNTER_CLOSE") {
    if (meta.documentationGapOverride === true || meta.dispositionSafetyOverride === true) {
      tags.add("close_override");
    }
  }

  if (action === "ORDER_CREATE") tags.add("order_create");

  if (meta.procedureCapture === true) tags.add("procedure_capture");

  const ae = meta.automationEvent;
  if (typeof ae === "string" && ae.includes("failed")) tags.add("auto_export_failure");

  if (entityType === "EXTERNAL_BILLING_AUTO_EXPORT" && meta.phase === "vendor_delivery") {
    tags.add("vendor_delivery");
  }

  return [...tags];
}
