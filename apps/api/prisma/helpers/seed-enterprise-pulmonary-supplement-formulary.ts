/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Seeds pulmonary formulary supplement via unified enterprise seed engine.
 */
import type { PrismaClient } from "@prisma/client";
import {
  buildEnterprisePulmonarySupplementSeedProfile,
  resolveEnterprisePulmonarySupplementSeedBody,
} from "@medora/shared";
import {
  buildActiveProviderOrderableRegistryForSeed,
  seedEnterpriseMedicationManifestProfile,
  type EnterpriseMedicationManifestSeedProfile,
  type EnterpriseMedicationManifestSeedResult,
} from "./seed-enterprise-medication-manifest";

export async function seedEnterprisePulmonarySupplementFormulary(
  prisma: PrismaClient,
  options?: { dryRun?: boolean }
): Promise<EnterpriseMedicationManifestSeedResult> {
  const profileDescriptor = buildEnterprisePulmonarySupplementSeedProfile();
  const profile: EnterpriseMedicationManifestSeedProfile = {
    ...profileDescriptor,
    resolve: (catalogCode) => resolveEnterprisePulmonarySupplementSeedBody(catalogCode),
  };
  return seedEnterpriseMedicationManifestProfile(prisma, profile, {
    dryRun: options?.dryRun,
    activeRegistry: buildActiveProviderOrderableRegistryForSeed(),
  });
}
