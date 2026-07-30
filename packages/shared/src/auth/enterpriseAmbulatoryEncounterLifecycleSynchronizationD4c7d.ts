/**
 * MEDUI.D4C.7D — Enterprise ambulatory encounter lifecycle synchronization.
 *
 * One canonical lifecycle authority (`Encounter.status` via `EncountersService.close`)
 * drives all ambulatory projections. Documentation SIGNED / workflow FINALIZED are
 * not synonyms for encounter CLOSED.
 *
 * No ClinicEncounterStatus / dashboard-owned terminal mutations.
 */

export const ENTERPRISE_AMBULATORY_ENCOUNTER_LIFECYCLE_SYNC_CERTIFICATION_ID =
  "MEDUI.D4C.7D" as const;

/** Forbidden duplicate Clinic* terminal authorities. */
export const D4C7D_FORBIDDEN_CLINIC_AUTHORITY_NAMES = [
  "ClinicEncounterStatus",
  "ClinicVisitClosure",
  "closeClinicEncounter",
  "finalizeAmbulatoryVisitLocally",
  "setClinicDashboardCompleted",
  "removePatientFromClinicQueue",
  "markClinicVisitClosed",
] as const;

export type D4c7dForbiddenClinicAuthorityName =
  (typeof D4C7D_FORBIDDEN_CLINIC_AUTHORITY_NAMES)[number];

/**
 * Sentinel workflow target: COMPLETE_VISIT delegates to enterprise
 * `POST /encounters/:id/close` — never a Clinic-local status write.
 */
export const CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET = "ENTERPRISE_CLOSE" as const;

/** Canonical enterprise close HTTP path (facility-scoped via headers). */
export const D4C7D_ENTERPRISE_ENCOUNTER_CLOSE_PATH = (encounterId: string): string =>
  `/encounters/${encodeURIComponent(encounterId)}/close`;

export const D4C7D_ENTERPRISE_ENCOUNTER_CLOSE_CHECK_PATH = (encounterId: string): string =>
  `/encounters/${encodeURIComponent(encounterId)}/close-check`;

/**
 * Canonical terminal-state policy (documented answers for D4C.7D).
 *
 * - Discharge summary save alone does NOT close.
 * - Provider documentation SIGNED / “finalized” does NOT close.
 * - Workflow FINALIZED does NOT close.
 * - Only `EncountersService.close` closes, and it delegates the transition to the
 *   MEDUI.D4C.7K lifecycle authority (status=CLOSED, closedAt, workflowState=CLOSED,
 *   roomLabel cleared) — atomic enterprise transition. `dischargedAt` stays owned by the
 *   discharge workflows and is written only for an explicit discharge.
 * - Ambulatory COMPLETE_VISIT (DISCHARGE_READY | FINALIZED) must invoke that close.
 * - Active operational queues / KPIs / header badge use Encounter.status.
 * - Follow-up OPEN is independent of encounter CLOSED.
 * - Billing incomplete may continue after close.
 */
export const D4C7D_CANONICAL_TERMINAL_POLICY = {
  dischargeSummaryAloneCloses: false,
  documentationSignedCloses: false,
  workflowFinalizedCloses: false,
  enterpriseCloseAuthority: "EncountersService.close",
  completedVisitKpiDriver: "Encounter.status === CLOSED",
  headerBadgeDriver: "Encounter.status (+ ambulatory lifecycle projection labels)",
  roomReleaseDriver: "EncountersService.close → roomLabel null",
  historicalRecordDriver: "Encounter.status === CLOSED (row retained)",
  leaveOperationalQueuesWhen: "Encounter.status === CLOSED",
  completeVisitInvokesEnterpriseClose: true,
} as const;

export type AmbulatoryLifecycleHeaderKind =
  | "OPEN"
  | "DISCHARGE_READY"
  | "DISCHARGED_DOCS_PENDING"
  | "READY_TO_CLOSE"
  | "CLOSED"
  | "CANCELLED";

export type AmbulatoryLifecycleHeaderProjection = {
  kind: AmbulatoryLifecycleHeaderKind;
  /** Encounter.status used for MedoraCard soft badge palette. */
  badgeStatusKey: "OPEN" | "CLOSED" | "CANCELLED";
  /** i18n key for primary badge (never raw enum). */
  badgeLabelKey: string;
  /** i18n key for meta “Statut …” line (never raw FINALIZED). */
  metaLabelKey: string;
  /** True when COMPLETE_VISIT may call enterprise close. */
  mayEnterpriseClose: boolean;
};

