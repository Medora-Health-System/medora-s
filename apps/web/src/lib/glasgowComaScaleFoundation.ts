/**
 * Structured GCS documentation foundation. Mirrors the eye + verbal + motor scoring logic used
 * by the existing shared GCS calculator (`calculateGcsScore` /
 * `packages/shared/src/clinicalDocumentation/strokeNeuroReassessmentDocumentationPayloads.ts`),
 * reimplemented locally because that internal module path is not re-exported from the
 * `@medora/shared` package entrypoint. Documentation support only — this never infers TBI
 * severity, imaging need, or disposition from a GCS score alone.
 */
export const GCS_FOUNDATION_STATUS = "STRUCTURED_FOUNDATION_READY" as const;

export const GCS_EYE_VALUES = [4, 3, 2, 1] as const;
export const GCS_VERBAL_VALUES = [5, 4, 3, 2, 1] as const;
export const GCS_MOTOR_VALUES = [6, 5, 4, 3, 2, 1] as const;
export const GCS_SEVERITY_BAND_VALUES = ["MILD", "MODERATE", "SEVERE"] as const;
export const GCS_NONVERBAL_REASON_VALUES = ["INTUBATED", "APHASIC", "OTHER"] as const;

export type GcsEyeScore = (typeof GCS_EYE_VALUES)[number];
export type GcsVerbalScore = (typeof GCS_VERBAL_VALUES)[number];
export type GcsMotorScore = (typeof GCS_MOTOR_VALUES)[number];
export type GcsSeverityBand = (typeof GCS_SEVERITY_BAND_VALUES)[number];
export type GcsNonVerbalReason = (typeof GCS_NONVERBAL_REASON_VALUES)[number];

export type GcsComponents = {
  eye: number;
  verbal: number;
  motor: number;
  /** Documented only; a nonverbal score is never silently treated as a normal verbal response. */
  nonVerbalReason?: GcsNonVerbalReason;
};

export function validateGcsComponents(input: { eye: number; verbal: number; motor: number }): boolean {
  return (
    (GCS_EYE_VALUES as readonly number[]).includes(input.eye) &&
    (GCS_VERBAL_VALUES as readonly number[]).includes(input.verbal) &&
    (GCS_MOTOR_VALUES as readonly number[]).includes(input.motor)
  );
}

/** Throws on an invalid component combination rather than silently computing a bad total. */
export function computeGcsTotal(input: { eye: number; verbal: number; motor: number }): number {
  if (!validateGcsComponents(input)) {
    throw new Error("Invalid GCS component score; eye/verbal/motor must each be within their valid range.");
  }
  return input.eye + input.verbal + input.motor;
}

export function deriveGcsSeverityBand(totalScore: number): GcsSeverityBand {
  if (totalScore <= 8) return "SEVERE";
  if (totalScore <= 12) return "MODERATE";
  return "MILD";
}

export type GcsSerialEntry = {
  timestamp: string;
  total: number;
  severity: GcsSeverityBand;
  nonVerbalReason?: GcsNonVerbalReason;
};

/** Builds one entry in a serial GCS trend; the caller decides how many entries to keep. */
export function buildGcsSerialEntry(input: GcsComponents & { timestamp: string }): GcsSerialEntry {
  const total = computeGcsTotal(input);
  return {
    timestamp: input.timestamp,
    total,
    severity: deriveGcsSeverityBand(total),
    nonVerbalReason: input.nonVerbalReason,
  };
}

/** Advisory flag only; the clinician — not this function — decides whether escalation is needed. */
export function hasClinicallySignificantGcsDecline(priorTotal: number | undefined, currentTotal: number): boolean {
  return priorTotal != null && priorTotal - currentTotal >= 2;
}

export function sortGcsSerialEntries(entries: readonly GcsSerialEntry[]): GcsSerialEntry[] {
  return [...entries].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

/** Chart-ready single-line GCS notation, e.g. "GCS 11T (E3 V1T M6)" for an intubated patient. */
export function formatGcsForDocumentation(input: GcsComponents): string {
  const total = computeGcsTotal(input);
  const nonVerbalSuffix = input.nonVerbalReason === "INTUBATED" ? "T" : input.nonVerbalReason ? "NV" : "";
  const verbalLabel = `V${input.verbal}${nonVerbalSuffix}`;
  return `GCS ${total}${nonVerbalSuffix} (E${input.eye} ${verbalLabel} M${input.motor})`;
}
