import type { PrismaClient } from "@prisma/client";
import type {
  CatalogRowForControlledMatch,
  ControlledSubstanceGovernanceEntry,
} from "../../../../packages/shared/src/medication/controlledSubstanceGovernanceValidation";
import { loadControlledSubstanceGovernanceSeedModules } from "./medication-governance-seed-modules";

export type SeedControlledSubstanceGovernanceResult = {
  applyEntries: number;
  catalogMatched: number;
  catalogUpdated: number;
  catalogAlreadyCompliant: number;
  catalogNotFound: number;
  safetyProfileUpdated: number;
  safetyProfileSkippedNoProfile: number;
  manualReviewSkipped: number;
  missingCatalogSkipped: number;
};

type LegacyControlledFlags = {
  isControlled: boolean;
  controlledSchedule: string | null;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
};

function flagsEqual(current: LegacyControlledFlags, target: LegacyControlledFlags): boolean {
  return (
    current.isControlled === target.isControlled &&
    (current.controlledSchedule ?? null) === (target.controlledSchedule ?? null) &&
    current.requiresWitness === target.requiresWitness &&
    current.requiresDoubleSign === target.requiresDoubleSign
  );
}

async function findCatalogRowsForEntry(
  prisma: PrismaClient,
  entry: ControlledSubstanceGovernanceEntry,
  catalogRowMatchesGovernanceEntry: (
    row: CatalogRowForControlledMatch,
    manifestEntry: ControlledSubstanceGovernanceEntry
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
        isControlled: true,
        controlledSchedule: true,
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
      isControlled: true,
      controlledSchedule: true,
      requiresWitness: true,
      requiresDoubleSign: true,
    },
  });

  return candidates.filter((row) => catalogRowMatchesGovernanceEntry(row, entry));
}

/**
 * M1.3C — Apply controlled-substance governance to existing catalog rows only.
 * Does not create/delete medications, orders, or search behavior.
 */
export async function seedControlledSubstanceGovernance(
  prisma: PrismaClient
): Promise<SeedControlledSubstanceGovernanceResult> {
  const {
    CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST,
    catalogRowMatchesGovernanceEntry,
    legacyControlledFlagsFromManifestEntry,
  } = await loadControlledSubstanceGovernanceSeedModules();

  const result: SeedControlledSubstanceGovernanceResult = {
    applyEntries: 0,
    catalogMatched: 0,
    catalogUpdated: 0,
    catalogAlreadyCompliant: 0,
    catalogNotFound: 0,
    safetyProfileUpdated: 0,
    safetyProfileSkippedNoProfile: 0,
    manualReviewSkipped: 0,
    missingCatalogSkipped: 0,
  };

  const applyEntries = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.filter(
    (e) => e.governanceStatus === "APPLY"
  );
  result.applyEntries = applyEntries.length;

  for (const entry of CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST) {
    if (entry.governanceStatus === "MANUAL_REVIEW") {
      result.manualReviewSkipped += 1;
      continue;
    }
    if (entry.governanceStatus === "MISSING_CATALOG") {
      result.missingCatalogSkipped += 1;
      continue;
    }

    const targetFlags = legacyControlledFlagsFromManifestEntry(entry);
    const rows = await findCatalogRowsForEntry(prisma, entry, catalogRowMatchesGovernanceEntry);

    if (rows.length === 0) {
      result.catalogNotFound += 1;
      continue;
    }

    for (const row of rows) {
      result.catalogMatched += 1;

      if (flagsEqual(row, targetFlags)) {
        result.catalogAlreadyCompliant += 1;
      } else {
        await prisma.catalogMedication.update({
          where: { id: row.id },
          data: targetFlags,
        });
        result.catalogUpdated += 1;
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

        const profileTarget = {
          isControlled: targetFlags.isControlled,
          controlledSchedule: targetFlags.controlledSchedule,
          requiresWitness: targetFlags.requiresWitness,
          requiresDoubleSign: targetFlags.requiresDoubleSign,
        };

        if (
          profile.isControlled === profileTarget.isControlled &&
          (profile.controlledSchedule ?? null) === (profileTarget.controlledSchedule ?? null) &&
          profile.requiresWitness === profileTarget.requiresWitness &&
          profile.requiresDoubleSign === profileTarget.requiresDoubleSign
        ) {
          continue;
        }

        await prisma.medicationSafetyProfile.update({
          where: { conceptId: product.conceptId },
          data: profileTarget,
        });
        result.safetyProfileUpdated += 1;
      }
    }
  }

  return result;
}
