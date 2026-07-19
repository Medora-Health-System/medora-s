/**
 * Formulation & Strength Completion — CatalogMedication-only variant CREATE from approved sources.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  MEDICATION_FORMULATION_FAMILY_SEARCH_CHECKS,
  MEDICATION_FORMULATION_STRENGTH_COMPLETION_PROGRAM_KEY,
  MEDICATION_FORMULATION_STRENGTH_COMPLETION_VERSION,
  assertMedicationFormulationStrengthCompletionSafetyDefaults,
  deriveMedicationCatalogCode,
  normalizeFormulationStrengthKey,
  normalizeMkExpansionWave3ConceptKey,
  buildMkExpansionWave3VariantSearchText,
} from "@medora/shared";
import {
  compareCatalogRows,
  matchTierForQuery,
} from "../../../src/order-catalog/catalog-search-rank.util";
import { expandMedicationSearchQuery } from "../../../src/medication-catalog/medication-catalog-search.util";

/** Approved brand/ingredient aliases for hard-acceptance families (no fabricated strengths). */
const PROVIDER_AVAILABILITY_ALIAS_ENRICHMENT: ReadonlyArray<{
  catalogCodeContains: string;
  aliases: readonly string[];
  searchTokens: readonly string[];
}> = [
  {
    catalogCodeContains: "BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_ALAFENAMIDE",
    aliases: [
      "biktarvy",
      "bikt",
      "bictegravir",
      "emtricitabine",
      "tenofovir alafenamide",
      "bictegravir emtricitabine tenofovir alafenamide",
      "bictegravir/emtricitabine/tenofovir alafenamide",
    ],
    searchTokens: [
      "biktarvy",
      "bikt",
      "bictegravir",
      "emtricitabine",
      "tenofovir alafenamide",
      "hiv",
    ],
  },
  {
    catalogCodeContains: "EMPAGLIFLOZIN_10_MG",
    aliases: ["jardiance", "jard", "jar", "empagliflozin"],
    searchTokens: ["jardiance", "jard", "jar", "empagliflozin"],
  },
  {
    catalogCodeContains: "EMPAGLIFLOZIN_25_MG",
    aliases: ["jardiance", "jard", "jar", "empagliflozin"],
    searchTokens: ["jardiance", "jard", "jar", "empagliflozin"],
  },
];

const DEFAULT_DATA = resolve(
  __dirname,
  "data/medora-formulation-completion-candidates.json"
);
const OUT_DIR = resolve(__dirname, "../audit-summaries");

export type FormulationCompletionMode =
  | "AUDIT"
  | "DRY_RUN"
  | "APPLY"
  | "VERIFY"
  | "REPORT";

export type FormulationCandidate = {
  conceptKey: string;
  genericName: string;
  domain: string;
  displayNameEn: string;
  displayNameFr: string;
  therapeuticClass: string;
  aliases: string[];
  brands: string[];
  variants: Array<{
    strength: string;
    dosageForm: string;
    route: string;
    administrationType: string;
    billingClass: string;
  }>;
  sourceNote?: string;
};

export type FormulationBaseline = {
  generatedAt: string;
  catalogActive: number;
  distinctGenerics: number;
  distinctStrengths: number;
  distinctDosageForms: number;
  distinctRoutes: number;
  distinctFormulations: number;
  genericsSingleStrength: number;
  genericsMultiStrength: number;
  aliases: number;
  productsActive: number;
  ordersUsingCatalogMed: number;
  administrations: number;
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

export function loadFormulationCandidates(filePath = DEFAULT_DATA): {
  candidates: FormulationCandidate[];
  checksumSha256: string;
  fileName: string;
} {
  if (!existsSync(filePath)) {
    throw new Error(`Formulation completion source missing: ${filePath}`);
  }
  const buf = readFileSync(filePath);
  const checksumSha256 = createHash("sha256").update(buf).digest("hex");
  const candidates = JSON.parse(buf.toString("utf8")) as FormulationCandidate[];
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("Formulation completion candidates empty");
  }
  return {
    candidates,
    checksumSha256,
    fileName: filePath.split("/").pop() ?? "unknown.json",
  };
}

