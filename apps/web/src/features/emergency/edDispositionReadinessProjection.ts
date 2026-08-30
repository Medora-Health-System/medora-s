/**
 * ED.HOSP.1B — presentation-only readiness chips.
 * Does not add clinical validation or reuse inpatient discharge readiness.
 */

import {
  evaluateAdaptiveNursingCompletion,
  nursingSectionsForPathway,
  pathwayFromDispositionOutcomeUi,
  readAdaptiveEdNursingExecution,
  readEdDischargeSortieExecutionFromNursingAssessment,
  type EdDispositionStateProjection,
} from "@medora/shared";
import type { ErDispositionOutcomeUi } from "./emergencyDispositionV1";
import { isAdmissionDecisionOutcome } from "./edHosp1bDispositionOutcomeMapping";
import type { ProviderDischargeDocumentationForm } from "./providerDischargeDocumentationModel";

export type EdDispositionReadinessChipId =
  | "provider"
  | "nursing"
  | "instructions"
  | "medications"
  | "departure"
  | "final";

export type EdDispositionReadinessChip = {
  id: EdDispositionReadinessChipId;
  state: "ready" | "pending";
};

export type ProjectEdDispositionReadinessInput = {
  outcomeUi: ErDispositionOutcomeUi;
  dispositionState: EdDispositionStateProjection;
  hasSavedAdmission: boolean;
  nursingAssessment: unknown;
  providerDischargeDoc?: ProviderDischargeDocumentationForm | null;
};

function homeInstructionsReady(form: ProviderDischargeDocumentationForm | null | undefined): boolean {
  if (!form) return false;
  if (form.patientInstructionsGiven === true) return true;
  return (form.diagnosisDocs ?? []).some((d) => String(d.diagnosisInstructions ?? "").trim().length > 0);
}

function homeMedicationsReady(form: ProviderDischargeDocumentationForm | null | undefined): boolean {
  if (!form) return false;
  return (form.diagnosisDocs ?? []).some(
    (d) =>
      String(d.medicationTreatment ?? "").trim().length > 0 ||
      (Array.isArray(d.medicationLines) && d.medicationLines.some((l) => String(l.displayName ?? "").trim()))
  );
}

function nursingReady(input: ProjectEdDispositionReadinessInput): boolean {
  if (input.outcomeUi === "HOME") {
    return readEdDischargeSortieExecutionFromNursingAssessment(input.nursingAssessment) != null;
  }
  const stored = readAdaptiveEdNursingExecution(input.nursingAssessment);
  if (stored?.completedAt) return true;
  const pathway = pathwayFromDispositionOutcomeUi(input.outcomeUi);
  const evaluation = evaluateAdaptiveNursingCompletion({
    pathway,
    sections: stored?.sections ?? {},
    physicianPathway: pathway,
    admissionDecisionSigned: input.hasSavedAdmission && input.dispositionState.decisionSigned,
    completing: false,
  });
  return evaluation.items.length > 0 && evaluation.items.filter((i) => i.required).every((i) => i.status === "COMPLETE");
}

function finalReady(input: ProjectEdDispositionReadinessInput, providerReady: boolean): boolean {
  if (isAdmissionDecisionOutcome(input.outcomeUi)) {
    return input.hasSavedAdmission && providerReady;
  }
  if (input.outcomeUi === "HOME") {
    return providerReady && input.dispositionState.physicalDepartureComplete;
  }
  return providerReady;
}

/**
 * Project chips that have real meaning for the current ED path.
 * Never stricter than existing server close/sign rules — display only.
 */
export function projectEdDispositionReadiness(
  input: ProjectEdDispositionReadinessInput
): EdDispositionReadinessChip[] {
  const providerReady = input.dispositionState.decisionSigned;
  const chips: EdDispositionReadinessChip[] = [
    { id: "provider", state: providerReady ? "ready" : "pending" },
  ];

  const adaptivePathway = pathwayFromDispositionOutcomeUi(input.outcomeUi);
  if (input.outcomeUi === "HOME" || nursingSectionsForPathway(adaptivePathway).length > 0) {
    chips.push({ id: "nursing", state: nursingReady(input) ? "ready" : "pending" });
  }

  if (input.outcomeUi === "HOME") {
    chips.push({
      id: "instructions",
      state: homeInstructionsReady(input.providerDischargeDoc) ? "ready" : "pending",
    });
    chips.push({
      id: "medications",
      state: homeMedicationsReady(input.providerDischargeDoc) ? "ready" : "pending",
    });
  }

  if (
    input.outcomeUi === "HOME" ||
    isAdmissionDecisionOutcome(input.outcomeUi) ||
    input.outcomeUi === "TRANSFER" ||
    input.outcomeUi === "AMA"
  ) {
    chips.push({
      id: "departure",
      state: input.dispositionState.physicalDepartureComplete ? "ready" : "pending",
    });
  }

  chips.push({
    id: "final",
    state: finalReady(input, providerReady) ? "ready" : "pending",
  });

  return chips;
}
