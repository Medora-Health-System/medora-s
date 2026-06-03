import type { PrismaClient } from "@prisma/client";
import { MedicationMarWorkflow } from "@prisma/client";
import type {
  EnterpriseFormularyPilotDashboard,
  EnterprisePilotReadinessScores,
} from "@medora/shared";
import {
  mergeEnterpriseFormularyPilotGovernanceNotes,
  stripEnterpriseFormularyPilotGovernanceLines,
} from "../../src/medication-master/enterprise-formulary-pilot.constants";
import {
  mergeProductRuntimeActivation,
  parseProductRuntimeActivation,
} from "../../src/medication-master/medication-product-runtime-activation.util";
import { loadEnterpriseFormularyPilotSeedModules } from "./enterprise-formulary-pilot-seed-modules";

export class EnterpriseFormularyPilotActivationError extends Error {
  constructor(
    message: string,
    readonly failures: ReadonlyArray<{ catalogCode: string; reason: string }>
  ) {
    super(message);
    this.name = "EnterpriseFormularyPilotActivationError";
  }
}

export type ActivateEnterpriseFormularyPilotOptions = {
  facilityId: string;
  dryRun?: boolean;
  /** Explicit catalog codes to activate (must be Tranche A eligible). No bulk beyond this list. */
  catalogCodes?: string[];
  pilotNote?: string;
  activatedBy?: string;
};

export type ActivateEnterpriseFormularyPilotResult = {
  dryRun: boolean;
  facilityId: string;
  trancheTotal: number;
  pilotEligible: number;
  requested: number;
  activatedProducts: number;
  skippedNotEligible: number;
  skippedValidationFailed: number;
  skippedMissingChain: number;
  alreadyActivated: number;
  failures: Array<{ catalogCode: string; reason: string }>;
  dashboard: EnterpriseFormularyPilotDashboard;
  readinessScores: EnterprisePilotReadinessScores;
};

function buildPilotActivationNotes(existing: string | null, pilotNote: string): string {
  const mergedMarker = mergeEnterpriseFormularyPilotGovernanceNotes(existing, pilotNote);
  const runtime = mergeProductRuntimeActivation(mergedMarker, {
    formularyApprovedInactive: true,
    formularyApprovedAt: new Date().toISOString(),
    orderSearchEnabled: false,
    orderSearchEnabledAt: null,
    marEnabled: false,
    marEnabledAt: null,
    billingEnabled: false,
    billingEnabledAt: null,
  });
  return runtime;
}

/**
 * M1.6F — Activate Enterprise Tranche A pilot products (per-medication, no provider search cutover).
 */
