import {
  EdEncounterLifecycleState,
  resolveEdEncounterLifecycleState,
  type EdEncounterLifecycleEncounterSnapshot,
} from "@medora/shared";

/** Minimal encounter shape for My Patients assignment filtering (trackboard row subset). */
export type EdMyPatientsEncounter = {
  id: string;
  physicianAssignedUserId?: string | null;
  physicianAssigned?: { id?: string | null } | null;
  nurseAssignedUserId?: string | null;
  nurseAssigned?: { id?: string | null } | null;
};

/** Lifecycle fields required to separate active assignments from incomplete charts. */
export type EdMyPatientsLifecycleEncounter = EdMyPatientsEncounter & {
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

function buildMyPatientsLifecycleSnapshot(
  encounter: EdMyPatientsLifecycleEncounter
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

export function resolveMyPatientsLifecycleState(
  encounter: EdMyPatientsLifecycleEncounter
): EdEncounterLifecycleState {
  return resolveEdEncounterLifecycleState(buildMyPatientsLifecycleSnapshot(encounter));
}

export function isMyActivePatientLifecycleState(state: EdEncounterLifecycleState): boolean {
  return (
    state === EdEncounterLifecycleState.ACTIVE_ED ||
    state === EdEncounterLifecycleState.DISPOSITION_ORDERED
  );
}

export type EdMyPatientsFilterContext = {
  currentUserId: string;
  roles: readonly string[];
};

function normalizeUserId(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function resolvePhysicianAssignedUserId(encounter: EdMyPatientsEncounter): string {
  return normalizeUserId(
    encounter.physicianAssignedUserId ?? encounter.physicianAssigned?.id ?? null
  );
}

export function resolveNurseAssignedUserId(encounter: EdMyPatientsEncounter): string {
  return normalizeUserId(encounter.nurseAssignedUserId ?? encounter.nurseAssigned?.id ?? null);
}

/**
 * Operational ownership — assignment is workload, not exclusivity.
 * RN: nurse assignment; PROVIDER: physician assignment; ADMIN: either role slot.
 */
export function isEncounterAssignedToCurrentUser(
  encounter: EdMyPatientsEncounter,
  ctx: EdMyPatientsFilterContext
): boolean {
  const userId = normalizeUserId(ctx.currentUserId);
  if (!userId) return false;

  const nurseId = resolveNurseAssignedUserId(encounter);
  const physicianId = resolvePhysicianAssignedUserId(encounter);
  const isNurse = ctx.roles.includes("RN");
  const isProvider = ctx.roles.includes("PROVIDER");
  const isAdmin = ctx.roles.includes("ADMIN");

  if (isAdmin) {
    return nurseId === userId || physicianId === userId;
  }

  const roleMatches: boolean[] = [];
  if (isNurse) roleMatches.push(nurseId === userId);
  if (isProvider) roleMatches.push(physicianId === userId);

  if (roleMatches.length === 0) return false;
  return roleMatches.some(Boolean);
}

export function resolveMyPatientsEncounters<T extends EdMyPatientsEncounter>(
  encounters: readonly T[],
  ctx: EdMyPatientsFilterContext
): T[] {
  if (!normalizeUserId(ctx.currentUserId)) return [];
  return encounters.filter((encounter) => isEncounterAssignedToCurrentUser(encounter, ctx));
}

/**
 * My Patients — assigned active ED workload only (not departed incomplete charts).
 */
export function resolveMyActivePatientsEncounters<T extends EdMyPatientsLifecycleEncounter>(
  encounters: readonly T[],
  ctx: EdMyPatientsFilterContext
): T[] {
  if (!normalizeUserId(ctx.currentUserId)) return [];
  return encounters.filter((encounter) => {
    if (!isEncounterAssignedToCurrentUser(encounter, ctx)) return false;
    return isMyActivePatientLifecycleState(resolveMyPatientsLifecycleState(encounter));
  });
}
