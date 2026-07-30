/**
 * MEDUI.D5A.2 — Enterprise Dental service line, capabilities, and navigation.
 *
 * Dental is a configurable enterprise service line (not a product fork).
 * Reuses Patient, Encounter, Appointment, Orders, Results, Billing, Follow-up,
 * EnterpriseDocument, AuditLog. No DentalPatient / DentalEncounter / odontogram.
 *
 * Dashboard and Active Dental Workspace are routing shells only in this milestone.
 */

import type { ProfessionGroup } from "./professionResolver.js";
import { resolveProfessionGroup } from "./professionResolver.js";
import type { FacilityModuleCapabilitiesD4c1 } from "./facilityClinicCareProfileD4c1.js";
import {
  D5A1_FORBIDDEN_AUTHORITIES,
  D5A1_PROPOSED_DENTAL_SPECIALTY_CAPABILITIES,
} from "./enterpriseDentalOrthodonticsArchitectureD5a1.js";

export const ENTERPRISE_DENTAL_SERVICE_LINE_NAVIGATION_CERTIFICATION_ID =
  "MEDUI.D5A.2" as const;

/** Canonical enterprise service-line token registered in MedoraServiceLine. */
export const D5A2_DENTAL_SERVICE_LINE = "DENTAL" as const;

/** Navigation area parallel to CLINIC_CARE / EMERGENCY / HOSPITAL. */
export const D5A2_DENTAL_NAVIGATION_AREA = "DENTAL_CARE" as const;

/** App-router root for Dental Care (shell only). */
export const D5A2_DENTAL_APP_ROOT = "/app/dental" as const;

/**
 * Capability codes — capability-first; not RoleCode enum additions.
 * Persistence of per-user capability grants may come later; D5A.2 derives
 * workspace access from profession ∩ facility dentalCareEnabled ∩ specialty config.
 */
export const D5A2_DENTAL_CAPABILITIES = [
  "DENTAL_VIEW",
  "DENTAL_PROVIDER",
  "DENTAL_ADMIN",
  "ORTHODONTICS_VIEW",
  "ORTHODONTICS_EDIT",
  "ODONTOGRAM_VIEW",
  "ODONTOGRAM_EDIT",
  "DENTAL_DOCUMENT",
  "DENTAL_TREATMENT_PLAN",
  "DENTAL_PROCEDURE_PERFORM",
  "PERIODONTAL_CHART_EDIT",
  "ORTHODONTIC_CASE_MANAGE",
  "ORTHODONTIC_PLAN_SIGN",
  "DENTAL_IMAGE_UPLOAD",
  "DENTAL_CONSENT_MANAGE",
  "DENTAL_BILLING_VIEW",
] as const;

export type D5a2DentalCapability = (typeof D5A2_DENTAL_CAPABILITIES)[number];

/**
 * Dental specialty configuration tokens (facility care-profile JSON only).
 * No clinical engines in D5A.2.
 */
export const D5A2_DENTAL_SPECIALTIES = [
  "GENERAL_DENTISTRY",
  "ORTHODONTICS",
  "PEDIATRIC_DENTISTRY",
  "ENDODONTICS",
  "PERIODONTICS",
  "PROSTHODONTICS",
  "ORAL_SURGERY",
  "ORAL_MEDICINE",
] as const;

export type D5a2DentalSpecialty = (typeof D5A2_DENTAL_SPECIALTIES)[number];

/** Dashboard placeholder cards — no live clinical queries in D5A.2. */
export const D5A2_DENTAL_DASHBOARD_SECTIONS = [
  "todaysAppointments",
  "todaysPatients",
  "clinicalWorklist",
  "followUp",
  "imaging",
  "orthodonticCases",
  "treatmentPlans",
  "billing",
  "administration",
] as const;

export type D5a2DentalDashboardSection = (typeof D5A2_DENTAL_DASHBOARD_SECTIONS)[number];

/** Active Dental Workspace tab ids — placeholders only. */
export const D5A2_DENTAL_WORKSPACE_TABS = [
  "overview",
  "history",
  "odontogram",
  "periodontal",
  "assessment",
  "treatmentPlan",
  "procedures",
  "imaging",
  "prescriptions",
  "clinicalNotes",
  "consents",
  "followUp",
  "summary",
] as const;

export type D5a2DentalWorkspaceTab = (typeof D5A2_DENTAL_WORKSPACE_TABS)[number];

