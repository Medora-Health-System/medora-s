/**
 * D3E.6C — Dedicated inpatient unit / service-line board routes.
 */

export const INPATIENT_UNIT_TREE_PATH = "/app/hospitalisation/inpatient";
export const INPATIENT_ALL_UNITS_BOARD_PATH = "/app/hospitalisation/inpatient/all";

export function inpatientServiceLineBoardPath(slug: string): string {
  return `/app/hospitalisation/inpatient/${encodeURIComponent(slug)}`;
}

export function inpatientUnitBoardPath(unitIdOrSlug: string): string {
  return `/app/hospitalisation/inpatient/units/${encodeURIComponent(unitIdOrSlug)}`;
}

export function inpatientUnitPatientWorkspacePath(
  unitIdOrSlug: string,
  encounterId: string
): string {
  return `/app/hospitalisation/inpatient/units/${encodeURIComponent(unitIdOrSlug)}/patients/${encodeURIComponent(encounterId)}`;
}

export const INPATIENT_SERVICE_LINE_SLUGS = [
  "medical-services",
  "critical-care",
  "surgical-services",
  "women-newborn",
  "pediatrics",
  "neuro-specialty",
  "oncology-hematology",
  "behavioral-health",
  "rehabilitation",
  "other-specialty",
] as const;
