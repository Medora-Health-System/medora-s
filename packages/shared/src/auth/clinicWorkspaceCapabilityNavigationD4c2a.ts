/**
 * MEDUI.D4C.2A — Unified Clinic Workspace & capability-based navigation.
 *
 * Extends D4C.1 facility capabilities + D4C.2 Clinic Care shell contracts.
 * Does not invent parallel facility taxonomies or clinical engines.
 *
 * Core rule:
 *   visibleNavigation = facilityEnabledModules ∩ roleAuthorizedModules ∩ userAssignments
 * Admin does NOT override absent facility capability.
 */

import type { ProfessionGroup } from "./professionResolver.js";
import { resolveProfessionGroup } from "./professionResolver.js";
import type { NavigationArea, NavigationProfileInput } from "./navigationAuthorization.js";
import {
  resolveFacilityModuleCapabilitiesD4c1,
  resolveFacilityNavigation,
  resolveClinicCareWorkspaceRoleAccess,
  type ClinicCareWorkspaceRoleAccess,
  type FacilityModuleCapabilitiesD4c1,
  type FacilityNavigationResolution,
  type ResolveFacilityNavigationInput,
} from "./facilityClinicCareProfileD4c1.js";
import {
  isClinicCareAmbulatoryOrdersNavVisible,
  isClinicCareAmbulatoryResultsNavVisible,
} from "./clinicCareAmbulatoryOrdersResultsD4c6.js";

/** Typed Clinic workspace destinations (route-backed; nested under `/app/clinic-care`). */
export const CLINIC_WORKSPACE_NAV_IDS = [
  "trackboard",
  "registration",
  "todaysVisits",
  "nursing",
  "provider",
  "orders",
  "results",
  "patients",
  "encounters",
  "followUp",
  "billing",
  "laboratory",
  "radiology",
  "pharmacy",
  "publicHealth",
  "administration",
] as const;

export type ClinicWorkspaceNavId = (typeof CLINIC_WORKSPACE_NAV_IDS)[number];

export type ClinicWorkspaceNavPlacement = "top" | "side" | "both";

export type ClinicWorkspaceNavItem = {
  id: ClinicWorkspaceNavId;
  /** Canonical nested Clinic workspace href. */
  href: string;
  labelKey: string;
  placement: ClinicWorkspaceNavPlacement;
  /** When true, item appears in the D4C.2 top tab strip. */
  topTab: boolean;
  /** Capability + role predicate using Clinic Care workspace access. */
  isVisible: (access: ClinicCareWorkspaceRoleAccess) => boolean;
};

/**
 * Single typed Clinic navigation registry (MEDUI.D4C.2A.1 — one sidebar architecture).
 * Global Medora sidebar + Clinic top tabs only; no in-shell ClinicCareSideNav.
 * Ancillary modules (lab/rad/pharmacy/PH/admin) are capability-gated top tabs.
 */
