import type { PrismaClient } from "@prisma/client";
import { MedicationMarWorkflow } from "@prisma/client";
import {
  HAITI_M15E_LINKAGE_ONLY_MARKER,
  HAITI_M15G_GOVERNANCE_NOTES_PREFIX,
  HAITI_M15G_PILOT_ACTIVATED_MARKER,
} from "../../src/medication-master/haiti-canonical-linkage.constants";
import {
  mergeProductRuntimeActivation,
  parseProductRuntimeActivation,
} from "../../src/medication-master/medication-product-runtime-activation.util";
import { loadHaitiCanonicalActivationPilotSeedModules } from "./haiti-canonical-activation-pilot-seed-modules";

export class HaitiCanonicalActivationPilotError extends Error {
  constructor(
    message: string,
    readonly failures: ReadonlyArray<{ catalogMedicationCode: string; reason: string }>
  ) {
    super(message);
    this.name = "HaitiCanonicalActivationPilotError";
  }
}

export type SeedHaitiCanonicalActivationPilotOptions = {
  facilityId: string;
  dryRun?: boolean;
  /** Limit activation count (for staged pilot). */
  maxActivations?: number;
  pilotNote?: string;
};

export type SeedHaitiCanonicalActivationPilotResult = {
  dryRun: boolean;
  facilityId: string;
  pilotManifestT1Total: number;
  pilotEligible: number;
  activatedProducts: number;
  skippedNotEligible: number;
  skippedValidationFailed: number;
  skippedMissingChain: number;
  alreadyActivated: number;
  rolledBack: number;
  billingWarnings: number;
  governanceWarnings: number;
  duplicateFindings: number;
  failures: Array<{ catalogMedicationCode: string; reason: string }>;
  readinessScores: {
    activationSafety: number;
    searchSafety: number;
    billingSafety: number;
    governanceSafety: number;
    orderingSafety: number;
    enterpriseReadiness: number;
  };
};

const MIN_LINKAGE_INTEGRITY_PERCENT = 75;

function stripPilotGovernanceLines(notes: string | null): string {
  if (!notes) return "";
  return notes
    .split("\n")
    .filter(
      (line) =>
        !line.includes(HAITI_M15E_LINKAGE_ONLY_MARKER) &&
        !line.includes(HAITI_M15G_PILOT_ACTIVATED_MARKER) &&
        !line.includes(HAITI_M15G_GOVERNANCE_NOTES_PREFIX) &&
        !line.startsWith("Pilot:")
    )
    .join("\n")
    .trim();
}

function buildPilotGovernanceNotes(existing: string | null, pilotNote: string): string {
  const base = stripPilotGovernanceLines(existing);
  const runtime = mergeProductRuntimeActivation(base, {
    formularyApprovedInactive: true,
    orderSearchEnabled: true,
    orderSearchEnabledAt: new Date().toISOString(),
  });
  return `${HAITI_M15G_GOVERNANCE_NOTES_PREFIX}\n${HAITI_M15G_PILOT_ACTIVATED_MARKER}\nPilot: ${pilotNote}\n${runtime}`;
}

/**
 * M1.5G — Activate Haiti T1 pilot canonical products (≤82 T1 scope, auto-eligible subset only).
 */
