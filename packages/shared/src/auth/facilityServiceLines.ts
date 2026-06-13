import {
  CLINICAL_DEPARTMENT_REGISTRY,
  isClinicalDepartmentCode,
  type ClinicalDepartmentCode,
} from "./clinicalDepartmentRegistry.js";
import {
  getDefaultServiceLinesForFacilityType,
  normalizeFacilityType,
  normalizeServiceLineToken,
  type MedoraFacilityType,
  type MedoraServiceLine,
} from "./facilityTypeRegistry.js";
import type { ProfessionGroup } from "./professionResolver.js";
import type { DepartmentCode } from "./departmentResolver.js";

export type ResolveFacilityServiceLinesInput = {
  facilityType?: MedoraFacilityType | string | null;
  configuredServiceLines?: readonly string[] | null;
};

/** Parse `Facility.serviceLinesJson` from Prisma/API. */
export function parseStoredFacilityServiceLines(json: unknown): MedoraServiceLine[] | null {
  if (json == null) return null;
  if (!Array.isArray(json)) return null;
  const lines: MedoraServiceLine[] = [];
  for (const raw of json) {
    const normalized = normalizeServiceLineToken(String(raw));
    if (normalized && !lines.includes(normalized)) {
      lines.push(normalized);
    }
  }
  return lines.length > 0 ? lines : null;
}

/**
 * Resolve active facility service lines.
 * Configured lines win; otherwise defaults from facility type (CLINIC fallback).
 */
export function resolveFacilityServiceLines(
  input: ResolveFacilityServiceLinesInput
): MedoraServiceLine[] {
  const facilityType = normalizeFacilityType(input.facilityType);
  const configured = (input.configuredServiceLines ?? [])
    .map((line) => normalizeServiceLineToken(line))
    .filter((line): line is MedoraServiceLine => line != null);

  const uniqueConfigured = dedupePreserveOrder(configured);
  if (uniqueConfigured.length > 0) {
    return orderServiceLines(uniqueConfigured);
  }

  return orderServiceLines(getDefaultServiceLinesForFacilityType(facilityType));
}

function dedupePreserveOrder(lines: MedoraServiceLine[]): MedoraServiceLine[] {
  const seen = new Set<MedoraServiceLine>();
  const out: MedoraServiceLine[] = [];
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

/** Preserve registry order for stable UI and seeding. */
function orderServiceLines(lines: MedoraServiceLine[]): MedoraServiceLine[] {
  const orderIndex = new Map<MedoraServiceLine, number>();
  let index = 0;
  for (const entry of CLINICAL_DEPARTMENT_REGISTRY) {
    orderIndex.set(entry.code, index++);
  }
  orderIndex.set("PHARMACY", index++);

  return [...lines].sort((a, b) => (orderIndex.get(a) ?? 999) - (orderIndex.get(b) ?? 999));
}

export function facilityHasServiceLine(
  input: ResolveFacilityServiceLinesInput & { serviceLine: MedoraServiceLine | string }
): boolean {
  const lines = resolveFacilityServiceLines(input);
  const normalized = normalizeServiceLineToken(input.serviceLine);
  return normalized != null && lines.includes(normalized);
}

export type FacilityObservationTechnicianAccessInput = {
  facilityType?: MedoraFacilityType | string | null;
  facilityServiceLines?: readonly string[] | null;
  configuredServiceLines?: readonly string[] | null;
  professionGroup: ProfessionGroup;
  departmentCode?: DepartmentCode | string | null;
  roleCodes?: readonly string[];
};

/**
 * Freestanding ER / urgent care: LAB/RAD technicians (and ED techs with lab/rad roles)
 * may access observation hospital workflows when the facility exposes OBSERVATION.
 */
export function facilitySupportsObservationAccessForTechnician(
  input: FacilityObservationTechnicianAccessInput
): boolean {
  if (input.professionGroup !== "TECHNICIAN") {
    return false;
  }

  const facilityType = normalizeFacilityType(input.facilityType);
  if (facilityType !== "FREESTANDING_ER" && facilityType !== "URGENT_CARE") {
    return false;
  }

  const lines = resolveFacilityServiceLines({
    facilityType,
    configuredServiceLines:
      input.facilityServiceLines ?? input.configuredServiceLines ?? null,
  });
  if (!lines.includes("OBSERVATION")) {
    return false;
  }

  const department = String(input.departmentCode ?? "")
    .trim()
    .toUpperCase();
  const roles = (input.roleCodes ?? []).map((code) => code.trim().toUpperCase());

  const hasLabAccess =
    department === "LABORATORY" ||
    department === "LAB" ||
    roles.includes("LAB") ||
    lines.includes("LABORATORY");
  const hasRadAccess =
    department === "RADIOLOGY" ||
    department === "RAD" ||
    roles.includes("RADIOLOGY") ||
    lines.includes("RADIOLOGY");

  if (department === "EMERGENCY" && (roles.includes("LAB") || roles.includes("RADIOLOGY"))) {
    return true;
  }

  return (
    (hasLabAccess && lines.includes("LABORATORY")) ||
    (hasRadAccess && lines.includes("RADIOLOGY"))
  );
}

/** Map service line → clinical department codes for department row seeding. */
export function mapServiceLineToClinicalDepartmentCode(
  line: MedoraServiceLine
): ClinicalDepartmentCode | null {
  if (line === "PHARMACY") return null;
  if (isClinicalDepartmentCode(line)) return line;
  return null;
}

export function mapServiceLineToPrismaDepartmentCodes(line: MedoraServiceLine): string[] {
  if (line === "PHARMACY") return ["PHARM"];
  return [line];
}