export const CLINIC_WORKSPACE_NAV_REGISTRY: readonly ClinicWorkspaceNavItem[] = [
  {
    id: "trackboard",
    href: "/app/clinic-care",
    labelKey: "clinicCareD4c2.nav.trackboard",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessClinicCareShell,
  },
  {
    id: "registration",
    href: "/app/clinic-care/registration",
    labelKey: "clinicCareD4c2.nav.registration",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessRegistration,
  },
  {
    id: "todaysVisits",
    href: "/app/clinic-care/todays-visits",
    labelKey: "clinicCareD4c2.nav.todaysVisits",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessTodaysVisitsProjection,
  },
  {
    id: "nursing",
    href: "/app/clinic-care/nursing",
    labelKey: "clinicCareD4c2.nav.nursingMa",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessNursingMa || a.canAccessTechnicianSafeNursingMaProjection,
  },
  {
    id: "provider",
    href: "/app/clinic-care/provider",
    labelKey: "clinicCareD4c2.nav.provider",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessProviderDocumentation && a.canAuthorProviderDocumentation,
  },
  {
    id: "orders",
    href: "/app/clinic-care/orders",
    labelKey: "clinicCareD4c6.nav.orders",
    placement: "top",
    topTab: true,
    isVisible: (a) => isClinicCareAmbulatoryOrdersNavVisible(a),
  },
  {
    id: "results",
    href: "/app/clinic-care/results",
    labelKey: "clinicCareD4c6.nav.results",
    placement: "top",
    topTab: true,
    isVisible: (a) => isClinicCareAmbulatoryResultsNavVisible(a),
  },
  {
    id: "patients",
    href: "/app/clinic-care/patients",
    labelKey: "clinicCareD4c2.nav.patients",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessPatients,
  },
  {
    id: "encounters",
    href: "/app/clinic-care/encounters",
    labelKey: "clinicCareD4c2.nav.encounters",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessEncounters,
  },
  {
    id: "followUp",
    href: "/app/clinic-care/follow-up",
    labelKey: "clinicCareD4c2.nav.followUps",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessFollowUps,
  },
  {
    id: "billing",
    href: "/app/clinic-care/billing",
    labelKey: "clinicCareD4c2.nav.billing",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessBilling,
  },
  {
    id: "laboratory",
    href: "/app/clinic-care/laboratory",
    labelKey: "clinicCareD4c2a.nav.laboratory",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessLaboratory,
  },
  {
    id: "radiology",
    href: "/app/clinic-care/radiology",
    labelKey: "clinicCareD4c2a.nav.radiology",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessRadiology,
  },
  {
    id: "pharmacy",
    href: "/app/clinic-care/pharmacy",
    labelKey: "clinicCareD4c2.nav.pharmacy",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessPharmacy,
  },
  {
    id: "publicHealth",
    href: "/app/clinic-care/public-health",
    labelKey: "clinicCareD4c2a.nav.publicHealth",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessPublicHealth === true,
  },
  {
    id: "administration",
    href: "/app/clinic-care/administration",
    labelKey: "clinicCareD4c2a.nav.administration",
    placement: "top",
    topTab: true,
    isVisible: (a) => a.canAccessAdministration,
  },
] as const;

/** Care-setting path prefixes gated by facility module capabilities (not Admin override). */
export const FACILITY_CARE_SETTING_ROUTE_GATES: readonly {
  prefixes: readonly string[];
  required: keyof FacilityModuleCapabilitiesD4c1 | "hospitalCare";
}[] = [
  {
    prefixes: ["/app/emergency", "/app/trackboard"],
    required: "edEnabled",
  },
  {
    prefixes: ["/app/hospitalisation", "/app/hospitalization"],
    required: "hospitalCare",
  },
  {
    prefixes: ["/app/clinic-care"],
    required: "clinicCareEnabled",
  },
];

export type ResolveCapabilityAwareNavigationInput = ResolveFacilityNavigationInput;

/**
 * Facility-capability-aware navigation areas for web sidebar + API guards.
 * Wraps D4C.1 `resolveFacilityNavigation` (Admin cannot restore absent care settings).
 */
export function resolveCapabilityAwareNavigation(
  input: ResolveCapabilityAwareNavigationInput
): FacilityNavigationResolution {
  return resolveFacilityNavigation(input);
}

export function resolveCapabilityAwareNavigationAreas(
  input: ResolveCapabilityAwareNavigationInput
): NavigationArea[] {
  return resolveFacilityNavigation(input).areas;
}

