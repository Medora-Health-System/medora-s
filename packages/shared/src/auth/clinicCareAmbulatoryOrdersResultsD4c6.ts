/**
 * MEDUI.D4C.6 — Ambulatory Orders & Results presentation contracts.
 *
 * Clinic Care projects facility + AMBULATORY (OUTPATIENT | URGENT_CARE) onto the
 * enterprise Order / Result engines. No ClinicOrder*, ClinicResult*, or parallel
 * acknowledgement / audit authority.
 *
 * REFERENCE_VIRTUAL: AMBULATORY is a care-setting projection filter — not a new SOT.
 */

import {
  CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES,
  isClinicCareAmbulatoryEncounterType,
} from "./clinicCareTrackboardProjectionD4c2.js";
import {
  CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY,
  clinicCareAmbulatoryProviderChartPath,
} from "./clinicCareProviderWorkspaceD4c5.js";
import type { ClinicCareWorkspaceRoleAccess } from "./facilityClinicCareProfileD4c1.js";
import type { ProfessionGroup } from "./professionResolver.js";

export const CLINIC_CARE_AMBULATORY_ORDERS_RESULTS_CERTIFICATION_ID =
  "MEDUI.D4C.6" as const;

/** Enterprise order category tokens reused on the ambulatory order board. */
export const CLINIC_CARE_AMBULATORY_ORDER_CATEGORIES = [
  "ALL",
  "LAB",
  "IMAGING",
  "MEDICATION",
  "CARE",
] as const;
export type ClinicCareAmbulatoryOrderCategory =
  (typeof CLINIC_CARE_AMBULATORY_ORDER_CATEGORIES)[number];

/**
 * Board status filters — subset / aliases of enterprise OrderStatus vocabulary.
 * Does not invent ClinicOrderStatus.
 */
export const CLINIC_CARE_AMBULATORY_ORDER_STATUS_FILTERS = [
  "ALL",
  "ACTIVE",
  "PENDING",
  "PLACED",
  "SIGNED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "COMPLETED",
  "RESULTED",
  "VERIFIED",
  "CANCELLED",
] as const;
export type ClinicCareAmbulatoryOrderStatusFilter =
  (typeof CLINIC_CARE_AMBULATORY_ORDER_STATUS_FILTERS)[number];

/** Statuses treated as still-open / operational on the ambulatory board. */
export const CLINIC_CARE_AMBULATORY_ORDER_ACTIVE_STATUSES = [
  "PENDING",
  "PLACED",
  "SIGNED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "COMPLETED",
  "RESULTED",
] as const;

/** Results inbox group filters (presentation over Result + OrderStatus). */
export const CLINIC_CARE_AMBULATORY_RESULT_INBOX_GROUPS = [
  "CRITICAL",
  "ABNORMAL",
  "NEW_FINAL",
  "PRELIMINARY",
  "ACKNOWLEDGED",
  "ALL",
] as const;
export type ClinicCareAmbulatoryResultInboxGroup =
  (typeof CLINIC_CARE_AMBULATORY_RESULT_INBOX_GROUPS)[number];

export type ClinicCareAmbulatoryOrderBoardAccess = {
  canViewBoard: boolean;
  /** Place / sign via enterprise order-entry only (PROVIDER / ADMIN). */
  canPlaceOrders: boolean;
  /** Tech-safe / department read — no clinical escalation. */
  techSafeOnly: boolean;
};

export type ClinicCareAmbulatoryResultsInboxAccess = {
  canViewInbox: boolean;
  /** Clinician ack via POST /orders/:id/result/acknowledge only. */
  canAcknowledgeResults: boolean;
  techSafeOnly: boolean;
};

/** Ambulatory encounter types for board / inbox queries (enterprise Encounter.type). */
export function clinicCareAmbulatoryOrdersEncounterTypes(): readonly string[] {
  return CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES;
}

/**
 * Orders board visibility: clinical + department roles when Clinic Care shell on.
 * Front Desk / Billing: denied (no clinical escalation via URL).
 */
