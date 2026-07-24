/**
 * MEDUI.D4A.3.3A — Minimal inpatient discharge summary draft synthesis (zero migration).
 * Fills Encounter.dischargeSummaryJson when empty before print — not a parallel discharge engine.
 */

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
  language?: "en" | "fr";
};

export function hasMeaningfulDischargeSummary(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  const keys = [
    "dischargeMode",
    "disposition",
    "dischargeDiagnosisSummary",
    "dischargeInstructions",
    "followUp",
    "followUpInstructions",
    "medicationInstructions",
    "returnIfWorse",
    "returnPrecautions",
    "patientDestination",
  ];
  return keys.some((k) => typeof o[k] === "string" && String(o[k]).trim().length > 0);
}

/** Build a chart-derived draft summary for print when none exists. */
export function synthesizeInpatientDischargeSummaryDraft(
  input: InpatientDischargeSynthesisInput
): Record<string, unknown> {
  const fr = input.language === "fr";
  const dx = input.admissionDiagnosis?.trim() || (fr ? "Non documenté" : "Not documented");
  const dest =
    input.dischargeDestination?.trim() ||
    (fr ? "Domicile (brouillon)" : "Home (draft)");
  const isolation = input.isolation?.length ? input.isolation.join(", ") : fr ? "Standard" : "Standard";
  const lines = fr
    ? [
        `Diagnostic d’admission : ${dx}`,
        `Destination prévue : ${dest}`,
        `Statut de code : ${input.codeStatus?.trim() || "—"}`,
        `Isolement : ${isolation}`,
        `Chambre : ${input.room?.trim() || "—"}`,
        `Médecin : ${input.attendingName?.trim() || "—"}`,
        `Infirmier(ère) : ${input.assignedRnName?.trim() || "—"}`,
      ]
    : [
        `Admission diagnosis: ${dx}`,
        `Planned destination: ${dest}`,
        `Code status: ${input.codeStatus?.trim() || "—"}`,
        `Isolation: ${isolation}`,
        `Room: ${input.room?.trim() || "—"}`,
        `Provider: ${input.attendingName?.trim() || "—"}`,
        `Assigned RN: ${input.assignedRnName?.trim() || "—"}`,
      ];

  return {
    dischargeMode: dest,
    patientDestination: dest,
    disposition: input.dischargeWorkflowState?.trim() || "PLANNING",
    dischargeDiagnosisSummary: dx,
    dischargeInstructions: lines.join("\n"),
    followUpInstructions: fr
      ? "Suivi selon le plan de sortie documenté dans le dossier."
      : "Follow-up per documented discharge plan in the chart.",
    returnPrecautions: fr
      ? "Revenir immédiatement en cas d’aggravation (douleur, fièvre, détresse respiratoire, saignement)."
      : "Return immediately for worsening pain, fever, respiratory distress, or bleeding.",
    synthesizedAt: new Date().toISOString(),
    synthesizedByModule: "MEDUI.D4A.3.3A.inpatientDischargeSynthesis",
  };
}
