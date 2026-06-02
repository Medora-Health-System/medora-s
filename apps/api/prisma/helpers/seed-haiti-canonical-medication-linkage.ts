import type { PrismaClient } from "@prisma/client";
import { MedicationMarWorkflow } from "@prisma/client";
import {
  HAITI_M15E_GOVERNANCE_NOTES_PREFIX,
  HAITI_M15E_LINKAGE_ONLY_MARKER,
} from "../../src/medication-master/haiti-canonical-linkage.constants";
import { loadHaitiCanonicalLinkageSeedModules } from "./haiti-canonical-linkage-seed-modules";

export class HaitiCanonicalLinkageBackfillError extends Error {
  constructor(
    message: string,
    readonly conflicts: ReadonlyArray<{ catalogMedicationCode: string; reason: string }>
  ) {
    super(message);
    this.name = "HaitiCanonicalLinkageBackfillError";
  }
}

export type SeedHaitiCanonicalMedicationLinkageOptions = {
  dryRun?: boolean;
  /** When true, LINK_READY rows may link to an existing clean target without creating chains. */
  allowLinkReadyWithoutCreate?: boolean;
};

export type SeedHaitiCanonicalMedicationLinkageResult = {
  dryRun: boolean;
  manifestEntries: number;
  createdConcepts: number;
  createdProducts: number;
  createdPackages: number;
  linkedCatalogMedications: number;
  skippedManualReview: number;
  skippedDoNotLink: number;
  skippedQuarantine: number;
  skippedMissingCatalog: number;
  alreadyLinked: number;
  safetyProfilesCreated: number;
  billingProfilesCreated: number;
  conflicts: Array<{ catalogMedicationCode: string; reason: string }>;
  warnings: Array<{ catalogMedicationCode?: string; message: string }>;
};

type CatalogRow = {
  id: string;
  code: string;
  genericName: string | null;
  displayNameFr: string | null;
  displayNameEn: string | null;
  strength: string | null;
  dosageForm: string | null;
  route: string | null;
  administrationType: string | null;
  billingCodeDefault: string | null;
  ndc11: string | null;
  ndcDisplay: string | null;
  billingUnitType: string | null;
  billingClass: string | null;
  isControlled: boolean;
  controlledSchedule: string | null;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
  isActive: boolean;
};

type ExistingProductRow = {
  id: string;
  code: string;
  conceptId: string;
  legacyCatalogMedicationId: string | null;
  baselineAvailable: boolean;
  isActive: boolean;
  governanceStatus: string;
  governanceNotes: string | null;
  concept: { genericName: string; isActive: boolean };
  packages: Array<{
    id: string;
    code: string;
    ndc11: string | null;
    isActive: boolean;
    billingProfiles: Array<{ hcpcsCodeSuggested: string | null }>;
  }>;
};

type ManifestEntry = Awaited<
  ReturnType<typeof loadHaitiCanonicalLinkageSeedModules>
>["HAITI_CANONICAL_LINKAGE_MANIFEST"][number];

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
    rectale: "RECTAL",
    topique: "TOPICAL",
    vaginale: "VAGINAL",
    ophtalmique: "OPHTHALMIC",
    nasale: "NASAL",
    "sous-cutanee": "SUBCUTANEOUS",
    inhalee: "INHALATION",
    inhalation: "INHALATION",
  };
  return (
    routeMap[routeRaw] ??
    (routeRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "") || "OTHER")
  );
}

function inferAdministrationType(routeCode: string, catalogAdminType: string | null | undefined): string {
  const explicit = catalogAdminType?.trim().toUpperCase();
  if (explicit) return explicit;
  const r = routeCode.toUpperCase();
  if (r === "INTRAVENOUS") return "INFUSION";
  if (r === "INJECTION" || r === "INTRAMUSCULAR" || r === "SUBCUTANEOUS") return "PUSH";
  if (r === "ORAL" || r === "RECTAL") return "ORAL";
  return "OTHER";
}

function inferBillingClass(catalogBillingClass: string | null | undefined): string {
  const v = catalogBillingClass?.trim().toUpperCase();
  if (v === "HYDRATION" || v === "THERAPEUTIC" || v === "DRUG_SUPPLY") return v;
  return "UNKNOWN";
}

