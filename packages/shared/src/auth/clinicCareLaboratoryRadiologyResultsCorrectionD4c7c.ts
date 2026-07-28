/**
 * MEDUI.D4C.7C — Clinic Laboratory and Radiology workflow, result entry,
 * completion, and authorization correction.
 *
 * Reuses enterprise Laboratory / Radiology worklists, ResultsService,
 * ClinicalResultViewer, and result acknowledgement. No ClinicLaboratory*,
 * ClinicRadiology*, ClinicDiagnostic*, or ClinicResult* engines.
 *
 * REFERENCE_VIRTUAL: AMBULATORY is a care-setting projection filter on
 * enterprise Order / Result rows — not a new SOT.
 */

import {
  CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES,
  isClinicCareAmbulatoryEncounterType,
} from "./clinicCareTrackboardProjectionD4c2.js";
import type { FacilityModuleCapabilitiesD4c1 } from "./facilityClinicCareProfileD4c1.js";
import { haitiAmbulatoryRnLabEntrySeedChangeRequired } from "./clinicCareHaitiAmbulatoryOrdersMedicationsResultsD4c5b3.js";
import {
  clinicCareAmbulatoryOrdersChartPath,
  clinicCareAmbulatoryResultsChartPath,
  projectClinicCareAmbulatoryOrderCategory,
} from "./clinicCareAmbulatoryOrdersResultsD4c6.js";

export const CLINIC_CARE_LABORATORY_RADIOLOGY_RESULTS_CORRECTION_CERTIFICATION_ID =
  "MEDUI.D4C.7C" as const;

/** Forbidden duplicate Clinic* authorities for this certification. */
export const D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES = [
  "ClinicLaboratoryOrder",
  "ClinicLaboratoryResult",
  "ClinicRadiologyOrder",
  "ClinicRadiologyResult",
  "ClinicDiagnosticWorklist",
  "ClinicResultStatus",
  "ClinicRadiologyStatus",
  "ClinicResultAcknowledgement",
  "ClinicLabEngine",
  "ClinicRadEngine",
] as const;

export type D4c7cForbiddenClinicAuthorityName =
  (typeof D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES)[number];

export const D4C7C_CLINIC_DIAGNOSTICS_SOURCE = "clinic-care" as const;

export const D4C7C_ENTERPRISE_LAB_WORKLIST_HREF = "/app/lab-worklist" as const;
export const D4C7C_ENTERPRISE_RAD_WORKLIST_HREF = "/app/rad-worklist" as const;
export const D4C7C_CLINIC_LABORATORY_ALIAS_HREF = "/app/clinic-care/laboratory" as const;
export const D4C7C_CLINIC_RADIOLOGY_ALIAS_HREF = "/app/clinic-care/radiology" as const;

/** Nav group presentation label keys (display-layer). */
export const D4C7C_NAV_GROUP_LABEL_KEY = "clinicCareD4c7c.nav.groupLabImaging" as const;
export const D4C7C_NAV_LAB_LIST_LABEL_KEY = "clinicCareD4c7c.nav.labList" as const;
export const D4C7C_NAV_RAD_LIST_LABEL_KEY = "clinicCareD4c7c.nav.radList" as const;

/**
 * Documented role/capability matrix (audit) — does not grant seed permissions.
 * Server-side enforcement remains ResultsService / WorklistsController / order guards.
 */
export const D4C7C_ROLE_CAPABILITY_MATRIX_DOC = {
  PROVIDER: [
    "PLACE_ORDER",
    "BROWSE_LAB_WORKLIST",
    "ACKNOWLEDGE_RESULT",
    "VERIFY_RESULT",
    "VIEW_RESULTS_TILE",
  ],
  RN: [
    "BROWSE_LAB_WORKLIST",
    "ACK_START_COMPLETE_LAB_LINE",
    "COLLECT_VIA_WORKFLOW",
    "ENTER_LAB_IF_FACILITY_POLICY",
    "ACKNOWLEDGE_RESULT",
  ],
  MA: ["VIEW_ORDERS_RESULTS_TILE_READONLY"],
  LAB_TECH: [
    "BROWSE_LAB_WORKLIST",
    "ACCEPT_COLLECT_RECEIVE_REJECT",
    "BEGIN_PROCESSING",
    "ENTER_VERIFY_FINALIZE_LAB",
  ],
  RAD_TECH: [
    "BROWSE_RAD_WORKLIST",
    "ACCEPT_SCHEDULE_BEGIN_COMPLETE_EXAM",
    "ENTER_ACQUISITION_NOTES",
  ],
  RADIOLOGIST_OR_AUTHORIZED_READER: [
    "PRELIMINARY_INTERPRETATION",
    "FINAL_INTERPRETATION",
    "AMEND",
    "ACKNOWLEDGE_RESULT",
  ],
  ADMIN: ["FULL_ENTERPRISE_LAB_RAD_RESULTS"],
  FRONT_DESK: [],
  BILLING: [],
} as const;

