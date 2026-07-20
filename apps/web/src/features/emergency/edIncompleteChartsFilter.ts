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
import {
  isEncounterAssignedToCurrentUser,
  type EdMyPatientsFilterContext,
  type EdMyPatientsLifecycleEncounter,
} from "@/features/emergency/edMyPatientsFilter";

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

export type EdMyIncompleteChartsEncounter = EdTrackboardLifecycleEncounter & EdMyPatientsLifecycleEncounter;

/**
 * My Incomplete Charts — assigned post-departure documentation only.
 */
export function resolveMyIncompleteChartsEncounters<T extends EdMyIncompleteChartsEncounter>(
  encounters: readonly T[],
  ctx: EdMyPatientsFilterContext
): T[] {
  if (!(ctx.currentUserId ?? "").trim()) return [];
  return encounters.filter((encounter) => {
    if (!isEncounterAssignedToCurrentUser(encounter, ctx)) return false;
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

/**
 * Certification + lifecycle badges for incomplete-charts workspace cards.
 *
 * List inclusion is lifecycle-only (see resolveMyIncompleteChartsEncounters).
 * Stage A advisory findings must never add or retain rows in My Incomplete Charts.
 * When Stage A flag is off, skip Stage A certification-derived badge overlays.
 */
export function resolveEdIncompleteChartBadgeKeys(
  encounter: EdTrackboardLifecycleEncounter,
  opts?: { stageAEnabled?: boolean }
): EdIncompleteChartBadgeKey[] {
  const state = resolveTrackboardEncounterLifecycleState(encounter);
  if (
    state !== EdEncounterLifecycleState.INCOMPLETE_CHART &&
    state !== EdEncounterLifecycleState.READY_FOR_CLOSURE
  ) {
    return [];
  }

  const badges: EdIncompleteChartBadgeKey[] = [];
  const seen = new Set<string>();

  const push = (key: EdIncompleteChartBadgeKey) => {
    if (seen.has(key)) return;
    seen.add(key);
    badges.push(key);
  };

  const snapshot = buildEdTrackboardLifecycleSnapshot(encounter);
  if (state === EdEncounterLifecycleState.READY_FOR_CLOSURE) {
    push("edLifecycle.incompleteCharts.badge.readyForClosure");
  } else {
    push("edLifecycle.incompleteCharts.badge.incompleteChart");
  }

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

  if (opts?.stageAEnabled) {
    const certification = buildEdClosedEncounterCertification({
      lifecycleSnapshot: snapshot,
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
    const statusBadge = CERT_STATUS_BADGE[certification.status];
    if (statusBadge) push(statusBadge);
    if (!certification.authoritativeReadiness.billingReady) {
      push("edLifecycle.incompleteCharts.badge.billingNotReady");
    }
    if (
      certification.advisoryFindings.some((d) => d.id === "orders:open") ||
      certification.establishedFindings.some((d) => d.deduplicationKey === "ACTIVE_ORDERS_UNRESOLVED")
    ) {
      push("edLifecycle.incompleteCharts.badge.ordersNotReconciled");
    }
  }

  return badges;
}