function inferPackageType(dosageForm: string | null | undefined, routeCode: string): string {
  const form = (dosageForm ?? "").toLowerCase();
  if (form.includes("perfusion") || routeCode === "INTRAVENOUS") return "BAG_PREMIX";
  if (form.includes("injectable")) return "SYRINGE";
  if (form.includes("comprimé") || form.includes("comprime") || form.includes("gélule") || form.includes("capsule")) {
    return "TABLET_BOTTLE";
  }
  if (form.includes("inhal")) return "OTHER";
  return "OTHER";
}

function assertNoQuarantineViolation(
  modules: Awaited<ReturnType<typeof loadHaitiCanonicalLinkageSeedModules>>,
  inspect: {
    productCode: string;
    conceptGenericName: string;
    baselineAvailable?: boolean;
    productIsActive?: boolean;
    conceptIsActive?: boolean;
    governanceStatus?: string | null;
    packageNdc11?: string | null;
  },
  catalogMedicationCode: string,
  conflicts: Array<{ catalogMedicationCode: string; reason: string }>
): void {
  if (modules.productCodeLooksQuarantined(inspect.productCode)) {
    conflicts.push({
      catalogMedicationCode,
      reason: `quarantine: import artifact product code ${inspect.productCode}`,
    });
    return;
  }
  const decision = modules.isQuarantinedCanonicalProduct(inspect);
  if (decision === "QUARANTINE") {
    const classId = modules.classifyQuarantine(inspect);
    const reason = classId ? modules.getQuarantineReason(classId) : "quarantine deny-list";
    conflicts.push({ catalogMedicationCode, reason });
  }
}

/**
 * M1.5E — Create clean Haiti canonical chains and link legacy CatalogMedication rows.
 * Does not activate products or change provider search visibility.
 */