/** Top-level Dental Care routes (shell / routing only). */
export const D5A2_DENTAL_NAV_REGISTRY = [
  {
    id: "dashboard",
    href: "/app/dental",
    labelKey: "dentalCareD5a2.nav.dashboard",
    requiredCapability: "DENTAL_VIEW" as const,
  },
  {
    id: "provider",
    href: "/app/dental/provider",
    labelKey: "dentalCareD5a2.nav.provider",
    requiredCapability: "DENTAL_PROVIDER" as const,
  },
  {
    id: "appointments",
    href: "/app/dental/appointments",
    labelKey: "dentalCareD5a2.nav.appointments",
    requiredCapability: "DENTAL_VIEW" as const,
  },
  {
    id: "follow-up",
    href: "/app/dental/follow-up",
    labelKey: "dentalCareD5a2.nav.followUp",
    requiredCapability: "DENTAL_VIEW" as const,
  },
  {
    id: "imaging",
    href: "/app/dental/imaging",
    labelKey: "dentalCareD5a2.nav.imaging",
    requiredCapability: "DENTAL_VIEW" as const,
  },
  {
    id: "admin",
    href: "/app/dental/admin",
    labelKey: "dentalCareD5a2.nav.admin",
    requiredCapability: "DENTAL_ADMIN" as const,
  },
  {
    id: "workspace",
    href: "/app/dental/workspace",
    labelKey: "dentalCareD5a2.nav.workspace",
    requiredCapability: "DENTAL_VIEW" as const,
  },
] as const;

export type D5a2DentalNavId = (typeof D5A2_DENTAL_NAV_REGISTRY)[number]["id"];

/** Care-setting route gate for facility capability enforcement. */
export const D5A2_DENTAL_ROUTE_GATE = {
  prefixes: ["/app/dental"] as const,
  required: "dentalCareEnabled" as const,
};

export type DentalWorkspaceAccess = {
  canAccessDentalShell: boolean;
  canAccessDentalProvider: boolean;
  canAccessDentalAdmin: boolean;
  canViewOdontogram: boolean;
  canEditOdontogram: boolean;
  canViewOrthodontics: boolean;
  canEditOrthodontics: boolean;
  capabilities: readonly D5a2DentalCapability[];
  specialties: readonly D5a2DentalSpecialty[];
};

export function isD5a2DentalSpecialty(value: string | null | undefined): value is D5a2DentalSpecialty {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  return (D5A2_DENTAL_SPECIALTIES as readonly string[]).includes(code);
}

