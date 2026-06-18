import {
  buildEdClosedEncounterCertification,
  type EdClosedEncounterCertificationResult,
  type DispositionSafetyReadinessResponse,
} from "@medora/shared";
import {
  buildEdTrackboardLifecycleSnapshot,
  type EdTrackboardLifecycleEncounter,
} from "@/features/emergency/edIncompleteChartsFilter";

export type EdTrackboardCertificationEncounter = EdTrackboardLifecycleEncounter;

export function buildEdClosedEncounterCertificationFromTrackboardRow(
  encounter: EdTrackboardCertificationEncounter,
  opts?: {
    dispositionReadiness?: DispositionSafetyReadinessResponse | null;
    diagnosisCount?: number | null;
  }
): EdClosedEncounterCertificationResult {
  const billingSnapshot =
    encounter.billingReadinessSnapshotJson &&
    typeof encounter.billingReadinessSnapshotJson === "object" &&
    !Array.isArray(encounter.billingReadinessSnapshotJson)
      ? (encounter.billingReadinessSnapshotJson as Record<string, unknown>)
      : null;

  return buildEdClosedEncounterCertification({
    lifecycleSnapshot: buildEdTrackboardLifecycleSnapshot(encounter),
    dispositionReadiness: opts?.dispositionReadiness ?? null,
    trackboardOps: encounter.trackboardOps ?? null,
    billingReadinessSnapshot: billingSnapshot,
    demographics: {
      dob: encounter.patient?.dob ?? null,
      sexAtBirth: encounter.patient?.sexAtBirth ?? null,
      mrn: encounter.patient?.mrn ?? null,
      phone: encounter.patient?.phone ?? null,
    },
    diagnosisCount: opts?.diagnosisCount ?? null,
  });
}
