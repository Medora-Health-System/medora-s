import { parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import {
  erDispositionSupplementFromEncounter,
  inferOutcomeUiFromForms,
  type ErDispositionOutcomeUi,
} from "@/features/emergency/emergencyDispositionV1";
import {
  deriveObservationEncounterDisplayStatus,
  type ObservationOperationalSnapshot,
} from "@medora/shared";

export type ObservationBoardDispositionTier =
  | "outcome"
  | "discharge_packet_active"
  | "ready_no_mode"
  | "observing";

export type ObservationBoardDispositionModel =
  | {
      tier: "outcome";
      outcome: ErDispositionOutcomeUi;
      encounterClosed: boolean;
    }
  | { tier: "discharge_packet_active" }
  | { tier: "ready_no_mode" }
  | { tier: "observing" }
  | null;

/**
 * Derives a compact disposition / dossier state for the observation hospitalisation board row.
 * Uses persisted `dischargeSummaryJson`, `nursingAssessment.erDispositionV1` (LWBS vs Autre),
 * optional `trackboardOps.firstDispositionDocAt`, and observation operational flags.
 */
export function resolveObservationBoardDispositionModel(input: {
  status: string;
  type?: string | null;
  admittedAt?: unknown;
  admissionSummaryJson?: unknown;
  dischargedAt?: unknown;
  dischargeSummaryJson?: unknown;
  nursingAssessment?: unknown;
  trackboardOps?: { firstDispositionDocAt?: string | null } | null;
  observationOps?: ObservationOperationalSnapshot | null;
}): ObservationBoardDispositionModel {
  const displayStatus = deriveObservationEncounterDisplayStatus({
    type: input.type,
    status: input.status,
    admittedAt: input.admittedAt,
    admissionSummaryJson: input.admissionSummaryJson,
    dischargeSummaryJson: input.dischargeSummaryJson,
    dischargedAt: input.dischargedAt,
  });

  const parsed = parseDischargeSummaryForChart(input.dischargeSummaryJson);
  const mode =
    displayStatus.dischargeMode ??
    (typeof parsed?.dischargeMode === "string" ? parsed.dischargeMode.trim() : "");
  const sup = erDispositionSupplementFromEncounter(input.nursingAssessment);
  const encounterClosed = displayStatus.phase === "DISCHARGED" || input.status !== "OPEN";
  const hasDischargePayload = parsed != null;
  const firstDocRaw = input.trackboardOps?.firstDispositionDocAt;
  const hasFirstDispositionDoc =
    firstDocRaw != null && (typeof firstDocRaw !== "string" || firstDocRaw.trim() !== "");

  if (mode) {
    return {
      tier: "outcome",
      outcome: inferOutcomeUiFromForms(mode, sup),
      encounterClosed,
    };
  }

  if (encounterClosed) {
    return null;
  }

  if (displayStatus.phase === "DISCHARGE_IN_PROGRESS") {
    return { tier: "discharge_packet_active" };
  }

  if (input.observationOps?.flags.readyForDischarge) {
    return { tier: "ready_no_mode" };
  }

  if (hasDischargePayload || hasFirstDispositionDoc) {
    return { tier: "discharge_packet_active" };
  }

  return { tier: "observing" };
}