export function parseDentalSpecialtiesConfig(raw: unknown): D5a2DentalSpecialty[] {
  if (!Array.isArray(raw)) return [];
  const out: D5a2DentalSpecialty[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const code = String(item ?? "")
      .trim()
      .toUpperCase();
    if (!isD5a2DentalSpecialty(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

/**
 * Read dental specialties from facilityCareProfileJson (additive; schemaVersion 1).
 */
export function resolveDentalSpecialtiesFromCareProfile(
  careProfileJson: unknown
): D5a2DentalSpecialty[] {
  if (!careProfileJson || typeof careProfileJson !== "object" || Array.isArray(careProfileJson)) {
    return [];
  }
  const o = careProfileJson as Record<string, unknown>;
  return parseDentalSpecialtiesConfig(o.dentalSpecialties);
}

export function facilityHasDentalServiceLine(
  serviceLines: readonly string[] | null | undefined
): boolean {
  return (serviceLines ?? []).some(
    (line) =>
      String(line ?? "")
        .trim()
        .toUpperCase() === D5A2_DENTAL_SERVICE_LINE
  );
}

/**
 * Derive capability set from profession ∩ dental enabled ∩ specialty config.
 * No hardcoded single-role gate: PROVIDER / RN / ADMIN map to capability bundles.
 */
export function resolveDentalCapabilityCodes(input: {
  roleCodes: readonly string[] | null | undefined;
  dentalCareEnabled: boolean;
  specialties?: readonly D5a2DentalSpecialty[] | null;
}): D5a2DentalCapability[] {
  if (!input.dentalCareEnabled) return [];

  const profession = resolveProfessionGroup({ roleCodes: input.roleCodes ?? [] });
  const specialties = input.specialties ?? [];
  const hasOrtho = specialties.includes("ORTHODONTICS");
  const caps = new Set<D5a2DentalCapability>();

  const grantViewBundle = () => {
    caps.add("DENTAL_VIEW");
    caps.add("ODONTOGRAM_VIEW");
    if (hasOrtho) caps.add("ORTHODONTICS_VIEW");
  };

  if (profession === "ADMIN") {
    grantViewBundle();
    caps.add("DENTAL_ADMIN");
    caps.add("DENTAL_BILLING_VIEW");
  }

  if (profession === "PROVIDER") {
    grantViewBundle();
    caps.add("DENTAL_PROVIDER");
    caps.add("DENTAL_DOCUMENT");
    caps.add("DENTAL_TREATMENT_PLAN");
    caps.add("DENTAL_PROCEDURE_PERFORM");
    caps.add("ODONTOGRAM_EDIT");
    caps.add("DENTAL_IMAGE_UPLOAD");
    caps.add("DENTAL_CONSENT_MANAGE");
    if (hasOrtho) {
      caps.add("ORTHODONTICS_EDIT");
      caps.add("ORTHODONTIC_CASE_MANAGE");
      caps.add("ORTHODONTIC_PLAN_SIGN");
    }
    if (specialties.includes("PERIODONTICS")) {
      caps.add("PERIODONTAL_CHART_EDIT");
    }
  }

  if (profession === "RN" || profession === "FRONT_DESK") {
    grantViewBundle();
  }

  if (profession === "BILLING") {
    caps.add("DENTAL_VIEW");
    caps.add("DENTAL_BILLING_VIEW");
  }

  return D5A2_DENTAL_CAPABILITIES.filter((c) => caps.has(c));
}

export function hasDentalCapability(
  capabilities: readonly D5a2DentalCapability[],
  required: D5a2DentalCapability
): boolean {
  return capabilities.includes(required);
}

export function resolveDentalWorkspaceAccess(input: {
  roleCodes: readonly string[] | null | undefined;
  dentalCareEnabled: boolean;
  specialties?: readonly D5a2DentalSpecialty[] | null;
}): DentalWorkspaceAccess {
  const specialties = input.specialties ?? [];
  const capabilities = resolveDentalCapabilityCodes({
    roleCodes: input.roleCodes,
    dentalCareEnabled: input.dentalCareEnabled,
    specialties,
  });
  return {
    canAccessDentalShell: hasDentalCapability(capabilities, "DENTAL_VIEW"),
    canAccessDentalProvider: hasDentalCapability(capabilities, "DENTAL_PROVIDER"),
    canAccessDentalAdmin: hasDentalCapability(capabilities, "DENTAL_ADMIN"),
    canViewOdontogram: hasDentalCapability(capabilities, "ODONTOGRAM_VIEW"),
    canEditOdontogram: hasDentalCapability(capabilities, "ODONTOGRAM_EDIT"),
    canViewOrthodontics: hasDentalCapability(capabilities, "ORTHODONTICS_VIEW"),
    canEditOrthodontics: hasDentalCapability(capabilities, "ORTHODONTICS_EDIT"),
    capabilities,
    specialties,
  };
}

export function resolveVisibleDentalNavItems(access: DentalWorkspaceAccess) {
  if (!access.canAccessDentalShell) return [];
  return D5A2_DENTAL_NAV_REGISTRY.filter((item) =>
    hasDentalCapability(access.capabilities, item.requiredCapability)
  );
}

export function resolveDentalWorkspaceActiveNavId(pathname: string): D5a2DentalNavId | null {
  if (!pathname.startsWith(D5A2_DENTAL_APP_ROOT)) return null;
  if (pathname === D5A2_DENTAL_APP_ROOT || pathname === `${D5A2_DENTAL_APP_ROOT}/`) {
    return "dashboard";
  }
  for (const item of D5A2_DENTAL_NAV_REGISTRY) {
    if (item.id === "dashboard") continue;
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.id;
    }
  }
  return "dashboard";
}

export function resolveDentalLandingPath(access: DentalWorkspaceAccess): string {
  if (!access.canAccessDentalShell) return "/app";
  if (access.canAccessDentalProvider) return "/app/dental/provider";
  if (access.canAccessDentalAdmin) return "/app/dental/admin";
  return D5A2_DENTAL_APP_ROOT;
}

/** Architecture guard: D5A.2 must not introduce forbidden dental forks. */
export function assertNoForbiddenDentalAuthoritiesInD5a2(
  names: readonly string[]
): { ok: true } | { ok: false; forbidden: string[] } {
  const hit = names.filter((n) =>
    (D5A1_FORBIDDEN_AUTHORITIES as readonly string[]).includes(n)
  );
  if (hit.length > 0) return { ok: false, forbidden: hit };
  return { ok: true };
}

/** Specialty list includes all D5A.1 proposed specialty capabilities plus GENERAL_DENTISTRY / ORTHODONTICS. */
export function d5a2SpecialtyCoversD5a1Proposals(): boolean {
  return D5A1_PROPOSED_DENTAL_SPECIALTY_CAPABILITIES.every((s) =>
    (D5A2_DENTAL_SPECIALTIES as readonly string[]).includes(s)
  );
}

export function isDentalCarePath(pathname: string): boolean {
  return pathname === D5A2_DENTAL_APP_ROOT || pathname.startsWith(`${D5A2_DENTAL_APP_ROOT}/`);
}

export function isDentalCarePathAllowed(
  pathname: string,
  capabilities: Pick<FacilityModuleCapabilitiesD4c1, "dentalCareEnabled">
): boolean {
  if (!isDentalCarePath(pathname)) return true;
  return capabilities.dentalCareEnabled === true;
}

/** Placeholder dashboard projection — no Dental repository. */
export function projectDentalDashboardShellPlaceholders(): Record<
  D5a2DentalDashboardSection,
  { status: "placeholder"; count: null }
> {
  const out = {} as Record<D5a2DentalDashboardSection, { status: "placeholder"; count: null }>;
  for (const section of D5A2_DENTAL_DASHBOARD_SECTIONS) {
    out[section] = { status: "placeholder", count: null };
  }
  return out;
}

export type { ProfessionGroup };
