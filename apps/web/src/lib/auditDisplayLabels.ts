/**
 * S24A — Human-readable audit log labels (PHI-safe). Raw codes stay in the UI separately.
 */

export type AuditDisplayTranslate = (key: string) => string;

const GENERIC_MISSING_TRANSLATIONS = new Set([
  "unavailable",
  "indisponible",
  "no disponible",
  "non disponible",
  "n/a",
]);

function tryTranslate(t: AuditDisplayTranslate, key: string): string | null {
  const out = t(key)?.trim();
  if (!out || out === key) return null;
  if (GENERIC_MISSING_TRANSLATIONS.has(out.toLowerCase())) return null;
  return out;
}

function humanizeAuditCode(raw: string | undefined): string {
  const code = raw?.trim();
  if (!code) return "—";
  return code
    .split("_")
    .filter(Boolean)
    .map((part) => {
      if (/^(FHIR|M2M|API|ID|UUID|ED|MAR|MFA|ROI)$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

const FHIR_LIFECYCLE_LABELS: Record<string, string> = {
  FHIR_M2M_CLIENT_PROVISIONED: "FHIR M2M client provisioned",
  FHIR_M2M_CREDENTIAL_ROTATED: "FHIR M2M credential rotated",
  FHIR_M2M_CREDENTIAL_REVOKED: "FHIR M2M credential revoked",
  FHIR_M2M_CLIENT_REVOKED: "FHIR M2M client revoked",
  FHIR_M2M_TOKEN_ISSUED: "FHIR M2M token issued",
};

function fhirLifecycleEventLabel(meta: Record<string, string | number | boolean>): string | null {
  const event = typeof meta.event === "string" ? meta.event.trim() : "";
  if (!event.startsWith("FHIR_M2M_")) return null;
  return FHIR_LIFECYCLE_LABELS[event] ?? humanizeAuditCode(event);
}

/**
 * Primary line for the Action column. Uses FHIR event-specific labels first for
 * security/interoperability lifecycle evidence, then translated action labels,
 * then a stable humanized-code fallback.
 */
export function auditActionLabel(
  t: AuditDisplayTranslate,
  action: string,
  entity?: string,
  metadataSummary?: Record<string, string | number | boolean>
): string {
  const meta = metadataSummary ?? {};

  const lifecycle = fhirLifecycleEventLabel(meta);
  if (lifecycle) return lifecycle;

  if (
    action === "ENCOUNTER_UPDATE" &&
    (entity === "ENCOUNTER" || entity === undefined || entity === "") &&
    meta.procedureCapture === true
  ) {
    const doc = tryTranslate(t, "auditLabels.actions.procedureDocumented");
    if (doc) return doc;
  }

  if (entity?.trim()) {
    const compositeKey = `auditLabels.actions.${action}_${entity.trim()}`;
    const composite = tryTranslate(t, compositeKey);
    if (composite) return composite;
  }

  const actionKey = `auditLabels.actions.${action}`;
  const single = tryTranslate(t, actionKey);
  if (single) return single;

  return humanizeAuditCode(action);
}

/** Entity column primary line (raw code still shown underneath). */
export function auditEntityLabel(t: AuditDisplayTranslate, entity: string): string {
  if (!entity?.trim()) return "—";
  if (entity === "FHIR_INTEGRATION_CLIENT") return "FHIR integration client";
  if (entity === "FHIR_INTEGRATION_ACCESS") return "FHIR integration access";
  const key = `auditLabels.entities.${entity.trim()}`;
  const out = tryTranslate(t, key);
  if (out) return out;
  return humanizeAuditCode(entity);
}

/** Table section headers — matches `AuditUiCategory` from the API. */
export function auditCategoryLabel(t: AuditDisplayTranslate, category: string): string {
  if (category === "security") return "Security & interoperability";
  const key = `auditLabels.categories.${category}`;
  const out = tryTranslate(t, key);
  if (out) return out;
  return humanizeAuditCode(category);
}

/** Summary cell when `metadataSummary` is empty. */
export function auditSummaryEmptyText(t: AuditDisplayTranslate): string {
  const translated = tryTranslate(t, "auditLabels.summaryEmpty");
  return translated ?? "No additional details";
}

/** Keys shown separately under the action line — omit from the generic summary line. */
const AUDIT_CONTEXT_METADATA_KEYS = new Set(["actorRole", "source"]);

export function auditMetadataSummaryEntries(
  meta: Record<string, string | number | boolean>
): [string, string | number | boolean][] {
  return Object.entries(meta).filter(([k]) => !AUDIT_CONTEXT_METADATA_KEYS.has(k));
}

/** Human label for persisted `metadata.actorRole` (backend codes only). */
export function getAuditActorRoleLabel(role: string | undefined, t: AuditDisplayTranslate): string {
  const raw = role?.trim();
  if (!raw) return "Unknown";
  const key = `audit.context.roles.${raw}`;
  const out = tryTranslate(t, key);
  return out ?? raw;
}

/** Human label for persisted `metadata.source` (backend codes only). */
export function getAuditSourceLabel(source: string | undefined, t: AuditDisplayTranslate): string {
  const raw = source?.trim();
  if (!raw) return "Unknown";
  const key = `audit.context.sources.${raw}`;
  const out = tryTranslate(t, key);
  return out ?? raw;
}