export async function collectFormulationBaseline(
  prisma: PrismaClient
): Promise<FormulationBaseline> {
  const [catalogActive, aliases, productsActive, ordersUsingCatalogMed, administrations] =
    await Promise.all([
      prisma.catalogMedication.count({ where: { isActive: true } }),
      prisma.medicationAlias.count(),
      prisma.medicationProduct.count({ where: { isActive: true } }),
      prisma.orderItem.count({ where: { catalogItemType: "MEDICATION" } }),
      prisma.medicationAdministration.count(),
    ]);

  const rows = await prisma.catalogMedication.findMany({
    where: { isActive: true },
    select: { genericName: true, strength: true, dosageForm: true, route: true },
  });

  const byGeneric = new Map<string, Set<string>>();
  const strengths = new Set<string>();
  const forms = new Set<string>();
  const routes = new Set<string>();
  const formulations = new Set<string>();

  for (const r of rows) {
    const g = normGeneric(r.genericName);
    if (!g) continue;
    if (!byGeneric.has(g)) byGeneric.set(g, new Set());
    const sk = normalizeFormulationStrengthKey(r.strength || "");
    if (sk) byGeneric.get(g)!.add(sk);
    if (sk) strengths.add(sk);
    if ((r.dosageForm || "").trim()) forms.add(normGeneric(r.dosageForm));
    if ((r.route || "").trim()) routes.add(normGeneric(r.route));
    formulations.add(
      `${g}|${sk}|${normGeneric(r.dosageForm)}|${normGeneric(r.route)}`
    );
  }

  let genericsSingleStrength = 0;
  let genericsMultiStrength = 0;
  for (const set of byGeneric.values()) {
    if (set.size <= 1) genericsSingleStrength += 1;
    else genericsMultiStrength += 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    catalogActive,
    distinctGenerics: byGeneric.size,
    distinctStrengths: strengths.size,
    distinctDosageForms: forms.size,
    distinctRoutes: routes.size,
    distinctFormulations: formulations.size,
    genericsSingleStrength,
    genericsMultiStrength,
    aliases,
    productsActive,
    ordersUsingCatalogMed,
    administrations,
  };
}