export async function seedHaitiCanonicalActivationPilot(
  prisma: PrismaClient,
  options: SeedHaitiCanonicalActivationPilotOptions
): Promise<SeedHaitiCanonicalActivationPilotResult> {
  const dryRun = options.dryRun === true;
  const facilityId = options.facilityId.trim();
  const modules = await loadHaitiCanonicalActivationPilotSeedModules();
  modules.assertPilotManifestReady();

  const result: SeedHaitiCanonicalActivationPilotResult = {
    dryRun,
    facilityId,
    pilotManifestT1Total: modules.HAITI_CANONICAL_ACTIVATION_PILOT_STATS.t1Total,
    pilotEligible: modules.HAITI_CANONICAL_ACTIVATION_PILOT_STATS.pilotEligible,
    activatedProducts: 0,
    skippedNotEligible: 0,
    skippedValidationFailed: 0,
    skippedMissingChain: 0,
    alreadyActivated: 0,
    rolledBack: 0,
    billingWarnings: 0,
    governanceWarnings: 0,
    duplicateFindings: 0,
    failures: [],
    readinessScores: modules.computePilotReadinessScores(),
  };

  const eligible = modules.HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE;
  const max = options.maxActivations ?? eligible.length;
  const toProcess = eligible.slice(0, max);

  const linkedEligible = await prisma.medicationProduct.count({
    where: {
      code: { in: toProcess.map((e) => e.proposedProductCode) },
      legacyCatalogMedicationId: { not: null },
    },
  });
  const linkageIntegrity =
    toProcess.length === 0 ? 100 : Math.round((linkedEligible / toProcess.length) * 100);
  if (linkageIntegrity < MIN_LINKAGE_INTEGRITY_PERCENT) {
    throw new HaitiCanonicalActivationPilotError(
      `[haiti-pilot] linkage integrity ${linkageIntegrity}% < ${MIN_LINKAGE_INTEGRITY_PERCENT}% — run M1.5E backfill first`,
      [{ catalogMedicationCode: "manifest", reason: `linked ${linkedEligible}/${toProcess.length}` }]
    );
  }

  const allProducts = await prisma.medicationProduct.findMany({
    where: { code: { in: toProcess.map((e) => e.proposedProductCode) } },
    select: {
      id: true,
      code: true,
      legacyCatalogMedicationId: true,
      baselineAvailable: true,
      isActive: true,
      governanceNotes: true,
      concept: { select: { genericName: true } },
      packages: {
        where: { isDefaultForProduct: true },
        take: 1,
        select: { code: true, ndc11: true },
      },
    },
  });

  const productSnapshots = allProducts.map((p) => ({
    productId: p.id,
    productCode: p.code,
    legacyCatalogMedicationId: p.legacyCatalogMedicationId,
    conceptGenericName: p.concept.genericName,
    baselineAvailable: p.baselineAvailable,
    packageNdc11: p.packages[0]?.ndc11 ?? null,
    packageCode: p.packages[0]?.code ?? null,
  }));

  let activatedCount = 0;
  const pilotNote = options.pilotNote?.trim() || "M1.5G T1 ER/IV pilot";

  result.skippedNotEligible =
    modules.HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.length - modules.HAITI_CANONICAL_ACTIVATION_PILOT_STATS.pilotEligible;

  const billingScores: number[] = [];

  for (const entry of toProcess) {
    const product = await prisma.medicationProduct.findFirst({
      where: { code: entry.proposedProductCode },
      include: {
        concept: { include: { safetyProfile: true } },
        packages: {
          where: { code: entry.proposedPackageCode },
          take: 1,
          include: {
            billingProfiles: { select: { hcpcsCodeSuggested: true }, take: 1 },
            facilityFormularyItems: { where: { facilityId }, take: 1 },
          },
        },
      },
    });

    const catalog = await prisma.catalogMedication.findUnique({
      where: { code: entry.catalogMedicationCode },
      select: {
        id: true,
        code: true,
        genericName: true,
        ndc11: true,
        billingCodeDefault: true,
        isControlled: true,
        requiresWitness: true,
        requiresDoubleSign: true,
      },
    });

    const pkg = product?.packages[0];
    const chain = {
      concept: product?.concept ? { code: product.concept.code, isActive: product.concept.isActive } : null,
      product: product
        ? {
            productId: product.id,
            productCode: product.code,
            legacyCatalogMedicationId: product.legacyCatalogMedicationId,
            conceptGenericName: product.concept.genericName,
            baselineAvailable: product.baselineAvailable,
            packageNdc11: pkg?.ndc11 ?? null,
            packageCode: pkg?.code ?? null,
          }
        : null,
      package: pkg ? { code: pkg.code, isActive: pkg.isActive, ndc11: pkg.ndc11 } : null,
      catalog: catalog
        ? {
            catalogId: catalog.id,
            catalogCode: catalog.code,
            genericName: catalog.genericName,
            ndc11: catalog.ndc11,
            billingCodeDefault: catalog.billingCodeDefault,
          }
        : null,
      safetyProfile: product?.concept.safetyProfile
        ? {
            isControlled: product.concept.safetyProfile.isControlled,
            isHighAlert: product.concept.safetyProfile.isHighAlert,
            requiresWitness: product.concept.safetyProfile.requiresWitness,
            requiresDoubleSign: product.concept.safetyProfile.requiresDoubleSign,
            lasaGroupId: product.concept.safetyProfile.lasaGroupId,
          }
        : null,
      billingProfileHcpcs: pkg?.billingProfiles[0]?.hcpcsCodeSuggested ?? null,
    };

    const issues = modules.validatePilotActivationCandidate(entry, chain, productSnapshots);
    const blocking = issues.filter((i) => i.severity === "blocking");
    const billingValidation = modules.validatePilotBillingPreservation(entry, chain);
    billingScores.push(billingValidation.score);
    result.billingWarnings += issues.filter((i) => i.kind.startsWith("BILLING")).length;
    result.governanceWarnings += issues.filter((i) =>
      ["MISSING_SAFETY_PROFILE", "CONTROLLED_FLAG_DRIFT", "HIGH_ALERT_FLAG_DRIFT"].includes(i.kind)
    ).length;
    result.duplicateFindings += issues.filter((i) => i.kind.startsWith("DUPLICATE")).length;

    if (!product || !catalog) {
      result.skippedMissingChain += 1;
      result.failures.push({
        catalogMedicationCode: entry.catalogMedicationCode,
        reason: "M1.5E chain or catalog row missing",
      });
      continue;
    }

    if (blocking.length > 0) {
      result.skippedValidationFailed += 1;
      result.failures.push({
        catalogMedicationCode: entry.catalogMedicationCode,
        reason: blocking.map((i) => i.message).join("; "),
      });
      continue;
    }

    const runtime = parseProductRuntimeActivation(product.governanceNotes);
    if (runtime.orderSearchEnabled && product.isActive) {
      result.alreadyActivated += 1;
      continue;
    }

    if (dryRun) {
      result.activatedProducts += 1;
      activatedCount += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const defaultPkg = product.packages[0];
      if (!defaultPkg) throw new Error("missing default package");

      let ffi = defaultPkg.facilityFormularyItems[0];
      if (!ffi) {
        ffi = await tx.facilityFormularyItem.create({
          data: {
            facilityId,
            packageId: defaultPkg.id,
            isOnFormulary: true,
            isEDFormulary: true,
            allowManualOverride: false,
          },
        });
      } else if (!ffi.isOnFormulary) {
        await tx.facilityFormularyItem.update({
          where: { id: ffi.id },
          data: { isOnFormulary: true },
        });
      }

      const adminExists = await tx.medicationAdministrationProfile.findUnique({
        where: { productId: product.id },
      });
      if (!adminExists) {
        const adminType = product.administrationType?.trim().toUpperCase() ?? "OTHER";
        await tx.medicationAdministrationProfile.create({
          data: {
            productId: product.id,
            defaultMarWorkflow:
              adminType === "INFUSION"
                ? MedicationMarWorkflow.INFUSION_SESSION
                : MedicationMarWorkflow.SINGLE_DOSE,
            requiresInfusionSession: adminType === "INFUSION",
          },
        });
      }

      const notes = buildPilotGovernanceNotes(product.governanceNotes, pilotNote);

      await tx.medicationConcept.update({
        where: { id: product.conceptId },
        data: { isActive: true },
      });
      await tx.medicationProduct.update({
        where: { id: product.id },
        data: {
          isActive: true,
          governanceStatus: "ACTIVATION_APPROVED",
          governanceNotes: notes,
        },
      });
      await tx.medicationPackage.update({
        where: { id: defaultPkg.id },
        data: { isActive: true },
      });
    });

    result.activatedProducts += 1;
    activatedCount += 1;
  }

  if (result.failures.some((f) => f.reason.toLowerCase().includes("quarantine"))) {
    throw new HaitiCanonicalActivationPilotError(
      `[haiti-pilot] quarantine violation during activation`,
      result.failures.filter((f) => f.reason.toLowerCase().includes("quarantine"))
    );
  }

  const avgBilling =
    billingScores.length === 0
      ? 70
      : Math.round(billingScores.reduce((a, b) => a + b, 0) / billingScores.length);
  result.readinessScores = modules.computePilotReadinessScores({
    linkageIntegrityScore: linkageIntegrity,
    billingScore: avgBilling,
    governanceScore: result.governanceWarnings === 0 ? 85 : 70,
    searchInflation: 0,
  });

  return result;
}

