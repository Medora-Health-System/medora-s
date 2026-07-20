/**
 * Effective discharge summary for disposition readiness / close-check.
 *
 * Must preserve structured provider-discharge fields (19Y arrays) — not only flat
 * string keys — so readiness matches what the disposition UI hydrates.
 */

/** Flat string keys aligned with encounterDischargeFieldsSchema / close DTO. */
export const DISCHARGE_SUMMARY_STRING_KEYS = [
  "disposition",
  "exitCondition",
  "dischargeInstructions",
  "medicationsGiven",
  "followUp",
  "returnIfWorse",
  "patientDestination",
  "dischargeMode",
  "dischargeDiagnosisSummary",
  "medicationInstructions",
  "returnPrecautions",
  "followUpInstructions",
  "activityInstructions",
  "woundCareInstructions",
  "workSchoolNote",
  "instructionsGivenBy",
  "instructionsGivenAt",
  "providerDischargeReturnPrecautions",
  "providerDischargeReturnWorkSchool",
  "patientLeftEdAt",
  "providerDischargeDocumentedAt",
  "providerDischargeDocumentedByDisplayName",
  "providerDischargeDocumentedByTitle",
] as const;

/** Structured arrays written by provider discharge documentation (no migration). */
export const DISCHARGE_SUMMARY_STRUCTURED_ARRAY_KEYS = [
  "providerDischargeFollowUps",
  "providerDischargeDiagnosisDocs",
  "providerDischargeDiagnosisRefs",
] as const;

function copyTrimmedStringKeys(
  source: Record<string, unknown>,
  out: Record<string, unknown>,
  keys: readonly string[],
  mode: "copy-nonempty" | "apply-incoming"
): void {
  for (const k of keys) {
    const v = source[k];
    if (mode === "apply-incoming") {
      if (v === undefined) continue;
      if (typeof v === "string") {
        if (v.trim() === "") delete out[k];
        else out[k] = v.trim();
      }
      continue;
    }
    if (typeof v === "string" && v.trim()) {
      out[k] = v.trim();
    }
  }
}

function copyStructuredArrays(source: Record<string, unknown>, out: Record<string, unknown>): void {
  for (const k of DISCHARGE_SUMMARY_STRUCTURED_ARRAY_KEYS) {
    const v = source[k];
    if (!Array.isArray(v) || v.length === 0) continue;
    out[k] = v;
  }
}

/**
 * Merge persisted `dischargeSummaryJson` with an optional close/patch incoming slice.
 * Used by disposition readiness so evaluation sees the same structured follow-up /
 * diagnosis documentation the chart UI displays.
 */
export function mergeDischargeSummaryJson(
  existing: unknown,
  incoming?: Record<string, unknown> | null
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};

  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const o = existing as Record<string, unknown>;
    copyTrimmedStringKeys(o, out, DISCHARGE_SUMMARY_STRING_KEYS, "copy-nonempty");
    copyStructuredArrays(o, out);
    const g0 = o.patientInstructionsGiven;
    if (typeof g0 === "boolean") {
      out.patientInstructionsGiven = g0;
    }
  }

  if (incoming && typeof incoming === "object" && !Array.isArray(incoming)) {
    const inc = incoming as Record<string, unknown>;
    copyTrimmedStringKeys(inc, out, DISCHARGE_SUMMARY_STRING_KEYS, "apply-incoming");
    copyStructuredArrays(inc, out);
    if (typeof inc.patientInstructionsGiven === "boolean") {
      out.patientInstructionsGiven = inc.patientInstructionsGiven;
      if (inc.patientInstructionsGiven === false) {
        delete out.instructionsGivenBy;
        delete out.instructionsGivenAt;
      }
    }
  }

  return Object.keys(out).length ? out : undefined;
}