export async function activateEnterpriseFormularyPilotTrancheA(
  prisma: PrismaClient,
  options: ActivateEnterpriseFormularyPilotOptions
): Promise<ActivateEnterpriseFormularyPilotResult> {
  const dryRun = options.dryRun === true;
  const facilityId = options.facilityId.trim();
  const modules = await loadEnterpriseFormularyPilotSeedModules();
  modules.assertEnterpriseFormularyPilotTrancheAReady();

  const eligibleByCode = modules.ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_BY_CODE;
  const requestedCodes =
    options.catalogCodes?.map((c) => c.trim()).filter(Boolean) ??
    modules.getEnterpriseFormularyPilotTrancheAEligibleCodes();

  if (requestedCodes.length === 0) {
    throw new EnterpriseFormularyPilotActivationError("[enterprise-pilot] no catalog codes requested", []);
  }
  if (requestedCodes.length > 15) {
    throw new EnterpriseFormularyPilotActivationError(
      "[enterprise-pilot] refused bulk activation (>15 catalog codes)",
      requestedCodes.map((catalogCode) => ({ catalogCode, reason: "bulk limit" }))
    );
  }

  const result: ActivateEnterpriseFormularyPilotResult = {
    dryRun,
    facilityId,
    trancheTotal: modules.ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.trancheTotal,
    pilotEligible: modules.ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.pilotEligible,
    requested: requestedCodes.length,
    activatedProducts: 0,
    skippedNotEligible: 0,
    skippedValidationFailed: 0,
    skippedMissingChain: 0,
    alreadyActivated: 0,
    failures: [],
    dashboard: modules.computeEnterpriseFormularyPilotDashboard({
      trancheEntries: modules.ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST,
      chainByCatalogCode: {},
    }),
    readinessScores: {
      canonicalIntegrity: 0,
      billingReadiness: 0,
      governanceReadiness: 0,
      searchReadiness: 0,
      activationReadiness: 0,
      rollbackReadiness: 0,
    },
  };

  const pilotNote =
    options.pilotNote?.trim() ||
    `M1.6F Tranche A${options.activatedBy ? ` by ${options.activatedBy}` : ""}`;
  const chainByCatalogCode: Record<string, import("@medora/shared").EnterprisePilotChainSnapshot> = {};
  let billingPass = 0;
  let searchPass = 0;
  let chainCount = 0;

  for (const catalogCode of requestedCodes) {
    const entry = eligibleByCode[catalogCode];
    if (!entry) {
      result.skippedNotEligible += 1;
      result.failures.push({ catalogCode, reason: "not in Tranche A manifest" });
      continue;
    }
    if (!entry.pilotEligible) {
      result.skippedNotEligible += 1;
      result.failures.push({ catalogCode, reason: entry.pilotRationale });
      continue;
    }

    const product = await prisma.medicationProduct.findUnique({
      where: { code: catalogCode },
      include: {
        concept: { include: { safetyProfile: true } },
        packages: {
          where: { isDefaultForProduct: true },
          take: 1,
          include: {
            billingProfiles: { take: 1, select: { hcpcsCodeSuggested: true, requiresManualReview: true } },
            facilityFormularyItems: { where: { facilityId }, take: 1 },
          },
        },
      },
    });

    const catalog = await prisma.catalogMedication.findUnique({
      where: { code: catalogCode },
      select: {
        id: true,
        code: true,
        genericName: true,
        ndc11: true,
        billingCodeDefault: true,
      },
    });

    const aliasCount = catalog
      ? await prisma.medicationAlias.count({ where: { catalogMedicationId: catalog.id } })
      : 0;

    const pkg = product?.packages[0];
    const chain = {
      product: product
        ? {
            productId: product.id,
            productCode: product.code,
            legacyCatalogMedicationId: product.legacyCatalogMedicationId,
            isActive: product.isActive,
            governanceStatus: product.governanceStatus,
            governanceNotes: product.governanceNotes,
            baselineAvailable: product.baselineAvailable,
          }
        : null,
      concept: product?.concept ? { isActive: product.concept.isActive } : null,
      package: pkg ? { id: pkg.id, isActive: pkg.isActive, ndc11: pkg.ndc11 } : null,
      catalog: catalog
        ? {
            catalogId: catalog.id,
            catalogCode: catalog.code,
            genericName: catalog.genericName,
            billingCodeDefault: catalog.billingCodeDefault,
            ndc11: catalog.ndc11,
          }
        : null,
      safetyProfile: product?.concept.safetyProfile
        ? {
            isControlled: product.concept.safetyProfile.isControlled,
            isHighAlert: product.concept.safetyProfile.isHighAlert,
            lasaGroupId: product.concept.safetyProfile.lasaGroupId,
            requiresWitness: product.concept.safetyProfile.requiresWitness,
          }
        : null,
      billingProfileHcpcs: pkg?.billingProfiles[0]?.hcpcsCodeSuggested ?? null,
      billingRequiresManualReview: pkg?.billingProfiles[0]?.requiresManualReview ?? true,
      aliasCount,
    };

    chainByCatalogCode[catalogCode] = chain;
    chainCount += 1;

    const issues = modules.validateEnterprisePilotActivationCandidate(entry, chain);
    const blocking = issues.filter((i) => i.severity === "blocking");
    if (modules.validateEnterprisePilotBilling(entry, chain).billingPass) billingPass += 1;
    if ((aliasCount ?? 0) > 0) searchPass += 1;

    if (!product || !catalog || !pkg) {
      result.skippedMissingChain += 1;
      result.failures.push({ catalogCode, reason: "canonical chain or catalog missing" });
      continue;
    }

    if (blocking.length > 0) {
      result.skippedValidationFailed += 1;
      result.failures.push({
        catalogCode,
        reason: blocking.map((i) => i.message).join("; "),
      });
      continue;
    }

    const runtime = parseProductRuntimeActivation(product.governanceNotes);
    if (
      modules.productHasEnterprisePilotActivatedMarker(product.governanceNotes) &&
      product.isActive
    ) {
      result.alreadyActivated += 1;
      continue;
    }
    if (runtime.orderSearchEnabled) {
      result.skippedValidationFailed += 1;
      result.failures.push({
        catalogCode,
        reason: "orderSearchEnabled already set — refuse pilot activation (M1.5F cutover)",
      });
      continue;
    }

    if (dryRun) {
      result.activatedProducts += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      let ffi = pkg.facilityFormularyItems[0];
      if (!ffi) {
        ffi = await tx.facilityFormularyItem.create({
          data: {
            facilityId,
            packageId: pkg.id,
            isOnFormulary: true,
            isEDFormulary: false,
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
        const adminType = product.administrationType?.trim().toUpperCase() ?? "ORAL";
        await tx.medicationAdministrationProfile.create({
          data: {
            productId: product.id,
            defaultMarWorkflow: MedicationMarWorkflow.SINGLE_DOSE,
            requiresInfusionSession: adminType === "INFUSION",
          },
        });
      }

      const notes = buildPilotActivationNotes(product.governanceNotes, pilotNote);

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
        where: { id: pkg.id },
        data: { isActive: true },
      });
    });

    chainByCatalogCode[catalogCode] = {
      ...chain,
      product: {
        ...chain.product!,
        isActive: true,
        governanceStatus: "ACTIVATION_APPROVED",
        governanceNotes: buildPilotActivationNotes(product.governanceNotes, pilotNote),
      },
      concept: { isActive: true },
      package: { ...pkg, isActive: true },
    };

    result.activatedProducts += 1;
  }

  result.dashboard = modules.computeEnterpriseFormularyPilotDashboard({
    trancheEntries: modules.ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST,
    chainByCatalogCode,
  });
  result.readinessScores = modules.computeEnterprisePilotReadinessScores(result.dashboard, {
    billingPass,
    searchPass,
    total: chainCount,
  });

  return result;
}

