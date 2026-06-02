import type { PrismaClient } from "@prisma/client";
import { MedicationMarWorkflow } from "@prisma/client";
import type { EnterpriseWave2ReadinessReport } from "@medora/shared";
import { mergeEnterpriseWave2GovernanceNotes } from "../../src/medication-master/enterprise-wave2.constants";
import { loadEnterpriseWave2FormularySeedModules } from "./enterprise-wave2-formulary-seed-modules";

export class EnterpriseWave2FormularySeedError extends Error {
  constructor(
    message: string,
    readonly conflicts: ReadonlyArray<{ catalogCode: string; reason: string }>
  ) {
    super(message);
    this.name = "EnterpriseWave2FormularySeedError";
  }
}

export type SeedEnterpriseWave2FormularyOptions = {
  dryRun?: boolean;
};

export type SeedEnterpriseWave2FormularyResult = {
  dryRun: boolean;
  manifestEntries: number;
  catalogCreated: number;
  catalogEnriched: number;
  conceptsCreated: number;
  productsCreated: number;
  packagesCreated: number;
  aliasesAdded: number;
  safetyProfilesCreated: number;
  billingProfilesCreated: number;
  billingCatalogRowsCreated: number;
  linkedCatalogMedications: number;
  alreadyLinked: number;
  /** M1.6D — ENRICH alreadyLinked rows that received Wave 2 marker on governanceNotes. */
  wave2GovernanceNotesUpdated: number;
  skippedMissingCatalog: number;
  conflicts: Array<{ catalogCode: string; reason: string }>;
  readinessReport: EnterpriseWave2ReadinessReport;
};

function mapCatalogRouteToCode(route: string | null | undefined): string {
  const routeRaw = (route ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0301/g, "")
    .replace(/é/g, "e");
  const routeMap: Record<string, string> = {
    orale: "ORAL",
    oral: "ORAL",
    injectable: "INJECTION",
    "injectable-intramusculaire": "INTRAMUSCULAR",
    intramusculaire: "INTRAMUSCULAR",
    intraveineuse: "INTRAVENOUS",
    "sous-cutanee": "SUBCUTANEOUS",
    "sous-cutanée": "SUBCUTANEOUS",
    inhalation: "INHALATION",
  };
  return (
    routeMap[routeRaw] ??
    (routeRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "") || "OTHER")
  );
}

function inferAdministrationType(routeCode: string, explicit: string | null | undefined): string {
  const e = explicit?.trim().toUpperCase();
  if (e) return e;
  if (routeCode === "INTRAVENOUS") return "INFUSION";
  if (routeCode === "INJECTION" || routeCode === "INTRAMUSCULAR" || routeCode === "SUBCUTANEOUS") {
    return "PUSH";
  }
  if (routeCode === "ORAL") return "ORAL";
  return "OTHER";
}

function inferPackageType(dosageForm: string | null | undefined, routeCode: string): string {
  const form = (dosageForm ?? "").toLowerCase();
  if (form.includes("perfusion") || routeCode === "INTRAVENOUS") return "BAG_PREMIX";
  if (form.includes("injectable")) return "SYRINGE";
  if (form.includes("comprimé") || form.includes("comprime") || form.includes("gélule")) {
    return "TABLET_BOTTLE";
  }
  return "OTHER";
}

