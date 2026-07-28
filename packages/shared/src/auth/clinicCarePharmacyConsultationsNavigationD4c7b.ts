/**
 * MEDUI.D4C.7B — Clinic Pharmacy navigation, role-gated inventory alerts,
 * and Consultations → ambulatory worklist → Active Clinic Workspace routing.
 *
 * Reuses enterprise Pharmacy (`/app/pharmacy`) and Clinic Care encounters
 * projection. No ClinicPharmacy / ClinicConsultation engines.
 *
 * Canonical pharmacy role code = `PHARMACY` (Prisma RoleCode). Soft alias
 * `PHARMACIST` accepted for display/workspace helpers only — not a seeded role.
 */

import type { ProfessionGroup } from "./professionResolver.js";
import { resolveProfessionGroup } from "./professionResolver.js";
import type { FacilityModuleCapabilitiesD4c1 } from "./facilityClinicCareProfileD4c1.js";
import {
  clinicCareAmbulatoryActiveWorkspacePath,
  type ClinicCareAmbulatoryWorkspaceSection,
} from "./clinicCareAmbulatoryEncounterWorkspaceD4c5b.js";

export const CLINIC_CARE_PHARMACY_CONSULTATIONS_NAVIGATION_CERTIFICATION_ID =
  "MEDUI.D4C.7B" as const;

/** Forbidden duplicate Clinic* authorities for this certification. */
export const D4C7B_FORBIDDEN_CLINIC_AUTHORITY_NAMES = [
  "ClinicPharmacy",
  "ClinicPharmacyQueue",
  "ClinicInventory",
  "ClinicDispense",
  "ClinicPharmacyAlert",
  "ClinicMedicationVerification",
  "ClinicConsultation",
  "ClinicEncounter",
  "ClinicEncounterList",
] as const;

export type D4c7bForbiddenClinicAuthorityName =
  (typeof D4C7B_FORBIDDEN_CLINIC_AUTHORITY_NAMES)[number];

/** Canonical Prisma pharmacy ops role. */
export const D4C7B_CANONICAL_PHARMACY_ROLE_CODE = "PHARMACY" as const;

/** Soft display/workspace aliases — not seeded RoleCode values. */
export const D4C7B_PHARMACY_ROLE_ALIASES = ["PHARMACIST"] as const;

export const D4C7B_CLINIC_PHARMACY_SOURCE = "clinic-care" as const;

export const D4C7B_CLINIC_CONSULTATIONS_LIST_HREF =
  "/app/clinic-care/encounters" as const;

export const D4C7B_GENERIC_ENCOUNTERS_LIST_HREF = "/app/encounters" as const;

export const D4C7B_ENTERPRISE_PHARMACY_HREF = "/app/pharmacy" as const;

/** Admin inventory-alert dashboard widget — deferred (no private Clinic Admin board). */
export const D4C7B_ADMIN_INVENTORY_ALERT_WIDGET_DEFERRAL = "D4C.8" as const;

export function isCanonicalPharmacyRoleCode(code: string | null | undefined): boolean {
  const c = String(code ?? "")
    .trim()
    .toUpperCase();
  if (c === D4C7B_CANONICAL_PHARMACY_ROLE_CODE) return true;
  return (D4C7B_PHARMACY_ROLE_ALIASES as readonly string[]).includes(c);
}

