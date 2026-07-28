/**
 * MEDUI.D4C.7F — Ambulatory encounter transition UX, closure override,
 * navigation icons, and Clinic Pharmacy access.
 *
 * One EncountersService.close authority. No ClinicClosure* / ClinicPharmacy* engines.
 * Generic audit metadata is sufficient for override (no migration).
 */

import {
  buildClinicPharmacyEntryHref,
  canAccessClinicPharmacyNavigation,
  D4C7B_ENTERPRISE_PHARMACY_HREF,
} from "./clinicCarePharmacyConsultationsNavigationD4c7b.js";
import {
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
} from "../mar/medicationAdministrationInfusionMar.js";

export const CLINIC_ENCOUNTER_TRANSITION_CLOSURE_PHARMACY_NAV_CERTIFICATION_ID =
  "MEDUI.D4C.7F" as const;

/** Forbidden duplicate Clinic* authorities for this certification. */
export const D4C7F_FORBIDDEN_CLINIC_AUTHORITY_NAMES = [
  "closeClinicEncounterWithOverride",
  "ClinicClosureStatus",
  "ClinicPendingOrderOverride",
  "ClinicPharmacyDashboard",
  "ClinicInventory",
  "ClinicDispense",
  "ClinicSidebarIconRegistry",
] as const;

export type D4c7fForbiddenClinicAuthorityName =
  (typeof D4C7F_FORBIDDEN_CLINIC_AUTHORITY_NAMES)[number];

/** Stable acknowledgement text version for override audit (no PHI). */
export const D4C7F_PENDING_ITEMS_ACK_VERSION = "D4C7F_PENDING_ACK_V1" as const;

export const D4C7F_PENDING_ITEMS_OVERRIDE_REASON = "PROVIDER_ACCEPTED_PENDING_ITEMS" as const;

/** Typed close / preflight error code (client must not stringify raw objects). */
export const D4C7F_ENCOUNTER_PENDING_ITEMS_CODE = "ENCOUNTER_PENDING_ITEMS" as const;

export const D4C7F_ENCOUNTER_NON_OVERRIDABLE_BLOCKERS_CODE =
  "ENCOUNTER_CLOSE_NON_OVERRIDABLE_BLOCKERS" as const;

/** Enterprise Pharmacy routes exposed to Clinic ADMIN+capability / PHARMACY. */
export const D4C7F_ENTERPRISE_PHARMACY_NAV_PATHS = [
  "/app/pharmacy",
  "/app/pharmacy-worklist",
  "/app/pharmacy/inventory",
  "/app/pharmacy/dispense",
  "/app/pharmacy/low-stock",
  "/app/pharmacy/expiring",
] as const;

export type D4c7fPharmacyNavPath = (typeof D4C7F_ENTERPRISE_PHARMACY_NAV_PATHS)[number];

/**
 * Closure guard classification (enterprise audit — do not invent Clinic-only safety).
 *
 * A Non-overridable: active infusion running; concurrent close conflict (API).
 * B Overridable: pending outpatient lab/imaging/meds/procedures; unsigned docs via
 *   existing acknowledgeDispositionSafety / acknowledgeDeficiencies paths.
 * C Informational: billing incomplete, external Rx send, follow-up OPEN (independent).
 */
export const D4C7F_CLOSURE_GUARD_CLASSIFICATION = {
  ACTIVE_INFUSION_RUNNING: "NON_OVERRIDABLE",
  ACTIVE_ORDERS_UNRESOLVED: "OVERRIDABLE_PENDING",
  PROVIDER_DOCUMENTATION_UNSIGNED: "OVERRIDABLE_EXISTING_SAFETY_ACK",
  VITALS_MISSING: "OVERRIDABLE_EXISTING_SAFETY_ACK",
  VITALS_STALE: "OVERRIDABLE_EXISTING_SAFETY_ACK",
  DISCHARGE_INSTRUCTIONS_MISSING: "OVERRIDABLE_EXISTING_SAFETY_ACK",
  NURSING_HANDOFF_INCOMPLETE: "OVERRIDABLE_EXISTING_SAFETY_ACK",
  BILLING_INCOMPLETE: "INFORMATIONAL",
  EXTERNAL_RX_SEND_PENDING: "INFORMATIONAL",
  OPEN_FOLLOW_UP: "INFORMATIONAL",
  CRITICAL_RESULT_IMMEDIATE: "NOT_CURRENTLY_A_CLOSE_BLOCKER",
} as const;