export function resolveClinicCareAmbulatoryOrdersBoardAccess(input: {
  professionGroup: ProfessionGroup | string;
  access: ClinicCareWorkspaceRoleAccess;
}): ClinicCareAmbulatoryOrderBoardAccess {
  const p = String(input.professionGroup ?? "")
    .trim()
    .toUpperCase();
  const shell = input.access.canAccessClinicCareShell === true;
  if (!shell) {
    return { canViewBoard: false, canPlaceOrders: false, techSafeOnly: false };
  }

  if (p === "FRONT_DESK" || p === "BILLING") {
    return { canViewBoard: false, canPlaceOrders: false, techSafeOnly: false };
  }

  if (p === "PROVIDER" || p === "ADMIN") {
    return {
      canViewBoard: true,
      canPlaceOrders: input.access.canIssueProviderOrders === true,
      techSafeOnly: false,
    };
  }

  if (p === "RN") {
    // Nursing-authorized: view board; placement remains enterprise provider authority.
    return {
      canViewBoard: input.access.canAccessNursingMa === true,
      canPlaceOrders: false,
      techSafeOnly: false,
    };
  }

  if (p === "TECHNICIAN") {
    // MA / tech-safe: view when nursing-safe projection or diagnostics authorized.
    const techSafe =
      input.access.canAccessTechnicianSafeNursingMaProjection === true ||
      input.access.canAccessDiagnosticsWorklists === true;
    return {
      canViewBoard: techSafe,
      canPlaceOrders: false,
      techSafeOnly: true,
    };
  }

  if (p === "PHARMACY") {
    return {
      canViewBoard: input.access.canAccessPharmacy === true,
      canPlaceOrders: false,
      techSafeOnly: false,
    };
  }

  if (p === "LAB" || p === "RADIOLOGY") {
    return {
      canViewBoard:
        (p === "LAB" && input.access.canAccessLaboratory) ||
        (p === "RADIOLOGY" && input.access.canAccessRadiology),
      canPlaceOrders: false,
      techSafeOnly: false,
    };
  }

  // Fallback: diagnostics worklist holders may view; never place.
  if (input.access.canAccessDiagnosticsWorklists || input.access.canAccessPharmacy) {
    return { canViewBoard: true, canPlaceOrders: false, techSafeOnly: false };
  }

  return { canViewBoard: false, canPlaceOrders: false, techSafeOnly: false };
}

/**
 * Results inbox: Provider / RN / Admin clinical review.
 * Lab/Rad continue on departmental worklists; Front Desk denied.
 */
export function resolveClinicCareAmbulatoryResultsInboxAccess(input: {
  professionGroup: ProfessionGroup | string;
  access: ClinicCareWorkspaceRoleAccess;
  roleCodes?: readonly string[];
}): ClinicCareAmbulatoryResultsInboxAccess {
  const p = String(input.professionGroup ?? "")
    .trim()
    .toUpperCase();
  const roles = (input.roleCodes ?? []).map((r) => r.trim().toUpperCase());
  const shell = input.access.canAccessClinicCareShell === true;
  if (!shell) {
    return { canViewInbox: false, canAcknowledgeResults: false, techSafeOnly: false };
  }

  if (p === "FRONT_DESK" || p === "BILLING") {
    return { canViewInbox: false, canAcknowledgeResults: false, techSafeOnly: false };
  }

  const canAckEnterprise =
    roles.includes("PROVIDER") ||
    roles.includes("RN") ||
    roles.includes("ADMIN") ||
    p === "PROVIDER" ||
    p === "RN" ||
    p === "ADMIN";

  if (p === "PROVIDER" || p === "ADMIN") {
    return {
      canViewInbox: true,
      canAcknowledgeResults: canAckEnterprise,
      techSafeOnly: false,
    };
  }

  if (p === "RN") {
    return {
      canViewInbox: input.access.canAccessNursingMa === true,
      canAcknowledgeResults: canAckEnterprise,
      techSafeOnly: false,
    };
  }

  if (p === "TECHNICIAN") {
    // Tech-safe read of pending diagnostics context only — no clinician ack.
    const techSafe =
      input.access.canAccessTechnicianSafeNursingMaProjection === true ||
      input.access.canAccessDiagnosticsWorklists === true;
    return {
      canViewInbox: techSafe,
      canAcknowledgeResults: false,
      techSafeOnly: true,
    };
  }

  // Lab / Radiology / Pharmacy: operational boards elsewhere; clinic results inbox is clinical.
  if (p === "PHARMACY" || p === "LAB" || p === "RADIOLOGY") {
    return { canViewInbox: false, canAcknowledgeResults: false, techSafeOnly: false };
  }

  return { canViewInbox: false, canAcknowledgeResults: false, techSafeOnly: false };
}