/** Lab workflow actions remain distinct (no conflation with radiology / ack). */
export const D4C7C_LAB_ACTIONS = [
  "ACCEPT",
  "COLLECT",
  "RECEIVE",
  "REJECT",
  "BEGIN_PROCESSING",
  "ENTER",
  "VERIFY",
  "FINALIZE",
  "AMEND",
] as const;

/** Radiology workflow actions remain distinct. */
export const D4C7C_RAD_ACTIONS = [
  "ACCEPT",
  "SCHEDULE",
  "BEGIN",
  "COMPLETE",
  "PRELIMINARY",
  "FINAL",
  "AMEND",
] as const;

/** Acknowledgement ≠ entry / finalization. */
export const D4C7C_ACKNOWLEDGE_ACTION = "ACKNOWLEDGE_RESULT" as const;

/**
 * Enterprise Order.type / catalogItemType → worklist routing.
 * Medication / Rx must never route to Lab or Radiology queues.
 */
export function resolveClinicDiagnosticWorklistRoute(input: {
  orderType?: string | null;
  catalogItemType?: string | null;
}): "LAB" | "RADIOLOGY" | "PHARMACY" | "NONE" {
  const catalog = String(input.catalogItemType ?? "")
    .trim()
    .toUpperCase();
  if (catalog === "LAB_TEST") return "LAB";
  if (catalog === "IMAGING_STUDY") return "RADIOLOGY";
  if (catalog === "MEDICATION") return "PHARMACY";

  const cat = projectClinicCareAmbulatoryOrderCategory(input.orderType ?? null);
  if (cat === "LAB") return "LAB";
  if (cat === "IMAGING") return "RADIOLOGY";
  if (cat === "MEDICATION") return "PHARMACY";
  return "NONE";
}

export function medicationMustNotRouteToLabOrRad(input: {
  orderType?: string | null;
  catalogItemType?: string | null;
}): boolean {
  return resolveClinicDiagnosticWorklistRoute(input) === "PHARMACY";
}

/** Thin Clinic-aware Laboratory entry — enterprise list + ambulatory filter. */
export function buildClinicLaboratoryEntryHref(input?: {
  ambulatory?: boolean;
  source?: string | null;
}): string {
  const qs = new URLSearchParams();
  qs.set("source", input?.source?.trim() || D4C7C_CLINIC_DIAGNOSTICS_SOURCE);
  if (input?.ambulatory !== false) {
    qs.set("ambulatory", "1");
  }
  return `${D4C7C_ENTERPRISE_LAB_WORKLIST_HREF}?${qs.toString()}`;
}

/** Thin Clinic-aware Radiology entry — enterprise list + ambulatory filter. */
export function buildClinicRadiologyEntryHref(input?: {
  ambulatory?: boolean;
  source?: string | null;
}): string {
  const qs = new URLSearchParams();
  qs.set("source", input?.source?.trim() || D4C7C_CLINIC_DIAGNOSTICS_SOURCE);
  if (input?.ambulatory !== false) {
    qs.set("ambulatory", "1");
  }
  return `${D4C7C_ENTERPRISE_RAD_WORKLIST_HREF}?${qs.toString()}`;
}

export function isClinicLaboratoryEntryHref(href: string | null | undefined): boolean {
  const raw = String(href ?? "").trim();
  if (!raw.startsWith(D4C7C_ENTERPRISE_LAB_WORKLIST_HREF)) return false;
  try {
    const url = new URL(raw, "https://medora.local");
    return (
      url.pathname === D4C7C_ENTERPRISE_LAB_WORKLIST_HREF &&
      url.searchParams.get("source") === D4C7C_CLINIC_DIAGNOSTICS_SOURCE
    );
  } catch {
    return raw.includes("source=clinic-care");
  }
}

export function isClinicRadiologyEntryHref(href: string | null | undefined): boolean {
  const raw = String(href ?? "").trim();
  if (!raw.startsWith(D4C7C_ENTERPRISE_RAD_WORKLIST_HREF)) return false;
  try {
    const url = new URL(raw, "https://medora.local");
    return (
      url.pathname === D4C7C_ENTERPRISE_RAD_WORKLIST_HREF &&
      url.searchParams.get("source") === D4C7C_CLINIC_DIAGNOSTICS_SOURCE
    );
  } catch {
    return raw.includes("source=clinic-care");
  }
}

