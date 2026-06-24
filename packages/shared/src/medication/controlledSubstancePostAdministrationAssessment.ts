/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_A_B_PROVIDER_ORDERING_ACTIVATION.1
 * Post-administration pain response documentation — required at MAR, not at order time.
 */

export type ControlledSubstancePostAdministrationAssessmentInput = {
  painScoreBefore?: number | null;
  painLocation?: string | null;
  painScaleUsed?: string | null;
  sedationLevel?: string | null;
  respiratoryStatus?: string | null;
  reaction?: string | null;
  sideEffects?: string | null;
  noSideEffects?: boolean | null;
  nauseaVomiting?: boolean | null;
  dizziness?: boolean | null;
  itching?: boolean | null;
  constipation?: boolean | null;
  respiratoryDepression?: boolean | null;
  painReassessmentTime?: string | null;
  painScoreAfter?: number | null;
  patientResponse?: string | null;
  interventionEffective?: boolean | null;
  requiresOpioidOrBenzoFields?: boolean;
};

export const CONTROLLED_SUBSTANCE_POST_ADMIN_PAIN_FIELD_KEYS = [
  "painScoreBefore",
  "painLocation",
  "painScaleUsed",
  "sedationLevel",
  "respiratoryStatus",
  "reaction",
  "sideEffects",
  "noSideEffects",
  "nauseaVomiting",
  "dizziness",
  "itching",
  "constipation",
  "respiratoryDepression",
  "painReassessmentTime",
  "painScoreAfter",
  "patientResponse",
  "interventionEffective",
] as const;

export type ControlledSubstancePostAdministrationAssessmentReport = {
  decision: "PASS" | "FAIL";
  requiredAtOrderTime: false;
  requiredAtMarAdministration: true;
  fields: readonly string[];
  pyxisWasteWitnessExternalized: true;
  blockers: string[];
};

export function validateControlledSubstancePostAdministrationAssessment(
  input: ControlledSubstancePostAdministrationAssessmentInput
): { ok: boolean; missingFields: string[] } {
  const missing: string[] = [];
  if (input.painScoreBefore == null) missing.push("painScoreBefore");
  if (!input.painLocation?.trim()) missing.push("painLocation");
  if (!input.painScaleUsed?.trim()) missing.push("painScaleUsed");
  if (input.painReassessmentTime == null) missing.push("painReassessmentTime");
  if (input.painScoreAfter == null) missing.push("painScoreAfter");
  if (!input.patientResponse?.trim()) missing.push("patientResponse");
  if (input.interventionEffective == null) missing.push("interventionEffective");
  if (!input.noSideEffects && !input.sideEffects?.trim() && !input.reaction?.trim()) {
    missing.push("sideEffectsOrNoSideEffects");
  }
  if (input.requiresOpioidOrBenzoFields) {
    if (!input.sedationLevel?.trim()) missing.push("sedationLevel");
    if (!input.respiratoryStatus?.trim()) missing.push("respiratoryStatus");
  }
  return { ok: missing.length === 0, missingFields: missing };
}

export function buildControlledSubstancePostAdministrationAssessmentReport(): ControlledSubstancePostAdministrationAssessmentReport {
  const sample = validateControlledSubstancePostAdministrationAssessment({
    painScoreBefore: 8,
    painLocation: "Abdomen",
    painScaleUsed: "Numeric 0-10",
    sedationLevel: "Alert",
    respiratoryStatus: "Normal",
    noSideEffects: true,
    painReassessmentTime: "2026-06-24T12:30:00.000Z",
    painScoreAfter: 4,
    patientResponse: "Improved",
    interventionEffective: true,
    requiresOpioidOrBenzoFields: true,
  });
  return {
    decision: sample.ok ? "PASS" : "FAIL",
    requiredAtOrderTime: false,
    requiredAtMarAdministration: true,
    fields: CONTROLLED_SUBSTANCE_POST_ADMIN_PAIN_FIELD_KEYS,
    pyxisWasteWitnessExternalized: true,
    blockers: sample.ok ? [] : sample.missingFields,
  };
}
