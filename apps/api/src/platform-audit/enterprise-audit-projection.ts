const SEMANTIC_EVIDENCE_KEYS = new Set([
  "accessscope",
  "changedfields",
  "changedfieldnames",
  "cursorused",
  "facilityfilterused",
  "filterclasses",
  "mfareset",
  "passwordcredentialchanged",
  "resultcount",
  "sessionsrevoked",
]);

const RESERVED_CLASSIFICATION_KEYS = new Set([
  "event",
  "outcome",
  "severity",
  "sourceoperation",
  "denialreason",
]);

const SENSITIVE_OR_PHI_MARKERS = [
  "password", "token", "authorization", "apikey", "secret", "credential", "recoverycode",
  "patient", "mrn", "diagnosis", "clinical", "note", "narrative", "symptom", "medication",
] as const;

function canonical(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function safeScalar(value: unknown): string | number | boolean | null | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

/**
 * Minimum-necessary, fail-closed evidence boundary. Unknown objects and fields are omitted rather
 * than guessed safe. Case-insensitive key markers protect spelling variants, while refusing every
 * nested object prevents unknown recursive content from crossing the boundary at all.
 */
export function projectEnterpriseAuditMetadata(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { event: null, outcome: null, severity: null, sourceOperation: null, evidence: {} };
  }
  const metadata = raw as Record<string, unknown>;
  const evidence: Record<string, string | number | boolean | null | Array<string | number | boolean | null>> = {};
  let event: string | null = null;
  let outcome: string | null = null;
  let severity: string | null = null;
  let sourceOperation: string | null = null;

  for (const [key, value] of Object.entries(metadata)) {
    const normalized = canonical(key);
    if (SENSITIVE_OR_PHI_MARKERS.some((marker) => normalized.includes(marker))) continue;
    const scalar = safeScalar(value);
    if (RESERVED_CLASSIFICATION_KEYS.has(normalized) && typeof scalar === "string") {
      if (normalized === "event") event = scalar.slice(0, 160);
      if (normalized === "outcome" && ["SUCCESS", "DENIED"].includes(scalar)) outcome = scalar;
      if (normalized === "severity" && ["CRITICAL", "HIGH", "MEDIUM"].includes(scalar)) severity = scalar;
      if (normalized === "sourceoperation") sourceOperation = scalar.slice(0, 160);
      continue;
    }
    if (!SEMANTIC_EVIDENCE_KEYS.has(normalized)) continue;
    if (scalar !== undefined) evidence[key] = typeof scalar === "string" ? scalar.slice(0, 200) : scalar;
    if (Array.isArray(value) && value.length <= 25) {
      const projected = value.map(safeScalar);
      if (projected.every((entry) => entry !== undefined)) {
        evidence[key] = projected as Array<string | number | boolean | null>;
      }
    }
  }
  return { event, outcome, severity, sourceOperation, evidence };
}