/**
 * Care-setting-aware rewrite for global sidebar Lab / Rad links when Clinic Care
 * is the active ambulatory surface (preserves enterprise boards).
 */
export function resolveClinicCareLabRadSidebarHref(
  href: string,
  caps: Pick<
    FacilityModuleCapabilitiesD4c1,
    "clinicCareEnabled" | "urgentCareEnabled" | "laboratoryEnabled" | "radiologyEnabled"
  >
): string {
  const path = href.split("?")[0] || href;
  const clinicOn = Boolean(caps.clinicCareEnabled || caps.urgentCareEnabled);

  if (path === D4C7C_ENTERPRISE_LAB_WORKLIST_HREF && clinicOn && caps.laboratoryEnabled) {
    return buildClinicLaboratoryEntryHref({ ambulatory: true });
  }
  if (path === D4C7C_ENTERPRISE_RAD_WORKLIST_HREF && clinicOn && caps.radiologyEnabled) {
    return buildClinicRadiologyEntryHref({ ambulatory: true });
  }
  return href;
}

export function isAmbulatoryLabRadWorklistEncounterType(
  encounterType: string | null | undefined
): boolean {
  return isClinicCareAmbulatoryEncounterType(encounterType);
}

export type D4c7cAmbulatoryLabRadQueueFilter = {
  facilityId?: string | null;
  ambulatoryOnly?: boolean;
  patientId?: string | null;
  providerUserId?: string | null;
  onDate?: string | null;
};

export type D4c7cLabRadQueueOrderLike = {
  facilityId?: string | null;
  createdAt?: string | Date | null;
  orderedByUserId?: string | null;
  type?: string | null;
  encounter?: {
    type?: string | null;
    patientId?: string | null;
    patient?: { id?: string | null } | null;
  } | null;
  items?: Array<{
    catalogItemType?: string | null;
  }> | null;
};

function orderCreatedOnDate(
  createdAt: string | Date | null | undefined,
  onDate: string
): boolean {
  if (!createdAt) return false;
  const iso = typeof createdAt === "string" ? createdAt : createdAt.toISOString();
  return iso.slice(0, 10) === onDate.slice(0, 10);
}

/**
 * Filter enterprise lab/rad worklist rows for ambulatory Clinic Care presentation.
 * Does not invent a ClinicDiagnosticWorklist — presentation filter only.
 */
export function filterAmbulatoryLabRadWorklistOrders<T extends D4c7cLabRadQueueOrderLike>(
  orders: T[],
  filter: D4c7cAmbulatoryLabRadQueueFilter
): T[] {
  return orders.filter((order) => {
    if (filter.facilityId && order.facilityId && order.facilityId !== filter.facilityId) {
      return false;
    }
    if (filter.ambulatoryOnly === true) {
      if (!isAmbulatoryLabRadWorklistEncounterType(order.encounter?.type ?? null)) {
        return false;
      }
    }
    const patientId =
      order.encounter?.patientId ?? order.encounter?.patient?.id ?? null;
    if (filter.patientId && patientId && patientId !== filter.patientId) return false;
    if (
      filter.providerUserId &&
      order.orderedByUserId &&
      order.orderedByUserId !== filter.providerUserId
    ) {
      return false;
    }
    if (filter.onDate && !orderCreatedOnDate(order.createdAt, filter.onDate)) return false;
    return true;
  });
}

/**
 * Departmental worklist care-setting badge for OUTPATIENT / URGENT_CARE.
 * Does NOT mutate D3E.5 ClinicalEncounterContext (ED/Obs/IP identity stays separate).
 */
export function resolveAmbulatoryWorklistCareSettingBadge(input: {
  encounterType?: string | null;
}): "AMBULATORY" | null {
  const type = String(input.encounterType ?? "")
    .trim()
    .toUpperCase();
  if ((CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES as readonly string[]).includes(type)) {
    return "AMBULATORY";
  }
  return null;
}

/** French display keys for worklist encounter context (no raw AMBULATORY in FR UI). */
export const D4C7C_ENCOUNTER_CONTEXT_I18N_KEY = {
  AMBULATORY: "worklistDepartments.shared.encounterContext.ambulatory",
} as const;

