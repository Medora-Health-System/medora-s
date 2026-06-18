import {
  buildEdEncounterLifecycleProjection,
  EdEncounterLifecycleState,
  evaluateEdEncounterDocumentationDeficiencies,
  isEdProviderDocumentationSigned,
  resolveEdEncounterLifecycleState,
  type EdEncounterLifecycleEncounterSnapshot,
  type EdEncounterLifecycleProjection,
} from "@medora/shared";

/** Trackboard row fields required for lifecycle projection (read-only). */
export type EdTrackboardLifecycleEncounter = {
  status?: string | null;
  workflowState?: string | null;
  providerDocumentationStatus?: string | null;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
  billingFinalizationStatus?: string | null;
  dischargedAt?: string | null;
  chiefComplaint?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  type?: string | null;
  triage?: { chiefComplaint?: string | null } | null;
  dispositionSafetyReadiness?: { canClose: boolean } | null;
};

export function buildEdTrackboardLifecycleSnapshot(
  encounter: EdTrackboardLifecycleEncounter
): EdEncounterLifecycleEncounterSnapshot {
  return {
    status: encounter.status ?? "OPEN",
    workflowState: encounter.workflowState ?? null,
    providerDocumentationStatus: encounter.providerDocumentationStatus ?? null,
    dischargeSummaryJson: encounter.dischargeSummaryJson,
    admissionSummaryJson: encounter.admissionSummaryJson,
    nursingAssessment: encounter.nursingAssessment,
    billingFinalizationStatus: encounter.billingFinalizationStatus ?? null,
    dischargedAt: encounter.dischargedAt ?? null,
    chiefComplaint: encounter.chiefComplaint ?? encounter.triage?.chiefComplaint ?? null,
    providerNote: encounter.providerNote ?? null,
    treatmentPlan: encounter.treatmentPlan ?? null,
    encounterType: encounter.type ?? "EMERGENCY",
    dispositionSafetyReadiness: encounter.dispositionSafetyReadiness ?? null,
  };
}

export function resolveTrackboardEncounterLifecycleState(
  encounter: EdTrackboardLifecycleEncounter
): EdEncounterLifecycleState {
  return resolveEdEncounterLifecycleState(buildEdTrackboardLifecycleSnapshot(encounter));
}

export function buildTrackboardEncounterLifecycleProjection(
  encounter: EdTrackboardLifecycleEncounter
): EdEncounterLifecycleProjection {
  return buildEdEncounterLifecycleProjection(buildEdTrackboardLifecycleSnapshot(encounter));
}

/** Operational ED census — active treatment and disposition-ordered only. */
export function resolveActiveTrackboardEncounters<T extends EdTrackboardLifecycleEncounter>(
  encounters: readonly T[]
): T[] {
  return encounters.filter((encounter) => {
    const state = resolveTrackboardEncounterLifecycleState(encounter);
    return (
      state === EdEncounterLifecycleState.ACTIVE_ED ||
      state === EdEncounterLifecycleState.DISPOSITION_ORDERED
    );
  });
}

/** Departed-but-open encounters awaiting documentation completion. */
export function resolveIncompleteChartsEncounters<T extends EdTrackboardLifecycleEncounter>(
  encounters: readonly T[]
): T[] {
  return encounters.filter(
    (encounter) =>
      resolveTrackboardEncounterLifecycleState(encounter) ===
      EdEncounterLifecycleState.INCOMPLETE_CHART
  );
}

export type EdIncompleteChartBadgeKey =
  | "edLifecycle.incompleteCharts.badge.incompleteChart"
  | "edLifecycle.incompleteCharts.badge.missingDocumentation"
  | "edLifecycle.incompleteCharts.badge.providerSignatureNeeded"
  | "edLifecycle.incompleteCharts.badge.documentationDeficiency";

/** Badge keys for incomplete-chart cards — projection and deficiency read model only. */
export function resolveEdIncompleteChartBadgeKeys(
  encounter: EdTrackboardLifecycleEncounter
): EdIncompleteChartBadgeKey[] {
  const snapshot = buildEdTrackboardLifecycleSnapshot(encounter);
  const projection = buildEdEncounterLifecycleProjection(snapshot);
  if (projection.state !== EdEncounterLifecycleState.INCOMPLETE_CHART) {
    return [];
  }

  const badges: EdIncompleteChartBadgeKey[] = ["edLifecycle.incompleteCharts.badge.incompleteChart"];

  if (!isEdProviderDocumentationSigned(snapshot)) {
    badges.push("edLifecycle.incompleteCharts.badge.providerSignatureNeeded");
  }

  const { hasDeficiencies } = evaluateEdEncounterDocumentationDeficiencies(snapshot);
  if (hasDeficiencies) {
    badges.push("edLifecycle.incompleteCharts.badge.documentationDeficiency");
  } else if (!isEdProviderDocumentationSigned(snapshot)) {
    badges.push("edLifecycle.incompleteCharts.badge.missingDocumentation");
  }

  return badges;
}
