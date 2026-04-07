/**
 * Libellés opérationnels pour le tableau des urgences — dérivés uniquement des champs déjà
 * présents sur la consultation (dischargeSummaryJson, admissionSummaryJson). Pas d’inférence clinique.
 */

import { parseAdmissionSummaryForChart, parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";

export type ErDispositionBadgeVariant = "discharge" | "admit" | "observe" | "transfer" | "ama" | "deceased" | "other" | "lwbs";

export type ErDispositionBadgeModel = {
  shortLabel: string;
  variant: ErDispositionBadgeVariant;
  source: "dischargeMode" | "admissionCareLevel" | "none";
};

const CARE_OBSERVATION = "Observation";

function normalizeMode(m: string): string {
  return m.trim();
}

/**
 * A partir du JSON dossier de sortie / admission déjà présents sur l’encounter (ex. trackboard).
 */
export function erDispositionBadgeFromEncounterJson(enc: {
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
}): ErDispositionBadgeModel | null {
  const d = parseDischargeSummaryForChart(enc.dischargeSummaryJson);
  const mode = d?.dischargeMode ? normalizeMode(d.dischargeMode) : "";

  if (mode === "Domicile") {
    return { shortLabel: "Sortie", variant: "discharge", source: "dischargeMode" };
  }
  if (mode === "Admission / hospitalisation") {
    return { shortLabel: "Admission", variant: "admit", source: "dischargeMode" };
  }
  if (mode === "Transfert vers un autre établissement") {
    return { shortLabel: "Transfert", variant: "transfer", source: "dischargeMode" };
  }
  if (mode === "Contre avis médical (LAMA)") {
    return { shortLabel: "LAMA", variant: "ama", source: "dischargeMode" };
  }
  if (mode === "Décès") {
    return { shortLabel: "Décès", variant: "deceased", source: "dischargeMode" };
  }
  if (mode === "Autre") {
    return { shortLabel: "Autre", variant: "lwbs", source: "dischargeMode" };
  }

  const a = parseAdmissionSummaryForChart(enc.admissionSummaryJson);
  const care = a?.careLevel ? normalizeMode(a.careLevel) : "";
  if (care === CARE_OBSERVATION) {
    return { shortLabel: "Observation", variant: "observe", source: "admissionCareLevel" };
  }

  return null;
}