async function validateFamilySearch(prisma: PrismaClient): Promise<{
  checks: number;
  passed: number;
  failed: Array<{ query: string; missing: string[]; rankingFailure?: string }>;
  passRate: number;
  exactRankingPassRate: number;
  hardAcceptancePass: boolean;
}> {
  const failed: Array<{ query: string; missing: string[]; rankingFailure?: string }> = [];
  let passed = 0;
  let rankingPassed = 0;
  let rankingChecks = 0;
  let hardOk = true;

  for (const check of MEDICATION_FORMULATION_FAMILY_SEARCH_CHECKS) {
    const missing: string[] = [];
    const terms = expandMedicationSearchQuery(check.query);
    const q = check.query.trim().toLowerCase();

    for (const strengthSub of check.requiredStrengthSubstrings) {
      const exactGeneric = await prisma.catalogMedication.findFirst({
        where: {
          isActive: true,
          genericName: { equals: check.query, mode: "insensitive" },
          strength: { contains: strengthSub, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (exactGeneric) continue;

      const brandOrAlias = await prisma.catalogMedication.findFirst({
        where: {
          isActive: true,
          strength: { contains: strengthSub, mode: "insensitive" },
          OR: [
            { name: { contains: check.query, mode: "insensitive" } },
            { displayNameEn: { contains: check.query, mode: "insensitive" } },
            { displayNameFr: { contains: check.query, mode: "insensitive" } },
            { searchText: { contains: check.query, mode: "insensitive" } },
            {
              aliases: {
                some: {
                  OR: terms.map((term) => ({
                    alias: { contains: term, mode: "insensitive" as const },
                  })),
                },
              },
            },
            ...terms.map((term) => ({
              searchText: { contains: term, mode: "insensitive" as const },
            })),
          ],
        },
        select: { id: true },
      });
      if (!brandOrAlias) missing.push(strengthSub);
    }

    let rankingFailure: string | undefined;
    if (check.mustRankBefore) {
      rankingChecks += 1;
      const candidates = await prisma.catalogMedication.findMany({
        where: {
          isActive: true,
          OR: terms.flatMap((term) => [
            { searchText: { contains: term, mode: "insensitive" as const } },
            { genericName: { contains: term, mode: "insensitive" as const } },
            {
              aliases: {
                some: { alias: { contains: term, mode: "insensitive" as const } },
              },
            },
          ]),
        },
        select: {
          id: true,
          code: true,
          name: true,
          displayNameEn: true,
          displayNameFr: true,
          genericName: true,
          searchText: true,
          isEssential: true,
          sortPriority: true,
          aliases: { select: { alias: true } },
        },
        take: 80,
      });
      const scored = candidates
        .map((row) => ({
          row,
          tier: matchTierForQuery(q, row, {
            aliasOnlyMatch: false,
            aliases: row.aliases.map((a) => a.alias),
          }),
        }))
        .filter((s) => s.tier < 9)
        .sort((a, b) =>
          compareCatalogRows(
            { row: a.row, tier: a.tier },
            { row: b.row, tier: b.tier }
          )
        );
      const top = scored.slice(0, 5);
      const blocker = check.mustRankBefore.toLowerCase();
      const preferredIdx = top.findIndex(
        (s) =>
          (s.row.genericName || "").toLowerCase().includes("empagliflozin") ||
          (s.row.searchText || "").toLowerCase().includes("jardiance") ||
          s.row.aliases.some((a) => a.alias.toLowerCase().includes("jardiance"))
      );
      const blockerIdx = top.findIndex((s) =>
        (s.row.genericName || "").toLowerCase().includes(blocker)
      );
      if (preferredIdx < 0 || (blockerIdx >= 0 && blockerIdx < preferredIdx)) {
        rankingFailure = `expected preferred family before ${check.mustRankBefore}`;
        hardOk = false;
      } else {
        rankingPassed += 1;
      }
    }

    const hardQueries = new Set([
      "jardiance",
      "jard",
      "jar",
      "empagliflozin",
      "biktarvy",
      "bikt",
      "bictegravir",
    ]);
    if (missing.length === 0 && !rankingFailure) {
      passed += 1;
    } else {
      failed.push({ query: check.query, missing, rankingFailure });
      if (hardQueries.has(check.query.toLowerCase())) hardOk = false;
    }
  }

  const checks = MEDICATION_FORMULATION_FAMILY_SEARCH_CHECKS.length;
  return {
    checks,
    passed,
    failed,
    passRate: checks > 0 ? passed / checks : 0,
    exactRankingPassRate: rankingChecks > 0 ? rankingPassed / rankingChecks : 1,
    hardAcceptancePass: hardOk && failed.every((f) => !["Jardiance", "jard", "jar", "Empagliflozin", "Biktarvy", "bikt", "bictegravir"].includes(f.query)),
  };
}

export async function enrichProviderAvailabilityAliases(
  prisma: PrismaClient,
  dryRun: boolean
): Promise<{ aliasesCreated: number; searchTextUpdated: number }> {
  let aliasesCreated = 0;
  let searchTextUpdated = 0;
  for (const rule of PROVIDER_AVAILABILITY_ALIAS_ENRICHMENT) {
    const rows = await prisma.catalogMedication.findMany({
      where: {
        isActive: true,
        code: { contains: rule.catalogCodeContains, mode: "insensitive" },
      },
      select: { id: true, searchText: true, code: true },
    });
    for (const row of rows) {
      const existingText = (row.searchText || "").toLowerCase();
      const missingTokens = rule.searchTokens.filter((t) => !existingText.includes(t.toLowerCase()));
      if (missingTokens.length > 0) {
        searchTextUpdated += 1;
        if (!dryRun) {
          const next = `${row.searchText || ""} ${missingTokens.join(" ")}`
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 2000);
          await prisma.catalogMedication.update({
            where: { id: row.id },
            data: { searchText: next },
          });
        }
      }
      for (const alias of rule.aliases) {
        const normalized = alias.trim().toLowerCase();
        if (normalized.length < 2) continue;
        const existing = await prisma.medicationAlias.findFirst({
          where: { catalogMedicationId: row.id, alias: normalized },
          select: { id: true },
        });
        if (existing) continue;
        aliasesCreated += 1;
        if (!dryRun) {
          try {
            await prisma.medicationAlias.create({
              data: {
                catalogMedicationId: row.id,
                alias: normalized,
                language: "en",
                isPrimary: false,
              },
            });
          } catch {
            /* unique */
          }
        }
      }
    }
  }
  return { aliasesCreated, searchTextUpdated };
}

export type FormulationCompletionResult = {
  mode: FormulationCompletionMode;
  programKey: string;
  importerVersion: string;
  dryRun: boolean;
  sourceChecksumSha256: string;
  sourceFileName: string;
  baselineBefore: FormulationBaseline | null;
  baselineAfter: FormulationBaseline | null;
  candidatesConcepts: number;
  candidatesVariants: number;
  variantsCreated: number;
  variantsSkippedExisting: number;
  aliasesCreated: number;
  availabilityAliasesCreated: number;
  searchTextUpdated: number;
  rejectedNewGeneric: number;
  manualReview: Array<{ conceptKey: string; reason: string }>;
  familySearch: Awaited<ReturnType<typeof validateFamilySearch>>;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  productsActivated: number;
};

export async function runFormulationStrengthCompletion(
  prisma: PrismaClient,
  mode: FormulationCompletionMode,
  options: { filePath?: string } = {}
): Promise<FormulationCompletionResult> {
  assertMedicationFormulationStrengthCompletionSafetyDefaults();
  const mutate = mode === "APPLY";
  const dryRun = !mutate;
  const { candidates, checksumSha256, fileName } = loadFormulationCandidates(
    options.filePath ?? DEFAULT_DATA
  );
  const baselineBefore = await collectFormulationBaseline(prisma);

  const result: FormulationCompletionResult = {
    mode,
    programKey: MEDICATION_FORMULATION_STRENGTH_COMPLETION_PROGRAM_KEY,
    importerVersion: MEDICATION_FORMULATION_STRENGTH_COMPLETION_VERSION,
    dryRun,
    sourceChecksumSha256: checksumSha256,
    sourceFileName: fileName,
    baselineBefore,
    baselineAfter: null,
    candidatesConcepts: candidates.length,
    candidatesVariants: candidates.reduce((n, c) => n + (c.variants?.length ?? 0), 0),
    variantsCreated: 0,
    variantsSkippedExisting: 0,
    aliasesCreated: 0,
    availabilityAliasesCreated: 0,
    searchTextUpdated: 0,
    rejectedNewGeneric: 0,
    manualReview: [],
    familySearch: {
      checks: 0,
      passed: 0,
      failed: [],
      passRate: 0,
      exactRankingPassRate: 0,
      hardAcceptancePass: false,
    },
    orderMutations: 0,
    marMutations: 0,
    chartMutations: 0,
    productsActivated: 0,
  };

  if (mode === "AUDIT" || mode === "REPORT") {
    const enrichPreview = await enrichProviderAvailabilityAliases(prisma, true);
    result.availabilityAliasesCreated = enrichPreview.aliasesCreated;
    result.searchTextUpdated = enrichPreview.searchTextUpdated;
    result.familySearch = await validateFamilySearch(prisma);
    result.baselineAfter = baselineBefore;
    return result;
  }

  const enrich = await enrichProviderAvailabilityAliases(prisma, dryRun);
  result.availabilityAliasesCreated = enrich.aliasesCreated;
  result.searchTextUpdated = enrich.searchTextUpdated;
  result.aliasesCreated += enrich.aliasesCreated;

  const live = await prisma.catalogMedication.findMany({
    where: { isActive: true },
    select: { code: true, genericName: true, strength: true },
  });
  const codes = new Set(live.map((r) => r.code));
  const existingGenerics = new Set(
    live.map((r) => normGeneric(r.genericName)).filter(Boolean)
  );
  const byGS = new Set(
    live.map(
      (r) =>
        `${normGeneric(r.genericName)}|${normalizeFormulationStrengthKey(r.strength || "")}`
    )
  );

  for (const candidate of candidates) {
    const g = normGeneric(candidate.conceptKey || candidate.genericName);
    if (!g || !existingGenerics.has(g)) {
      result.rejectedNewGeneric += 1;
      result.manualReview.push({
        conceptKey: candidate.conceptKey,
        reason: "GENERIC_NOT_IN_CATALOG",
      });
      continue;
    }

    for (const variant of candidate.variants || []) {
      const sk = normalizeFormulationStrengthKey(variant.strength);
      if (!sk || !variant.dosageForm?.trim() || !variant.route?.trim()) {
        result.manualReview.push({
          conceptKey: g,
          reason: "VARIANT_INSUFFICIENT",
        });
        continue;
      }
      const gs = `${g}|${sk}`;
      const catalogCode = deriveMedicationCatalogCode({
        genericName: g,
        strength: variant.strength,
        dosageForm: variant.dosageForm,
        route: variant.route,
      }).slice(0, 120);

      if (codes.has(catalogCode) || byGS.has(gs)) {
        result.variantsSkippedExisting += 1;
        continue;
      }

      const searchText = buildMkExpansionWave3VariantSearchText({
        genericName: candidate.genericName,
        displayNameEn: candidate.displayNameEn || candidate.genericName,
        displayNameFr: candidate.displayNameFr || candidate.genericName,
        strength: variant.strength,
        dosageForm: variant.dosageForm,
        route: variant.route,
        therapeuticClass: candidate.therapeuticClass || "Formulation completion",
        domain: candidate.domain || "FORMULATION_COMPLETION",
        aliases: candidate.aliases || [],
        brands: candidate.brands || [],
      });

      if (dryRun) {
        result.variantsCreated += 1;
        result.aliasesCreated += (candidate.brands || []).length;
        codes.add(catalogCode);
        byGS.add(gs);
        continue;
      }

      const created = await prisma.catalogMedication.create({
        data: {
          code: catalogCode,
          name: candidate.displayNameFr || candidate.displayNameEn || candidate.genericName,
          displayNameEn: candidate.displayNameEn || candidate.genericName,
          displayNameFr: candidate.displayNameFr || candidate.genericName,
          genericName: candidate.genericName,
          strength: variant.strength,
          dosageForm: variant.dosageForm,
          route: variant.route,
          therapeuticClass: candidate.therapeuticClass || "Formulation completion",
          searchText,
          isActive: true,
          isEssential: false,
          administrationType: variant.administrationType,
          billingClass: variant.billingClass,
          dataClassification: "PRODUCTION",
          dataSourceLabel: "MEDORA_FORMULATION_COMPLETION",
        },
      });

      let aliasesCreated = 0;
      for (const brand of candidate.brands || []) {
        const alias = String(brand).trim().toLowerCase();
        if (alias.length < 2) continue;
        try {
          await prisma.medicationAlias.create({
            data: {
              catalogMedicationId: created.id,
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

      result.variantsCreated += 1;
      result.aliasesCreated += aliasesCreated;
      codes.add(catalogCode);
      byGS.add(gs);
    }
  }

  result.familySearch = await validateFamilySearch(prisma);
  if (mode === "APPLY" || mode === "VERIFY" || mode === "DRY_RUN") {
    result.baselineAfter = await collectFormulationBaseline(prisma);
  }
  result.manualReview = result.manualReview.slice(0, 200);
  return result;
}

export { writeArtifact as writeFormulationCompletionArtifact };
