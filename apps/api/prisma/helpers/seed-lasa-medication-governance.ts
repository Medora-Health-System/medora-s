import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CatalogRowForLasaMatch,
  LasaMedicationGovernanceEntry,
} from "../../../../packages/shared/src/medication/lasaMedicationGovernanceValidation";
import { loadLasaMedicationGovernanceSeedModules } from "./medication-governance-seed-modules";

export type SeedLasaMedicationGovernanceResult = {
  applyMemberCount: number;
  applyGroupCount: number;
  catalogMatched: number;
  safetyProfileUpdated: number;
  safetyProfileAlreadyCompliant: number;
  safetyProfileSkippedNoProfile: number;
  catalogNotFound: number;
  manualReviewSkipped: number;
  missingCatalogSkipped: number;
};

async function findCatalogRowsForEntry(
  prisma: PrismaClient,
  entry: LasaMedicationGovernanceEntry,
  catalogRowMatchesLasaGovernanceEntry: (
    row: CatalogRowForLasaMatch,
    manifestEntry: LasaMedicationGovernanceEntry
  ) => boolean
) {
  if (entry.catalogCode?.trim()) {
    const row = await prisma.catalogMedication.findUnique({
      where: { code: entry.catalogCode.trim() },
      select: {
        id: true,
        code: true,
        genericName: true,
        strength: true,
        dosageForm: true,
        displayNameEn: true,
      },
    });
    return row ? [row] : [];
  }

  const candidates = await prisma.catalogMedication.findMany({
    where: {
      genericName: { equals: entry.genericName, mode: "insensitive" },
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      genericName: true,
      strength: true,
      dosageForm: true,
      displayNameEn: true,
    },
  });

  return candidates.filter((row) => catalogRowMatchesLasaGovernanceEntry(row, entry));
}

/**
 * M1.3E — Apply LASA governance to existing safety profiles only.
 * Does not create/delete medications, orders, or search behavior.
 */
export async function seedLasaMedicationGovernance(
  prisma: PrismaClient
): Promise<SeedLasaMedicationGovernanceResult> {
  const {
    LASA_MEDICATION_GOVERNANCE_MANIFEST,
    catalogRowMatchesLasaGovernanceEntry,
    lasaCategoriesPayloadFromEntry,
    mergeLasaIntoHighAlertCategories,
    lasaProfileCompliant,
    LASA_MEDICATION_GOVERNANCE_APPLY_GROUP_COUNT,
  } = await loadLasaMedicationGovernanceSeedModules();

  const result: SeedLasaMedicationGovernanceResult = {
    applyMemberCount: LASA_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "APPLY")
      .length,
    applyGroupCount: LASA_MEDICATION_GOVERNANCE_APPLY_GROUP_COUNT,
    catalogMatched: 0,
    safetyProfileUpdated: 0,
    safetyProfileAlreadyCompliant: 0,
    safetyProfileSkippedNoProfile: 0,
    catalogNotFound: 0,
    manualReviewSkipped: 0,
    missingCatalogSkipped: 0,
  };

  for (const entry of LASA_MEDICATION_GOVERNANCE_MANIFEST) {
    if (entry.governanceStatus === "MANUAL_REVIEW") {
      result.manualReviewSkipped += 1;
      continue;
    }
    if (entry.governanceStatus === "MISSING_CATALOG") {
      result.missingCatalogSkipped += 1;
      continue;
    }

    const lasaPayload = lasaCategoriesPayloadFromEntry(entry);
    const rows = await findCatalogRowsForEntry(prisma, entry, catalogRowMatchesLasaGovernanceEntry);

    if (rows.length === 0) {
      result.catalogNotFound += 1;
      continue;
    }

    for (const row of rows) {
      result.catalogMatched += 1;

      const products = await prisma.medicationProduct.findMany({
        where: { legacyCatalogMedicationId: row.id },
        select: { conceptId: true },
      });

      for (const product of products) {
        const profile = await prisma.medicationSafetyProfile.findUnique({
          where: { conceptId: product.conceptId },
        });
        if (!profile) {
          result.safetyProfileSkippedNoProfile += 1;
          continue;
        }

        if (lasaProfileCompliant(profile, entry.lasaGroupCode, lasaPayload)) {
          result.safetyProfileAlreadyCompliant += 1;
          continue;
        }

        await prisma.medicationSafetyProfile.update({
          where: { conceptId: product.conceptId },
          data: {
            lasaGroupId: entry.lasaGroupCode,
            highAlertCategories: mergeLasaIntoHighAlertCategories(
              profile.highAlertCategories,
              lasaPayload
            ) as Prisma.InputJsonValue,
          },
        });
        result.safetyProfileUpdated += 1;
      }
    }
  }

  return result;
}
