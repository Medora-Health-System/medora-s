/**
 * Wave 2 EM catalog importer — CatalogMedication-first, dual-layer optional link.
 * Modes: AUDIT | DRY_RUN | APPLY | VERIFY | REPORT
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import { MedicationMarWorkflow } from "@prisma/client";
import {
  assertMkExpansionWave2CatalogSafetyDefaults,
  buildMkExpansionWave2VariantSearchText,
  classifyMkExpansionWave2Candidate,
  mkExpansionWave2CatalogConceptCode,
  mkExpansionWave2CatalogVariantCode,
  mkExpansionWave2CatalogPackMarker,
  normalizeMkExpansionWave2ConceptKey,
  type MkExpansionWave2CatalogCandidate,
  type MkExpansionWave2CatalogMode,
  MK_EXPANSION_WAVE2_CATALOG_PROGRAM_KEY,
} from "@medora/shared";

const DATA_PATH = resolve(__dirname, "data/em-wave2-catalog-candidates.json");
const OUT_DIR = resolve(__dirname, "../audit-summaries");

export type Wave2CatalogBaseline = {
  generatedAt: string;
  catalogTotal: number;
  catalogActive: number;
  catalogInactive: number;
  distinctNormalizedGenerics: number;
  aliases: number;
  concepts: number;
  conceptsActive: number;
  products: number;
  packages: number;
  productsWithLegacyLink: number;
  searchAliases: number;
  formularyItems: number;
  rxNormMappedConcepts: number;
  ordersUsingCatalogMed: number;
  dispenses: number;
  administrations: number;
  duplicateCatalogCodes: number;
  recommendationDefinitions: number;
};

function normGeneric(raw: string | null | undefined): string {
  return normalizeMkExpansionWave2ConceptKey(raw ?? "");
}

function mapRouteCode(route: string): string {
  const routeRaw = route
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/é/g, "e");
  const routeMap: Record<string, string> = {
    orale: "ORAL",
    oral: "ORAL",
    injectable: "INJECTION",
    intramusculaire: "INTRAMUSCULAR",
    intraveineuse: "INTRAVENOUS",
    "sous-cutanee": "SUBCUTANEOUS",
    subcutaneous: "SUBCUTANEOUS",
    inhalation: "INHALATION",
    inhalee: "INHALATION",
    topique: "TOPICAL",
    topical: "TOPICAL",
    nasale: "NASAL",
    nasal: "NASAL",
    ophtalmique: "OPHTHALMIC",
    ophthalmic: "OPHTHALMIC",
    otique: "OTIC",
    otic: "OTIC",
    rectale: "RECTAL",
    rectal: "RECTAL",
    sublingual: "SUBLINGUAL",
    buccale: "BUCCAL",
  };
  return (
    routeMap[routeRaw] ??
    (routeRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "") || "OTHER")
  );
}

export function loadWave2CatalogCandidates(): MkExpansionWave2CatalogCandidate[] {
  const raw = JSON.parse(readFileSync(DATA_PATH, "utf8")) as MkExpansionWave2CatalogCandidate[];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Wave 2 candidates JSON missing or empty");
  }
  return raw;
}

export async function collectWave2CatalogBaseline(
  prisma: PrismaClient
): Promise<Wave2CatalogBaseline> {
  const [
    catalogTotal,
    catalogActive,
    catalogInactive,
    aliases,
    concepts,
    conceptsActive,
    products,
    packages,
    productsWithLegacyLink,
    searchAliases,
    formularyItems,
    ordersUsingCatalogMed,
    dispenses,
    administrations,
  ] = await Promise.all([
    prisma.catalogMedication.count(),
    prisma.catalogMedication.count({ where: { isActive: true } }),
    prisma.catalogMedication.count({ where: { isActive: false } }),
    prisma.medicationAlias.count(),
    prisma.medicationConcept.count(),
    prisma.medicationConcept.count({ where: { isActive: true } }),
    prisma.medicationProduct.count(),
    prisma.medicationPackage.count(),
    prisma.medicationProduct.count({
      where: { legacyCatalogMedicationId: { not: null } },
    }),
    prisma.medicationSearchAlias.count(),
    prisma.facilityFormularyItem.count(),
    prisma.orderItem.count({ where: { catalogItemType: "MEDICATION" } }),
    prisma.medicationDispense.count(),
    prisma.medicationAdministration.count(),
  ]);

  const generics = await prisma.catalogMedication.findMany({
    select: { genericName: true },
  });
  const distinctNormalizedGenerics = new Set(
    generics.map((g) => normGeneric(g.genericName)).filter(Boolean)
  ).size;

  const duplicateCatalogCodes = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM (
      SELECT "code" FROM "CatalogMedication" GROUP BY "code" HAVING COUNT(*) > 1
    ) t
  `;

  let rxNormMappedConcepts = 0;
  try {
    rxNormMappedConcepts = await prisma.medicationConcept.count({
      where: { rxNormConceptId: { not: null } },
    });
  } catch {
    rxNormMappedConcepts = 0;
  }

  let recommendationDefinitions = 0;
  try {
    recommendationDefinitions = await prisma.medicationRecommendationDefinition.count();
  } catch {
    recommendationDefinitions = 0;
  }

  return {
    generatedAt: new Date().toISOString(),
    catalogTotal,
    catalogActive,
    catalogInactive,
    distinctNormalizedGenerics,
    aliases,
    concepts,
    conceptsActive,
    products,
    packages,
    productsWithLegacyLink,
    searchAliases,
    formularyItems,
    rxNormMappedConcepts,
    ordersUsingCatalogMed,
    dispenses,
    administrations,
    duplicateCatalogCodes: duplicateCatalogCodes[0]?.c ?? 0,
    recommendationDefinitions,
  };
}

async function loadExistingIdentitySets(prisma: PrismaClient): Promise<{
  generics: Set<string>;
  codes: Set<string>;
}> {
  const rows = await prisma.catalogMedication.findMany({
    select: { code: true, genericName: true },
  });
  const generics = new Set<string>();
  const codes = new Set<string>();
  for (const r of rows) {
    codes.add(r.code);
    const g = normGeneric(r.genericName);
    if (g) generics.add(g);
  }
  return { generics, codes };
}

export type Wave2CatalogImportResult = {
  mode: MkExpansionWave2CatalogMode;
  programKey: string;
  dryRun: boolean;
  baselineBefore: Wave2CatalogBaseline | null;
  baselineAfter: Wave2CatalogBaseline | null;
  candidatesEvaluated: number;
  newCanonicalConcepts: number;
  existingConceptNewVariants: number;
  duplicateRejected: number;
  sourceInsufficient: number;
  conflictReview: number;
  catalogRowsCreated: number;
  aliasesCreated: number;
  conceptsCreated: number;
  productsCreated: number;
  packagesCreated: number;
  synonymsAddedToExisting: number;
  byPack: Record<string, { candidates: number; netNewConcepts: number; variantsCreated: number }>;
  conflicts: Array<{ conceptKey: string; reason: string }>;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  recommendationActivations: number;
  productionCdsActivations: number;
  enterpriseActivations: number;
};

function emptyByPack(): Wave2CatalogImportResult["byPack"] {
  return {};
}

function bumpPack(
  byPack: Wave2CatalogImportResult["byPack"],
  packKey: string,
  field: "candidates" | "netNewConcepts" | "variantsCreated",
  n = 1
) {
  if (!byPack[packKey]) {
    byPack[packKey] = { candidates: 0, netNewConcepts: 0, variantsCreated: 0 };
  }
  byPack[packKey][field] += n;
}

async function ensureConcept(
  prisma: PrismaClient,
  candidate: MkExpansionWave2CatalogCandidate,
  dryRun: boolean
): Promise<{ id: string; created: boolean }> {
  const code = mkExpansionWave2CatalogConceptCode(candidate.conceptKey);
  const existing = await prisma.medicationConcept.findUnique({ where: { code } });
  if (existing) return { id: existing.id, created: false };
  // Prefer Wave 4 stable concept if present for same generic
  const w4 = `ENT_W4_${normalizeMkExpansionWave2ConceptKey(candidate.conceptKey)
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")}`;
  const w4Existing = await prisma.medicationConcept.findUnique({ where: { code: w4 } });
  if (w4Existing) return { id: w4Existing.id, created: false };
  if (dryRun) return { id: "dry-run", created: true };
  const created = await prisma.medicationConcept.create({
    data: {
      code,
      genericName: candidate.genericName,
      displayName: candidate.displayNameEn,
      isActive: false,
    },
  });
  return { id: created.id, created: true };
}

async function applyVariant(input: {
  prisma: PrismaClient;
  candidate: MkExpansionWave2CatalogCandidate;
  variant: MkExpansionWave2CatalogCandidate["variants"][number];
  catalogCode: string;
  conceptId: string;
  dryRun: boolean;
}): Promise<{
  catalogCreated: boolean;
  aliasesCreated: number;
  productCreated: boolean;
  packageCreated: boolean;
}> {
  const { prisma, candidate, variant, catalogCode, conceptId, dryRun } = input;
  const searchText = buildMkExpansionWave2VariantSearchText({
    genericName: candidate.genericName,
    displayNameEn: candidate.displayNameEn,
    displayNameFr: candidate.displayNameFr,
    strength: variant.strength,
    dosageForm: variant.dosageForm,
    route: variant.route,
    therapeuticClass: candidate.therapeuticClass,
    packKey: String(candidate.packKey),
    aliases: candidate.aliases ?? [],
    brands: candidate.brands ?? [],
  });

  if (dryRun) {
    return {
      catalogCreated: true,
      aliasesCreated: (candidate.aliases?.length ?? 0) + (candidate.brands?.length ?? 0),
      productCreated: true,
      packageCreated: true,
    };
  }

  const catalogBody: Prisma.CatalogMedicationCreateInput = {
    code: catalogCode,
    name: candidate.displayNameFr || candidate.displayNameEn,
    displayNameEn: candidate.displayNameEn,
    displayNameFr: candidate.displayNameFr,
    genericName: candidate.genericName,
    strength: variant.strength,
    dosageForm: variant.dosageForm,
    route: variant.route,
    therapeuticClass: candidate.therapeuticClass,
    searchText,
    isActive: true,
    isEssential: false,
    isControlled: candidate.flags?.isControlled ?? false,
    controlledSchedule: candidate.flags?.controlledSchedule ?? null,
    administrationType: variant.administrationType,
    billingClass: variant.billingClass,
  };

  const catalog = await prisma.catalogMedication.create({ data: catalogBody });

  let aliasesCreated = 0;
  const aliasTexts = [
    ...(candidate.aliases ?? []),
    ...(candidate.brands ?? []),
    mkExpansionWave2CatalogPackMarker(String(candidate.packKey)),
  ];
  for (const aliasRaw of aliasTexts) {
    const alias = String(aliasRaw).trim().toLowerCase();
    if (alias.length < 2) continue;
    try {
      await prisma.medicationAlias.create({
        data: {
          catalogMedicationId: catalog.id,
          alias,
          language: "en",
          isPrimary: false,
        },
      });
      aliasesCreated += 1;
    } catch {
      // unique violation — ignore
    }
  }

  const routeCode = mapRouteCode(variant.route);
  await prisma.medicationRoute.upsert({
    where: { code: routeCode },
    create: { code: routeCode, label: routeCode },
    update: {},
  });
  const route = await prisma.medicationRoute.findUniqueOrThrow({ where: { code: routeCode } });

  const concentration = await prisma.medicationConcentration.create({
    data: { displayText: variant.strength },
  });

  let productCode = catalogCode;
  const existingProduct = await prisma.medicationProduct.findUnique({
    where: { code: productCode },
    select: { id: true },
  });
  if (existingProduct) {
    productCode = `${catalogCode}_W2`.slice(0, 120);
  }

  const product = await prisma.medicationProduct.create({
    data: {
      code: productCode,
      conceptId,
      legacyCatalogMedicationId: catalog.id,
      strengthDisplay: variant.strength,
      concentrationId: concentration.id,
      dosageForm: variant.dosageForm,
      defaultRouteId: route.id,
      administrationType: variant.administrationType,
      billingClass: variant.billingClass,
      isActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      baselineAvailable: true,
      baselineSource: MK_EXPANSION_WAVE2_CATALOG_PROGRAM_KEY,
      dualLayerLinkageStatus: "LINKED",
      dualLayerLinkageMethod: "WAVE2_CATALOG_IMPORT",
      governanceNotes: `Wave2 catalog import; pack=${candidate.packKey}; no RxNorm/NDC fabricated`,
    },
  });

  const packageCode = `${productCode}_PKG`.slice(0, 120);
  await prisma.medicationPackage.create({
    data: {
      code: packageCode,
      productId: product.id,
      packageDescription: candidate.displayNameEn,
      packageType: "UNIT",
      ndc11: null,
      ndcDisplay: null,
      isDefaultForProduct: true,
      isActive: false,
    },
  });

  await prisma.medicationAdministrationProfile.upsert({
    where: { productId: product.id },
    create: {
      productId: product.id,
      defaultMarWorkflow:
        variant.administrationType === "INFUSION"
          ? MedicationMarWorkflow.INFUSION_SESSION
          : MedicationMarWorkflow.SINGLE_DOSE,
      requiresInfusionSession: variant.administrationType === "INFUSION",
    },
    update: {},
  });

  const safetyExists = await prisma.medicationSafetyProfile.findUnique({
    where: { conceptId },
  });
  if (!safetyExists) {
    await prisma.medicationSafetyProfile.create({
      data: {
        conceptId,
        isControlled: candidate.flags?.isControlled ?? false,
        controlledSchedule: candidate.flags?.controlledSchedule ?? null,
        isHighAlert: candidate.flags?.isHighAlert ?? false,
        requiresWitness: false,
        requiresDoubleSign: false,
      },
    });
  }

  return {
    catalogCreated: true,
    aliasesCreated,
    productCreated: true,
    packageCreated: true,
  };
}

export async function runWave2CatalogImport(
  prisma: PrismaClient,
  mode: MkExpansionWave2CatalogMode
): Promise<Wave2CatalogImportResult> {
  assertMkExpansionWave2CatalogSafetyDefaults();
  const dryRun = mode === "DRY_RUN" || mode === "AUDIT" || mode === "REPORT";
  const mutate = mode === "APPLY";

  const baselineBefore = await collectWave2CatalogBaseline(prisma);
  const candidates = loadWave2CatalogCandidates();
  const identity = await loadExistingIdentitySets(prisma);

  const result: Wave2CatalogImportResult = {
    mode,
    programKey: MK_EXPANSION_WAVE2_CATALOG_PROGRAM_KEY,
    dryRun: !mutate,
    baselineBefore,
    baselineAfter: null,
    candidatesEvaluated: 0,
    newCanonicalConcepts: 0,
    existingConceptNewVariants: 0,
    duplicateRejected: 0,
    sourceInsufficient: 0,
    conflictReview: 0,
    catalogRowsCreated: 0,
    aliasesCreated: 0,
    conceptsCreated: 0,
    productsCreated: 0,
    packagesCreated: 0,
    synonymsAddedToExisting: 0,
    byPack: emptyByPack(),
    conflicts: [],
    orderMutations: 0,
    marMutations: 0,
    chartMutations: 0,
    recommendationActivations: 0,
    productionCdsActivations: 0,
    enterpriseActivations: 0,
  };

  // Working sets mutate during APPLY so later candidates see earlier creates
  const liveGenerics = new Set(identity.generics);
  const liveCodes = new Set(identity.codes);

  for (const candidate of candidates) {
    result.candidatesEvaluated += 1;
    const packKey = String(candidate.packKey || "UNKNOWN");
    bumpPack(result.byPack, packKey, "candidates");

    const key = normalizeMkExpansionWave2ConceptKey(candidate.conceptKey);
    if (!key || !candidate.variants?.length) {
      result.sourceInsufficient += 1;
      result.conflicts.push({
        conceptKey: candidate.conceptKey,
        reason: "SOURCE_INSUFFICIENT",
      });
      continue;
    }

    const classified = classifyMkExpansionWave2Candidate({
      conceptKey: key,
      variants: candidate.variants,
      existingNormalizedGenerics: liveGenerics,
      existingCatalogCodes: liveCodes,
    });

    if (classified.outcome === "SOURCE_INSUFFICIENT") {
      result.sourceInsufficient += 1;
      continue;
    }
    if (classified.outcome === "DUPLICATE_REJECTED") {
      result.duplicateRejected += 1;
      continue;
    }
    if (classified.outcome === "CONFLICT_REQUIRES_REVIEW") {
      result.conflictReview += 1;
      result.conflicts.push({ conceptKey: key, reason: "CONFLICT_REQUIRES_REVIEW" });
      continue;
    }

    const creatable = classified.variantActions.filter((a) => a.action === "CREATE_VARIANT");
    if (creatable.length === 0) {
      result.duplicateRejected += 1;
      continue;
    }

    let conceptId = "dry-run";
    let conceptCreated = false;
    if (mutate || mode === "DRY_RUN") {
      const ensured = await ensureConcept(prisma, candidate, !mutate);
      conceptId = ensured.id;
      conceptCreated = ensured.created;
      if (conceptCreated) result.conceptsCreated += 1;
    }

    if (classified.netNewConcept) {
      result.newCanonicalConcepts += 1;
      bumpPack(result.byPack, packKey, "netNewConcepts");
      liveGenerics.add(key);
    } else if (classified.outcome === "EXISTING_CONCEPT_NEW_VARIANT") {
      result.existingConceptNewVariants += 1;
    }

    for (const action of creatable) {
      const variant = candidate.variants.find(
        (v) =>
          mkExpansionWave2CatalogVariantCode({
            genericName: key,
            strength: v.strength,
            dosageForm: v.dosageForm,
            route: v.route,
          }) === action.catalogCode
      );
      if (!variant) continue;

      if (liveCodes.has(action.catalogCode)) {
        result.duplicateRejected += 1;
        continue;
      }

      try {
        const applied = await applyVariant({
          prisma,
          candidate: { ...candidate, conceptKey: key },
          variant,
          catalogCode: action.catalogCode,
          conceptId,
          dryRun: !mutate,
        });

        if (applied.catalogCreated) {
          result.catalogRowsCreated += 1;
          bumpPack(result.byPack, packKey, "variantsCreated");
          liveCodes.add(action.catalogCode);
        }
        result.aliasesCreated += applied.aliasesCreated;
        if (applied.productCreated) result.productsCreated += 1;
        if (applied.packageCreated) result.packagesCreated += 1;
      } catch (err) {
        result.conflictReview += 1;
        result.conflicts.push({
          conceptKey: key,
          reason: `APPLY_FAILED:${action.catalogCode}:${
            err instanceof Error ? err.message : String(err)
          }`.slice(0, 400),
        });
      }
    }
  }

  if (mode === "VERIFY" || mode === "APPLY" || mode === "REPORT") {
    result.baselineAfter = await collectWave2CatalogBaseline(prisma);
  }

  return result;
}

export function writeWave2CatalogArtifact(filename: string, payload: unknown): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = resolve(OUT_DIR, filename);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}
