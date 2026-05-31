import { roleCodesIncludeLabImagingClinicalWorkflow } from "@medora/shared";

/** Statuts pour lesquels la file labo / imagerie propose « Accuser réception ». */
export function worklistItemNeedsAcknowledge(status: string | null | undefined): boolean {
  const st = String(status ?? "").trim().toUpperCase();
  return st === "PLACED" || st === "PENDING" || st === "SIGNED";
}

export function worklistItemAllowsStart(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "ACKNOWLEDGED";
}

export function worklistItemAllowsComplete(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "IN_PROGRESS";
}

export function worklistItemIsTerminal(status: string | null | undefined): boolean {
  const st = String(status ?? "").trim().toUpperCase();
  return st === "COMPLETED" || st === "RESULTED" || st === "VERIFIED";
}

export type WorklistItemWorkflowAction = "acknowledge" | "start" | "complete";

export type WorklistDeptKind = "lab" | "radiology" | "pharmacy";

/** Next workflow step for a line item, or null when no action applies. */
export function resolveWorklistItemWorkflowAction(
  status: string | null | undefined
): WorklistItemWorkflowAction | null {
  if (worklistItemNeedsAcknowledge(status)) return "acknowledge";
  if (worklistItemAllowsStart(status)) return "start";
  if (worklistItemAllowsComplete(status)) return "complete";
  return null;
}

/**
 * LAB.ED.4 — LAB_TEST / IMAGING_STUDY workflow (ack/start/complete).
 * Mirrors `roleCodesIncludeLabImagingClinicalWorkflow` in API guards.
 * `MEDORA_SUPER_ADMIN` alone is not included unless the user also has a clinical role.
 */
export function isLabRadClinicalWorkflowActor(roles: readonly string[]): boolean {
  return roleCodesIncludeLabImagingClinicalWorkflow(roles);
}

/** Facility ADMIN — pharmacy worklist and legacy checks. */
export function isFacilityAdminWorkflowRole(roles: readonly string[]): boolean {
  return roles.includes("ADMIN");
}

/** LAB_TEST workflow — same clinical matrix as imaging (LAB.ED.4). */
export function isLabTestWorkflowActor(roles: readonly string[]): boolean {
  return isLabRadClinicalWorkflowActor(roles);
}

/** IMAGING_STUDY workflow — same clinical matrix as lab (LAB.ED.4). */
export function isRadiologyWorkflowActor(roles: readonly string[]): boolean {
  return isLabRadClinicalWorkflowActor(roles);
}

/** MEDICATION worklist workflow — backend: ADMIN or PHARMACY only. */
export function isPharmacyWorkflowActor(roles: readonly string[]): boolean {
  return isFacilityAdminWorkflowRole(roles) || roles.includes("PHARMACY");
}

/** Aligns queue/detail UI with `assertDepartmentRoleForItem` per catalog line type. */
export function isDeptWorklistWorkflowActor(
  roles: readonly string[],
  kind: WorklistDeptKind
): boolean {
  if (kind === "lab") return isLabTestWorkflowActor(roles);
  if (kind === "radiology") return isRadiologyWorkflowActor(roles);
  if (kind === "pharmacy") return isPharmacyWorkflowActor(roles);
  return false;
}

/** @deprecated Use `isDeptWorklistWorkflowActor` — kept for imports during migration. */
export function isDeptWorklistActor(roles: readonly string[], kind: WorklistDeptKind): boolean {
  return isDeptWorklistWorkflowActor(roles, kind);
}

/** Read-only notice when the line has a next workflow step but the viewer lacks dept workflow role. */
export function shouldShowDeptWorklistReadOnlyNotice(input: {
  roles: readonly string[];
  kind: WorklistDeptKind;
  status: string | null | undefined;
  orderCancelled: boolean;
}): boolean {
  if (isDeptWorklistWorkflowActor(input.roles, input.kind)) return false;
  if (input.orderCancelled) return false;
  if (worklistItemIsTerminal(input.status)) return false;
  return resolveWorklistItemWorkflowAction(input.status) !== null;
}

export function deptWorklistReadOnlyNoticeKey(kind: WorklistDeptKind): string {
  if (kind === "lab") return "worklistDepartments.shared.labWorkflowReadOnlyPermission";
  if (kind === "radiology") return "worklistDepartments.shared.radWorkflowReadOnlyPermission";
  return "worklistDepartments.shared.pharmacyWorkflowReadOnlyPermission";
}

/** Queue/detail card: which workflow button to show for an active line. */
export function resolveLabRadQueueWorkflowAction(input: {
  status: string | null | undefined;
  orderCancelled: boolean;
  viewerIsDeptActor: boolean;
}): WorklistItemWorkflowAction | null {
  if (input.orderCancelled) return null;
  if (worklistItemIsTerminal(input.status)) return null;
  if (!input.viewerIsDeptActor) return null;
  return resolveWorklistItemWorkflowAction(input.status);
}

export function worklistItemWorkflowActionPath(
  action: WorklistItemWorkflowAction,
  itemId: string
): string {
  if (action === "acknowledge") return `/orders/items/${itemId}/acknowledge`;
  if (action === "start") return `/orders/items/${itemId}/start`;
  return `/orders/items/${itemId}/complete`;
}

export function worklistItemShowsWorkflowActions(status: string | null | undefined): boolean {
  const st = String(status ?? "").trim().toUpperCase();
  if (worklistItemIsTerminal(st)) return false;
  if (st === "CANCELLED" || st === "DRAFT") return false;
  return resolveWorklistItemWorkflowAction(st) !== null;
}