/**
 * Nav / path gate from access flags alone (ClinicCareTopNav only receives access).
 * Front Desk / Billing fail all predicates → no clinical escalation via URL.
 */
export function isClinicCareAmbulatoryOrdersNavVisible(
  access: ClinicCareWorkspaceRoleAccess
): boolean {
  if (!access.canAccessClinicCareShell) return false;
  return (
    access.canIssueProviderOrders === true ||
    access.canAccessNursingMa === true ||
    access.canAccessTechnicianSafeNursingMaProjection === true ||
    access.canAccessDiagnosticsWorklists === true ||
    access.canAccessPharmacy === true ||
    access.canAccessLaboratory === true ||
    access.canAccessRadiology === true
  );
}

/** Results inbox nav — clinical review + tech-safe read; not Front Desk / Billing / Pharmacy-only. */
export function isClinicCareAmbulatoryResultsNavVisible(
  access: ClinicCareWorkspaceRoleAccess
): boolean {
  if (!access.canAccessClinicCareShell) return false;
  return (
    access.canAuthorProviderDocumentation === true ||
    access.canAccessNursingMa === true ||
    access.canAccessTechnicianSafeNursingMaProjection === true
  );
}

/** Map enterprise order.type → board category. */
export function projectClinicCareAmbulatoryOrderCategory(
  orderType: string | null | undefined
): Exclude<ClinicCareAmbulatoryOrderCategory, "ALL"> {
  const u = String(orderType ?? "")
    .trim()
    .toUpperCase();
  if (u === "LAB") return "LAB";
  if (u === "IMAGING" || u === "RADIOLOGY") return "IMAGING";
  if (u === "MEDICATION" || u === "MED") return "MEDICATION";
  return "CARE";
}

/** Whether an order row matches category + status filters. */
export function clinicCareAmbulatoryOrderMatchesFilters(input: {
  orderType: string | null | undefined;
  status: string | null | undefined;
  category: ClinicCareAmbulatoryOrderCategory;
  statusFilter: ClinicCareAmbulatoryOrderStatusFilter;
}): boolean {
  const category = projectClinicCareAmbulatoryOrderCategory(input.orderType);
  if (input.category !== "ALL" && category !== input.category) return false;

  const status = String(input.status ?? "")
    .trim()
    .toUpperCase();
  if (input.statusFilter === "ALL") return true;
  if (input.statusFilter === "ACTIVE") {
    return (CLINIC_CARE_AMBULATORY_ORDER_ACTIVE_STATUSES as readonly string[]).includes(status);
  }
  return status === input.statusFilter;
}

export type ClinicCareAmbulatoryResultClassificationInput = {
  catalogItemType?: string | null;
  status?: string | null;
  resultText?: string | null;
  criticalValue?: boolean | null;
  acknowledgedByProviderAt?: string | Date | null;
  verifiedAt?: string | Date | null;
};

/**
 * Classify a reportable lab/imaging line into inbox groups.
 * Priority for primaryGroup: CRITICAL → ABNORMAL → PRELIMINARY → NEW_FINAL → ACKNOWLEDGED.
 */
export function classifyClinicCareAmbulatoryResult(
  input: ClinicCareAmbulatoryResultClassificationInput
): {
  groups: ClinicCareAmbulatoryResultInboxGroup[];
  primaryGroup: ClinicCareAmbulatoryResultInboxGroup;
  critical: boolean;
  abnormal: boolean;
  preliminary: boolean;
  finalLike: boolean;
  acknowledged: boolean;
} {
  const status = String(input.status ?? "")
    .trim()
    .toUpperCase();
  const text = String(input.resultText ?? "");
  const critical = input.criticalValue === true;
  const acknowledged = Boolean(input.acknowledgedByProviderAt);
  const preliminary =
    /PRELIM|IN_PROGRESS|PENDING|PLACED|SIGNED|ACKNOWLEDGED/.test(status) &&
    !/RESULTED|VERIFIED|COMPLETED|FINAL/.test(status);
  const finalLike =
    Boolean(input.verifiedAt) ||
    /RESULTED|VERIFIED|COMPLETED|FINAL/.test(status) ||
    (Boolean(text.trim()) && !preliminary);
  const abnormal =
    critical ||
    /ABNORMAL|HIGH|LOW|\*|HH|LL|\bCRITICAL\b/i.test(text) ||
    /(?:^|[\s,;:(])[HL](?:[\s,;:).]|$)/.test(text);

  const groups: ClinicCareAmbulatoryResultInboxGroup[] = ["ALL"];
  if (critical) groups.push("CRITICAL");
  if (abnormal && !critical) groups.push("ABNORMAL");
  if (preliminary) groups.push("PRELIMINARY");
  if (finalLike && !preliminary && !acknowledged) groups.push("NEW_FINAL");
  if (acknowledged) groups.push("ACKNOWLEDGED");

  let primaryGroup: ClinicCareAmbulatoryResultInboxGroup = "ALL";
  if (critical) primaryGroup = "CRITICAL";
  else if (abnormal) primaryGroup = "ABNORMAL";
  else if (preliminary) primaryGroup = "PRELIMINARY";
  else if (finalLike && !acknowledged) primaryGroup = "NEW_FINAL";
  else if (acknowledged) primaryGroup = "ACKNOWLEDGED";

  return {
    groups,
    primaryGroup,
    critical,
    abnormal,
    preliminary,
    finalLike,
    acknowledged,
  };
}

