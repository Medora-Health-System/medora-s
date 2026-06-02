import type { PrismaClient } from "@prisma/client";
import type {
  CatalogRowForHighAlertMatch,
  HighAlertGovernanceCategoriesPayload,
  HighAlertMedicationGovernanceEntry,
} from "../../../../packages/shared/src/medication/highAlertMedicationGovernanceValidation";
import { loadHighAlertMedicationGovernanceSeedModules } from "./medication-governance-seed-modules";

export type SeedHighAlertMedicationGovernanceResult = {
  applyEntries: number;
  catalogMatched: number;
  catalogWitnessFlagsUpdated: number;
  catalogWitnessFlagsAlreadyCompliant: number;
  catalogNotFound: number;
  safetyProfileUpdated: number;
  safetyProfileAlreadyCompliant: number;
  safetyProfileSkippedNoProfile: number;
  manualReviewSkipped: number;
  missingCatalogSkipped: number;
  safetyRequirementMappingCount: number;
};

type CatalogWitnessFlags = {
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
};

type ProfileHighAlertTarget = {
  isHighAlert: boolean;
  highAlertCategories: HighAlertGovernanceCategoriesPayload;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
};

function categoriesPayloadEqual(
  current: unknown,
  target: HighAlertGovernanceCategoriesPayload
): boolean {
  if (current == null || typeof current !== "object") {
    return false;
  }
  const parsed = current as HighAlertGovernanceCategoriesPayload;
  return (
    parsed.highAlertClass === target.highAlertClass &&
    parsed.sourcePhase === target.sourcePhase &&
    Array.isArray(parsed.safetyRequirements) &&
    parsed.safetyRequirements.length === target.safetyRequirements.length &&
    parsed.safetyRequirements.every((c, i) => c === target.safetyRequirements[i])
  );
}

function catalogWitnessCompliant(row: CatalogWitnessFlags, target: CatalogWitnessFlags): boolean {
  return (
    (!target.requiresWitness || row.requiresWitness) &&
    (!target.requiresDoubleSign || row.requiresDoubleSign)
  );
}

function profileHighAlertCompliant(
  profile: {
    isHighAlert: boolean;
    highAlertCategories: unknown;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
  },
  target: ProfileHighAlertTarget
): boolean {
  return (
    profile.isHighAlert === target.isHighAlert &&
    categoriesPayloadEqual(profile.highAlertCategories, target.highAlertCategories) &&
    (!target.requiresWitness || profile.requiresWitness) &&
    (!target.requiresDoubleSign || profile.requiresDoubleSign)
  );
}

async function findCatalogRowsForEntry(
  prisma: PrismaClient,
  entry: HighAlertMedicationGovernanceEntry,
  catalogRowMatchesHighAlertGovernanceEntry: (
    row: CatalogRowForHighAlertMatch,
    manifestEntry: HighAlertMedicationGovernanceEntry
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
        requiresWitness: true,
        requiresDoubleSign: true,
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
      requiresWitness: true,
      requiresDoubleSign: true,
    },
  });

  return candidates.filter((row) => catalogRowMatchesHighAlertGovernanceEntry(row, entry));
}

/**
 * M1.3D — Apply high-alert governance to existing catalog rows only.
 * Does not create/delete medications, orders, or search behavior.
 */
export async function seedHighAlertMedicationGovernance(
  prisma: PrismaClient
): Promise<SeedHighAlertMedicationGovernanceResult> {
  const {
    HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST,
    catalogRowMatchesHighAlertGovernanceEntry,
    safetyProfilePayloadFromHighAlertEntry,
    countUniqueSafetyRequirementCodesInManifest,
  } = await loadHighAlertMedicationGovernanceSeedModules();

  const result: SeedHighAlertMedicationGovernanceResult = {
    applyEntries: HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "APPLY")
      .length,
    catalogMatched: 0,
    catalogWitnessFlagsUpdated: 0,
    catalogWitnessFlagsAlreadyCompliant: 0,
    catalogNotFound: 0,
    safetyProfileUpdated: 0,
    safetyProfileAlreadyCompliant: 0,
    safetyProfileSkippedNoProfile: 0,
    manualReviewSkipped: 0,
    missingCatalogSkipped: 0,
    safetyRequirementMappingCount: countUniqueSafetyRequirementCodesInManifest(
      HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST
    ),
  };

  for (const entry of HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST) {
    if (entry.governanceStatus === "MANUAL_REVIEW") {
      result.manualReviewSkipped += 1;
      continue;
    }
    if (entry.governanceStatus === "MISSING_CATALOG") {
      result.missingCatalogSkipped += 1;
      continue;
    }

    const profileTarget = safetyProfilePayloadFromHighAlertEntry(entry);
    const catalogWitnessTarget: CatalogWitnessFlags = {
      requiresWitness: profileTarget.requiresWitness,
      requiresDoubleSign: profileTarget.requiresDoubleSign,
    };

    const rows = await findCatalogRowsForEntry(
      prisma,
      entry,
      catalogRowMatchesHighAlertGovernanceEntry
    );

    if (rows.length === 0) {
      result.catalogNotFound += 1;
      continue;
    }

    for (const row of rows) {
      result.catalogMatched += 1;

      if (catalogWitnessCompliant(row, catalogWitnessTarget)) {
        result.catalogWitnessFlagsAlreadyCompliant += 1;
      } else {
        await prisma.catalogMedication.update({
          where: { id: row.id },
          data: {
            requiresWitness: row.requiresWitness || catalogWitnessTarget.requiresWitness,
            requiresDoubleSign: row.requiresDoubleSign || catalogWitnessTarget.requiresDoubleSign,
          },
        });
        result.catalogWitnessFlagsUpdated += 1;
      }

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

        if (profileHighAlertCompliant(profile, profileTarget)) {
          result.safetyProfileAlreadyCompliant += 1;
          continue;
        }

        await prisma.medicationSafetyProfile.update({
          where: { conceptId: product.conceptId },
          data: {
            isHighAlert: true,
            highAlertCategories: profileTarget.highAlertCategories,
            requiresWitness: profile.requiresWitness || profileTarget.requiresWitness,
            requiresDoubleSign: profile.requiresDoubleSign || profileTarget.requiresDoubleSign,
          },
        });
        result.safetyProfileUpdated += 1;
      }
    }
  }

  return result;
}
