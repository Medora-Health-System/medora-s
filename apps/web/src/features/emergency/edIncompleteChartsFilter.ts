import {
  buildEdClosedEncounterCertification,
  buildEdEncounterLifecycleProjection,
  EdClosedEncounterCertificationStatus,
  EdEncounterLifecycleState,
  evaluateEdEncounterDocumentationDeficiencies,
  isEdProviderDocumentationSigned,
  resolveEdEncounterLifecycleState,
  type EdEncounterLifecycleEncounterSnapshot,
  type EdEncounterLifecycleProjection,
} from "@medora/shared";
import type { TrackboardOpsPayload } from "@/features/emergency/erTrackboardOperationalBadges";

/** Trackboard row fields required for lifecycle projection (read-only). */
export type EdTrackboardLifecycleEncounter = {
  id: string;
  status?: string | null;
  workflowState?: string | null;
  providerDocumentationStatus?: string | null;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
  billingFinalizationStatus?: string | null;
  billingReadinessSnapshotJson?: unknown;
  dischargedAt?: string | null;
  chiefComplaint?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  type?: string | null;
  createdAt?: string | null;
  triage?: { chiefComplaint?: string | null } | null;
  dispositionSafetyReadiness?: { canClose: boolean } | null;
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
    mrn?: string | null;
    phone?: string | null;
  } | null;
  trackboardOps?: TrackboardOpsPayload | null;
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

/**
 * Post-departure documentation workspace — incomplete charts and ready-for-closure.
 * Excludes active trackboard census patients.
 */
export function resolveIncompleteChartsEncounters<T extends EdTrackboardLifecycleEncounter>(
  encounters: readonly T[]
): T[] {
  return encounters.filter((encounter) => {
    const state = resolveTrackboardEncounterLifecycleState(encounter);
    return (
      state === EdEncounterLifecycleState.INCOMPLETE_CHART ||
      state === EdEncounterLifecycleState.READY_FOR_CLOSURE
    );
  });
}

export type EdIncompleteChartBadgeKey =
  | "edLifecycle.incompleteCharts.badge.incompleteChart"
  | "edLifecycle.incompleteCharts.badge.readyForClosure"
  | "edLifecycle.incompleteCharts.badge.missingDocumentation"
  | "edLifecycle.incompleteCharts.badge.providerSignatureNeeded"
  | "edLifecycle.incompleteCharts.badge.documentationDeficiency"
  | "edLifecycle.incompleteCharts.badge.billingNotReady"
  | "edLifecycle.incompleteCharts.badge.readyForBilling"
  | "edLifecycle.incompleteCharts.badge.ordersNotReconciled"
  | "edLifecycle.incompleteCharts.badge.diagnosisMissing"
  | "edLifecycle.incompleteCharts.badge.nursingDocumentationNeeded";

const CERT_STATUS_BADGE: Partial<Record<EdClosedEncounterCertificationStatus, EdIncompleteChartBadgeKey>> =
  {
    [EdClosedEncounterCertificationStatus.INCOMPLETE]:
      "edLifecycle.incompleteCharts.badge.incompleteChart",
    [EdClosedEncounterCertificationStatus.READY_FOR_CLOSURE]:
      "edLifecycle.incompleteCharts.badge.readyForClosure",
    [EdClosedEncounterCertificationStatus.READY_FOR_BILLING]:
      "edLifecycle.incompleteCharts.badge.readyForBilling",
  };

/** Certification + lifecycle badges for incomplete-charts workspace cards. */
export function resolveEdIncompleteChartBadgeKeys(
  encounter: EdTrackboardLifecycleEncounter
): EdIncompleteChartBadgeKey[] {
  const state = resolveTrackboardEncounterLifecycleState(encounter);
  if (
    state !== EdEncounterLifecycleState.INCOMPLETE_CHART &&
    state !== EdEncounterLifecycleState.READY_FOR_CLOSURE
  ) {
    return [];
  }

  const certification = buildEdClosedEncounterCertification({
    lifecycleSnapshot: buildEdTrackboardLifecycleSnapshot(encounter),
    trackboardOps: encounter.trackboardOps ?? null,
    billingReadinessSnapshot:
      encounter.billingReadinessSnapshotJson &&
      typeof encounter.billingReadinessSnapshotJson === "object" &&
      !Array.isArray(encounter.billingReadinessSnapshotJson)
        ? (encounter.billingReadinessSnapshotJson as Record<string, unknown>)
        : null,
    demographics: {
      dob: encounter.patient?.dob ?? null,
      sexAtBirth: encounter.patient?.sexAtBirth ?? null,
      mrn: encounter.patient?.mrn ?? null,
      phone: encounter.patient?.phone ?? null,
    },
  });
  const badges: EdIncompleteChartBadgeKey[] = [];
  const seen = new Set<string>();

  const push = (key: EdIncompleteChartBadgeKey) => {
    if (seen.has(key)) return;
    seen.add(key);
    badges.push(key);
  };

  const statusBadge = CERT_STATUS_BADGE[certification.status];
  if (statusBadge) push(statusBadge);
  else push("edLifecycle.incompleteCharts.badge.incompleteChart");

  if (!certification.billingReady) {
    push("edLifecycle.incompleteCharts.badge.billingNotReady");
  }

  const snapshot = buildEdTrackboardLifecycleSnapshot(encounter);
  if (!isEdProviderDocumentationSigned(snapshot)) {
    push("edLifecycle.incompleteCharts.badge.providerSignatureNeeded");
  }

  const { deficiencies } = evaluateEdEncounterDocumentationDeficiencies(snapshot);
  if (deficiencies.some((d) => d.code === "NURSING_ASSESSMENT" || d.code === "DISCHARGE_SUMMARY")) {
    push("edLifecycle.incompleteCharts.badge.nursingDocumentationNeeded");
  }
  if (deficiencies.some((d) => d.code === "CHIEF_COMPLAINT")) {
    push("edLifecycle.incompleteCharts.badge.diagnosisMissing");
  }
  if (deficiencies.length > 0) {
    push("edLifecycle.incompleteCharts.badge.documentationDeficiency");
  } else if (!isEdProviderDocumentationSigned(snapshot)) {
    push("edLifecycle.incompleteCharts.badge.missingDocumentation");
  }

  if (certification.deficiencies.some((d) => d.id === "orders:open")) {
    push("edLifecycle.incompleteCharts.badge.ordersNotReconciled");
  }

  return badges;
}
