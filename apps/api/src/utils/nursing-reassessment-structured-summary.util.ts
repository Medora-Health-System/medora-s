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
