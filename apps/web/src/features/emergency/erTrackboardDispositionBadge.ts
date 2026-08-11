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
import { resolveEdDispositionPath } from "@medora/shared";

export type ErDispositionBadgeVariant =
  | "discharge"
  | "admit"
  | "observe"
  | "transfer"
  | "ama"
  | "deceased"
  | "other"
  | "lwbs"
  | "elopement";

export type ErDispositionBadgeModel = {
  shortLabel: string;
  variant: ErDispositionBadgeVariant;
  source: "dischargeMode" | "admissionCareLevel" | "erDispositionV1" | "none";
};

const OBSERVATION_LEVELS = new Set(["OBSERVATION", "OBSERVATION CARE"]);

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
  const path = resolveEdDispositionPath(enc);

  if (mode === "Domicile") {
    const exec = readDischargeSortieExecutionFromEncounter(enc.nursingAssessment);
    return {
      shortLabel: exec ? "SORTIE" : "Sortie en attente",
      variant: "discharge",
      source: "dischargeMode",
    };
  }
  if (path === "ADMISSION") {
    const summary =
      enc.admissionSummaryJson && typeof enc.admissionSummaryJson === "object"
        ? (enc.admissionSummaryJson as Record<string, unknown>)
        : {};
    const packet =
      summary.admissionPacketV1 && typeof summary.admissionPacketV1 === "object"
        ? (summary.admissionPacketV1 as Record<string, unknown>)
        : {};
    const care = String(packet.levelOfCareCode ?? a?.careLevel ?? "").trim().toUpperCase();
    const requestedType = String(summary.requestedEncounterType ?? "").trim().toUpperCase();
    if (OBSERVATION_LEVELS.has(care) || requestedType === "OBSERVATION") {
      return { shortLabel: "Observation", variant: "observe", source: "admissionCareLevel" };
    }
    return { shortLabel: "Admission", variant: "admit", source: "admissionCareLevel" };
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
  // D2.5 first-class LWBS / Elopement modes
  if (mode === "Départ avant évaluation (LWBS)") {
    return { shortLabel: "LWBS", variant: "lwbs", source: "dischargeMode" };
  }
  if (mode === "Fugue / départ non autorisé") {
    return { shortLabel: "Fugue", variant: "elopement", source: "dischargeMode" };
  }
  if (mode === "Autre") {
    // Legacy: LWBS stored as Autre + lwbsNarrative
    const sup = erDispositionSupplementFromEncounter(enc.nursingAssessment);
    if (sup.lwbsNarrative.trim()) {
      return { shortLabel: "LWBS", variant: "lwbs", source: "erDispositionV1" };
    }
    return { shortLabel: "Autre", variant: "other", source: "dischargeMode" };
  }

  return null;
}