function norm(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

function isDocsSigned(providerDocumentationStatus: string | null | undefined): boolean {
  const s = norm(providerDocumentationStatus);
  return s === "SIGNED" || s === "FINALIZED";
}

function hasDischargePathway(workflowState: string | null | undefined): boolean {
  const wf = norm(workflowState);
  return wf === "DISCHARGE_READY" || wf === "FINALIZED";
}

/**
 * Header + meta projection from canonical encounter fields.
 * Docs SIGNED ≠ CLOSED; FINALIZED workflow ≠ CLOSED.
 */
export function projectAmbulatoryLifecycleHeader(input: {
  encounterStatus?: string | null;
  workflowState?: string | null;
  providerDocumentationStatus?: string | null;
  dischargedAt?: string | Date | null;
}): AmbulatoryLifecycleHeaderProjection {
  const status = norm(input.encounterStatus) || "OPEN";
  if (status === "CANCELLED") {
    return {
      kind: "CANCELLED",
      badgeStatusKey: "CANCELLED",
      badgeLabelKey: "clinicCareD4c7d.lifecycle.cancelled",
      metaLabelKey: "clinicCareD4c7d.lifecycle.cancelled",
      mayEnterpriseClose: false,
    };
  }
  if (status === "CLOSED") {
    return {
      kind: "CLOSED",
      badgeStatusKey: "CLOSED",
      badgeLabelKey: "clinicCareD4c7d.lifecycle.closed",
      metaLabelKey: "clinicCareD4c7d.lifecycle.terminated",
      mayEnterpriseClose: false,
    };
  }

  const docsSigned = isDocsSigned(input.providerDocumentationStatus);
  const pathway = hasDischargePathway(input.workflowState);
  const mayClose = pathway;

  if (pathway && !docsSigned) {
    return {
      kind: "DISCHARGED_DOCS_PENDING",
      badgeStatusKey: "OPEN",
      badgeLabelKey: "clinicCareD4c7d.lifecycle.dischargeDone",
      metaLabelKey: "clinicCareD4c7d.lifecycle.docsToFinalize",
      mayEnterpriseClose: mayClose,
    };
  }

  if (pathway && docsSigned) {
    return {
      kind: "READY_TO_CLOSE",
      badgeStatusKey: "OPEN",
      badgeLabelKey: "clinicCareD4c7d.lifecycle.readyForCheckout",
      metaLabelKey: "clinicCareD4c7d.lifecycle.readyToClose",
      mayEnterpriseClose: true,
    };
  }

  const wf = norm(input.workflowState);
  if (wf === "DISPOSITION") {
    return {
      kind: "DISCHARGE_READY",
      badgeStatusKey: "OPEN",
      badgeLabelKey: "clinicCareD4c7d.lifecycle.open",
      metaLabelKey: "clinicCareD4c7d.lifecycle.readyForCheckout",
      mayEnterpriseClose: false,
    };
  }

  return {
    kind: "OPEN",
    badgeStatusKey: "OPEN",
    badgeLabelKey: "clinicCareD4c7d.lifecycle.open",
    metaLabelKey: ambulatoryWorkflowStateLabelKey(input.workflowState),
    mayEnterpriseClose: false,
  };
}

/** French-safe workflow meta labels (no raw enums in product UI). */
export function ambulatoryWorkflowStateLabelKey(
  workflowState: string | null | undefined
): string {
  const wf = norm(workflowState);
  switch (wf) {
    case "ARRIVED":
      return "clinicCareD4c7d.workflow.arrived";
    case "TRIAGE":
      return "clinicCareD4c7d.workflow.triage";
    case "IN_TREATMENT":
      return "clinicCareD4c7d.workflow.inTreatment";
    case "RESULTS_PENDING":
      return "clinicCareD4c7d.workflow.resultsPending";
    case "DISPOSITION":
      return "clinicCareD4c7d.workflow.disposition";
    case "DISCHARGE_READY":
      return "clinicCareD4c7d.lifecycle.readyForCheckout";
    case "FINALIZED":
      return "clinicCareD4c7d.lifecycle.readyToClose";
    case "CLOSED":
      return "clinicCareD4c7d.lifecycle.terminated";
    default:
      return "clinicCareD4c7d.lifecycle.open";
  }
}

/**
 * COMPLETE_VISIT → enterprise close when pathway is DISCHARGE_READY or FINALIZED.
 * Does not return FINALIZED (that was the pre-D4C.7D defect path).
 */
export function resolveAmbulatoryCompleteVisitTarget(
  currentWorkflowState: string | null | undefined
): typeof CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET | null {
  const wf = norm(currentWorkflowState);
  if (wf === "DISCHARGE_READY" || wf === "FINALIZED") {
    return CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET;
  }
  return null;
}

export function isAmbulatoryEnterpriseCloseTarget(
  target: string | null | undefined
): boolean {
  return norm(target) === CLINIC_CARE_AMBULATORY_ENTERPRISE_CLOSE_TARGET;
}

/** Active operational queue membership — CLOSED / CANCELLED leave defaults. */
export function isAmbulatoryActiveOperationalEncounter(input: {
  encounterStatus?: string | null;
}): boolean {
  const status = norm(input.encounterStatus);
  return status === "OPEN" || status === "";
}

/**
 * Roles allowed to invoke ambulatory COMPLETE_VISIT → enterprise close
 * (mirrors POST /encounters/:id/close RequireRoles).
 */
export function canInvokeAmbulatoryEnterpriseClose(
  roleCodes: readonly string[] | null | undefined
): boolean {
  const roles = (roleCodes ?? []).map((r) => String(r).trim().toUpperCase());
  return (
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN")
  );
}

/** Show COMPLETE_VISIT even when docs lock the chart, if pathway allows close. */
export function shouldShowAmbulatoryCompleteVisitAction(input: {
  encounterStatus?: string | null;
  workflowState?: string | null;
  roleCodes?: readonly string[] | null;
}): boolean {
  if (!isAmbulatoryActiveOperationalEncounter(input)) return false;
  if (!canInvokeAmbulatoryEnterpriseClose(input.roleCodes)) return false;
  return resolveAmbulatoryCompleteVisitTarget(input.workflowState) != null;
}

/**
 * GET paths to invalidate after successful ambulatory enterprise close
 * (existing getRequestDedupe standard — no setTimeout / full reload only).
 */
export function ambulatoryLifecycleCacheInvalidationPaths(input: {
  encounterId: string;
  dashboardPeriods?: readonly string[];
}): string[] {
  const periods = input.dashboardPeriods ?? ["TODAY", "WEEK", "MONTH"];
  const paths = [
    `/encounters/${input.encounterId}`,
    "/clinic-care/trackboard",
    ...periods.map((p) => `/clinic-care/dashboard?period=${encodeURIComponent(p)}`),
  ];
  return paths;
}

/** Minimal client projection from close API response (no guessing from bare 200). */
export type AmbulatoryEnterpriseCloseClientProjection = {
  encounterId: string;
  status: string;
  workflowState: string | null;
  dischargedAt: string | null;
  providerDocumentationStatus: string | null;
  roomLabel: string | null;
  version: number | null;
  disposition: string | null;
  dischargeStatus: string | null;
};

export function projectAmbulatoryEnterpriseCloseResponse(
  raw: unknown
): AmbulatoryEnterpriseCloseClientProjection | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : typeof o.encounterId === "string" ? o.encounterId : null;
  const status = typeof o.status === "string" ? o.status : null;
  if (!id || !status) return null;
  return {
    encounterId: id,
    status,
    workflowState: typeof o.workflowState === "string" ? o.workflowState : null,
    dischargedAt:
      typeof o.dischargedAt === "string"
        ? o.dischargedAt
        : o.dischargedAt instanceof Date
          ? o.dischargedAt.toISOString()
          : null,
    providerDocumentationStatus:
      typeof o.providerDocumentationStatus === "string" ? o.providerDocumentationStatus : null,
    roomLabel: typeof o.roomLabel === "string" ? o.roomLabel : o.roomLabel === null ? null : null,
    version: typeof o.version === "number" ? o.version : null,
    disposition: typeof o.disposition === "string" ? o.disposition : null,
    dischargeStatus: typeof o.dischargeStatus === "string" ? o.dischargeStatus : null,
  };
}

export function assertNoForbiddenClinicLifecycleAuthority(source: string): boolean {
  for (const name of D4C7D_FORBIDDEN_CLINIC_AUTHORITY_NAMES) {
    if (source.includes(name)) return false;
  }
  return true;
}
