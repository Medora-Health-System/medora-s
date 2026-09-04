import { pickProductUiCopy } from "../i18n/productUiLocale.js";

/** Navigation area hint for clinical departments (subset of NavigationArea). */
export type ClinicalDepartmentArea = "EMERGENCY" | "HOSPITAL" | "LABORATORY" | "RADIOLOGY";

/** Hospital-grade clinical department taxonomy (MEDUI.AUTH.ROLE.3). */
export type ClinicalDepartmentCode =
  | "EMERGENCY"
  | "ICU"
  | "MEDSURG"
  | "OBSERVATION"
  | "OBGYN"
  | "PEDIATRICS"
  | "BEHAVIORAL_HEALTH"
  | "TELEMETRY"
  | "LABORATORY"
  | "RADIOLOGY";

export type ClinicalDepartmentRegistryEntry = {
  code: ClinicalDepartmentCode;
  labelEn: string;
  labelFr: string;
  area: ClinicalDepartmentArea;
};

export const CLINICAL_DEPARTMENT_REGISTRY: readonly ClinicalDepartmentRegistryEntry[] = [
  {
    code: "EMERGENCY",
    labelEn: "Emergency Department",
    labelFr: "Urgences",
    area: "EMERGENCY",
  },
  { code: "ICU", labelEn: "ICU", labelFr: "Soins intensifs", area: "HOSPITAL" },
  { code: "MEDSURG", labelEn: "Med-Surg", labelFr: "Médecine-Chirurgie", area: "HOSPITAL" },
  { code: "OBSERVATION", labelEn: "Observation", labelFr: "Observation", area: "HOSPITAL" },
  { code: "OBGYN", labelEn: "OB/GYN", labelFr: "OB/GYN", area: "HOSPITAL" },
  { code: "PEDIATRICS", labelEn: "Pediatrics", labelFr: "Pédiatrie", area: "HOSPITAL" },
  {
    code: "BEHAVIORAL_HEALTH",
    labelEn: "Behavioral Health",
    labelFr: "Santé comportementale",
    area: "HOSPITAL",
  },
  { code: "TELEMETRY", labelEn: "Telemetry", labelFr: "Télémétrie", area: "HOSPITAL" },
  {
    code: "LABORATORY",
    labelEn: "Laboratory",
    labelFr: "Laboratoire",
    area: "LABORATORY",
  },
  { code: "RADIOLOGY", labelEn: "Radiology", labelFr: "Radiologie", area: "RADIOLOGY" },
] as const;

export const CLINICAL_DEPARTMENT_CODES: readonly ClinicalDepartmentCode[] =
  CLINICAL_DEPARTMENT_REGISTRY.map((entry) => entry.code);

/** Legacy Prisma `DepartmentCode` values before / alongside clinical expansion. */
export type LegacyPrismaDepartmentCode =
  | "PRIMARY_CARE"
  | "LAB"
  | "RAD"
  | "PHARM"
  | "INPATIENT"
  /** MEDUI.D4C.9A — ambulatory Dental operational department (not a hospital clinical ward). */
  | "DENTAL";

export type StoredPrismaDepartmentCode = LegacyPrismaDepartmentCode | ClinicalDepartmentCode;

const CLINICAL_CODE_SET = new Set<string>(CLINICAL_DEPARTMENT_CODES);

const REGISTRY_BY_CODE = new Map<ClinicalDepartmentCode, ClinicalDepartmentRegistryEntry>(
  CLINICAL_DEPARTMENT_REGISTRY.map((entry) => [entry.code, entry])
);

export function isClinicalDepartmentCode(value: string): value is ClinicalDepartmentCode {
  return CLINICAL_CODE_SET.has(value.trim().toUpperCase());
}

const CLINICAL_DEPARTMENT_LABEL_ES: Record<ClinicalDepartmentCode, string> = {
  EMERGENCY: "Urgencias",
  ICU: "UCI",
  MEDSURG: "Medicina-cirugía",
  OBSERVATION: "Observación",
  OBGYN: "Ginecología y obstetricia",
  PEDIATRICS: "Pediatría",
  BEHAVIORAL_HEALTH: "Salud conductual",
  TELEMETRY: "Telemetría",
  LABORATORY: "Laboratorio",
  RADIOLOGY: "Radiología",
};

export function getClinicalDepartmentLabel(
  code: ClinicalDepartmentCode,
  language: string = "en"
): string {
  const entry = REGISTRY_BY_CODE.get(code);
  if (!entry) return code;
  return pickProductUiCopy(
    language,
    { en: entry.labelEn, fr: entry.labelFr, es: CLINICAL_DEPARTMENT_LABEL_ES[code] },
    CLINICAL_DEPARTMENT_LABEL_ES[code]
  );
}

export function resolveClinicalDepartmentArea(
  code: ClinicalDepartmentCode
): ClinicalDepartmentArea {
  return REGISTRY_BY_CODE.get(code)?.area ?? "HOSPITAL";
}

/**
 * Map stored Prisma department row code → clinical taxonomy.
 * Accepts expanded clinical enum values and legacy codes.
 */
export function mapLegacyPrismaDepartmentCodeToClinicalDepartment(
  prismaCode: string | null | undefined
): ClinicalDepartmentCode | null {
  const code = String(prismaCode ?? "")
    .trim()
    .toUpperCase();
  if (!code) return null;
  if (isClinicalDepartmentCode(code)) {
    return code;
  }
  switch (code as LegacyPrismaDepartmentCode) {
    case "LAB":
      return "LABORATORY";
    case "RAD":
      return "RADIOLOGY";
    case "INPATIENT":
      return "MEDSURG";
    case "PRIMARY_CARE":
      /** Ambulatory clinic ops department — not a hospital Observation ward. */
      return null;
    case "DENTAL":
      /** Dental is operational service-line department — not hospital clinical taxonomy. */
      return null;
    default:
      return null;
  }
}

/** @deprecated alias — use {@link mapLegacyPrismaDepartmentCodeToClinicalDepartment}. */
export const mapPrismaDepartmentCodeToClinicalDepartment =
  mapLegacyPrismaDepartmentCodeToClinicalDepartment;

/**
 * Clinical department → Prisma enum value for new Department rows (post MEDUI.AUTH.ROLE.3 migration).
 * Clinical codes map 1:1; legacy-only concepts return null.
 */
export function mapClinicalDepartmentCodeToPrismaDepartmentCode(
  clinicalCode: ClinicalDepartmentCode
): ClinicalDepartmentCode {
  return clinicalCode;
}

export function findClinicalDepartmentRegistryEntry(
  code: ClinicalDepartmentCode
): ClinicalDepartmentRegistryEntry | undefined {
  return REGISTRY_BY_CODE.get(code);
}
