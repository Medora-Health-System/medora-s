import type { PrismaClient } from "@prisma/client";
import { US_INSURANCE_PAYERS_SEED } from "../data/us-insurance-payers";

function normalizeInsurancePayerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[''`´.]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Idempotent upsert of U.S. catalog payers by stable `code`.
 * Safe to run on every seed; updates display name / normalizedName if catalog changes.
 */
export async function seedUsInsurancePayers(prisma: PrismaClient): Promise<void> {
  for (const row of US_INSURANCE_PAYERS_SEED) {
    const normalizedName = normalizeInsurancePayerName(row.name);
    await prisma.insurancePayer.upsert({
      where: { code: row.code },
      create: {
        name: row.name,
        normalizedName,
        code: row.code,
        isActive: true,
      },
      update: {
        name: row.name,
        normalizedName,
        isActive: true,
      },
    });
  }
}