/**
 * Status → French i18n key (display-layer). Prefer printOutput.orderItemChart.*;
 * never show raw IN_PROGRESS / PLACED / FINALIZED in FR product UI.
 */
export const D4C7C_ORDER_STATUS_FR_LABEL_KEYS: Record<string, string> = {
  DRAFT: "printOutput.orderItemChart.DRAFT",
  PENDING: "printOutput.orderItemChart.PENDING",
  PLACED: "printOutput.orderItemChart.PLACED",
  SIGNED: "printOutput.orderItemChart.SIGNED",
  ACKNOWLEDGED: "printOutput.orderItemChart.ACKNOWLEDGED",
  IN_PROGRESS: "printOutput.orderItemChart.IN_PROGRESS",
  COMPLETED: "printOutput.orderItemChart.terminalDone",
  RESULTED: "printOutput.orderItemChart.RESULTED",
  VERIFIED: "printOutput.orderItemChart.VERIFIED",
  CANCELLED: "printOutput.orderItemChart.CANCELLED",
};

export function clinicLabRadOrderStatusLabelKey(status: string | null | undefined): string {
  const u = String(status ?? "")
    .trim()
    .toUpperCase();
  return D4C7C_ORDER_STATUS_FR_LABEL_KEYS[u] ?? "printOutput.orderItemChart.PENDING";
}

/**
 * Active Clinic Workspace deep links — canonical chart sections (no ClinicResult viewer).
 */
export function clinicCareAmbulatoryOrdersTilePath(encounterId: string): string {
  return clinicCareAmbulatoryOrdersChartPath(encounterId);
}

export function clinicCareAmbulatoryResultsTilePath(encounterId: string): string {
  return clinicCareAmbulatoryResultsChartPath(encounterId);
}

/**
 * STOP: Haiti Clinic RN lab entry requires Facility.allowRnLabResultSubmission.
 * Do not silently flip production defaults in this certification.
 */
export function clinicLabRnResultEntrySeedChangeRequired(input: {
  facilityAllowsRnLabResultSubmission: boolean | null | undefined;
}): {
  stop: boolean;
  authority: string;
  proposedChange: string | null;
} {
  return haitiAmbulatoryRnLabEntrySeedChangeRequired(input);
}

/**
 * STOP gap: no typed Result/Order distinction for provider POC vs central-lab
 * vs provider-performed. Do not invent Clinic-only POC finalization.
 */
export function clinicDiagnosticPocVsCentralLabDistinctionExists(): {
  exists: boolean;
  stop: boolean;
  gap: string;
} {
  return {
    exists: false,
    stop: true,
    gap:
      "No typed POC / CENTRAL_LAB / PROVIDER_PERFORMED resultSource on Result or OrderItem. Provider POC (glucose, rapid antigen, urine preg, UA dip, bedside US) cannot be safely distinguished from central-lab finalization without enterprise semantics — deferred; no Clinic-only logic.",
  };
}

/**
 * Specimen collection / workflow ack-start must not be auto-blocked solely because
 * Facility.allowRnLabResultSubmission is false — that flag gates RN result ENTER only.
 */
export function rnLabSpecimenCollectionBlockedByResultSubmissionPolicy(): boolean {
  return false;
}

/** Front Desk / Billing must not enter lab/rad results. */
export function canEnterLabOrRadResults(roleCodes: readonly string[] | null | undefined): boolean {
  const roles = (roleCodes ?? []).map((r) => String(r).trim().toUpperCase());
  if (roles.includes("FRONT_DESK") || roles.includes("BILLING")) {
    if (
      !roles.some((r) =>
        ["ADMIN", "LAB", "RADIOLOGY", "RN", "PROVIDER", "MEDORA_SUPER_ADMIN"].includes(r)
      )
    ) {
      return false;
    }
  }
  if (roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN")) return true;
  if (roles.includes("LAB") || roles.includes("RADIOLOGY")) return true;
  if (roles.includes("RN") || roles.includes("PROVIDER")) return true;
  return false;
}

export function frontDeskBillingResultEntryDenied(
  roleCodes: readonly string[] | null | undefined
): boolean {
  const roles = (roleCodes ?? []).map((r) => String(r).trim().toUpperCase());
  const onlyDeskOrBilling =
    roles.length > 0 &&
    roles.every((r) => r === "FRONT_DESK" || r === "BILLING") &&
    !roles.some((r) =>
      ["ADMIN", "LAB", "RADIOLOGY", "RN", "PROVIDER", "MEDORA_SUPER_ADMIN"].includes(r)
    );
  return onlyDeskOrBilling;
}
