/**
 * Wave 4 clinical library import (reuses Wave 3 platform pattern) — source-aware staging + CatalogMedication-first APPLY.
 * Modes: AUDIT | VALIDATE | DRY_RUN | APPLY | VERIFY | REPORT | RECONCILE
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import { MedicationMarWorkflow } from "@prisma/client";
import {
  MK_EXPANSION_WAVE3_SOURCE_REGISTRY,
  MK_EXPANSION_WAVE4_IMPORTER_VERSION,
  MK_EXPANSION_WAVE4_PROGRAM_KEY,
  assertMkExpansionWave4SafetyDefaults,
  assertMkExpansionWave4SourceApprovedForIngestion,
  buildMkExpansionWave4VariantSearchText,
  classifyMkExpansionWave4Candidate,
  mkExpansionWave4CatalogCode,
  mkExpansionWave4ConceptCode,
  normalizeMkExpansionWave4ConceptKey,
  type MkExpansionWave4Candidate,
  type MkExpansionWave4PipelineMode,
} from "@medora/shared";

const DEFAULT_DATA = resolve(__dirname, "data/medora-curated-wave4-candidates.json");
const OUT_DIR = resolve(__dirname, "../audit-summaries");

export type Wave4Baseline = {
  generatedAt: string;
  catalogTotal: number;
  catalogActive: number;
  distinctNormalizedGenerics: number;
  aliases: number;
  concepts: number;
  products: number;
  packages: number;
  productsWithLegacyLink: number;
  rxNormMappedConcepts: number;
  rxNormStagingConcepts: number;
  ordersUsingCatalogMed: number;
  dispenses: number;
  administrations: number;
  recommendationDefinitions: number;
};

function normGeneric(raw: string | null | undefined): string {
  return normalizeMkExpansionWave4ConceptKey(raw ?? "");
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
    topique: "TOPICAL",
    topical: "TOPICAL",
    nasale: "NASAL",
    nasal: "NASAL",
    ophtalmique: "OPHTHALMIC",
    ophthalmic: "OPHTHALMIC",
    rectale: "RECTAL",
    rectal: "RECTAL",
    sublingual: "SUBLINGUAL",
  };
  return (
    routeMap[routeRaw] ??
    (routeRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "") || "OTHER")
  );
}

export function writeWave4Artifact(filename: string, payload: unknown): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = resolve(OUT_DIR, filename);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}

export function loadWave4Candidates(filePath = DEFAULT_DATA): {
  candidates: MkExpansionWave4Candidate[];
  checksumSha256: string;
  fileName: string;
} {
  if (!existsSync(filePath)) {
    throw new Error(`Wave 4 source file missing: ${filePath}`);
  }
  const buf = readFileSync(filePath);
  const checksumSha256 = createHash("sha256").update(buf).digest("hex");
  const raw = JSON.parse(buf.toString("utf8")) as MkExpansionWave4Candidate[];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Wave 4 candidates empty or invalid");
  }
  return {
    candidates: raw,
    checksumSha256,
    fileName: filePath.split("/").pop() ?? "unknown.json",
  };
}

export async function collectWave4Baseline(prisma: PrismaClient): Promise<Wave4Baseline> {
  const [
    catalogTotal,
    catalogActive,
    aliases,
    concepts,
    products,
    packages,
    productsWithLegacyLink,
    ordersUsingCatalogMed,
    dispenses,
    administrations,
  ] = await Promise.all([
    prisma.catalogMedication.count(),
    prisma.catalogMedication.count({ where: { isActive: true } }),
    prisma.medicationAlias.count(),
    prisma.medicationConcept.count(),
    prisma.medicationProduct.count(),
    prisma.medicationPackage.count(),
    prisma.medicationProduct.count({
      where: { legacyCatalogMedicationId: { not: null } },
    }),
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

  let rxNormMappedConcepts = 0;
  let rxNormStagingConcepts = 0;
  try {
    rxNormMappedConcepts = await prisma.medicationConcept.count({
      where: { rxNormConceptId: { not: null } },
    });
  } catch {
    /* field may be absent in some environments */
  }
  try {
    rxNormStagingConcepts = await prisma.rxNormStagingConcept.count();
  } catch {
    /* ignore */
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
    distinctNormalizedGenerics,
    aliases,
    concepts,
    products,
    packages,
    productsWithLegacyLink,
    rxNormMappedConcepts,
    rxNormStagingConcepts,
    ordersUsingCatalogMed,
    dispenses,
    administrations,
    recommendationDefinitions,
  };
}