export function resolveClinicWorkspaceAccess(input: {
  roleCodes: readonly string[];
  facilityType?: string | null;
  facilityServiceLines?: readonly string[] | null;
  careProfileJson?: unknown;
  facilityCountry?: string | null;
}): {
  professionGroup: ProfessionGroup;
  capabilities: FacilityModuleCapabilitiesD4c1;
  access: ClinicCareWorkspaceRoleAccess;
  navigation: FacilityNavigationResolution;
} {
  const professionGroup = resolveProfessionGroup({ roleCodes: input.roleCodes });
  const navigation = resolveFacilityNavigation({
    roleCodes: input.roleCodes,
    facilityType: input.facilityType,
    facilityServiceLines: input.facilityServiceLines,
    careProfileJson: input.careProfileJson,
  });
  const capabilities = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: input.facilityType,
    careProfileJson: input.careProfileJson,
    serviceLines: input.facilityServiceLines,
    facilityCountry: input.facilityCountry,
  });
  const access = resolveClinicCareWorkspaceRoleAccess({
    professionGroup,
    moduleCapabilities: capabilities,
    roleCodes: input.roleCodes,
    facilityCountry: input.facilityCountry,
  });
  return { professionGroup, capabilities, access, navigation };
}

/** Visible Clinic top tabs (role ∩ facility capability). */
export function resolveVisibleClinicTopTabs(
  access: ClinicCareWorkspaceRoleAccess
): ClinicWorkspaceNavItem[] {
  return CLINIC_WORKSPACE_NAV_REGISTRY.filter((item) => item.topTab && item.isVisible(access));
}

/**
 * @deprecated MEDUI.D4C.2A.1 — Clinic in-shell side nav removed.
 * Kept for test/compat; returns [] (ancillary modules are top tabs).
 */
export function resolveVisibleClinicSideNav(
  _access: ClinicCareWorkspaceRoleAccess
): ClinicWorkspaceNavItem[] {
  return [];
}

/**
 * Role-aware default landing inside Clinic workspace.
 * Admin → Trackboard; Front Desk → Registration; Provider → Provider; RN → Nursing; etc.
 */
export function resolveClinicWorkspaceLandingPath(input: {
  professionGroup: ProfessionGroup;
  access: ClinicCareWorkspaceRoleAccess;
}): string {
  const { professionGroup: p, access } = input;
  if (!access.canAccessClinicCareShell) {
    return "/app";
  }
  if (p === "FRONT_DESK" && access.canAccessRegistration) {
    return "/app/clinic-care/registration";
  }
  if (p === "PROVIDER" && access.canAccessProviderDocumentation) {
    return "/app/clinic-care/provider";
  }
  if (p === "RN" && access.canAccessNursingMa) {
    return "/app/clinic-care/nursing";
  }
  if (p === "BILLING" && access.canAccessBilling) {
    return "/app/clinic-care/billing";
  }
  if (p === "PHARMACY" && access.canAccessPharmacy) {
    return "/app/clinic-care/pharmacy";
  }
  if (p === "TECHNICIAN") {
    if (access.canAccessLaboratory) return "/app/clinic-care/laboratory";
    if (access.canAccessRadiology) return "/app/clinic-care/radiology";
    if (access.canAccessNursingMa || access.canAccessTechnicianSafeNursingMaProjection) {
      return "/app/clinic-care/nursing";
    }
  }
  // Admin and default Clinic operational home → Trackboard
  return "/app/clinic-care";
}

/**
 * Facility post-login / `/app` landing: ambulatory Clinic Care when enabled;
 * otherwise shared navigation profile landing. Role landings nested when Clinic.
 */
