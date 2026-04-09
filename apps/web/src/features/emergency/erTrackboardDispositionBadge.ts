/**
 * Libellés opérationnels pour le tableau des urgences — dérivés uniquement des champs déjà
 * persistés (dischargeSummaryJson, admissionSummaryJson, nursingAssessment.erDispositionV1).
 * Pas d’inférence à partir du seul statut de consultation.
 */

import { parseAdmissionSummaryForChart, parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import {
  erDispositionSupplementFromEncounter,
  readDischargeSortieExecutionFromEncounter,
} from "@/features/emergency/emergencyDispositionV1";

export type ErDispositionBadgeVariant = "discharge" | "admit" | "observe" | "transfer" | "ama" | "deceased" | "other" | "lwbs";

export type ErDispositionBadgeModel = {
  shortLabel: string;
  variant: ErDispositionBadgeVariant;
  source: "dischargeMode" | "admissionCareLevel" | "erDispositionV1" | "none";
};

const CARE_OBSERVATION = "Observation";

function normalizeMode(m: string): string {
  return m.trim();
}

/**
 * A partir du JSON dossier de sortie / admission / supplément urgence déjà présents sur l’encounter.
 */
export function erDispositionBadgeFromEncounterJson(enc: {
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
}): ErDispositionBadgeModel | null {
  const d = parseDischargeSummaryForChart(enc.dischargeSummaryJson);
  const a = parseAdmissionSummaryForChart(enc.admissionSummaryJson);
  const mode = d?.dischargeMode ? normalizeMode(d.dischargeMode) : "";

  if (mode === "Domicile") {
    const exec = readDischargeSortieExecutionFromEncounter(enc.nursingAssessment);
    return {
      shortLabel: exec ? "SORTIE" : "Sortie en attente",
      variant: "discharge",
      source: "dischargeMode",
    };
  }
  if (mode === "Admission / hospitalisation") {
    const care = a?.careLevel ? normalizeMode(a.careLevel) : "";
    if (care === CARE_OBSERVATION) {
      return { shortLabel: "Observation", variant: "observe", source: "admissionCareLevel" };
    }
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
    const sup = erDispositionSupplementFromEncounter(enc.nursingAssessment);
    if (sup.lwbsNarrative.trim()) {
      return { shortLabel: "LWBS", variant: "lwbs", source: "erDispositionV1" };
    }
    return { shortLabel: "Autre", variant: "other", source: "dischargeMode" };
  }

  const care = a?.careLevel ? normalizeMode(a.careLevel) : "";
  if (care === CARE_OBSERVATION) {
    return { shortLabel: "Observation", variant: "observe", source: "admissionCareLevel" };
  }

  return null;
}