async function loadIdentity(prisma: PrismaClient) {
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

async function ensureConcept(
  prisma: PrismaClient,
  candidate: MkExpansionWave4Candidate,
  dryRun: boolean
): Promise<{ id: string; created: boolean }> {
  const code = mkExpansionWave4ConceptCode(candidate.conceptKey);
  const existing = await prisma.medicationConcept.findUnique({ where: { code } });
  if (existing) return { id: existing.id, created: false };

  const key = normalizeMkExpansionWave4ConceptKey(candidate.conceptKey);
  const slug = key.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
  for (const prefix of ["EM_W2C_", "EM_W3C_", "ENT_W4_"]) {
    const prior = await prisma.medicationConcept.findUnique({
      where: { code: `${prefix}${slug}`.slice(0, 120) },
    });
    if (prior) return { id: prior.id, created: false };
  }

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
  candidate: MkExpansionWave4Candidate;
  variant: MkExpansionWave4Candidate["variants"][number];
  catalogCode: string;
  conceptId: string;
  dryRun: boolean;
  jobId: string;
}): Promise<{
  catalogCreated: boolean;
  aliasesCreated: number;
  productCreated: boolean;
  packageCreated: boolean;
}> {
  const { prisma, candidate, variant, catalogCode, conceptId, dryRun, jobId } = input;
  const searchText = buildMkExpansionWave4VariantSearchText({
    genericName: candidate.genericName,
    displayNameEn: candidate.displayNameEn,
    displayNameFr: candidate.displayNameFr,
    strength: variant.strength,
    dosageForm: variant.dosageForm,
    route: variant.route,
    therapeuticClass: candidate.therapeuticClass,
    domain: candidate.domain,
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
    administrationType: variant.administrationType,
    billingClass: variant.billingClass,
    dataClassification: "PRODUCTION",
    dataSourceLabel: "MEDORA_CURATED_WAVE4",
  };

  // Per-variant provenance id (Wave 3 used concept-only and collided on multi-variant rows).
  const provenanceRowId = `${jobId}:${candidate.conceptKey}:${catalogCode}`.slice(0, 128);

  const applied = await prisma.$transaction(async (tx) => {
    const catalog = await tx.catalogMedication.create({ data: catalogBody });

    let aliasesCreated = 0;
    for (const aliasRaw of [...(candidate.aliases ?? []), ...(candidate.brands ?? [])]) {
      const alias = String(aliasRaw).trim().toLowerCase();
      if (alias.length < 2) continue;
      try {
        await tx.medicationAlias.create({
          data: {
            catalogMedicationId: catalog.id,
            alias,
            language: "en",
            isPrimary: false,
          },
        });
        aliasesCreated += 1;
      } catch {
        /* unique */
      }
    }

    const routeCode = mapRouteCode(variant.route);
    await tx.medicationRoute.upsert({
      where: { code: routeCode },
      create: { code: routeCode, label: routeCode },
      update: {},
    });
    const route = await tx.medicationRoute.findUniqueOrThrow({ where: { code: routeCode } });
    const concentration = await tx.medicationConcentration.create({
      data: { displayText: variant.strength },
    });

    let productCode = catalogCode;
    if (await tx.medicationProduct.findUnique({ where: { code: productCode } })) {
      productCode = `${catalogCode}_W4`.slice(0, 120);
    }

    const product = await tx.medicationProduct.create({
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
        baselineSource: MK_EXPANSION_WAVE4_PROGRAM_KEY,
        baselineSourceRowId: provenanceRowId,
        dualLayerLinkageStatus: "LINKED",
        dualLayerLinkageMethod: "WAVE4_IMPORT",
        governanceNotes: `Wave4 import; domain=${candidate.domain}; source=MEDORA_CURATED; no RxNorm/NDC fabricated`,
      },
    });

    await tx.medicationPackage.create({
      data: {
        code: `${productCode}_PKG`.slice(0, 120),
        productId: product.id,
        packageDescription: candidate.displayNameEn,
        packageType: "UNIT",
        ndc11: null,
        ndcDisplay: null,
        isDefaultForProduct: true,
        isActive: false,
      },
    });

    await tx.medicationAdministrationProfile.upsert({
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

    if (!(await tx.medicationSafetyProfile.findUnique({ where: { conceptId } }))) {
      await tx.medicationSafetyProfile.create({
        data: {
          conceptId,
          isControlled: false,
          isHighAlert: false,
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
  });

  return applied;
}

export type Wave4ImportResult = {
  mode: MkExpansionWave4PipelineMode;
  jobId: string;
  importerVersion: string;
  sourceKey: string;
  sourceChecksumSha256: string;
  sourceFileName: string;
  dryRun: boolean;
  baselineBefore: Wave4Baseline | null;
  baselineAfter: Wave4Baseline | null;
  rowsReceived: number;
  rowsValid: number;
  rowsInvalid: number;
  stagedRows: number;
  newCanonicalConcepts: number;
  existingMatches: number;
  existingNewProducts: number;
  duplicateRejected: number;
  sourceInsufficient: number;
  conflictReview: number;
  catalogRowsCreated: number;
  aliasesCreated: number;
  conceptsCreated: number;
  productsCreated: number;
  packagesCreated: number;
  byDomain: Record<string, { candidates: number; netNewConcepts: number; variantsCreated: number }>;
  conflicts: Array<{ conceptKey: string; reason: string }>;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  recommendationActivations: number;
  productionCdsActivations: number;
  enterpriseActivations: number;
  rxNormAdapter: { stagingConceptsAvailable: number; fabricatedRxCui: number };
  dailyMedAdapter: { implemented: boolean; rowsIngested: number };
  sourceRegistrySnapshot: typeof MK_EXPANSION_WAVE3_SOURCE_REGISTRY;
};

export async function runWave4Import(
  prisma: PrismaClient,
  mode: MkExpansionWave4PipelineMode,
  options: { sourceKey?: string; filePath?: string } = {}
): Promise<Wave4ImportResult> {
  assertMkExpansionWave4SafetyDefaults();
  const sourceKey = options.sourceKey ?? "MEDORA_CURATED";
  assertMkExpansionWave4SourceApprovedForIngestion(sourceKey);

  const mutate = mode === "APPLY";
  const dryRun = !mutate;
  const jobId = `W4_${mode}_${Date.now()}`;

  const baselineBefore = await collectWave4Baseline(prisma);
  const { candidates, checksumSha256, fileName } = loadWave4Candidates(
    options.filePath ?? DEFAULT_DATA
  );

  // VALIDATE / AUDIT: zero mutations; emit registry + checksum
  if (mode === "AUDIT" || mode === "VALIDATE") {
    const invalid = candidates.filter(
      (c) =>
        !normalizeMkExpansionWave4ConceptKey(c.conceptKey) ||
        !c.variants?.length ||
        normalizeMkExpansionWave4ConceptKey(c.conceptKey) !==
          normalizeMkExpansionWave4ConceptKey(c.genericName)
    );
    const result: Wave4ImportResult = {
      mode,
      jobId,
      importerVersion: MK_EXPANSION_WAVE4_IMPORTER_VERSION,
      sourceKey,
      sourceChecksumSha256: checksumSha256,
      sourceFileName: fileName,
      dryRun: true,
      baselineBefore,
      baselineAfter: null,
      rowsReceived: candidates.length,
      rowsValid: candidates.length - invalid.length,
      rowsInvalid: invalid.length,
      stagedRows: 0,
      newCanonicalConcepts: 0,
      existingMatches: 0,
      existingNewProducts: 0,
      duplicateRejected: 0,
      sourceInsufficient: invalid.length,
      conflictReview: 0,
      catalogRowsCreated: 0,
      aliasesCreated: 0,
      conceptsCreated: 0,
      productsCreated: 0,
      packagesCreated: 0,
      byDomain: {},
      conflicts: invalid.slice(0, 50).map((c) => ({
        conceptKey: c.conceptKey,
        reason: "SOURCE_RECORD_INVALID_OR_KEY_MISMATCH",
      })),
      orderMutations: 0,
      marMutations: 0,
      chartMutations: 0,
      recommendationActivations: 0,
      productionCdsActivations: 0,
      enterpriseActivations: 0,
      rxNormAdapter: {
        stagingConceptsAvailable: baselineBefore.rxNormStagingConcepts,
        fabricatedRxCui: 0,
      },
      dailyMedAdapter: { implemented: false, rowsIngested: 0 },
      sourceRegistrySnapshot: MK_EXPANSION_WAVE3_SOURCE_REGISTRY,
    };
    return result;
  }

  const identity = await loadIdentity(prisma);
  const liveGenerics = new Set(identity.generics);
  const liveCodes = new Set(identity.codes);

  const result: Wave4ImportResult = {
    mode,
    jobId,
    importerVersion: MK_EXPANSION_WAVE4_IMPORTER_VERSION,
    sourceKey,
    sourceChecksumSha256: checksumSha256,
    sourceFileName: fileName,
    dryRun,
    baselineBefore,
    baselineAfter: null,
    rowsReceived: candidates.length,
    rowsValid: 0,
    rowsInvalid: 0,
    stagedRows: candidates.length,
    newCanonicalConcepts: 0,
    existingMatches: 0,
    existingNewProducts: 0,
    duplicateRejected: 0,
    sourceInsufficient: 0,
    conflictReview: 0,
    catalogRowsCreated: 0,
    aliasesCreated: 0,
    conceptsCreated: 0,
    productsCreated: 0,
    packagesCreated: 0,
    byDomain: {},
    conflicts: [],
    orderMutations: 0,
    marMutations: 0,
    chartMutations: 0,
    recommendationActivations: 0,
    productionCdsActivations: 0,
    enterpriseActivations: 0,
    rxNormAdapter: {
      stagingConceptsAvailable: baselineBefore.rxNormStagingConcepts,
      fabricatedRxCui: 0,
    },
    dailyMedAdapter: { implemented: false, rowsIngested: 0 },
    sourceRegistrySnapshot: MK_EXPANSION_WAVE3_SOURCE_REGISTRY,
  };

  const bump = (
    domain: string,
    field: "candidates" | "netNewConcepts" | "variantsCreated",
    n = 1
  ) => {
    if (!result.byDomain[domain]) {
      result.byDomain[domain] = {
        candidates: 0,
        netNewConcepts: 0,
        variantsCreated: 0,
      };
    }
    result.byDomain[domain][field] += n;
  };

  for (const candidate of candidates) {
    const domain = String(candidate.domain || "UNKNOWN");
    bump(domain, "candidates");
    const key = normalizeMkExpansionWave4ConceptKey(candidate.conceptKey);
    const genericKey = normalizeMkExpansionWave4ConceptKey(candidate.genericName);

    if (!key || !candidate.variants?.length || (key && genericKey && key !== genericKey)) {
      result.rowsInvalid += 1;
      result.sourceInsufficient += 1;
      result.conflicts.push({
        conceptKey: candidate.conceptKey,
        reason: "SOURCE_INSUFFICIENT_OR_KEY_MISMATCH",
      });
      continue;
    }
    result.rowsValid += 1;

    const classified = classifyMkExpansionWave4Candidate({
      conceptKey: key,
      variants: candidate.variants,
      existingNormalizedGenerics: liveGenerics,
      existingCatalogCodes: liveCodes,
    });

    if (
      classified.outcome === "SOURCE_INSUFFICIENT" ||
      classified.outcome === "DUPLICATE_REJECTED" ||
      classified.outcome === "EXISTING_CANONICAL_MATCH"
    ) {
      if (classified.outcome === "EXISTING_CANONICAL_MATCH") result.existingMatches += 1;
      else if (classified.outcome === "DUPLICATE_REJECTED") result.duplicateRejected += 1;
      else result.sourceInsufficient += 1;
      continue;
    }

    const creatable = classified.variantActions.filter((a) => a.action === "CREATE_VARIANT");
    if (creatable.length === 0) {
      result.duplicateRejected += 1;
      continue;
    }

    const ensured = await ensureConcept(prisma, candidate, dryRun);
    if (ensured.created) result.conceptsCreated += 1;

    if (classified.netNewConcept) {
      result.newCanonicalConcepts += 1;
      bump(domain, "netNewConcepts");
      liveGenerics.add(key);
    } else if (classified.outcome === "EXISTING_CONCEPT_NEW_PRODUCT") {
      result.existingNewProducts += 1;
    }

    for (const action of creatable) {
      const variant = candidate.variants.find(
        (v) =>
          mkExpansionWave4CatalogCode({
            genericName: key,
            strength: v.strength,
            dosageForm: v.dosageForm,
            route: v.route,
          }) === action.catalogCode
      );
      if (!variant || liveCodes.has(action.catalogCode)) {
        result.duplicateRejected += 1;
        continue;
      }
      try {
        const applied = await applyVariant({
          prisma,
          candidate: { ...candidate, conceptKey: key },
          variant,
          catalogCode: action.catalogCode,
          conceptId: ensured.id,
          dryRun,
          jobId,
        });
        if (applied.catalogCreated) {
          result.catalogRowsCreated += 1;
          bump(domain, "variantsCreated");
          liveCodes.add(action.catalogCode);
        }
        result.aliasesCreated += applied.aliasesCreated;
        if (applied.productCreated) result.productsCreated += 1;
        if (applied.packageCreated) result.packagesCreated += 1;
      } catch (err) {
        result.conflictReview += 1;
        result.conflicts.push({
          conceptKey: key,
          reason: `APPLY_FAILED:${err instanceof Error ? err.message : String(err)}`.slice(
            0,
            400
          ),
        });
      }
    }
  }

  if (mode === "VERIFY" || mode === "APPLY" || mode === "REPORT" || mode === "RECONCILE") {
    result.baselineAfter = await collectWave4Baseline(prisma);
  }

  return result;
}

/** Merge duplicate EM_W4C_* shells that share genericName. */
export async function reconcileWave4Concepts(prisma: PrismaClient): Promise<{
  groupsProcessed: number;
  productsRelinked: number;
  conceptsRetired: number;
  remainingActiveDuplicateGenerics: number;
}> {
  const dups = await prisma.$queryRaw<Array<{ g: string; c: number }>>`
    SELECT LOWER(TRIM("genericName")) AS g, COUNT(*)::int AS c
    FROM "MedicationConcept"
    WHERE "code" LIKE 'EM_W4C_%'
      AND ("displayName" IS NULL OR "displayName" NOT LIKE '%[MERGED_INTO_%')
    GROUP BY 1
    HAVING COUNT(*) > 1
  `;

  let groupsProcessed = 0;
  let productsRelinked = 0;
  let conceptsRetired = 0;

  for (const row of dups) {
    const concepts = await prisma.medicationConcept.findMany({
      where: {
        code: { startsWith: "EM_W4C_" },
        genericName: { equals: row.g, mode: "insensitive" },
      },
      select: { id: true, code: true },
    });
    if (concepts.length < 2) continue;
    const preferred = mkExpansionWave4ConceptCode(row.g);
    const keep =
      concepts.find((c) => c.code === preferred) ??
      [...concepts].sort((a, b) => a.code.length - b.code.length)[0];
    const retire = concepts.filter((c) => c.id !== keep.id);
    groupsProcessed += 1;

    for (const r of retire) {
      const moved = await prisma.medicationProduct.updateMany({
        where: { conceptId: r.id },
        data: { conceptId: keep.id },
      });
      productsRelinked += moved.count;

      const keepSafety = await prisma.medicationSafetyProfile.findUnique({
        where: { conceptId: keep.id },
      });
      const retireSafety = await prisma.medicationSafetyProfile.findUnique({
        where: { conceptId: r.id },
      });
      if (!keepSafety && retireSafety) {
        await prisma.medicationSafetyProfile.update({
          where: { id: retireSafety.id },
          data: { conceptId: keep.id },
        });
      } else if (retireSafety) {
        await prisma.medicationSafetyProfile.delete({ where: { id: retireSafety.id } });
      }

      await prisma.medicationConcept.update({
        where: { id: r.id },
        data: {
          isActive: false,
          displayName: `${r.code} [MERGED_INTO_${keep.code}]`,
        },
      });
      conceptsRetired += 1;
    }
  }

  const remaining = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM (
      SELECT LOWER(TRIM("genericName")) AS g
      FROM "MedicationConcept"
      WHERE "code" LIKE 'EM_W4C_%'
        AND ("displayName" IS NULL OR "displayName" NOT LIKE '%[MERGED_INTO_%')
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) t
  `;

  return {
    groupsProcessed,
    productsRelinked,
    conceptsRetired,
    remainingActiveDuplicateGenerics: remaining[0]?.c ?? 0,
  };
}
