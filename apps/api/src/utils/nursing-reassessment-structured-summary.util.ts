/**
 * PHI-safe structured summary for ER nursing reassessment audit metadata.
 *
 * Inspects `Encounter.nursingAssessment.erNursingReassessmentV1` and returns ONLY the names of
 * structured fields that have a non-empty value. Never returns narrative text, never returns
 * the values themselves, and never inspects free-text keys (narrative, generalAppearance,
 * bedsideStatus, vitalsSummaryNote, responseToTreatment, interventionsPerformed,
 * safetyRoundingNote, addendum). Used for QA / pilot oversight / documentation completeness
 * analytics without exposing PHI.
 *
 * Frontend mirror: `apps/web/src/features/emergency/emergencyNursingReassessmentV1.ts` —
 * `STRUCTURED_FIELDS_FOR_NARRATIVE` (kept conceptually in sync; both lists are explicit
 * whitelists, never derived dynamically from the input).
 */

const ER_NURSING_REASSESSMENT_V1_KEY = "erNursingReassessmentV1" as const;

/**
 * Whitelist of structured reassessment fields safe to surface in audit metadata. Each entry is
 * a stable code (matches the JSON key inside `erNursingReassessmentV1`). NEVER add narrative or
 * free-text keys to this list.
 */
const STRUCTURED_FIELD_KEYS = [
  "mentalStatus",
  "orientation",
  "speech",
  "pain0to10",
  "airway",
  "breathing",
  "respiratoryPattern",
  "circulation",
  "cardiacRhythm",
  "fallRisk",
  "trend",
  "generalAppearanceCode",
  "skinCondition",
  "ambulation",
  "safetyRisk",
  "distressLevel",
  /**
   * Phase-3 mockup-aligned structured fields. JSON-additive (no Prisma migration). Listed here
   * so the `structuredSectionsCompleted` audit metadata correctly reports new entries; values
   * themselves are never returned, only field names.
   */
  "airwayType",
  "respEffortBreathing",
  "respDepth",
  "respChestMovement",
  "cardiacEctopy",
  "ivAccess",
] as const;

export type StructuredReassessmentSectionKey = (typeof STRUCTURED_FIELD_KEYS)[number];

function readReassessmentNamespace(nursingAssessment: unknown): Record<string, unknown> | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return null;
  }
  const ns = (nursingAssessment as Record<string, unknown>)[ER_NURSING_REASSESSMENT_V1_KEY];
  if (!ns || typeof ns !== "object" || Array.isArray(ns)) return null;
  return ns as Record<string, unknown>;
}

/**
 * Returns the deduplicated list of structured field codes that have a non-empty string value
 * inside the `erNursingReassessmentV1` namespace. Returns `[]` when the namespace is missing or
 * has no structured content — caller should treat empty list as "nothing structured" (still safe
 * to log; it indicates the save was free-text-only).
 */
export function structuredReassessmentSectionsCompleted(
  nursingAssessment: unknown
): StructuredReassessmentSectionKey[] {
  const ns = readReassessmentNamespace(nursingAssessment);
  if (!ns) return [];
  const completed: StructuredReassessmentSectionKey[] = [];
  for (const key of STRUCTURED_FIELD_KEYS) {
    const v = ns[key];
    if (typeof v === "string" && v.trim().length > 0) {
      completed.push(key);
    }
  }
  return completed;
}

/**
 * True when the structured-section completion list differs between two `nursingAssessment` blobs
 * — used to decide whether to attach the structured summary to the audit metadata for a PATCH.
 * Comparing field NAMES only (not values) keeps the comparison PHI-safe and matches what the
 * audit metadata will actually expose.
 */
export function structuredReassessmentSectionsChanged(
  prevNursingAssessment: unknown,
  nextNursingAssessment: unknown
): boolean {
  const a = structuredReassessmentSectionsCompleted(prevNursingAssessment).slice().sort();
  const b = structuredReassessmentSectionsCompleted(nextNursingAssessment).slice().sort();
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return true;
  }
  return false;
}

/**
 * True when the `erNursingReassessmentV1` namespace changed in any clinically-material way
 * between two `nursingAssessment` blobs. Specifically EXCLUDES the `signature` sub-object from
 * the comparison so that clicking Save without any other change (which always re-generates
 * `signature.savedAt`) does NOT create a duplicate column event in the append-only history.
 */
export function reassessmentNamespaceMaterialChange(
  prevNursingAssessment: unknown,
  nextNursingAssessment: unknown
): boolean {
  return (
    materialReassessmentToken(prevNursingAssessment) !== materialReassessmentToken(nextNursingAssessment)
  );
}

function materialReassessmentToken(nursingAssessment: unknown): string {
  const ns = readReassessmentNamespace(nursingAssessment);
  if (!ns) return "__missing__";
  const { signature, ...rest } = ns as Record<string, unknown> & { signature?: unknown };
  void signature;
  try {
    return JSON.stringify(rest);
  } catch {
    return "__invalid__";
  }
}

/**
 * Read the (clinical) `reassessmentAt` ISO timestamp from the `erNursingReassessmentV1` namespace.
 * Returns the trimmed ISO string when present and non-empty, otherwise `null`. This is the
 * "documentedAt" recorded by the nurse on the bedside form, distinct from the system save time.
 */
export function extractReassessmentDocumentedAt(nursingAssessment: unknown): string | null {
  const ns = readReassessmentNamespace(nursingAssessment);
  if (!ns) return null;
  const v = ns.reassessmentAt;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

/**
 * True when the `erTraumaSurveyV1` namespace in `nursingAssessment` has any non-empty value.
 * PHI-safe: only inspects whether free-text/structured fields are non-empty, never returns the
 * content. Used by audit metadata to expose `hasTraumaDocumentation: boolean`.
 */
export function nursingAssessmentHasTraumaDocumentation(nursingAssessment: unknown): boolean {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return false;
  const ns = (nursingAssessment as Record<string, unknown>).erTraumaSurveyV1;
  if (!ns || typeof ns !== "object" || Array.isArray(ns)) return false;
  for (const v of Object.values(ns as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

/**
 * True when `erNursingReassessmentV1.safetyRoundingNote` is non-empty. Boolean only — never
 * surfaces the note content.
 */
export function nursingAssessmentHasBedsideSafety(nursingAssessment: unknown): boolean {
  const ns = readReassessmentNamespace(nursingAssessment);
  if (!ns) return false;
  const v = ns.safetyRoundingNote;
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * True when `erNursingReassessmentV1.interventionsPerformed` is non-empty. Boolean only — never
 * surfaces the interventions text.
 */
export function nursingAssessmentHasNursingInterventions(nursingAssessment: unknown): boolean {
  const ns = readReassessmentNamespace(nursingAssessment);
  if (!ns) return false;
  const v = ns.interventionsPerformed;
  return typeof v === "string" && v.trim().length > 0;
}
