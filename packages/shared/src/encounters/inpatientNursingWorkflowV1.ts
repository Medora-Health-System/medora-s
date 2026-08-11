/**
 * D3E — Inpatient nursing assessment domains (documentation shells).
 */

export const INPATIENT_NURSING_ASSESSMENT_KINDS = [
  "ADMISSION_ASSESSMENT",
  "SHIFT_ASSESSMENT",
  "REASSESSMENT",
  "INTAKE_OUTPUT",
  "PAIN",
  "NEURO",
  "RESPIRATORY",
  "CARDIAC",
  "SKIN",
  "MOBILITY",
  "LINES",
  "TUBES",
  "WOUNDS",
  "CARE_PLAN",
] as const;

export type InpatientNursingAssessmentKind =
  (typeof INPATIENT_NURSING_ASSESSMENT_KINDS)[number];

/** @deprecated D3E planning shell; not a persistence authority. */
export type LegacyInpatientNursingAssessmentShellV1 = {
  assessmentId: string;
  encounterId: string;
  kind: InpatientNursingAssessmentKind;
  recordedAt: string;
  nurseUserId: string;
  complete: boolean;
};

export function inpatientNursingKindIsFlowsheet(
  kind: InpatientNursingAssessmentKind
): boolean {
  return (
    kind === "INTAKE_OUTPUT" ||
    kind === "PAIN" ||
    kind === "NEURO" ||
    kind === "RESPIRATORY" ||
    kind === "CARDIAC" ||
    kind === "SKIN" ||
    kind === "MOBILITY" ||
    kind === "LINES" ||
    kind === "TUBES" ||
    kind === "WOUNDS"
  );
}