export type RollbackHaitiCanonicalActivationPilotOptions = {
  facilityId: string;
  dryRun?: boolean;
};

/**
 * M1.5G rollback — deactivate pilot products, restore M1.5E search-preservation marker, keep links + billing.
 */
export async function rollbackHaitiCanonicalActivationPilot(
  prisma: PrismaClient,
  options: RollbackHaitiCanonicalActivationPilotOptions
): Promise<{ dryRun: boolean; rolledBack: number; failures: string[] }> {
  const dryRun = options.dryRun === true;
  const failures: string[] = [];
  let rolledBack = 0;

  const products = await prisma.medicationProduct.findMany({
    where: {
      governanceNotes: { contains: HAITI_M15G_PILOT_ACTIVATED_MARKER },
    },
    include: {
      packages: {
        orderBy: [{ isDefaultForProduct: "desc" }, { createdAt: "asc" }],
        take: 1,
        include: {
          facilityFormularyItems: { where: { facilityId: options.facilityId }, take: 1 },
        },
      },
    },
  });

  for (const product of products) {
    if (dryRun) {
      rolledBack += 1;
      continue;
    }

    const pkg = product.packages[0];
    const runtime = mergeProductRuntimeActivation(
      stripPilotGovernanceLines(product.governanceNotes),
      {
        orderSearchEnabled: false,
        orderSearchEnabledAt: null,
        marEnabled: false,
        marEnabledAt: null,
        formularyApprovedInactive: false,
        formularyApprovedAt: null,
      }
    );
    const restoredNotes = [
      "M1.5E Haiti canonical linkage — provider search unchanged until M1.5F cutover.",
      HAITI_M15E_LINKAGE_ONLY_MARKER,
      runtime,
    ]
      .filter(Boolean)
      .join("\n");

    await prisma.$transaction(async (tx) => {
      await tx.medicationConcept.update({
        where: { id: product.conceptId },
        data: { isActive: false },
      });
      await tx.medicationProduct.update({
        where: { id: product.id },
        data: {
          isActive: false,
          governanceStatus: "REVIEW_REQUIRED",
          governanceNotes: restoredNotes,
        },
      });
      if (pkg) {
        await tx.medicationPackage.update({
          where: { id: pkg.id },
          data: { isActive: false },
        });
        const ffi = pkg.facilityFormularyItems[0];
        if (ffi?.isOnFormulary) {
          await tx.facilityFormularyItem.update({
            where: { id: ffi.id },
            data: { isOnFormulary: false },
          });
        }
      }
    });
    rolledBack += 1;
  }

  return { dryRun, rolledBack, failures };
}
