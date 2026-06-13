import type { MedoraFacilityType } from "./facilityTypeRegistry.js";
import { normalizeFacilityType } from "./facilityTypeRegistry.js";
import type { ProfessionGroup } from "./professionResolver.js";
import { resolveProfessionGroup } from "./professionResolver.js";

const FREESTANDING_OPERATIONAL_FACILITY_TYPES = new Set<MedoraFacilityType>([
  "FREESTANDING_ER",
  "URGENT_CARE",
]);

/** MEDUI.ED.PROCEDURE.TECH.1A / MEDUI.FSER.ROLE.1 — FSER RN/Provider operational sidebar (routes unchanged). */
export const FREESTANDING_ER_RN_PROVIDER_SIDEBAR_HREFS = [
  "/app/registration",
  "/app/emergency/trackboard",
  "/app/emergency/triage",
  "/app/lab-worklist",
  "/app/hospitalisation",
] as const;

export type FreestandingErRnProviderSidebarHref =
  (typeof FREESTANDING_ER_RN_PROVIDER_SIDEBAR_HREFS)[number];

export function isFreestandingErOperationalFacilityType(
  facilityType: MedoraFacilityType | string | null | undefined
): boolean {
  return FREESTANDING_OPERATIONAL_FACILITY_TYPES.has(normalizeFacilityType(facilityType));
}

function normalizeRoleCodes(roleCodes: readonly string[] | undefined): string[] {
  return (roleCodes ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean);
}

/**
 * When true, RN/Provider sidebar at freestanding ER / urgent care should show the
 * operational FSER menu only — not the hospital-style nursing/provider/trackboard clutter.
 */
export function shouldApplyFreestandingErRnProviderSidebarAllowlist(input: {
  roleCodes: readonly string[];
  facilityType?: MedoraFacilityType | string | null;
}): boolean {
  const profession = resolveProfessionGroup({ roleCodes: input.roleCodes });
  if (profession !== "RN" && profession !== "PROVIDER") {
    return false;
  }
  return isFreestandingErOperationalFacilityType(input.facilityType);
}

/** Resolve allowed sidebar hrefs for FSER RN/Provider; radiology worklist only when user has RADIOLOGY role. */
export function resolveFreestandingErRnProviderSidebarHrefs(
  roleCodes: readonly string[]
): Set<string> {
  const allowed = new Set<string>(FREESTANDING_ER_RN_PROVIDER_SIDEBAR_HREFS);
  const roles = normalizeRoleCodes(roleCodes);
  if (roles.includes("RADIOLOGY")) {
    allowed.add("/app/rad-worklist");
  }
  return allowed;
}

export function filterHrefListForFreestandingErRnProviderSidebar<T extends { href: string }>(
  items: readonly T[],
  input: {
    roleCodes: readonly string[];
    facilityType?: MedoraFacilityType | string | null;
    professionGroup?: ProfessionGroup;
  }
): T[] {
  const profession =
    input.professionGroup ?? resolveProfessionGroup({ roleCodes: input.roleCodes });
  if (!shouldApplyFreestandingErRnProviderSidebarAllowlist({ ...input, roleCodes: input.roleCodes })) {
    return [...items];
  }
  if (profession !== "RN" && profession !== "PROVIDER") {
    return [...items];
  }
  const allowed = resolveFreestandingErRnProviderSidebarHrefs(input.roleCodes);
  return items.filter((item) => allowed.has(item.href));
}

/** Map quick CARE UI keys to enterprise catalog ids (MEDPROC.2). */
export const CARE_QUICK_KEY_ENTERPRISE_PROCEDURE_IDS = {
  ekg_workflow: "ekg_ecg",
  laceration_kit: "laceration_repair",
} as const;

export type CareQuickKey = keyof typeof CARE_QUICK_KEY_ENTERPRISE_PROCEDURE_IDS;

export function resolveEnterpriseProcedureIdFromCareQuickKey(
  quickKey: string | null | undefined
): string | null {
  const key = String(quickKey ?? "").trim() as CareQuickKey;
  if (!key) return null;
  return CARE_QUICK_KEY_ENTERPRISE_PROCEDURE_IDS[key] ?? null;
}