export async function seedHaitiCanonicalMedicationLinkage(
  prisma: PrismaClient,
  options: SeedHaitiCanonicalMedicationLinkageOptions = {}
): Promise<SeedHaitiCanonicalMedicationLinkageResult> {
  const dryRun = options.dryRun === true;
  const modules = await loadHaitiCanonicalLinkageSeedModules();
  const manifest = modules.HAITI_CANONICAL_LINKAGE_MANIFEST;
  const formularyRows = modules.HAITI_MEDICATION_FORMULARY_CATALOG;

  modules.assertHaitiCanonicalLinkageManifest(manifest, formularyRows);

  const result: SeedHaitiCanonicalMedicationLinkageResult = {
    dryRun,
    manifestEntries: manifest.length,
    createdConcepts: 0,
    createdProducts: 0,
    createdPackages: 0,
    linkedCatalogMedications: 0,
    skippedManualReview: 0,
    skippedDoNotLink: 0,
    skippedQuarantine: 0,
    skippedMissingCatalog: 0,
    alreadyLinked: 0,
    safetyProfilesCreated: 0,
    billingProfilesCreated: 0,
    conflicts: [],
    warnings: [],
  };

  const proposedProductCodes = [...new Set(manifest.map((e) => e.proposedProductCode))];
  const proposedConceptCodes = [...new Set(manifest.map((e) => e.proposedConceptCode))];

  const existingProducts = await prisma.medicationProduct.findMany({
    where: {
      OR: [{ code: { in: proposedProductCodes } }, { concept: { code: { in: proposedConceptCodes } } }],
    },
    select: {
      id: true,
      code: true,
      conceptId: true,
      legacyCatalogMedicationId: true,
      baselineAvailable: true,
      isActive: true,
      governanceStatus: true,
      governanceNotes: true,
      concept: { select: { genericName: true, isActive: true } },
      packages: {
        select: {
          id: true,
          code: true,
          ndc11: true,
          isActive: true,
          billingProfiles: { select: { hcpcsCodeSuggested: true } },
        },
      },
    },
  });

  const existingTargets = existingProducts.map((p) => ({
    productCode: p.code,
    conceptGenericName: p.concept.genericName,
    legacyCatalogMedicationId: p.legacyCatalogMedicationId,
    baselineAvailable: p.baselineAvailable,
    productIsActive: p.isActive,
    conceptIsActive: p.concept.isActive,
    governanceStatus: p.governanceStatus,
  }));

  const proposedProductCodeSet = new Set(proposedProductCodes);
  const relevantTargets = existingTargets.filter((t) => proposedProductCodeSet.has(t.productCode));
  const preflight = modules.validateManifest(manifest, { formularyRows, existingTargets: relevantTargets });
  const blockingPreflight = preflight.issues.filter(
    (i) =>
      i.kind === "DUPLICATE_CATALOG_CODE" ||
      i.kind === "DUPLICATE_PRODUCT_CODE" ||
      i.kind === "DUPLICATE_PACKAGE_CODE" ||
      i.kind === "MANIFEST_SCHEMA" ||
      i.kind === "CATALOG_COVERAGE" ||
      i.kind === "QUARANTINE_TARGET_PREFIX" ||
      (i.kind === "QUARANTINE_TARGET" &&
        relevantTargets.some((t) => i.message.startsWith(t.productCode)))
  );
  if (blockingPreflight.length > 0) {
    throw new HaitiCanonicalLinkageBackfillError(
      `[haiti-canonical-linkage-backfill] manifest preflight failed: ${blockingPreflight.map((i) => i.message).join("; ")}`,
      blockingPreflight.map((i) => ({
        catalogMedicationCode: i.catalogMedicationCode ?? "manifest",
        reason: i.message,
      }))
    );
  }

  const productByCode = new Map(existingProducts.map((p) => [p.code, p as ExistingProductRow]));
  const conceptByCode = new Map(
    (
      await prisma.medicationConcept.findMany({
        where: { code: { in: proposedConceptCodes } },
        select: { id: true, code: true, genericName: true, isActive: true },
      })
    ).map((c) => [c.code, c])
  );

  const catalogRows = await prisma.catalogMedication.findMany({
    where: { code: { in: manifest.map((e) => e.catalogMedicationCode) } },
    select: {
      id: true,
      code: true,
      genericName: true,
      displayNameFr: true,
      displayNameEn: true,
      strength: true,
      dosageForm: true,
      route: true,
      administrationType: true,
      billingCodeDefault: true,
      ndc11: true,
      ndcDisplay: true,
      billingUnitType: true,
      billingClass: true,
      isControlled: true,
      controlledSchedule: true,
      requiresWitness: true,
      requiresDoubleSign: true,
      isActive: true,
    },
  });
  const catalogByCode = new Map(catalogRows.map((r) => [r.code, r as CatalogRow]));

  const processEntry = async (entry: ManifestEntry): Promise<void> => {
    const code = entry.catalogMedicationCode;

    if (entry.linkageStatus === "DO_NOT_LINK") {
      result.skippedDoNotLink += 1;
      return;
    }
    if (entry.linkageStatus === "MANUAL_REVIEW") {
      result.skippedManualReview += 1;
      return;
    }

    if (entry.linkageStatus === "LINK_READY") {
      if (!options.allowLinkReadyWithoutCreate) {
        result.skippedManualReview += 1;
        return;
      }
      await processLinkReady(entry);
      return;
    }

    if (entry.linkageStatus !== "MISSING_CANONICAL_TARGET") {
      result.warnings.push({
        catalogMedicationCode: code,
        message: `unsupported linkageStatus ${entry.linkageStatus}`,
      });
      return;
    }

    await processMissingTarget(entry);
  };

  const processLinkReady = async (entry: ManifestEntry): Promise<void> => {
    const catalog = catalogByCode.get(entry.catalogMedicationCode);
    if (!catalog) {
      result.skippedMissingCatalog += 1;
      return;
    }

    const existing = productByCode.get(entry.proposedProductCode);
    if (!existing) {
      result.conflicts.push({
        catalogMedicationCode: entry.catalogMedicationCode,
        reason: "LINK_READY target product missing",
      });
      return;
    }

    assertNoQuarantineViolation(
      modules,
      {
        productCode: existing.code,
        conceptGenericName: existing.concept.genericName,
        baselineAvailable: existing.baselineAvailable,
        productIsActive: existing.isActive,
        conceptIsActive: existing.concept.isActive,
        governanceStatus: existing.governanceStatus,
      },
      entry.catalogMedicationCode,
      result.conflicts
    );

    await linkCatalogToProduct(catalog, existing, entry);
  };

  const processMissingTarget = async (entry: ManifestEntry): Promise<void> => {
    const catalog = catalogByCode.get(entry.catalogMedicationCode);
    if (!catalog) {
      result.skippedMissingCatalog += 1;
      return;
    }

    assertNoQuarantineViolation(
      modules,
      {
        productCode: entry.proposedProductCode,
        conceptGenericName: entry.genericName,
      },
      entry.catalogMedicationCode,
      result.conflicts
    );

    let product = productByCode.get(entry.proposedProductCode);
    if (product) {
      assertNoQuarantineViolation(
        modules,
        {
          productCode: product.code,
          conceptGenericName: product.concept.genericName,
          baselineAvailable: product.baselineAvailable,
          productIsActive: product.isActive,
          conceptIsActive: product.concept.isActive,
          governanceStatus: product.governanceStatus,
        },
        entry.catalogMedicationCode,
        result.conflicts
      );

      if (product.legacyCatalogMedicationId === catalog.id) {
        result.alreadyLinked += 1;
        return;
      }
      if (product.legacyCatalogMedicationId && product.legacyCatalogMedicationId !== catalog.id) {
        result.conflicts.push({
          catalogMedicationCode: entry.catalogMedicationCode,
          reason: `product ${product.code} already linked to another catalog row`,
        });
        return;
      }

      await linkCatalogToProduct(catalog, product, entry);
      return;
    }

    const otherLegacy = existingProducts.find((p) => p.legacyCatalogMedicationId === catalog.id);
    if (otherLegacy && otherLegacy.code !== entry.proposedProductCode) {
      assertNoQuarantineViolation(
        modules,
        {
          productCode: otherLegacy.code,
          conceptGenericName: otherLegacy.concept.genericName,
          baselineAvailable: otherLegacy.baselineAvailable,
          productIsActive: otherLegacy.isActive,
          conceptIsActive: otherLegacy.concept.isActive,
          governanceStatus: otherLegacy.governanceStatus,
        },
        entry.catalogMedicationCode,
        result.conflicts
      );
      if (modules.isQuarantinedMatchTarget({
        code: otherLegacy.code,
        conceptGenericName: otherLegacy.concept.genericName,
        baselineAvailable: otherLegacy.baselineAvailable,
        productIsActive: otherLegacy.isActive,
        conceptIsActive: otherLegacy.concept.isActive,
        governanceStatus: otherLegacy.governanceStatus,
      })) {
        result.skippedQuarantine += 1;
        result.conflicts.push({
          catalogMedicationCode: entry.catalogMedicationCode,
          reason: `catalog already linked to quarantined product ${otherLegacy.code}`,
        });
        return;
      }
      result.conflicts.push({
        catalogMedicationCode: entry.catalogMedicationCode,
        reason: `catalog already linked to product ${otherLegacy.code}`,
      });
      return;
    }

    if (dryRun) {
      result.createdConcepts += conceptByCode.has(entry.proposedConceptCode) ? 0 : 1;
      result.createdProducts += 1;
      result.createdPackages += 1;
      result.linkedCatalogMedications += 1;
      return;
    }

    const routeCode = mapCatalogRouteToCode(catalog.route);
    const adminType = inferAdministrationType(routeCode, catalog.administrationType);
    const billingClass = inferBillingClass(catalog.billingClass);
    const packageType = inferPackageType(catalog.dosageForm, routeCode);

    let conceptId = conceptByCode.get(entry.proposedConceptCode)?.id;
    if (!conceptId) {
      const created = await prisma.medicationConcept.create({
        data: {
          code: entry.proposedConceptCode,
          genericName: entry.genericName,
          displayName: entry.displayName,
          isActive: false,
        },
      });
      conceptId = created.id;
      conceptByCode.set(entry.proposedConceptCode, {
        id: created.id,
        code: created.code,
        genericName: created.genericName,
        isActive: created.isActive,
      });
      result.createdConcepts += 1;
    }

    await prisma.medicationRoute.upsert({
      where: { code: routeCode },
      create: { code: routeCode, label: routeCode },
      update: {},
    });
    const route = await prisma.medicationRoute.findUniqueOrThrow({ where: { code: routeCode } });

    const concentration = await prisma.medicationConcentration.create({
      data: { displayText: catalog.strength?.trim() || entry.strength || "—" },
    });

    const productRow = await prisma.medicationProduct.create({
      data: {
        code: entry.proposedProductCode,
        conceptId,
        legacyCatalogMedicationId: catalog.id,
        strengthDisplay: catalog.strength?.trim() || entry.strength || "—",
        concentrationId: concentration.id,
        dosageForm: catalog.dosageForm?.trim() || entry.form || "unknown",
        defaultRouteId: route.id,
        administrationType: adminType,
        billingClass,
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
        baselineAvailable: false,
        governanceNotes: `${HAITI_M15E_GOVERNANCE_NOTES_PREFIX}\n${HAITI_M15E_LINKAGE_ONLY_MARKER}`,
      },
    });
    product = {
      id: productRow.id,
      code: productRow.code,
      conceptId: productRow.conceptId,
      legacyCatalogMedicationId: productRow.legacyCatalogMedicationId,
      baselineAvailable: productRow.baselineAvailable,
      isActive: productRow.isActive,
      governanceStatus: productRow.governanceStatus,
      governanceNotes: productRow.governanceNotes,
      concept: { genericName: entry.genericName, isActive: false },
      packages: [],
    };
    productByCode.set(product.code, product);
    existingProducts.push(product);
    result.createdProducts += 1;
    result.linkedCatalogMedications += 1;

    const ndcEntry = modules.MEDICATION_BILLING_NDC_BY_CATALOG_CODE[entry.catalogMedicationCode];
    const pkg = await prisma.medicationPackage.create({
      data: {
        code: entry.proposedPackageCode,
        productId: product.id,
        packageDescription: catalog.displayNameFr?.trim() || entry.displayName,
        packageType,
        ndc11: catalog.ndc11?.trim() || ndcEntry?.ndc11 || null,
        ndcDisplay: catalog.ndcDisplay?.trim() || ndcEntry?.ndcDisplay || null,
        isDefaultForProduct: true,
        isActive: false,
      },
    });
    product.packages.push({
      id: pkg.id,
      code: pkg.code,
      ndc11: pkg.ndc11,
      isActive: pkg.isActive,
      billingProfiles: [],
    });
    result.createdPackages += 1;

    await ensureSafetyProfile(prisma, modules, catalog, entry, conceptId, result);
    await ensureBillingProfile(prisma, modules, catalog, entry, pkg.id, result);
    await ensureAdministrationProfile(prisma, product.id, adminType);
  };

  const linkCatalogToProduct = async (
    catalog: CatalogRow,
    product: ExistingProductRow,
    entry: ManifestEntry
  ): Promise<void> => {
    if (product.legacyCatalogMedicationId === catalog.id) {
      result.alreadyLinked += 1;
      return;
    }
    if (product.legacyCatalogMedicationId) {
      result.conflicts.push({
        catalogMedicationCode: entry.catalogMedicationCode,
        reason: `cannot relink product ${product.code}`,
      });
      return;
    }

    if (dryRun) {
      result.linkedCatalogMedications += 1;
      return;
    }

    await prisma.medicationProduct.update({
      where: { id: product.id },
      data: {
        legacyCatalogMedicationId: catalog.id,
        ...(product.governanceNotes?.includes(HAITI_M15E_LINKAGE_ONLY_MARKER)
          ? {}
          : {
              governanceNotes: `${HAITI_M15E_GOVERNANCE_NOTES_PREFIX}\n${HAITI_M15E_LINKAGE_ONLY_MARKER}`,
            }),
      },
    });
    product.legacyCatalogMedicationId = catalog.id;
    result.linkedCatalogMedications += 1;

    const defaultPkg =
      product.packages.find((p) => p.code === entry.proposedPackageCode) ?? product.packages[0];
    if (defaultPkg) {
      await ensureBillingProfile(prisma, modules, catalog, entry, defaultPkg.id, result);
    } else {
      result.warnings.push({
        catalogMedicationCode: entry.catalogMedicationCode,
        message: "no package on existing product for billing mirror",
      });
    }
    await ensureSafetyProfile(prisma, modules, catalog, entry, product.conceptId, result);
  };

  for (const entry of manifest) {
    await processEntry(entry);
  }

  const quarantineConflicts = result.conflicts.filter((c) =>
    c.reason.toLowerCase().includes("quarantine")
  );
  if (quarantineConflicts.length > 0) {
    result.skippedQuarantine += quarantineConflicts.length;
    throw new HaitiCanonicalLinkageBackfillError(
      `[haiti-canonical-linkage-backfill] quarantine violation (${quarantineConflicts.length})`,
      quarantineConflicts
    );
  }

  if (result.conflicts.length > 0) {
    throw new HaitiCanonicalLinkageBackfillError(
      `[haiti-canonical-linkage-backfill] ${result.conflicts.length} conflict(s)`,
      result.conflicts
    );
  }

  return result;
}

