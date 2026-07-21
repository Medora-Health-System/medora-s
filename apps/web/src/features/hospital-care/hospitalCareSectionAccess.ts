/**
 * D3CA.CLOSURE — section visibility by role (module name stays Hospital Care).
 * UI filtering is complementary; API remains the authority for data.
 */

import type { HospitalCareSectionId } from "./hospitalCarePaths";
import { HOSPITAL_CARE_SECTIONS } from "./hospitalCarePaths";

const CLINICAL_OPS = ["ADMIN", "PROVIDER", "RN"] as const;
const CLINICAL_WITH_TECH = ["ADMIN", "PROVIDER", "RN", "LAB", "RADIOLOGY"] as const;
const BEDS_OPS = ["ADMIN", "RN", "LAB", "RADIOLOGY"] as const;

export const HOSPITAL_CARE_SECTION_ROLES: Record<
  HospitalCareSectionId,
  readonly string[]
> = {
  home: CLINICAL_WITH_TECH,
  placementQueue: CLINICAL_OPS,
  admissions: CLINICAL_OPS,
  observation: CLINICAL_WITH_TECH,
  inpatient: CLINICAL_WITH_TECH,
  beds: BEDS_OPS,
  transfers: CLINICAL_OPS,
};

export function normalizeRoleCodes(roleCodes: readonly string[]): Set<string> {
  return new Set(roleCodes.map((code) => code.trim().toUpperCase()).filter(Boolean));
}

export function canAccessHospitalCareSection(
  sectionId: HospitalCareSectionId,
  roleCodes: readonly string[]
): boolean {
  const allowed = HOSPITAL_CARE_SECTION_ROLES[sectionId];
  const roles = normalizeRoleCodes(roleCodes);
  return allowed.some((role) => roles.has(role));
}

export function filterHospitalCareSectionsForRoles(roleCodes: readonly string[]) {
  return HOSPITAL_CARE_SECTIONS.filter((section) =>
    canAccessHospitalCareSection(section.id, roleCodes)
  );
}

export function filterHospitalCareHomeTilesForRoles<T extends { sectionId: HospitalCareSectionId }>(
  tiles: readonly T[],
  roleCodes: readonly string[]
): T[] {
  return tiles.filter((tile) => canAccessHospitalCareSection(tile.sectionId, roleCodes));
}