/** Nav / route visibility for Pharmacy menu (ADMIN or PHARMACY). */
export function canAccessClinicPharmacyNavigation(
  roleCodes: readonly string[] | null | undefined
): boolean {
  const roles = (roleCodes ?? []).map((r) => String(r).trim().toUpperCase());
  if (roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN")) return true;
  return roles.some((r) => isCanonicalPharmacyRoleCode(r));
}

/**
 * Inventory / expiration operational alerts (low-stock, expiring 90d).
 * ADMIN + PHARMACY only — not Provider/RN/MA/Front Desk/Billing/Lab/Rad.
 */
export function canAccessPharmacyInventoryAlerts(
  roleCodes: readonly string[] | null | undefined
): boolean {
  return canAccessClinicPharmacyNavigation(roleCodes);
}

/** Shared Clinic Clinical Board must never mount inventory-expiration alerts. */
export function shouldExposeInventoryAlertsOnClinicClinicalBoard(): boolean {
  return false;
}

/**
 * Thin Clinic-aware Pharmacy entry — enterprise board + ambulatory filter.
 * Facility membership / pharmacyEnabled still enforced by nav + route guards.
 */
export function buildClinicPharmacyEntryHref(input?: {
  ambulatory?: boolean;
  source?: string | null;
}): string {
  const qs = new URLSearchParams();
  qs.set("source", input?.source?.trim() || D4C7B_CLINIC_PHARMACY_SOURCE);
  if (input?.ambulatory !== false) {
    qs.set("ambulatory", "1");
  }
  return `${D4C7B_ENTERPRISE_PHARMACY_HREF}?${qs.toString()}`;
}

export function isClinicPharmacyEntryHref(href: string | null | undefined): boolean {
  const raw = String(href ?? "").trim();
  if (!raw.startsWith(D4C7B_ENTERPRISE_PHARMACY_HREF)) return false;
  try {
    const url = new URL(raw, "https://medora.local");
    return (
      url.pathname === D4C7B_ENTERPRISE_PHARMACY_HREF &&
      url.searchParams.get("source") === D4C7B_CLINIC_PHARMACY_SOURCE
    );
  } catch {
    return raw.includes("source=clinic-care");
  }
}

/**
 * Typed Consultations list resolver (facility capability + care setting).
 * Clinic Care primary (no ED) → ambulatory encounters projection.
 * ED/Hospital keep generic `/app/encounters` for the legacy open list page.
 * Global Clinic sidebar still rewrites Consultations via
 * `resolveClinicCareAwareSidebarHref` when Clinic Care is enabled.
 */
export function resolveConsultationsListHref(input: {
  clinicCareEnabled?: boolean | null;
  urgentCareEnabled?: boolean | null;
  edEnabled?: boolean | null;
}): string {
  const clinicOn = Boolean(input.clinicCareEnabled || input.urgentCareEnabled);
  if (clinicOn && !input.edEnabled) {
    return D4C7B_CLINIC_CONSULTATIONS_LIST_HREF;
  }
  return D4C7B_GENERIC_ENCOUNTERS_LIST_HREF;
}

export function resolveConsultationsListHrefFromCapabilities(
  caps: Pick<
    FacilityModuleCapabilitiesD4c1,
    "clinicCareEnabled" | "urgentCareEnabled" | "edEnabled"
  >
): string {
  return resolveConsultationsListHref(caps);
}

/**
 * Care-setting-aware rewrite for global sidebar Soins et dossiers links when
 * Clinic Care is the active ambulatory surface.
 */
export function resolveClinicCareAwareSidebarHref(
  href: string,
  caps: Pick<
    FacilityModuleCapabilitiesD4c1,
    "clinicCareEnabled" | "urgentCareEnabled" | "edEnabled" | "pharmacyEnabled"
  >
): string {
  const path = href.split("?")[0] || href;
  const clinicOn = Boolean(caps.clinicCareEnabled || caps.urgentCareEnabled);

  if (path === "/app/encounters" && clinicOn) {
    // Clinic left-nav Consultations → ambulatory worklist even on mixed facilities.
    return D4C7B_CLINIC_CONSULTATIONS_LIST_HREF;
  }
  if (path === "/app/nursing" && clinicOn && !caps.edEnabled) {
    return "/app/clinic-care/nursing";
  }
  if (path === "/app/provider" && clinicOn && !caps.edEnabled) {
    return "/app/clinic-care/provider";
  }
  if (path === "/app/pharmacy" && clinicOn && caps.pharmacyEnabled) {
    return buildClinicPharmacyEntryHref({ ambulatory: true });
  }
  return href;
}

/** Role-aware default Active Clinic Workspace section (Consultations open). */
export function resolveAmbulatoryWorkspaceRoleDefaultSection(input: {
  roleCodes?: readonly string[] | null;
  professionGroup?: ProfessionGroup | null;
}): ClinicCareAmbulatoryWorkspaceSection {
  const group =
    input.professionGroup ??
    resolveProfessionGroup({ roleCodes: input.roleCodes ?? [] });

  switch (group) {
    case "PROVIDER":
      return "medical-evaluation";
    case "RN":
    case "TECHNICIAN":
      return "intake";
    case "PHARMACY":
      return "medications";
    case "FRONT_DESK":
      return "follow-up";
    case "ADMIN":
      return "summary";
    case "BILLING":
      return "summary";
    default:
      return "summary";
  }
}

export function clinicCareAmbulatoryOpenWorkspacePathForRole(
  encounterId: string,
  input: {
    roleCodes?: readonly string[] | null;
    professionGroup?: ProfessionGroup | null;
    from?: string | null;
  }
): string {
  const section = resolveAmbulatoryWorkspaceRoleDefaultSection(input);
  const base = clinicCareAmbulatoryActiveWorkspacePath(encounterId, section);
  const from = input.from?.trim();
  if (!from) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}from=${encodeURIComponent(from)}`;
}

/** Sidebar pathname match ignoring query (pharmacy clinic entry). */
export function sidebarHrefPathname(href: string): string {
  return String(href).split("?")[0] || href;
}

export function isPharmacySidebarHref(href: string): boolean {
  const path = sidebarHrefPathname(href);
  return (
    path === "/app/pharmacy" ||
    path === "/app/pharmacy-worklist" ||
    path.startsWith("/app/pharmacy/")
  );
}
