import type { ClinicalDepartmentCode } from "./clinicalDepartmentRegistry.js";

/** Operational facility taxonomy (MEDUI.FACILITY.TYPE.1). */
export type MedoraFacilityType =
  | "HOSPITAL"
  | "FREESTANDING_ER"
  | "URGENT_CARE"
  | "CLINIC"
  | "OUTSIDE_LABORATORY"
  | "OUTSIDE_RADIOLOGY"
  | "OUTSIDE_PHARMACY";

/**
 * Service line = clinical department code, pharmacy, or ambulatory Clinic/UC lines (MEDUI.D4C.1).
 * Ambulatory lines are config-driven tokens — never hard-coded facility names.
 */
export type MedoraServiceLine = ClinicalDepartmentCode | "PHARMACY" | "CLINIC" | "URGENT_CARE";

export type MedoraFacilityTypeRegistryEntry = {
  code: MedoraFacilityType;
  labelEn: string;
  labelFr: string;
  defaultServiceLines: readonly MedoraServiceLine[];
};

export const MEDORA_FACILITY_TYPE_REGISTRY: readonly MedoraFacilityTypeRegistryEntry[] = [
  {
    code: "HOSPITAL",
    labelEn: "Hospital",
    labelFr: "Hôpital",
    defaultServiceLines: [
      "EMERGENCY",
      "OBSERVATION",
      "ICU",
      "MEDSURG",
      "OBGYN",
      "PEDIATRICS",
      "BEHAVIORAL_HEALTH",
      "TELEMETRY",
      "LABORATORY",
      "RADIOLOGY",
      "PHARMACY",
    ],
  },
  {
    code: "FREESTANDING_ER",
    labelEn: "Freestanding Emergency Room",
    labelFr: "Urgences autonomes",
    defaultServiceLines: ["EMERGENCY", "OBSERVATION", "LABORATORY", "RADIOLOGY"],
  },
  {
    code: "URGENT_CARE",
    labelEn: "Urgent Care",
    labelFr: "Soins urgents",
    /** MEDUI.D4C.1 — ambulatory UC defaults (not ED/Observation hospital presentation). */
    defaultServiceLines: ["URGENT_CARE", "LABORATORY", "RADIOLOGY"],
  },
  {
    code: "CLINIC",
    labelEn: "Clinic",
    labelFr: "Clinique",
    /** MEDUI.D4C.1 — ambulatory Clinic Care (replaces Observation→Hospital mapping). */
    defaultServiceLines: ["CLINIC", "LABORATORY"],
  },
  {
    code: "OUTSIDE_LABORATORY",
    labelEn: "Outside Laboratory",
    labelFr: "Laboratoire externe",
    defaultServiceLines: ["LABORATORY"],
  },
  {
    code: "OUTSIDE_RADIOLOGY",
    labelEn: "Outside Radiology",
    labelFr: "Radiologie externe",
    defaultServiceLines: ["RADIOLOGY"],
  },
  {
    code: "OUTSIDE_PHARMACY",
    labelEn: "Outside Pharmacy",
    labelFr: "Pharmacie externe",
    defaultServiceLines: ["PHARMACY"],
  },
] as const;

const FACILITY_TYPE_SET = new Set<string>(
  MEDORA_FACILITY_TYPE_REGISTRY.map((entry) => entry.code)
);

const REGISTRY_BY_CODE = new Map<MedoraFacilityType, MedoraFacilityTypeRegistryEntry>(
  MEDORA_FACILITY_TYPE_REGISTRY.map((entry) => [entry.code, entry])
);

export function isMedoraFacilityType(value: string): value is MedoraFacilityType {
  return FACILITY_TYPE_SET.has(String(value ?? "").trim().toUpperCase());
}

export function normalizeFacilityType(
  value: MedoraFacilityType | string | null | undefined
): MedoraFacilityType {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  if (isMedoraFacilityType(code)) {
    return code;
  }
  return "CLINIC";
}

export function getFacilityTypeLabel(
  code: MedoraFacilityType,
  language: "en" | "fr" = "fr"
): string {
  const entry = REGISTRY_BY_CODE.get(code);
  if (!entry) return code;
  return language === "en" ? entry.labelEn : entry.labelFr;
}

export function getDefaultServiceLinesForFacilityType(
  facilityType: MedoraFacilityType | string | null | undefined
): MedoraServiceLine[] {
  const normalized = normalizeFacilityType(facilityType);
  return [...(REGISTRY_BY_CODE.get(normalized)?.defaultServiceLines ?? ["CLINIC", "LABORATORY"])];
}

export function facilityTypeSupportsServiceLine(
  facilityType: MedoraFacilityType | string | null | undefined,
  serviceLine: MedoraServiceLine | string
): boolean {
  const normalizedLine = normalizeServiceLineToken(serviceLine);
  if (!normalizedLine) return false;
  return getDefaultServiceLinesForFacilityType(facilityType).includes(normalizedLine);
}

const SERVICE_LINE_ALIASES: Record<string, MedoraServiceLine> = {
  LAB: "LABORATORY",
  RAD: "RADIOLOGY",
  INPATIENT: "MEDSURG",
  PHARM: "PHARMACY",
  /** MEDUI.D4C.1 — primary care aliases to ambulatory Clinic service line (not Observation). */
  PRIMARY_CARE: "CLINIC",
  CLINIC_CARE: "CLINIC",
  UC: "URGENT_CARE",
};

const ALL_KNOWN_SERVICE_LINES: readonly MedoraServiceLine[] = [
  "EMERGENCY",
  "ICU",
  "MEDSURG",
  "OBSERVATION",
  "OBGYN",
  "PEDIATRICS",
  "BEHAVIORAL_HEALTH",
  "TELEMETRY",
  "LABORATORY",
  "RADIOLOGY",
  "PHARMACY",
  "CLINIC",
  "URGENT_CARE",
];

export function normalizeServiceLineToken(
  value: string | null | undefined
): MedoraServiceLine | null {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!code) return null;
  if (code in SERVICE_LINE_ALIASES) {
    return SERVICE_LINE_ALIASES[code]!;
  }
  if (ALL_KNOWN_SERVICE_LINES.includes(code as MedoraServiceLine)) {
    return code as MedoraServiceLine;
  }
  return null;
}

export function findFacilityTypeRegistryEntry(
  code: MedoraFacilityType
): MedoraFacilityTypeRegistryEntry | undefined {
  return REGISTRY_BY_CODE.get(code);
}
