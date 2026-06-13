import type { PrismaClient } from "@prisma/client";
import { DepartmentCode } from "@prisma/client";
import {
  CLINICAL_DEPARTMENT_REGISTRY,
  mapClinicalDepartmentCodeToPrismaDepartmentCode,
} from "@medora/shared";

type PrismaLike = Pick<PrismaClient, "department">;

export type EnsureFacilityClinicalDepartmentsResult = {
  created: number;
  existing: number;
};

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

    const row = await prisma.department.findUnique({
      where: {
        facilityId_code: {
          facilityId,
          code: prismaCode,
        },
      },
      select: { id: true, name: true },
    });

    if (row) {
      existing += 1;
      const trimmed = String(row.name ?? "").trim();
      if (!trimmed) {
        await prisma.department.update({
          where: { id: row.id },
          data: { name: defaultName },
        });
      }
      continue;
    }

    await prisma.department.create({
      data: {
        facilityId,
        code: prismaCode,
        name: defaultName,
        isActive: true,
      },
    });
    created += 1;
  }

  return { created, existing };
}