function buildSearchText(entry: {
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  aliases: string[];
  searchTerms: string[];
}): string {
  const parts = [
    entry.genericName,
    entry.displayNameFr,
    entry.displayNameEn,
    entry.strength,
    entry.dosageForm,
    entry.route,
    ...entry.aliases,
    ...entry.searchTerms,
  ].filter(Boolean);
  return parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * M1.6D — Enterprise Wave 1 formulary seed (catalog + canonical chain + billing + governance).
 * Products remain inactive until explicit activation with billing gate.
 */
export async function seedEnterpriseWave2Formulary(
  prisma: PrismaClient,
  options: SeedEnterpriseWave2FormularyOptions = {}
): Promise<SeedEnterpriseWave2FormularyResult> {
  const dryRun = options.dryRun === true;
  const modules = await loadEnterpriseWave2FormularySeedModules();
  modules.assertEnterpriseWave2FormularyManifest();

  const manifest = modules.ENTERPRISE_WAVE1_FORMULARY_MANIFEST;
  const billingByCode = modules.ENTERPRISE_WAVE1_BILLING_BY_CODE;

  const result: Omit<SeedEnterpriseWave2FormularyResult, "readinessReport"> & {
    readinessReport?: SeedEnterpriseWave2FormularyResult["readinessReport"];
  } = {
    dryRun,
    manifestEntries: manifest.length,
    catalogCreated: 0,
    catalogEnriched: 0,
    conceptsCreated: 0,
    productsCreated: 0,
    packagesCreated: 0,
    aliasesAdded: 0,
    safetyProfilesCreated: 0,
    billingProfilesCreated: 0,
    billingCatalogRowsCreated: 0,
    linkedCatalogMedications: 0,
    alreadyLinked: 0,
    wave2GovernanceNotesUpdated: 0,
    skippedMissingCatalog: 0,
    conflicts: [],
  };

  const perMedication: Array<{
    catalogCode: string;
    pass: boolean;
    billingPass: boolean;
    governancePass: boolean;
    searchPass: boolean;
    failures: string[];
  }> = [];

  for (const entry of manifest) {
    const billing = billingByCode[entry.catalogCode];
    if (!billing) {
      result.conflicts.push({ catalogCode: entry.catalogCode, reason: "missing billing spec" });
      continue;
    }

    const searchText = buildSearchText(entry);
    const upsertBody = {
      name: entry.displayNameFr || entry.genericName,
      genericName: entry.genericName,
      displayNameFr: entry.displayNameFr,
      displayNameEn: entry.displayNameEn,
      strength: entry.strength,
      dosageForm: entry.dosageForm,
      route: entry.route,
      therapeuticClass: entry.therapeuticClass,
      administrationType: entry.administrationType ?? null,
      billingClass: entry.billingClass ?? null,
      billingCodeDefault: billing.hcpcs,
      ndc11: billing.ndc11,
      ndcDisplay: billing.ndcDisplay ?? null,
      billingUnitType: billing.billingUnitType ?? null,
      isEssential: entry.isEssential ?? false,
      isActive: true,
      isControlled: entry.governance.isControlled,
      controlledSchedule: entry.governance.controlledSchedule ?? null,
      requiresWitness: entry.governance.requiresWitness,
      requiresDoubleSign: entry.governance.requiresDoubleSign,
      searchText,
    };

    let catalogId: string;
    if (dryRun) {
      const existing = await prisma.catalogMedication.findUnique({
        where: { code: entry.catalogCode },
        select: { id: true },
      });
      if (!existing && entry.mode === "ENRICH") {
        result.skippedMissingCatalog += 1;
        result.conflicts.push({
          catalogCode: entry.catalogCode,
          reason: "ENRICH target catalog missing",
        });
        continue;
      }
      catalogId = existing?.id ?? "dry-run";
      if (existing) result.catalogEnriched += 1;
      else result.catalogCreated += 1;
    } else {
      const existing = await prisma.catalogMedication.findUnique({
        where: { code: entry.catalogCode },
        select: { id: true },
      });
      if (!existing && entry.mode === "ENRICH") {
        result.skippedMissingCatalog += 1;
        result.conflicts.push({
          catalogCode: entry.catalogCode,
          reason: "ENRICH target catalog missing",
        });
        continue;
      }
      const row = await prisma.catalogMedication.upsert({
        where: { code: entry.catalogCode },
        update: upsertBody,
        create: { code: entry.catalogCode, ...upsertBody },
      });
      catalogId = row.id;
      if (existing) result.catalogEnriched += 1;
      else result.catalogCreated += 1;

      for (const alias of entry.aliases) {
        const normalized = alias.trim().toLowerCase();
        if (!normalized) continue;
        const existingAlias = await prisma.medicationAlias.findUnique({
          where: {
            catalogMedicationId_alias: { catalogMedicationId: catalogId, alias: normalized },
          },
        });
        if (!existingAlias) {
          await prisma.medicationAlias.create({
            data: {
              catalogMedicationId: catalogId,
              alias: normalized,
              language: "en",
            },
          });
          result.aliasesAdded += 1;
        }
      }

      const billingCatalogExists = await prisma.billingCatalog.findFirst({
        where: { triggerSource: "MEDICATION", externalCode: entry.catalogCode },
      });
      if (!billingCatalogExists) {
        await prisma.billingCatalog.create({
          data: {
            code: billing.hcpcs,
            system: "HCPCS",
            description: billing.description.slice(0, 200),
            triggerSource: "MEDICATION",
            externalCode: entry.catalogCode,
            billClass: "both",
          },
        });
        result.billingCatalogRowsCreated += 1;
      }
    }

    const conceptCode = modules.wave2ConceptCodeForGeneric(entry.genericName);
    const productCode = entry.catalogCode;
    const packageCode = modules.wave2PackageCodeForProduct(productCode);

    let product = await prisma.medicationProduct.findUnique({
      where: { code: productCode },
      include: {
        concept: true,
        packages: { include: { billingProfiles: true } },
      },
    });

    if (!product && !dryRun) {
      const routeCode = mapCatalogRouteToCode(entry.route);
      const adminType = inferAdministrationType(routeCode, entry.administrationType);
      const packageType = inferPackageType(entry.dosageForm, routeCode);

      await prisma.medicationRoute.upsert({
        where: { code: routeCode },
        create: { code: routeCode, label: routeCode },
        update: {},
      });
      const route = await prisma.medicationRoute.findUniqueOrThrow({ where: { code: routeCode } });

      let concept = await prisma.medicationConcept.findUnique({ where: { code: conceptCode } });
      if (!concept) {
        concept = await prisma.medicationConcept.create({
          data: {
            code: conceptCode,
            genericName: entry.genericName,
            displayName: entry.displayNameEn,
            isActive: false,
          },
        });
        result.conceptsCreated += 1;
      }

      const concentration = await prisma.medicationConcentration.create({
        data: { displayText: entry.strength },
      });

      product = await prisma.medicationProduct.create({
        data: {
          code: productCode,
          conceptId: concept.id,
          legacyCatalogMedicationId: catalogId,
          strengthDisplay: entry.strength,
          concentrationId: concentration.id,
          dosageForm: entry.dosageForm,
          defaultRouteId: route.id,
          administrationType: adminType,
          billingClass: entry.billingClass ?? "DRUG_SUPPLY",
          isActive: false,
          governanceStatus: "REVIEW_REQUIRED",
          baselineAvailable: false,
          governanceNotes: mergeEnterpriseWave2GovernanceNotes(null),
        },
        include: {
          concept: true,
          packages: { include: { billingProfiles: true } },
        },
      });
      result.productsCreated += 1;
      result.linkedCatalogMedications += 1;

      const pkg = await prisma.medicationPackage.create({
        data: {
          code: packageCode,
          productId: product.id,
          packageDescription: entry.displayNameFr,
          packageType,
          ndc11: billing.ndc11,
          ndcDisplay: billing.ndcDisplay ?? null,
          isDefaultForProduct: true,
          isActive: false,
        },
      });
      result.packagesCreated += 1;

      await prisma.medicationBillingProfile.create({
        data: {
          packageId: pkg.id,
          hcpcsCodeSuggested: billing.hcpcs,
          hcpcsUnitType: billing.billingUnitType ?? null,
          requiresManualReview: true,
        },
      });
      result.billingProfilesCreated += 1;

      const safetyExists = await prisma.medicationSafetyProfile.findUnique({
        where: { conceptId: concept.id },
      });
      if (!safetyExists) {
        await prisma.medicationSafetyProfile.create({
          data: {
            conceptId: concept.id,
            isControlled: entry.governance.isControlled,
            controlledSchedule: entry.governance.controlledSchedule ?? null,
            requiresWitness: entry.governance.requiresWitness,
            requiresDoubleSign: entry.governance.requiresDoubleSign,
            isHighAlert: entry.governance.isHighAlert,
            lasaGroupId: entry.governance.lasaGroupId ?? null,
          },
        });
        result.safetyProfilesCreated += 1;
      }

      await prisma.medicationAdministrationProfile.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          defaultMarWorkflow:
            adminType === "INFUSION"
              ? MedicationMarWorkflow.INFUSION_SESSION
              : MedicationMarWorkflow.SINGLE_DOSE,
          requiresInfusionSession: adminType === "INFUSION",
        },
        update: {},
      });
    } else if (product) {
      if (product.legacyCatalogMedicationId === catalogId) {
        result.alreadyLinked += 1;
        if (!dryRun) {
          const mergedNotes = mergeEnterpriseWave2GovernanceNotes(product.governanceNotes);
          if (mergedNotes !== (product.governanceNotes ?? "")) {
            await prisma.medicationProduct.update({
              where: { id: product.id },
              data: { governanceNotes: mergedNotes },
            });
            product.governanceNotes = mergedNotes;
            result.wave2GovernanceNotesUpdated += 1;
          }
        }
      } else if (!product.legacyCatalogMedicationId && !dryRun) {
        const mergedNotes = mergeEnterpriseWave2GovernanceNotes(product.governanceNotes);
        await prisma.medicationProduct.update({
          where: { id: product.id },
          data: {
            legacyCatalogMedicationId: catalogId,
            governanceNotes: mergedNotes,
          },
        });
        product.governanceNotes = mergedNotes;
        product.legacyCatalogMedicationId = catalogId;
        result.linkedCatalogMedications += 1;
      }

      const defaultPkg =
        product.packages.find((p) => p.code === packageCode) ?? product.packages[0];
      if (defaultPkg && !dryRun) {
        if (!defaultPkg.ndc11?.trim()) {
          await prisma.medicationPackage.update({
            where: { id: defaultPkg.id },
            data: { ndc11: billing.ndc11, ndcDisplay: billing.ndcDisplay ?? null },
          });
        }
        const hasProfile = defaultPkg.billingProfiles.some((p) => p.hcpcsCodeSuggested?.trim());
        if (!hasProfile) {
          await prisma.medicationBillingProfile.create({
            data: {
              packageId: defaultPkg.id,
              hcpcsCodeSuggested: billing.hcpcs,
              hcpcsUnitType: billing.billingUnitType ?? null,
              requiresManualReview: true,
            },
          });
          result.billingProfilesCreated += 1;
        }
      }

      if (!dryRun) {
        const safetyExists = await prisma.medicationSafetyProfile.findUnique({
          where: { conceptId: product.conceptId },
        });
        if (!safetyExists) {
          await prisma.medicationSafetyProfile.create({
            data: {
              conceptId: product.conceptId,
              isControlled: entry.governance.isControlled,
              controlledSchedule: entry.governance.controlledSchedule ?? null,
              requiresWitness: entry.governance.requiresWitness,
              requiresDoubleSign: entry.governance.requiresDoubleSign,
              isHighAlert: entry.governance.isHighAlert,
              lasaGroupId: entry.governance.lasaGroupId ?? null,
            },
          });
          result.safetyProfilesCreated += 1;
        } else {
          await prisma.medicationSafetyProfile.update({
            where: { conceptId: product.conceptId },
            data: {
              isHighAlert: entry.governance.isHighAlert || safetyExists.isHighAlert,
              requiresWitness:
                entry.governance.requiresWitness || safetyExists.requiresWitness,
              requiresDoubleSign:
                entry.governance.requiresDoubleSign || safetyExists.requiresDoubleSign,
            },
          });
        }
      }
    } else if (dryRun) {
      result.productsCreated += 1;
      result.packagesCreated += 1;
      result.billingProfilesCreated += 1;
      result.safetyProfilesCreated += 1;
      result.linkedCatalogMedications += 1;
    }

    const catalogRow = dryRun
      ? null
      : await prisma.catalogMedication.findUnique({
          where: { code: entry.catalogCode },
          select: {
            id: true,
            code: true,
            genericName: true,
            billingCodeDefault: true,
            ndc11: true,
          },
        });

    const aliases = dryRun
      ? entry.aliases
      : (
          await prisma.medicationAlias.findMany({
            where: { catalogMedicationId: catalogId },
            select: { alias: true },
          })
        ).map((a) => a.alias);

    const searchCheck = modules.validateWave2EntrySearchReady(entry, catalogRow
      ? {
          catalogCode: catalogRow.code,
          genericName: catalogRow.genericName,
          aliases,
        }
      : null);

    let hasBillingProfile = dryRun;
    let packageNdc11 = billing.ndc11;
    let billingProfileHcpcs = billing.hcpcs;
    if (!dryRun && product) {
      const pkg = product.packages.find((p) => p.code === packageCode) ?? product.packages[0];
      hasBillingProfile = (pkg?.billingProfiles.length ?? 0) > 0;
      packageNdc11 = pkg?.ndc11?.trim() || billing.ndc11;
      billingProfileHcpcs = pkg?.billingProfiles[0]?.hcpcsCodeSuggested?.trim() || billing.hcpcs;
    }

    const billingSnapshot = {
      catalogCode: entry.catalogCode,
      billingCodeDefault: billing.hcpcs,
      ndc11: billing.ndc11,
      packageNdc11,
      billingProfileHcpcs,
      hasBillingProfile,
    };

    const billingReadiness = modules.validateWave2MedicationBillingReadiness(
      entry.catalogCode,
      {
        ...billingSnapshot,
        isActive: product?.isActive ?? (dryRun ? false : false),
        governanceStatus: product?.governanceStatus ?? "REVIEW_REQUIRED",
      }
    );

    perMedication.push({
      catalogCode: entry.catalogCode,
      pass: billingReadiness.billingPass && searchCheck.pass && billingReadiness.activationPass,
      billingPass: billingReadiness.billingPass,
      governancePass: true,
      searchPass: searchCheck.pass,
      activationPass: billingReadiness.activationPass,
      failures: [...billingReadiness.failures, ...searchCheck.failures],
    });
  }

  if (result.conflicts.length > 0) {
    throw new EnterpriseWave2FormularySeedError(
      `[enterprise-wave2-formulary] ${result.conflicts.length} conflict(s)`,
      result.conflicts
    );
  }

  const readinessReport = modules.summarizeEnterpriseWave2Readiness(perMedication, {
    manifestEntries: manifest.length,
    catalogCreated: result.catalogCreated,
    catalogEnriched: result.catalogEnriched,
    conceptsCreated: result.conceptsCreated,
    productsCreated: result.productsCreated,
    packagesCreated: result.packagesCreated,
    aliasesAdded: result.aliasesAdded,
    safetyProfilesCreated: result.safetyProfilesCreated,
    billingProfilesCreated: result.billingProfilesCreated,
    billingCatalogRowsCreated: result.billingCatalogRowsCreated,
  });

  return { ...result, readinessReport };
}