export type D4c7fPendingItemCounts = {
  laboratory: number;
  imaging: number;
  medications: number;
  procedures: number;
  results: number;
  criticalResults: number;
  followUps: number;
};

export const EMPTY_D4C7F_PENDING_ITEM_COUNTS: D4c7fPendingItemCounts = {
  laboratory: 0,
  imaging: 0,
  medications: 0,
  procedures: 0,
  results: 0,
  criticalResults: 0,
  followUps: 0,
};

export type D4c7fClosurePreflightProjection = {
  encounterId: string;
  currentStatus: string;
  canClose: boolean;
  overrideAllowed: boolean;
  pendingItems: D4c7fPendingItemCounts;
  pendingItemIds: string[];
  nonOverridableBlockers: Array<{ code: string; message: string }>;
  allowedNextActions: string[];
  acknowledgementVersion: typeof D4C7F_PENDING_ITEMS_ACK_VERSION;
};

export function totalD4c7fPendingItems(counts: D4c7fPendingItemCounts): number {
  return (
    counts.laboratory +
    counts.imaging +
    counts.medications +
    counts.procedures +
    counts.results +
    counts.criticalResults +
    counts.followUps
  );
}

/**
 * Preferred override authority (server-enforced):
 * PROVIDER (+ MEDORA_SUPER_ADMIN) may acknowledge overridable pending items.
 * RN / ADMIN / PHARMACY / MA / FRONT_DESK / BILLING may not.
 */
export function canOverrideAmbulatoryPendingClosureItems(
  roleCodes: readonly string[] | null | undefined
): boolean {
  const roles = (roleCodes ?? []).map((r) => String(r).trim().toUpperCase());
  if (roles.includes("MEDORA_SUPER_ADMIN")) return true;
  return roles.includes("PROVIDER");
}

export function isActiveInfusionFromAdministrations(
  admins: ReadonlyArray<{
    marAction?: string | null;
    notes?: string | null;
    infusionPhase?: string | null;
  }>
): boolean {
  if (!admins.length) return false;
  const latest = admins[0];
  if (!latest) return false;
  if (medicationAdministrationRowIsInfusionStop(latest.notes, latest.infusionPhase)) {
    return false;
  }
  return medicationAdministrationRowIsInfusionStart(latest.notes, latest.infusionPhase);
}

export function projectD4c7fClosurePreflight(input: {
  encounterId: string;
  currentStatus: string;
  pendingItems: D4c7fPendingItemCounts;
  pendingItemIds?: string[];
  nonOverridableBlockers: Array<{ code: string; message: string }>;
  roleCodes?: readonly string[] | null;
  allowedNextActions?: string[];
}): D4c7fClosurePreflightProjection {
  const pendingTotal = totalD4c7fPendingItems(input.pendingItems);
  const hasHard = input.nonOverridableBlockers.length > 0;
  const overrideRoleOk = canOverrideAmbulatoryPendingClosureItems(input.roleCodes);
  const overrideAllowed = !hasHard && pendingTotal > 0 && overrideRoleOk;
  const canClose = !hasHard && pendingTotal === 0;
  return {
    encounterId: input.encounterId,
    currentStatus: input.currentStatus,
    canClose,
    overrideAllowed,
    pendingItems: { ...input.pendingItems },
    pendingItemIds: [...(input.pendingItemIds ?? [])],
    nonOverridableBlockers: input.nonOverridableBlockers.map((b) => ({
      code: b.code,
      message: b.message,
    })),
    allowedNextActions: input.allowedNextActions ?? (canClose ? ["CLOSE"] : overrideAllowed ? ["CLOSE_WITH_PENDING_ACK"] : []),
    acknowledgementVersion: D4C7F_PENDING_ITEMS_ACK_VERSION,
  };
}