export function clinicCareAmbulatoryResultMatchesGroup(
  classification: ReturnType<typeof classifyClinicCareAmbulatoryResult>,
  group: ClinicCareAmbulatoryResultInboxGroup
): boolean {
  return classification.groups.includes(group);
}

/**
 * Canonical chart path — Orders tile on Active Clinic Workspace (D4C.5B / D4C.6).
 * Legacy `tab=orders` is accepted as a section alias by the ambulatory workspace shell.
 */
export function clinicCareAmbulatoryOrdersChartPath(encounterId: string): string {
  const id = encodeURIComponent(encounterId);
  return `/app/encounters/${id}?workspace=${CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY}&section=orders`;
}

/**
 * Canonical chart path — Results tile on Active Clinic Workspace (D4C.5B / D4C.6).
 */
export function clinicCareAmbulatoryResultsChartPath(encounterId: string): string {
  const id = encodeURIComponent(encounterId);
  return `/app/encounters/${id}?workspace=${CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY}&section=results`;
}

/** Order detail deep-link stays on enterprise encounter orders tab (no ClinicOrderDetail). */
export function clinicCareAmbulatoryOrderDetailPath(input: {
  encounterId: string;
  orderId?: string | null;
}): string {
  const base = clinicCareAmbulatoryOrdersChartPath(input.encounterId);
  if (!input.orderId) return base;
  return `${base}&orderId=${encodeURIComponent(input.orderId)}`;
}

/** Provider worklist RESULTS_PENDING → results chart (reuse D4C.5 path helper family). */
export function clinicCareAmbulatoryProviderResultsPath(encounterId: string): string {
  return clinicCareAmbulatoryResultsChartPath(encounterId);
}

/** Compact visit badge tokens for Today's Visits (counts only — no PHI). */
export function projectClinicCareVisitOrderResultBadges(input: {
  openOrderCount?: number | null;
  resultsPendingCount?: number | null;
  criticalResultUnacknowledged?: boolean | null;
}): {
  openOrders: number;
  resultsPending: number;
  criticalUnacked: boolean;
} {
  return {
    openOrders: Math.max(0, Number(input.openOrderCount ?? 0) || 0),
    resultsPending: Math.max(0, Number(input.resultsPendingCount ?? 0) || 0),
    criticalUnacked: input.criticalResultUnacknowledged === true,
  };
}

/** Safe AI / Clinical Board insight params — never patient names. */
export function clinicCareAmbulatoryOrdersResultsInsightSafe(input: {
  openOrderCount: number;
  resultsPendingCount: number;
  criticalUnackedCount: number;
}): { messageKey: string; params: Record<string, number> } | null {
  if (input.criticalUnackedCount > 0) {
    return {
      messageKey: "clinicCareD4c6.insights.criticalUnacked",
      params: { count: input.criticalUnackedCount },
    };
  }
  if (input.resultsPendingCount > 0) {
    return {
      messageKey: "clinicCareD4c6.insights.resultsPending",
      params: { count: input.resultsPendingCount },
    };
  }
  if (input.openOrderCount > 0) {
    return {
      messageKey: "clinicCareD4c6.insights.openOrders",
      params: { count: input.openOrderCount },
    };
  }
  return null;
}

export {
  isClinicCareAmbulatoryEncounterType,
  CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES,
  clinicCareAmbulatoryProviderChartPath,
};
