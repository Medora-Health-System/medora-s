import type { PrismaClient } from "@prisma/client";
import { DepartmentCode } from "@prisma/client";
import {
  CLINICAL_DEPARTMENT_REGISTRY,
  findClinicalDepartmentRegistryEntry,
  mapClinicalDepartmentCodeToPrismaDepartmentCode,
  type ClinicalDepartmentCode,
} from "@medora/shared";
import {
  mapServiceLineToClinicalDepartmentCode,
  mapServiceLineToPrismaDepartmentCodes,
  resolveFacilityServiceLines,
  type MedoraServiceLine,
} from "@medora/shared";
import type { MedoraFacilityType } from "@medora/shared";

type PrismaLike = Pick<PrismaClient, "department">;

export type EnsureFacilityClinicalDepartmentsResult = {
  created: number;
  existing: number;
};

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

/**
 * Idempotent department seed for explicit service lines (MEDUI.FACILITY.TYPE.1).
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
    const prismaCodes = mapServiceLineToPrismaDepartmentCodes(line);
    const clinicalCode = mapServiceLineToClinicalDepartmentCode(line);
    const defaultName =
      line === "PHARMACY"
        ? language === "en"
          ? "Pharmacy"
          : "Pharmacie"
        : clinicalCode
          ? labelForClinicalCode(clinicalCode, language)
          : line;

    for (const rawCode of prismaCodes) {
      const code = rawCode as DepartmentCode;
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
    const prismaCode = mapClinicalDepartmentCodeToPrismaDepartmentCode(
      entry.code
    ) as DepartmentCode;
    const defaultName = language === "en" ? entry.labelEn : entry.labelFr;
    const result = await upsertDepartmentRow(prisma, facilityId, prismaCode, defaultName);
    if (result === "created") created += 1;
    else existing += 1;
  }

  return { created, existing };
}