/** Pathname-only icon key (strip query). Clinic Care aliases → enterprise Twemoji peers. */
export function resolveSidebarNavIconPathname(href: string | null | undefined): string {
  const raw = String(href ?? "").trim();
  if (!raw) return "";
  let path = raw;
  try {
    const u = new URL(raw, "https://medora.local");
    path = u.pathname;
  } catch {
    path = raw.split("?")[0] || raw;
  }
  switch (path) {
    case "/app/clinic-care/nursing":
      return "/app/nursing";
    case "/app/clinic-care/provider":
      return "/app/provider";
    case "/app/clinic-care/encounters":
      return "/app/encounters";
    case "/app/clinic-care/pharmacy":
      return "/app/pharmacy";
    case "/app/clinic-care/laboratory":
      return "/app/lab-worklist";
    case "/app/clinic-care/radiology":
      return "/app/rad-worklist";
    default:
      return path;
  }
}

/**
 * Twemoji SVG filename for a sidebar href (pathname-normalized).
 * Falls back only when truly unknown — callers should avoid shipping 2753 in Clinic nav.
 */
export function resolveSidebarTwemojiSvgFile(
  href: string,
  map: Record<string, string>,
  fallback = "2753.svg"
): string {
  const key = resolveSidebarNavIconPathname(href);
  return map[key] ?? map[href] ?? fallback;
}

/** Clinic-aware Pharmacy href rewrite for all enterprise pharmacy paths. */
export function resolveClinicCareAwarePharmacySidebarHref(
  href: string,
  caps: { clinicCareEnabled?: boolean | null; urgentCareEnabled?: boolean | null; pharmacyEnabled?: boolean | null }
): string {
  const path = resolveSidebarNavIconPathname(href) || href.split("?")[0] || href;
  const clinicOn = Boolean(caps.clinicCareEnabled || caps.urgentCareEnabled);
  if (!clinicOn || !caps.pharmacyEnabled) return href;
  if (!(D4C7F_ENTERPRISE_PHARMACY_NAV_PATHS as readonly string[]).includes(path)) {
    return href;
  }
  if (path === D4C7B_ENTERPRISE_PHARMACY_HREF) {
    return buildClinicPharmacyEntryHref({ ambulatory: true });
  }
  const qs = new URLSearchParams();
  qs.set("source", "clinic-care");
  qs.set("ambulatory", "1");
  return `${path}?${qs.toString()}`;
}

export function clinicAdminHasFullPharmacyNavAccess(input: {
  roleCodes: readonly string[] | null | undefined;
  pharmacyEnabled: boolean;
}): boolean {
  if (!input.pharmacyEnabled) return false;
  return canAccessClinicPharmacyNavigation(input.roleCodes);
}

/** Admin operational Pharmacy ≠ pharmacist clinical verification. */
export const D4C7F_ADMIN_PHARMACY_CLINICAL_AUTHORITY = {
  mayVerifyPharmacy: false,
  maySubstituteMedication: false,
  maySignClinicalIntervention: false,
  mayPrescribe: false,
  mayAdministerMar: false,
  mayViewOperationalPharmacy: true,
  mayViewInventoryAlerts: true,
} as const;

export const D4C7F_PHARMACY_ROLE_CLINICAL_AUTHORITY = {
  mayVerifyPharmacy: true,
  mayViewOperationalPharmacy: true,
  mayViewInventoryAlerts: true,
  mayDispense: true,
} as const;

export function assertNoForbiddenClinicD4c7fAuthority(source: string): boolean {
  for (const name of D4C7F_FORBIDDEN_CLINIC_AUTHORITY_NAMES) {
    if (source.includes(name)) return false;
  }
  return true;
}

/** Pending-label i18n keys for workflow busy state. */
export function ambulatoryWorkflowPendingLabelKey(
  action: string
): string {
  switch (action) {
    case "START_INTAKE":
      return "clinicCareD4c7f.pending.startIntake";
    case "READY_FOR_PROVIDER":
      return "clinicCareD4c7f.pending.readyForProvider";
    case "START_CONSULTATION":
      return "clinicCareD4c7f.pending.startConsultation";
    case "READY_FOR_CHECKOUT":
      return "clinicCareD4c7f.pending.readyForCheckout";
    case "COMPLETE_VISIT":
      return "clinicCareD4c7f.pending.closing";
    default:
      return "clinicCareD4c7f.pending.updating";
  }
}
