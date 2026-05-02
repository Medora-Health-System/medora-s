/**
 * S24A — Human-readable audit log labels (PHI-safe). Raw codes stay in the UI separately.
 */

export type AuditDisplayTranslate = (key: string) => string;

function tryTranslate(t: AuditDisplayTranslate, key: string): string | null {
  const out = t(key);
  return out === key ? null : out;
}

/**
 * Primary line for the Action column. Uses composite keys `auditLabels.actions.{ACTION}_{ENTITY}` when needed,
 * then `auditLabels.actions.{ACTION}`, then a raw-code fallback.
 */
export function auditActionLabel(
  t: AuditDisplayTranslate,
  action: string,
  entity?: string,
  metadataSummary?: Record<string, string | number | boolean>
): string {
  const meta = metadataSummary ?? {};
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

  return t("auditLabels.fallbackCode").replace("{code}", action);
}

/** Entity column primary line (raw code still shown underneath). */
export function auditEntityLabel(t: AuditDisplayTranslate, entity: string): string {
  if (!entity?.trim()) return t("auditLabels.fallbackCode").replace("{code}", "—");
  const key = `auditLabels.entities.${entity.trim()}`;
  const out = tryTranslate(t, key);
  if (out) return out;
  return t("auditLabels.fallbackCode").replace("{code}", entity.trim());
}

/** Table section headers — matches `AuditUiCategory` from the API (`critical`, `clinical`, …). */
export function auditCategoryLabel(t: AuditDisplayTranslate, category: string): string {
  const key = `auditLabels.categories.${category}`;
  const out = tryTranslate(t, key);
  if (out) return out;
  return t("auditLabels.fallbackCode").replace("{code}", category);
}

/** Summary cell when `metadataSummary` is empty. */
export function auditSummaryEmptyText(t: AuditDisplayTranslate): string {
  return t("auditLabels.summaryEmpty");
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
  if (!raw) return t("audit.context.roles.UNKNOWN");
  const key = `audit.context.roles.${raw}`;
  const out = t(key);
  return out !== key ? out : raw;
}

/** Human label for persisted `metadata.source` (backend codes only). */
export function getAuditSourceLabel(source: string | undefined, t: AuditDisplayTranslate): string {
  const raw = source?.trim();
  if (!raw) return t("audit.context.sources.UNKNOWN");
  const key = `audit.context.sources.${raw}`;
  const out = t(key);
  return out !== key ? out : raw;
}
