/**
 * Orderable Catalog Completion — audit + safe completion + search validation.
 * CatalogMedication-first. Does not bulk-activate dual-layer products.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  MEDICATION_ORDERABLE_CATALOG_COMPLETION_PROGRAM_KEY,
  MEDICATION_ORDERABLE_CATALOG_COMPLETION_VERSION,
  MEDICATION_ORDERABLE_COMMON_CLINICAL_QUERIES,
  assertMedicationOrderableCatalogCompletionSafetyDefaults,
  classifyCatalogOrderability,
  deriveDosageFormFromExistingText,
  deriveStrengthFromExistingText,
  isTestOrNonclinicalCatalog,
  normalizeMkExpansionWave3ConceptKey,
} from "@medora/shared";

const OUT_DIR = resolve(__dirname, "../audit-summaries");
const WAVE2 = resolve(__dirname, "../wave2/data/em-wave2-catalog-candidates.json");
const WAVE3 = resolve(__dirname, "../wave3/data/medora-curated-wave3-candidates.json");

export type OrderableCompletionMode =
  | "AUDIT"
  | "COMPLETE"
  | "VERIFY"
  | "REPORT"
  | "DRY_RUN";

export type OrderableBaseline = {
  generatedAt: string;
  catalogTotal: number;
  catalogActive: number;
  catalogInactive: number;
  distinctGenerics: number;
  aliases: number;
  brandAliasRows: number;
  concepts: number;
  products: number;
  productsActive: number;
  packages: number;
  clinicallyRelevantCatalogRows: number;
  providerOrderableCatalogRows: number;
  nonOrderableCatalogRows: number;
  coveragePercent: number;
  blockers: Record<string, number>;
  ordersUsingCatalogMed: number;
  administrations: number;
  recommendationDefinitions: number;
};

function writeArtifact(filename: string, payload: unknown): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = resolve(OUT_DIR, filename);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}

function normGeneric(raw: string | null | undefined): string {
  return normalizeMkExpansionWave3ConceptKey(raw ?? "");
}

function loadBrandMapFromCandidates(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const file of [WAVE2, WAVE3]) {
    if (!existsSync(file)) continue;
    const rows = JSON.parse(readFileSync(file, "utf8")) as Array<{
      genericName?: string;
      brands?: string[];
      aliases?: string[];
    }>;
    for (const row of rows) {
      const g = normGeneric(row.genericName);
      if (!g) continue;
      if (!map.has(g)) map.set(g, new Set());
      for (const b of [...(row.brands ?? []), ...(row.aliases ?? [])]) {
        const alias = String(b).trim().toLowerCase();
        if (alias.length >= 2) map.get(g)!.add(alias);
      }
    }
  }
  return map;
}

export async function collectOrderableBaseline(
  prisma: PrismaClient
): Promise<OrderableBaseline> {
  const [
    catalogTotal,
    catalogActive,
    aliases,
    concepts,
    products,
    productsActive,
    packages,
    ordersUsingCatalogMed,
    administrations,
  ] = await Promise.all([
    prisma.catalogMedication.count(),
    prisma.catalogMedication.count({ where: { isActive: true } }),
    prisma.medicationAlias.count(),
    prisma.medicationConcept.count(),
    prisma.medicationProduct.count(),
    prisma.medicationProduct.count({ where: { isActive: true } }),
    prisma.medicationPackage.count(),
    prisma.orderItem.count({ where: { catalogItemType: "MEDICATION" } }),
    prisma.medicationAdministration.count(),
  ]);

  const rows = await prisma.catalogMedication.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      genericName: true,
      strength: true,
      dosageForm: true,
      route: true,
      isActive: true,
      legacyMedicationProducts: {
        select: { governanceStatus: true, isActive: true },
      },
    },
  });

  const generics = new Set<string>();
  const blockers: Record<string, number> = {};
  let clinicallyRelevant = 0;
  let orderable = 0;
  let brandish = 0;

  // Count brand-like aliases (not equal to generic)
  const aliasRows = await prisma.medicationAlias.findMany({
    select: { alias: true, catalogMedication: { select: { genericName: true } } },
  });
  for (const a of aliasRows) {
    const g = normGeneric(a.catalogMedication.genericName);
    const al = normGeneric(a.alias);
    if (al && g && al !== g) brandish += 1;
  }

  for (const r of rows) {
    const g = normGeneric(r.genericName);
    if (g) generics.add(g);
    const linked = r.legacyMedicationProducts;
    const cls = classifyCatalogOrderability({
      code: r.code,
      name: r.name,
      genericName: r.genericName,
      strength: r.strength,
      dosageForm: r.dosageForm,
      route: r.route,
      isActive: r.isActive,
      linkedProductGovernanceStatus: linked?.governanceStatus ?? null,
    });
    if (!isTestOrNonclinicalCatalog(r)) clinicallyRelevant += 1;
    if (cls.orderable) orderable += 1;
    else {
      blockers[cls.blocker] = (blockers[cls.blocker] ?? 0) + 1;
    }
  }

  let recommendationDefinitions = 0;
  try {
    recommendationDefinitions = await prisma.medicationRecommendationDefinition.count();
  } catch {
    recommendationDefinitions = 0;
  }

  const coveragePercent =
    clinicallyRelevant > 0
      ? Math.round((orderable / clinicallyRelevant) * 10000) / 100
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    catalogTotal,
    catalogActive,
    catalogInactive: catalogTotal - catalogActive,
    distinctGenerics: generics.size,
    aliases,
    brandAliasRows: brandish, // measured brand-like alias rows (alias ≠ generic)
    concepts,
    products,
    productsActive,
    packages,
    clinicallyRelevantCatalogRows: clinicallyRelevant,
    providerOrderableCatalogRows: orderable,
    nonOrderableCatalogRows: clinicallyRelevant - orderable,
    coveragePercent,
    blockers,
    ordersUsingCatalogMed,
    administrations,
    recommendationDefinitions,
  };
}

async function rebuildSearchText(
  prisma: PrismaClient,
  catalogId: string
): Promise<void> {
  const row = await prisma.catalogMedication.findUnique({
    where: { id: catalogId },
    include: { aliases: { select: { alias: true } } },
  });
  if (!row) return;
  const parts = [
    row.name,
    row.displayNameEn,
    row.displayNameFr,
    row.genericName,
    row.strength,
    row.dosageForm,
    row.route,
    row.therapeuticClass,
    ...row.aliases.map((a) => a.alias),
  ]
    .map((p) => String(p ?? "").toLowerCase().trim())
    .filter(Boolean);
  const searchText = [...new Set(parts)].join(" ").slice(0, 2000);
  if (searchText !== (row.searchText || "")) {
    await prisma.catalogMedication.update({
      where: { id: catalogId },
      data: { searchText },
    });
  }
}

export type OrderableCompletionResult = {
  mode: OrderableCompletionMode;
  programKey: string;
  importerVersion: string;
  dryRun: boolean;
  baselineBefore: OrderableBaseline | null;
  baselineAfter: OrderableBaseline | null;
  metadataStrengthFilled: number;
  metadataFormFilled: number;
  aliasesCreated: number;
  searchTextUpdated: number;
  manualReview: Array<{ catalogId: string; code: string; reason: string }>;
  commonClinicalSearch: {
    queries: number;
    passed: number;
    failed: string[];
    passRate: number;
  };
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  productsActivated: number;
  checksumBrandSource: string;
};

async function validateCommonClinicalSearch(
  prisma: PrismaClient
): Promise<OrderableCompletionResult["commonClinicalSearch"]> {
  const failed: string[] = [];
  let passed = 0;
  for (const q of MEDICATION_ORDERABLE_COMMON_CLINICAL_QUERIES) {
    const term = q.trim();
    const termVariants = [
      term,
      term.replace(/\//g, " / "),
      term.replace(/\//g, " "),
      ...term.split(/[\/]/).map((p) => p.trim()).filter((p) => p.length >= 3),
    ];
    const uniqueTerms = [...new Set(termVariants.map((t) => t.trim()).filter(Boolean))];
    const where = {
      isActive: true,
      OR: uniqueTerms.flatMap((t) => [
        { name: { contains: t, mode: "insensitive" as const } },
        { genericName: { contains: t, mode: "insensitive" as const } },
        { displayNameEn: { contains: t, mode: "insensitive" as const } },
        { searchText: { contains: t, mode: "insensitive" as const } },
        {
          aliases: {
            some: { alias: { contains: t.toLowerCase(), mode: "insensitive" as const } },
          },
        },
      ]),
    };
    // Prefer a fully-shaped orderable hit over incomplete fixture/MST rows.
    const shapedHit = await prisma.catalogMedication.findFirst({
      where: {
        ...where,
        NOT: [{ strength: null }, { strength: "" }],
        AND: [
          { NOT: [{ dosageForm: null }, { dosageForm: "" }] },
          { NOT: [{ route: null }, { route: "" }] },
          { NOT: [{ genericName: null }, { genericName: "" }] },
        ],
      },
      select: { id: true },
    });
    if (shapedHit) passed += 1;
    else failed.push(term);
  }
  const queries = MEDICATION_ORDERABLE_COMMON_CLINICAL_QUERIES.length;
  return {
    queries,
    passed,
    failed,
    passRate: queries > 0 ? passed / queries : 0,
  };
}

export async function runOrderableCatalogCompletion(
  prisma: PrismaClient,
  mode: OrderableCompletionMode
): Promise<OrderableCompletionResult> {
  assertMedicationOrderableCatalogCompletionSafetyDefaults();
  const mutate = mode === "COMPLETE";
  const dryRun = !mutate;
  const baselineBefore = await collectOrderableBaseline(prisma);
  const brandMap = loadBrandMapFromCandidates();
  const brandBuf = Buffer.from(
    JSON.stringify(
      [...brandMap.entries()].map(([k, v]) => [k, [...v].sort()]).sort()
    )
  );
  const checksumBrandSource = createHash("sha256").update(brandBuf).digest("hex");

  const result: OrderableCompletionResult = {
    mode,
    programKey: MEDICATION_ORDERABLE_CATALOG_COMPLETION_PROGRAM_KEY,
    importerVersion: MEDICATION_ORDERABLE_CATALOG_COMPLETION_VERSION,
    dryRun,
    baselineBefore,
    baselineAfter: null,
    metadataStrengthFilled: 0,
    metadataFormFilled: 0,
    aliasesCreated: 0,
    searchTextUpdated: 0,
    manualReview: [],
    commonClinicalSearch: { queries: 0, passed: 0, failed: [], passRate: 0 },
    orderMutations: 0,
    marMutations: 0,
    chartMutations: 0,
    productsActivated: 0,
    checksumBrandSource,
  };

  if (mode === "AUDIT" || mode === "REPORT") {
    result.commonClinicalSearch = await validateCommonClinicalSearch(prisma);
    result.baselineAfter = baselineBefore;
    return result;
  }

  // Propagate existing DB aliases across same generic + candidate brands
  const existingAliasByGeneric = new Map<string, Set<string>>();
  const aliasJoin = await prisma.medicationAlias.findMany({
    select: {
      alias: true,
      catalogMedication: { select: { genericName: true } },
    },
  });
  for (const row of aliasJoin) {
    const g = normGeneric(row.catalogMedication.genericName);
    if (!g) continue;
    if (!existingAliasByGeneric.has(g)) existingAliasByGeneric.set(g, new Set());
    existingAliasByGeneric.get(g)!.add(row.alias.trim().toLowerCase());
  }

  const catalogs = await prisma.catalogMedication.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      displayNameEn: true,
      displayNameFr: true,
      genericName: true,
      strength: true,
      dosageForm: true,
      route: true,
      isActive: true,
      searchText: true,
      legacyMedicationProducts: {
        select: {
          id: true,
          strengthDisplay: true,
          dosageForm: true,
          governanceStatus: true,
        },
      },
    },
  });

  // Sibling metadata from same generic (existing catalog values only — never invent).
  const siblingStrength = new Map<string, string>();
  const siblingForm = new Map<string, string>();
  for (const row of catalogs) {
    const g = normGeneric(row.genericName);
    if (!g) continue;
    if ((row.strength || "").trim() && !siblingStrength.has(g)) {
      siblingStrength.set(g, (row.strength || "").trim());
    }
    if ((row.dosageForm || "").trim() && !siblingForm.has(g)) {
      siblingForm.set(g, (row.dosageForm || "").trim());
    }
  }

  for (const row of catalogs) {
    if (isTestOrNonclinicalCatalog(row)) {
      if (!row.isActive) {
        result.manualReview.push({
          catalogId: row.id,
          code: row.code,
          reason: "TEST_OR_NONCLINICAL",
        });
      }
      continue;
    }

    const linked = row.legacyMedicationProducts;
    const gov = (linked?.governanceStatus || "").toUpperCase();
    if (gov === "BLOCKED" || gov === "RETIRED") {
      result.manualReview.push({
        catalogId: row.id,
        code: row.code,
        reason: `PRODUCT_${gov}`,
      });
      continue;
    }

    let strength = (row.strength || "").trim();
    let dosageForm = (row.dosageForm || "").trim();
    const route = (row.route || "").trim();

    const gKey = normGeneric(row.genericName);
    if (!strength) {
      const derived =
        deriveStrengthFromExistingText(
          row.name,
          row.displayNameEn,
          row.displayNameFr,
          linked?.strengthDisplay
        ) || (gKey ? siblingStrength.get(gKey) ?? null : null);
      if (derived) {
        strength = derived;
        result.metadataStrengthFilled += 1;
        if (mutate) {
          await prisma.catalogMedication.update({
            where: { id: row.id },
            data: { strength: derived },
          });
        }
      } else if (row.isActive) {
        result.manualReview.push({
          catalogId: row.id,
          code: row.code,
          reason: "MISSING_STRENGTH_UNDERIVABLE",
        });
      }
    }

    if (!dosageForm) {
      const derived =
        deriveDosageFormFromExistingText(
          row.name,
          row.displayNameEn,
          row.displayNameFr,
          row.dosageForm,
          linked?.dosageForm
        ) || (gKey ? siblingForm.get(gKey) ?? null : null);
      if (derived) {
        dosageForm = derived;
        result.metadataFormFilled += 1;
        if (mutate) {
          await prisma.catalogMedication.update({
            where: { id: row.id },
            data: { dosageForm: derived },
          });
        }
      } else if (row.isActive && strength) {
        result.manualReview.push({
          catalogId: row.id,
          code: row.code,
          reason: "MISSING_FORM_UNDERIVABLE",
        });
      }
    }

    if (!route && row.isActive) {
      result.manualReview.push({
        catalogId: row.id,
        code: row.code,
        reason: "MISSING_ROUTE_UNDERIVABLE",
      });
    }

    // Alias propagation for active clinical rows
    if (row.isActive) {
      const g = normGeneric(row.genericName);
      const wanted = new Set<string>();
      for (const a of existingAliasByGeneric.get(g) ?? []) wanted.add(a);
      for (const a of brandMap.get(g) ?? []) wanted.add(a);
      // Do not add genericName as alias — catalog genericName is already searchable.

      const existing = await prisma.medicationAlias.findMany({
        where: { catalogMedicationId: row.id },
        select: { alias: true },
      });
      const have = new Set(existing.map((e) => e.alias.trim().toLowerCase()));
      const toCreate = [...wanted].filter((alias) => alias.length >= 2 && !have.has(alias));
      if (toCreate.length > 0) {
        if (mutate) {
          const created = await prisma.medicationAlias.createMany({
            data: toCreate.map((alias) => ({
              catalogMedicationId: row.id,
              alias,
              language: "en",
              isPrimary: false,
            })),
            skipDuplicates: true,
          });
          result.aliasesCreated += created.count;
          if (created.count > 0) {
            await rebuildSearchText(prisma, row.id);
            result.searchTextUpdated += 1;
          }
        } else {
          result.aliasesCreated += toCreate.length;
          result.searchTextUpdated += 1;
        }
      } else if (mutate && (!strength || !dosageForm)) {
        // metadata-only update may have occurred above
      }
    }
  }

  if (mode === "VERIFY" || mode === "COMPLETE" || mode === "DRY_RUN") {
    result.commonClinicalSearch = await validateCommonClinicalSearch(prisma);
    result.baselineAfter = await collectOrderableBaseline(prisma);
  }

  // Cap manual review list for artifact size
  result.manualReview = result.manualReview.slice(0, 500);
  return result;
}

export { writeArtifact as writeOrderableCompletionArtifact };
