import type { PrismaClient } from "@prisma/client";
import { DepartmentCode } from "@prisma/client";
import {
  CLINICAL_DEPARTMENT_REGISTRY,
  FACILITY_SERVICE_LINE_DEPARTMENT_MAPPING_INVALID,
  findClinicalDepartmentRegistryEntry,
  mapClinicalDepartmentCodeToPrismaDepartmentCode,
  mapServiceLineToClinicalDepartmentCode,
  assertServiceLinePrismaDepartmentMapping,
  resolveFacilityServiceLines,
  type ClinicalDepartmentCode,
  type MedoraFacilityType,
  type MedoraServiceLine,
  type PrismaDepartmentCodeToken,
} from "@medora/shared";

type PrismaLike = Pick<PrismaClient, "department">;

export type EnsureFacilityClinicalDepartmentsResult = {
  created: number;
  existing: number;
};

export class FacilityServiceLineDepartmentMappingError extends Error {
  readonly code = FACILITY_SERVICE_LINE_DEPARTMENT_MAPPING_INVALID;
  readonly serviceLine: string;
  readonly invalidCode: string;

  constructor(serviceLine: string, invalidCode: string) {
    super(
      `${FACILITY_SERVICE_LINE_DEPARTMENT_MAPPING_INVALID}: service line ${serviceLine} → ${invalidCode}`
    );
    this.name = "FacilityServiceLineDepartmentMappingError";
    this.serviceLine = serviceLine;
    this.invalidCode = invalidCode;
  }
}

const PRISMA_DEPARTMENT_CODE_VALUES = new Set<string>(Object.values(DepartmentCode));

/**
 * MEDUI.D4C.9A — only accept tokens that exist on the live Prisma DepartmentCode enum.
 * Prevents the production PrismaClientValidationError from unchecked string casts.
 */
export function toPrismaDepartmentCodeOrThrow(
  token: PrismaDepartmentCodeToken,
  serviceLine: MedoraServiceLine
): DepartmentCode {
  if (!PRISMA_DEPARTMENT_CODE_VALUES.has(token)) {
    throw new FacilityServiceLineDepartmentMappingError(serviceLine, token);
  }
  return token as DepartmentCode;
}

async function upsertDepartmentRow(
  prisma: PrismaLike,
  facilityId: string,
  code: DepartmentCode,
  defaultName: string
): Promise<"created" | "existing"> {
  const row = await prisma.department.findUnique({
    where: {
      facilityId_code: {
        facilityId,
        code,
      },
    },
    select: { id: true, name: true },
  });

  if (row) {
    const trimmed = String(row.name ?? "").trim();
    if (!trimmed) {
      await prisma.department.update({
        where: { id: row.id },
        data: { name: defaultName },
      });
    }
    return "existing";
  }

  await prisma.department.create({
    data: {
      facilityId,
      code,
      name: defaultName,
      isActive: true,
    },
  });
  return "created";
}

function labelForClinicalCode(code: ClinicalDepartmentCode, language: "fr" | "en"): string {
  const entry = findClinicalDepartmentRegistryEntry(code);
  if (!entry) return code;
  return language === "en" ? entry.labelEn : entry.labelFr;
}

function defaultNameForServiceLine(
  line: MedoraServiceLine,
  clinicalCode: ClinicalDepartmentCode | null,
  language: "fr" | "en"
): string {
  if (line === "PHARMACY") {
    return language === "en" ? "Pharmacy" : "Pharmacie";
  }
  if (line === "DENTAL") {
    return language === "en" ? "Dental" : "Soins dentaires";
  }
  if (clinicalCode) {
    return labelForClinicalCode(clinicalCode, language);
  }
  return line;
}

/**
 * Idempotent department seed for explicit service lines (MEDUI.FACILITY.TYPE.1 / D4C.9A).
 * Does not delete or deactivate unselected department rows.
 */
export async function ensureFacilityServiceLineDepartments(
  prisma: PrismaLike,
  facilityId: string,
  input: {
    facilityType?: MedoraFacilityType | string | null;
    serviceLines?: readonly MedoraServiceLine[] | null;
    defaultLanguage?: "fr" | "en";
  }
): Promise<EnsureFacilityClinicalDepartmentsResult> {
  const language = input.defaultLanguage ?? "fr";
  const lines = resolveFacilityServiceLines({
    facilityType: input.facilityType,
    configuredServiceLines: input.serviceLines ?? null,
  });

  let created = 0;
  let existing = 0;

  for (const line of lines) {
    const prismaTokens = assertServiceLinePrismaDepartmentMapping(line);
    const clinicalCode = mapServiceLineToClinicalDepartmentCode(line);
    const defaultName = defaultNameForServiceLine(line, clinicalCode, language);

    for (const token of prismaTokens) {
      const code = toPrismaDepartmentCodeOrThrow(token, line);
      const result = await upsertDepartmentRow(prisma, facilityId, code, defaultName);
      if (result === "created") created += 1;
      else existing += 1;
    }
  }

  return { created, existing };
}

/**
 * Idempotent clinical department seed for one facility (MEDUI.AUTH.ROLE.3).
 * Does not delete or deactivate legacy department rows.
 * Does not seed DENTAL — Dental is service-line provisioned only (D4C.9A).
 */
export async function ensureFacilityClinicalDepartments(
  prisma: PrismaLike,
  facilityId: string,
  options?: { defaultLanguage?: "fr" | "en" }
): Promise<EnsureFacilityClinicalDepartmentsResult> {
  const language = options?.defaultLanguage ?? "fr";
  let created = 0;
  let existing = 0;

  for (const entry of CLINICAL_DEPARTMENT_REGISTRY) {
    const prismaToken = mapClinicalDepartmentCodeToPrismaDepartmentCode(entry.code);
    if (!PRISMA_DEPARTMENT_CODE_VALUES.has(prismaToken)) {
      throw new FacilityServiceLineDepartmentMappingError(
        `clinical:${entry.code}`,
        String(prismaToken)
      );
    }
    const prismaCode = prismaToken as DepartmentCode;
    const defaultName = language === "en" ? entry.labelEn : entry.labelFr;
    const result = await upsertDepartmentRow(prisma, facilityId, prismaCode, defaultName);
    if (result === "created") created += 1;
    else existing += 1;
  }

  return { created, existing };
}