export type RollbackEnterpriseFormularyPilotOptions = {
  facilityId: string;
  dryRun?: boolean;
  catalogCodes?: string[];
};

/**
 * M1.6F rollback — deactivate Tranche A pilot products; preserve enterprise markers + billing.
 */
export async function rollbackEnterpriseFormularyPilotTrancheA(
  prisma: PrismaClient,
  options: RollbackEnterpriseFormularyPilotOptions
): Promise<{ dryRun: boolean; rolledBack: number; failures: string[] }> {
  const dryRun = options.dryRun === true;
  const failures: string[] = [];
  let rolledBack = 0;

  const where =
    options.catalogCodes?.length ?
      {
        code: { in: options.catalogCodes },
        governanceNotes: { contains: "ENTERPRISE_M16F_TRANCHE_A_PILOT" },
      }
    : { governanceNotes: { contains: "ENTERPRISE_M16F_TRANCHE_A_PILOT" } };

  const products = await prisma.medicationProduct.findMany({
    where,
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
    const baseNotes = stripEnterpriseFormularyPilotGovernanceLines(product.governanceNotes);
    const runtime = mergeProductRuntimeActivation(baseNotes, {
      formularyApprovedInactive: false,
      formularyApprovedAt: null,
      orderSearchEnabled: false,
      orderSearchEnabledAt: null,
      marEnabled: false,
      marEnabledAt: null,
      billingEnabled: false,
      billingEnabledAt: null,
    });

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
          governanceNotes: runtime.trim() || baseNotes,
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

/**
 * Read-only pilot dashboard for Tranche A (staging audit / ops).
 */
export async function auditEnterpriseFormularyPilotTrancheA(
  prisma: PrismaClient
): Promise<{
  dashboard: EnterpriseFormularyPilotDashboard;
  readinessScores: EnterprisePilotReadinessScores;
}> {
  const modules = await loadEnterpriseFormularyPilotSeedModules();
  modules.assertEnterpriseFormularyPilotTrancheAReady();

  const chainByCatalogCode: Record<string, import("@medora/shared").EnterprisePilotChainSnapshot> = {};
  let billingPass = 0;
  let searchPass = 0;
  let total = 0;

  for (const entry of modules.ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST) {
    const product = await prisma.medicationProduct.findUnique({
      where: { code: entry.catalogCode },
      include: {
        concept: { include: { safetyProfile: true } },
        packages: {
          where: { isDefaultForProduct: true },
          take: 1,
          include: { billingProfiles: { take: 1 } },
        },
      },
    });
    const catalog = await prisma.catalogMedication.findUnique({
      where: { code: entry.catalogCode },
      select: { id: true, code: true, genericName: true, billingCodeDefault: true, ndc11: true },
    });
    const aliasCount = catalog
      ? await prisma.medicationAlias.count({ where: { catalogMedicationId: catalog.id } })
      : 0;
    const pkg = product?.packages[0];
    const chain = {
      product: product
        ? {
            productId: product.id,
            productCode: product.code,
            legacyCatalogMedicationId: product.legacyCatalogMedicationId,
            isActive: product.isActive,
            governanceStatus: product.governanceStatus,
            governanceNotes: product.governanceNotes,
            baselineAvailable: product.baselineAvailable,
          }
        : null,
      concept: product?.concept ? { isActive: product.concept.isActive } : null,
      package: pkg ? { id: pkg.id, isActive: pkg.isActive, ndc11: pkg.ndc11 } : null,
      catalog: catalog
        ? {
            catalogId: catalog.id,
            catalogCode: catalog.code,
            genericName: catalog.genericName,
            billingCodeDefault: catalog.billingCodeDefault,
            ndc11: catalog.ndc11,
          }
        : null,
      safetyProfile: product?.concept.safetyProfile
        ? {
            isControlled: product.concept.safetyProfile.isControlled,
            isHighAlert: product.concept.safetyProfile.isHighAlert,
            lasaGroupId: product.concept.safetyProfile.lasaGroupId,
            requiresWitness: product.concept.safetyProfile.requiresWitness,
          }
        : null,
      billingProfileHcpcs: pkg?.billingProfiles[0]?.hcpcsCodeSuggested ?? null,
      billingRequiresManualReview: pkg?.billingProfiles[0]?.requiresManualReview ?? true,
      aliasCount,
    };
    chainByCatalogCode[entry.catalogCode] = chain;
    total += 1;
    if (modules.validateEnterprisePilotBilling(entry, chain).billingPass) billingPass += 1;
    if (aliasCount > 0) searchPass += 1;
  }

  const dashboard = modules.computeEnterpriseFormularyPilotDashboard({
    trancheEntries: modules.ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST,
    chainByCatalogCode,
  });
  const readinessScores = modules.computeEnterprisePilotReadinessScores(dashboard, {
    billingPass,
    searchPass,
    total,
  });
  return { dashboard, readinessScores };
}