async function ensureSafetyProfile(
  prisma: PrismaClient,
  _modules: Awaited<ReturnType<typeof loadHaitiCanonicalLinkageSeedModules>>,
  catalog: CatalogRow,
  entry: ManifestEntry,
  conceptId: string,
  result: SeedHaitiCanonicalMedicationLinkageResult
): Promise<void> {
  const existing = await prisma.medicationSafetyProfile.findUnique({ where: { conceptId } });
  if (existing) return;

  if (result.dryRun) {
    result.safetyProfilesCreated += 1;
    return;
  }

  await prisma.medicationSafetyProfile.create({
    data: {
      conceptId,
      isControlled: catalog.isControlled || entry.safetyFlags.controlled,
      controlledSchedule: catalog.controlledSchedule,
      requiresWitness: catalog.requiresWitness,
      requiresDoubleSign: catalog.requiresDoubleSign,
      isHighAlert: entry.safetyFlags.highAlert,
      lasaGroupId: entry.safetyFlags.lasa ? entry.genericName.slice(0, 64) : null,
    },
  });
  result.safetyProfilesCreated += 1;
}

async function ensureBillingProfile(
  prisma: PrismaClient,
  modules: Awaited<ReturnType<typeof loadHaitiCanonicalLinkageSeedModules>>,
  catalog: CatalogRow,
  entry: ManifestEntry,
  packageId: string,
  result: SeedHaitiCanonicalMedicationLinkageResult
): Promise<void> {
  const hcpcs =
    catalog.billingCodeDefault?.trim() ||
    modules.resolveMedicationHcpcsForCatalogRow(catalog, modules.MEDICATION_BILLING_MAPPING_BY_CODE) ||
    modules.MEDICATION_BILLING_MAPPING_BY_CODE[entry.catalogMedicationCode]?.hcpcs;

  const pkg = await prisma.medicationPackage.findUnique({
    where: { id: packageId },
    select: { ndc11: true, billingProfiles: { select: { hcpcsCodeSuggested: true } } },
  });
  if (!pkg) return;

  const existingHcpcs = pkg.billingProfiles.find((p) => p.hcpcsCodeSuggested?.trim())?.hcpcsCodeSuggested?.trim();
  if (existingHcpcs && hcpcs && existingHcpcs !== hcpcs) {
    result.conflicts.push({
      catalogMedicationCode: entry.catalogMedicationCode,
      reason: `billing HCPCS conflict: package ${existingHcpcs} vs catalog ${hcpcs}`,
    });
    return;
  }

  const ndcEntry = modules.MEDICATION_BILLING_NDC_BY_CATALOG_CODE[entry.catalogMedicationCode];
  if (pkg.ndc11?.trim() && ndcEntry?.ndc11 && pkg.ndc11 !== ndcEntry.ndc11) {
    result.conflicts.push({
      catalogMedicationCode: entry.catalogMedicationCode,
      reason: `NDC conflict on package`,
    });
    return;
  }

  if (!hcpcs && !ndcEntry) {
    result.warnings.push({
      catalogMedicationCode: entry.catalogMedicationCode,
      message: "billing preservation: no HCPCS/NDC manifest entry (M1.4B may not be applied)",
    });
    return;
  }

  if (result.dryRun) {
    if (hcpcs && !existingHcpcs) result.billingProfilesCreated += 1;
    return;
  }

  if (hcpcs && !existingHcpcs) {
    await prisma.medicationBillingProfile.create({
      data: {
        packageId,
        hcpcsCodeSuggested: hcpcs,
        hcpcsUnitType: catalog.billingUnitType,
        requiresManualReview: true,
      },
    });
    result.billingProfilesCreated += 1;
  }

  if (ndcEntry && !pkg.ndc11?.trim()) {
    await prisma.medicationPackage.update({
      where: { id: packageId },
      data: { ndc11: ndcEntry.ndc11, ndcDisplay: ndcEntry.ndcDisplay },
    });
  }
}

async function ensureAdministrationProfile(
  prisma: PrismaClient,
  productId: string,
  adminType: string
): Promise<void> {
  const existing = await prisma.medicationAdministrationProfile.findUnique({ where: { productId } });
  if (existing) return;

  await prisma.medicationAdministrationProfile.create({
    data: {
      productId,
      defaultMarWorkflow:
        adminType === "INFUSION" ? MedicationMarWorkflow.INFUSION_SESSION : MedicationMarWorkflow.SINGLE_DOSE,
      requiresInfusionSession: adminType === "INFUSION",
    },
  });
}
