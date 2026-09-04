/**
 * MEDUI.D4A.3.3A — Minimal inpatient discharge summary draft synthesis (zero migration).
 * Fallback-only when no clinician-authored discharge exists — not a parallel discharge engine.
 */

import {
  hasClinicianAuthoredDischargeContent,
} from "./inpatientDischargeContractInpDis1a.js";

export type InpatientDischargeSynthesisInput = {
  patientName?: string | null;
  mrn?: string | null;
  admissionDiagnosis?: string | null;
  admittedAt?: string | null;
  room?: string | null;
  codeStatus?: string | null;
  isolation?: string[] | null;
  dischargeDestination?: string | null;
  dischargeWorkflowState?: string | null;
  attendingName?: string | null;
  assignedRnName?: string | null;
  language?: string;
};

/** Build a chart-derived fallback draft for print preview — not clinician authorship. */
export function synthesizeInpatientDischargeSummaryDraft(
  input: InpatientDischargeSynthesisInput
): Record<string, unknown> {
  const fr = input.language === "fr";
  const dx = input.admissionDiagnosis?.trim() || (fr ? "Non documenté" : "Not documented");
  const plannedDest = input.dischargeDestination?.trim() || null;
  const workflowState = input.dischargeWorkflowState?.trim() || "PLANNING";
  const destLabel =
    plannedDest ||
    (fr ? "Destination non définie (planification)" : "Destination not set (planning)");
  const isolation = input.isolation?.length ? input.isolation.join(", ") : fr ? "Standard" : "Standard";
  const lines = fr
    ? [
        `Diagnostic d'admission : ${dx}`,
        `Destination prévue (planification) : ${destLabel}`,
        `État du plan de sortie : ${workflowState}`,
        `Statut de code : ${input.codeStatus?.trim() || "—"}`,
        `Isolement : ${isolation}`,
        `Chambre : ${input.room?.trim() || "—"}`,
        `Médecin : ${input.attendingName?.trim() || "—"}`,
        `Infirmier(ère) : ${input.assignedRnName?.trim() || "—"}`,
        "",
        "Brouillon de planification — ne constitue pas une autorisation médicale de sortie.",
      ]
    : [
        `Admission diagnosis: ${dx}`,
        `Planned destination (planning): ${destLabel}`,
        `Discharge planning state: ${workflowState}`,
        `Code status: ${input.codeStatus?.trim() || "—"}`,
        `Isolation: ${isolation}`,
        `Room: ${input.room?.trim() || "—"}`,
        `Provider: ${input.attendingName?.trim() || "—"}`,
        `Assigned RN: ${input.assignedRnName?.trim() || "—"}`,
        "",
        "Planning draft — not a medical discharge authorization.",
      ];

  return {
    dispositionSchemaVersion: "INP.DIS.1A",
    isSynthesizedDraftFallback: true,
    plannedDestinationNotFinalDisposition: true,
    plannedDestination: plannedDest,
    plannedDischargeWorkflowState: workflowState,
    dischargeMode: destLabel,
    patientDestination: destLabel,
    disposition: workflowState,
    dischargeDiagnosisSummary: dx,
    dischargeInstructions: lines.join("\n"),
    followUpInstructions: fr
      ? "Suivi selon le plan de sortie documenté dans le dossier."
      : "Follow-up per documented discharge plan in the chart.",
    returnPrecautions: fr
      ? "Revenir immédiatement en cas d'aggravation (douleur, fièvre, détresse respiratoire, saignement)."
      : "Return immediately for worsening pain, fever, respiratory distress, or bleeding.",
    synthesizedAt: new Date().toISOString(),
    synthesizedByModule: "MEDUI.D4A.3.3A.inpatientDischargeSynthesis",
  };
}

export function shouldOverwriteDischargeSummaryWithSynthesis(existing: unknown): boolean {
  return !hasClinicianAuthoredDischargeContent(existing);
}