export function resolveFacilityAwareLandingPath(
  input: ResolveCapabilityAwareNavigationInput & { facilityCountry?: string | null }
): string {
  const { access, navigation, professionGroup } = resolveClinicWorkspaceAccess(input);
  if (navigation.clinicCareVisible && access.canAccessClinicCareShell) {
    return resolveClinicWorkspaceLandingPath({ professionGroup, access });
  }
  return navigation.landingPath;
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function resolveFacilityCapabilityForPath(
  pathname: string,
  capabilities: FacilityModuleCapabilitiesD4c1
): boolean {
  const normalized =
    pathname === "/app/hospitalization" || pathname.startsWith("/app/hospitalization/")
      ? pathname.replace("/app/hospitalization", "/app/hospitalisation")
      : pathname;

  for (const gate of FACILITY_CARE_SETTING_ROUTE_GATES) {
    if (!gate.prefixes.some((p) => pathMatchesPrefix(normalized, p))) continue;
    if (gate.required === "hospitalCare") {
      return capabilities.observationEnabled || capabilities.inpatientEnabled;
    }
    if (gate.required === "clinicCareEnabled") {
      return capabilities.clinicCareEnabled || capabilities.urgentCareEnabled;
    }
    return Boolean(capabilities[gate.required]);
  }
  return true;
}

/**
 * Direct-URL / route-guard enforcement for care-setting paths.
 * Admin does not bypass missing facility capability.
 */
export function isFacilityCareSettingPathAllowed(
  pathname: string,
  input: NavigationProfileInput & { careProfileJson?: unknown; facilityCountry?: string | null }
): boolean {
  if (!pathname.startsWith("/app")) return true;
  const capabilities = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: input.facilityType,
    careProfileJson: input.careProfileJson,
    serviceLines: input.facilityServiceLines,
    facilityCountry: input.facilityCountry,
  });
  return resolveFacilityCapabilityForPath(pathname, capabilities);
}

/** Active Clinic workspace nav id from pathname (route-backed). */
export function resolveClinicWorkspaceActiveNavId(
  pathname: string
): ClinicWorkspaceNavId | null {
  if (!pathname.startsWith("/app/clinic-care")) return null;
  if (pathname === "/app/clinic-care" || pathname === "/app/clinic-care/") {
    return "trackboard";
  }
  const rest = pathname.slice("/app/clinic-care".length).replace(/^\//, "");
  const segment = rest.split("/")[0] ?? "";
  const map: Record<string, ClinicWorkspaceNavId> = {
    registration: "registration",
    "todays-visits": "todaysVisits",
    nursing: "nursing",
    provider: "provider",
    orders: "orders",
    results: "results",
    patients: "patients",
    encounters: "encounters",
    "follow-up": "followUp",
    billing: "billing",
    laboratory: "laboratory",
    radiology: "radiology",
    pharmacy: "pharmacy",
    "public-health": "publicHealth",
    administration: "administration",
  };
  return map[segment] ?? "trackboard";
}

/** Whether a Clinic nested path is allowed for the role ∩ facility access matrix. */
export function isClinicWorkspacePathAllowed(
  pathname: string,
  access: ClinicCareWorkspaceRoleAccess
): boolean {
  if (!pathname.startsWith("/app/clinic-care")) return true;
  const id = resolveClinicWorkspaceActiveNavId(pathname);
  if (!id) return access.canAccessClinicCareShell;
  const item = CLINIC_WORKSPACE_NAV_REGISTRY.find((n) => n.id === id);
  if (!item) return access.canAccessClinicCareShell;
  return item.isVisible(access);
}

/**
 * Hybrid facility mapping (documented; no inference of Hospital from Lab/Pharmacy/Billing):
 * - EMERGENCY service line → edEnabled / EMERGENCY nav
 * - OBSERVATION / inpatient lines → hospitalCare
 * - CLINIC / URGENT_CARE lines → Clinic Care
 * Lab / Radiology / Pharmacy / Billing / Public Health are optional modules only.
 */
export function documentHybridFacilityCapabilityMapping(): {
  neverInferHospitalFrom: readonly string[];
  careSettingSources: readonly string[];
} {
  return {
    neverInferHospitalFrom: ["LABORATORY", "RADIOLOGY", "PHARMACY", "BILLING", "PUBLIC_HEALTH"],
    careSettingSources: ["EMERGENCY", "OBSERVATION", "ICU", "MEDSURG", "CLINIC", "URGENT_CARE"],
  };
}
