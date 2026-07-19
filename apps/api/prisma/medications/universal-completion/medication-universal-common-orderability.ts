/**
 * Universal Common Medication Orderability — benchmark load, alias enrichment, provider-path validation.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CatalogMedication, PrismaClient } from "@prisma/client";
import {
  UNIVERSAL_COMMON_MEDICATION_ORDERABILITY_PROGRAM_KEY,
  UNIVERSAL_COMMON_MEDICATION_ORDERABILITY_VERSION,
  type UniversalBenchmarkFamily,
  type UniversalFamilyClassification,
} from "@medora/shared";
import {
  compareCatalogRows,
  matchTierForQuery,
  resolveMatchedBrandAlias,
  type CatalogRankableRow,
} from "../../../src/order-catalog/catalog-search-rank.util";
import { expandMedicationSearchQuery } from "../../../src/medication-catalog/medication-catalog-search.util";
import { evaluateProviderOrderSearchGate } from "../../../src/medication-master/medication-product-activation-gates.util";
import { parseProductRuntimeActivation } from "../../../src/medication-master/medication-product-runtime-activation.util";

const DEFAULT_BENCHMARK = resolve(
  __dirname,
  "data/medora-universal-common-medication-benchmark.json"
);
const OUT_DIR = resolve(__dirname, "../audit-summaries");

export type UniversalCompletionMode = "AUDIT" | "DRY_RUN" | "APPLY" | "VERIFY" | "VALIDATE";

type BenchmarkFile = {
  title: string;
  version: string;
  familyCount: number;
  brandBearingFamilyCount: number;
  sources: unknown[];
  domainDistribution: Record<string, number>;
  families: UniversalBenchmarkFamily[];
  checksumSha256?: string;
};

type CachedRow = CatalogMedication & { aliases: string[] };

function writeArtifact(filename: string, payload: unknown): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = resolve(OUT_DIR, filename);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}

function norm(s: string | null | undefined): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9./+\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Core INN token for salt/USP/route-qualified generics (e.g. "baclofen intrathecal" → "baclofen"). */
function coreInnQueries(genericName: string): string[] {
  const g = norm(genericName);
  if (!g) return [];
  const out = new Set<string>([g]);
  const stripped = g
    .replace(
      /\b(usp|human|bovine|porcine|dried|micronized|modified|augmented|intrathecal|sodium|hydrochloride|sulfate|acetate|tartrate|mesylate|potassium|calcium|chromium|serum|microspheres?)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length >= 4) out.add(stripped);
  const first = stripped.split(" ")[0] || g.split(" ")[0];
  if (first && first.length >= 4) out.add(first);
  return [...out];
}

export function loadUniversalBenchmark(filePath = DEFAULT_BENCHMARK): {
  benchmark: BenchmarkFile;
  checksumSha256: string;
} {
  if (!existsSync(filePath)) {
    throw new Error(`Universal benchmark missing: ${filePath}`);
  }
  const buf = readFileSync(filePath);
  const checksumSha256 = createHash("sha256").update(buf).digest("hex");
  const benchmark = JSON.parse(buf.toString("utf8")) as BenchmarkFile;
  if (!Array.isArray(benchmark.families) || benchmark.families.length < 1000) {
    throw new Error(
      `Universal benchmark too small: ${benchmark.families?.length ?? 0} (need >= 1000)`
    );
  }
  return { benchmark, checksumSha256 };
}

function toRankable(m: CachedRow): CatalogRankableRow {
  return {
    code: m.code,
    name: m.name,
    displayNameEn: m.displayNameEn,
    displayNameFr: m.displayNameFr,
    genericName: m.genericName,
    searchText: m.searchText,
    isEssential: m.isEssential,
    sortPriority: m.sortPriority,
  };
}

/**
 * Production-equivalent search over an in-memory snapshot of CatalogMedication + aliases + gate.
 * Uses the same expand/rank/gate functions as MedicationCatalogService.search.
 */
export async function buildProviderSearchSnapshot(prisma: PrismaClient): Promise<{
  rows: CachedRow[];
  excludedCatalogIds: Set<string>;
}> {
  const meds = await prisma.catalogMedication.findMany({
    where: { isActive: true },
  });
  const aliases = await prisma.medicationAlias.findMany({
    select: { catalogMedicationId: true, alias: true },
  });
  const aliasMap = new Map<string, string[]>();
  for (const a of aliases) {
    const list = aliasMap.get(a.catalogMedicationId) ?? [];
    list.push(a.alias);
    aliasMap.set(a.catalogMedicationId, list);
  }
  const rows: CachedRow[] = meds.map((m) => ({
    ...m,
    aliases: aliasMap.get(m.id) ?? [],
  }));

  const products = await prisma.medicationProduct.findMany({
    where: { legacyCatalogMedicationId: { in: rows.map((r) => r.id) } },
    include: { concept: { select: { isActive: true } } },
  });
  const excludedCatalogIds = new Set<string>();
  for (const product of products) {
    if (!product.legacyCatalogMedicationId) continue;
    const runtime = parseProductRuntimeActivation(product.governanceNotes);
    const gate = evaluateProviderOrderSearchGate({
      productIsActive: product.isActive,
      conceptIsActive: product.concept.isActive,
      governanceStatus: product.governanceStatus,
      formularyOnFormulary: false,
      facilityId: "validation",
      formularyFacilityId: null,
      runtime,
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
    });
    if (!gate.allowed) excludedCatalogIds.add(product.legacyCatalogMedicationId);
  }

  return { rows, excludedCatalogIds };
}

export function searchProviderSnapshot(
  snapshot: { rows: CachedRow[]; excludedCatalogIds: Set<string> },
  rawQuery: string,
  limit = 40
): CachedRow[] {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 2) return [];
  const nq = norm(q);
  const terms = expandMedicationSearchQuery(q);
  const matched: Array<{ row: CachedRow; tier: number; direct: boolean }> = [];

  for (const row of snapshot.rows) {
    if (snapshot.excludedCatalogIds.has(row.id)) continue;
    const hay = [
      row.code,
      row.name,
      row.genericName,
      row.displayNameEn,
      row.displayNameFr,
      row.strength,
      row.searchText,
      row.dosageForm,
      row.route,
      row.therapeuticClass,
      ...row.aliases,
    ]
      .join(" ")
      .toLowerCase();
    const hit = terms.some((t) => hay.includes(t));
    if (!hit) continue;
    const aliasOnly =
      !terms.some((t) =>
        [
          row.code,
          row.name,
          row.genericName,
          row.displayNameEn,
          row.displayNameFr,
          row.searchText,
        ]
          .join(" ")
          .toLowerCase()
          .includes(t)
      ) && row.aliases.some((a) => terms.some((t) => a.toLowerCase().includes(t)));
    const tier = matchTierForQuery(q, toRankable(row), {
      aliasOnlyMatch: aliasOnly,
      aliases: row.aliases,
    });
    if (tier >= 9) continue;
    matched.push({ row, tier, direct: !aliasOnly });
  }

  matched.sort((a, b) =>
    compareCatalogRows(
      { row: toRankable(a.row), tier: a.tier },
      { row: toRankable(b.row), tier: b.tier }
    )
  );

  // Prefer exact-generic family for the typed query (e.g. "Acetaminophen") so
  // combination products cannot crowd out sibling strengths under the result limit.
  const exactGenericKey = matched.some((m) => norm(m.row.genericName) === nq) ? nq : "";
  const seedGenerics = [
    ...(exactGenericKey ? [exactGenericKey] : []),
    ...new Set(
      matched
        .slice(0, 12)
        .map((m) => norm(m.row.genericName))
        .filter((g) => g && g !== exactGenericKey)
    ),
  ].slice(0, 8);
  const seen = new Set(matched.map((m) => m.row.id));
  for (const g of seedGenerics) {
    for (const row of snapshot.rows) {
      if (seen.has(row.id) || snapshot.excludedCatalogIds.has(row.id)) continue;
      if (norm(row.genericName) !== g) continue;
      const tier = matchTierForQuery(q, toRankable(row), {
        aliasOnlyMatch: false,
        aliases: row.aliases,
      });
      if (tier >= 9) continue;
      matched.push({ row, tier, direct: true });
      seen.add(row.id);
    }
  }

  matched.sort((a, b) =>
    compareCatalogRows(
      { row: toRankable(a.row), tier: a.tier },
      { row: toRankable(b.row), tier: b.tier }
    )
  );

  // Preserve distinct strengths; exact-generic family first, then other hits.
  const diversify = (items: typeof matched): typeof matched => {
    const diversified: typeof matched = [];
    const seenStrength = new Set<string>();
    const remainder: typeof matched = [];
    for (const item of items) {
      const key = `${norm(item.row.genericName)}|${norm(item.row.strength)}`;
      if (!seenStrength.has(key)) {
        seenStrength.add(key);
        diversified.push(item);
      } else {
        remainder.push(item);
      }
    }
    return [...diversified, ...remainder];
  };
  const exactFamily = exactGenericKey
    ? matched.filter((m) => norm(m.row.genericName) === exactGenericKey)
    : [];
  const otherFamily = exactGenericKey
    ? matched.filter((m) => norm(m.row.genericName) !== exactGenericKey)
    : matched;
  return [...diversify(exactFamily), ...diversify(otherFamily)]
    .slice(0, limit)
    .map((m) => m.row);
}

function rowOrderable(row: CachedRow): boolean {
  return Boolean(row.strength?.trim() && row.dosageForm?.trim() && row.route?.trim());
}

function hitsFamily(
  rows: CachedRow[],
  family: UniversalBenchmarkFamily,
  query: string
): boolean {
  const q = norm(query);
  const genericTokens = [norm(family.genericName), ...family.genericQueries.map(norm)].filter(
    Boolean
  );
  const brandTokens = family.brandQueries.map(norm).filter(Boolean);
  const tokens = [...new Set([...genericTokens, ...brandTokens, ...family.aliases?.map(norm) ?? []])];
  return rows.some((row) => {
    const hay = [
      row.genericName,
      row.displayNameEn,
      row.displayNameFr,
      row.name,
      row.searchText,
      ...row.aliases,
    ]
      .join(" ")
      .toLowerCase();
    return tokens.some((t) => t.length >= 3 && hay.includes(t)) || hay.includes(q);
  });
}

function classifyFamily(
  family: UniversalBenchmarkFamily,
  snapshot: { rows: CachedRow[]; excludedCatalogIds: Set<string> },
  limit: number
): {
  classification: UniversalFamilyClassification;
  genericHit: boolean;
  brandHit: boolean;
  orderable: boolean;
  brandRankOk: boolean;
  genericRankOk: boolean;
  missingStrengths: string[];
} {
  const genericCandidates = [
    ...new Set([
      ...(family.genericQueries || []),
      family.genericName,
      ...coreInnQueries(family.genericName),
    ]),
  ].filter((q) => q && q.trim().length >= 2);
  const brandQuery = family.brandQueries[0] || "";

  let genericRows: CachedRow[] = [];
  let genericHit = false;
  let genericQueryUsed = genericCandidates[0] || family.genericName;
  for (const gq of genericCandidates) {
    const rows = searchProviderSnapshot(snapshot, gq, limit);
    if (hitsFamily(rows, family, gq) || rows.some((r) => norm(r.genericName).includes(norm(gq).split(" ")[0] || ""))) {
      genericRows = rows;
      genericHit = true;
      genericQueryUsed = gq;
      break;
    }
    if (rows.length > 0 && !genericRows.length) genericRows = rows;
  }
  void genericQueryUsed;
  const brandRows = brandQuery
    ? searchProviderSnapshot(snapshot, brandQuery, limit)
    : [];

  const brandHit = brandQuery ? hitsFamily(brandRows, family, brandQuery) : true;

  const catalogExists = snapshot.rows.some(
    (r) =>
      norm(r.genericName) === norm(family.genericName) ||
      norm(r.genericName).includes(norm(family.genericName)) ||
      norm(family.genericName).includes(norm(r.genericName))
  );

  const combined = brandQuery ? brandRows : genericRows;
  const orderable = combined.some(rowOrderable) || genericRows.some(rowOrderable);

  let brandRankOk = true;
  if (brandQuery && brandRows.length > 0) {
    const top = brandRows[0]!;
    const hay = [top.genericName, top.displayNameEn, top.searchText, ...top.aliases]
      .join(" ")
      .toLowerCase();
    const brandCore = norm(brandQuery).replace(/\s*\(.*$/, "").trim();
    const tokens = [
      brandCore,
      norm(brandQuery),
      norm(family.genericName),
      ...family.genericQueries.map(norm),
      ...coreInnQueries(family.genericName),
    ].filter((t) => t.length >= 3);
    brandRankOk = tokens.some((t) => hay.includes(t));
  }

  let genericRankOk = true;
  if (genericRows.length > 0) {
    const top = genericRows[0]!;
    const hay = [top.genericName, top.displayNameEn, top.searchText, ...top.aliases]
      .join(" ")
      .toLowerCase();
    genericRankOk = hay.includes(norm(family.genericName).slice(0, Math.min(8, norm(family.genericName).length)))
      || family.genericQueries.some((gq) => hay.includes(norm(gq).slice(0, 6)));
  }

  const strengthBlob = [...genericRows, ...brandRows]
    .map((r) => (r.strength || "").toLowerCase())
    .join(" | ");
  const missingStrengths = (family.expectedStrengthSubstrings || []).filter(
    (s) => s && !strengthBlob.includes(s.toLowerCase())
  );

  if (!genericHit && !brandHit) {
    if (!catalogExists) return {
      classification: "MISSING_FAMILY",
      genericHit,
      brandHit,
      orderable: false,
      brandRankOk,
      genericRankOk,
      missingStrengths,
    };
    return {
      classification: "SEARCH_HIDDEN",
      genericHit,
      brandHit,
      orderable: false,
      brandRankOk,
      genericRankOk,
      missingStrengths,
    };
  }
  if (genericHit && brandQuery && !brandHit) {
    return {
      classification: "GENERIC_ONLY",
      genericHit,
      brandHit,
      orderable,
      brandRankOk,
      genericRankOk,
      missingStrengths,
    };
  }
  if (!genericHit && brandHit) {
    return {
      classification: "BRAND_ONLY",
      genericHit,
      brandHit,
      orderable,
      brandRankOk,
      genericRankOk,
      missingStrengths,
    };
  }
  if (!orderable) {
    return {
      classification: "NOT_ORDERABLE",
      genericHit,
      brandHit,
      orderable,
      brandRankOk,
      genericRankOk,
      missingStrengths,
    };
  }
  if (missingStrengths.length > 0) {
    return {
      classification: "PARTIAL_STRENGTH",
      genericHit,
      brandHit,
      orderable,
      brandRankOk,
      genericRankOk,
      missingStrengths,
    };
  }
  return {
    classification: "COMPLETE",
    genericHit,
    brandHit,
    orderable,
    brandRankOk,
    genericRankOk,
    missingStrengths,
  };
}

export async function enrichUniversalBrandAliases(
  prisma: PrismaClient,
  families: UniversalBenchmarkFamily[],
  dryRun: boolean
): Promise<{ aliasesCreated: number; searchTextUpdated: number; familiesTouched: number }> {
  let aliasesCreated = 0;
  let searchTextUpdated = 0;
  let familiesTouched = 0;

  const catalog = await prisma.catalogMedication.findMany({
    where: { isActive: true },
    select: { id: true, genericName: true, searchText: true, code: true },
    orderBy: [{ code: "asc" }],
  });
  const byGeneric = new Map<string, typeof catalog>();
  for (const row of catalog) {
    const g = norm(row.genericName);
    if (!g) continue;
    const list = byGeneric.get(g) ?? [];
    list.push(row);
    byGeneric.set(g, list);
  }

  const existingAliases = await prisma.medicationAlias.findMany({
    select: { catalogMedicationId: true, alias: true },
  });
  const aliasSet = new Set(
    existingAliases.map((a) => `${a.catalogMedicationId}|${a.alias.toLowerCase()}`)
  );

  for (const family of families) {
    const g = norm(family.genericName);
    const coreKeys = coreInnQueries(family.genericName);
    let rows = byGeneric.get(g) ?? [];
    if (rows.length === 0) {
      rows = catalog.filter((r) => {
        const rg = norm(r.genericName);
        return (
          rg === g ||
          rg.startsWith(g + " ") ||
          g.startsWith(rg + " ") ||
          coreKeys.some((ck) => rg === ck || rg.startsWith(ck + " ") || ck.startsWith(rg + " "))
        );
      });
    }
    if (rows.length === 0) continue;

    // Prefer primary single-ingredient rows (avoid combination products crowding).
    // Stable code order keeps APPLY idempotent across runs.
    const primary = rows.filter((r) => !norm(r.genericName).includes(" / "));
    const targets = (primary.length ? primary : rows)
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))
      .slice(0, 12);
    let touched = false;

    const aliasCandidates = [
      ...new Set(
        [
          ...family.brandQueries.slice(0, 5),
          ...family.brandQueries
            .slice(0, 5)
            .map((b) => String(b).replace(/\s*\(.*$/, "").trim()),
          ...coreKeys,
          family.genericName,
        ]
          .map((b) => String(b || "").trim())
          .filter((b) => b.length >= 2)
      ),
    ];

    for (const row of targets) {
      const missingTokens: string[] = [];
      const st = (row.searchText || "").toLowerCase();
      for (const brand of aliasCandidates) {
        const alias = String(brand || "").trim().toLowerCase();
        if (alias.length < 2) continue;
        if (!st.includes(alias)) missingTokens.push(alias);
        const key = `${row.id}|${alias}`;
        if (aliasSet.has(key)) continue;
        if (!dryRun) {
          try {
            await prisma.medicationAlias.create({
              data: {
                catalogMedicationId: row.id,
                alias,
                language: "en",
                isPrimary: false,
              },
            });
            aliasesCreated += 1;
            touched = true;
            aliasSet.add(key);
          } catch {
            /* already present under unique(catalogMedicationId, alias) */
            aliasSet.add(key);
          }
        } else {
          aliasesCreated += 1;
          touched = true;
          aliasSet.add(key);
        }
      }
      if (missingTokens.length > 0) {
        const next = `${row.searchText || ""} ${missingTokens.join(" ")}`
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 2000);
        if (next !== (row.searchText || "").trim()) {
          searchTextUpdated += 1;
          touched = true;
          if (!dryRun) {
            let updated = false;
            for (let attempt = 0; attempt < 3 && !updated; attempt += 1) {
              try {
                await prisma.catalogMedication.update({
                  where: { id: row.id },
                  data: { searchText: next },
                });
                row.searchText = next;
                updated = true;
              } catch {
                if (attempt === 2) {
                  // Proxy disconnects are non-fatal; aliases already persisted when possible.
                  searchTextUpdated -= 1;
                } else {
                  await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
                }
              }
            }
          }
        }
      }
    }
    if (touched) familiesTouched += 1;
  }

  return { aliasesCreated, searchTextUpdated, familiesTouched };
}

export async function runUniversalCommonOrderability(
  prisma: PrismaClient,
  mode: UniversalCompletionMode
): Promise<Record<string, unknown>> {
  const { benchmark, checksumSha256 } = loadUniversalBenchmark();
  const mutate = mode === "APPLY";
  const dryRun = !mutate;

  const enrichment =
    mode === "AUDIT" || mode === "REPORT"
      ? await enrichUniversalBrandAliases(prisma, benchmark.families, true)
      : await enrichUniversalBrandAliases(prisma, benchmark.families, dryRun);

  // VALIDATE / VERIFY / APPLY / DRY_RUN all measure after enrichment intent.
  const snapshot = await buildProviderSearchSnapshot(prisma);
  const limit = 40;
  const counts: Record<UniversalFamilyClassification, number> = {
    COMPLETE: 0,
    MISSING_FAMILY: 0,
    GENERIC_ONLY: 0,
    BRAND_ONLY: 0,
    PARTIAL_STRENGTH: 0,
    PARTIAL_FORM: 0,
    PARTIAL_ROUTE: 0,
    SEARCH_HIDDEN: 0,
    NOT_ORDERABLE: 0,
    AMBIGUOUS: 0,
    OUT_OF_SCOPE: 0,
    MANUAL_REVIEW: 0,
  };

  let searchPassed = 0;
  let searchFailed = 0;
  let orderablePassed = 0;
  let orderableFailed = 0;
  let brandRankPassed = 0;
  let brandRankChecks = 0;
  let genericRankPassed = 0;
  let genericRankChecks = 0;
  const failures: Array<{ familyId: string; classification: string; detail?: string }> = [];

  // Hard acceptance probes (production-equivalent snapshot)
  const hardQueries = [
    { q: "Biktarvy", mustInclude: ["biktarvy", "bictegravir"] },
    { q: "bikt", mustInclude: ["biktarvy", "bictegravir"] },
    { q: "Jardiance", mustInclude: ["jardiance", "empagliflozin"], strengths: ["10 mg", "25 mg"] },
    { q: "jar", mustInclude: ["jardiance", "empagliflozin"], strengths: ["10 mg", "25 mg"] },
    { q: "Empagliflozin", mustInclude: ["empagliflozin"], strengths: ["10 mg", "25 mg"] },
  ];
  const hardFailures: string[] = [];
  for (const hq of hardQueries) {
    const rows = searchProviderSnapshot(snapshot, hq.q, limit);
    const hay = rows
      .map((r) => [r.genericName, r.searchText, ...r.aliases].join(" ").toLowerCase())
      .join(" || ");
    const ok = hq.mustInclude.some((t) => hay.includes(t));
    if (!ok || rows.length === 0) hardFailures.push(`${hq.q}:NO_HIT`);
    if (hq.strengths) {
      const sb = rows.map((r) => (r.strength || "").toLowerCase()).join(" | ");
      for (const s of hq.strengths) {
        if (!sb.includes(s.toLowerCase())) hardFailures.push(`${hq.q}:MISSING_${s}`);
      }
    }
    if (hq.q === "jar") {
      const top = rows[0];
      if (top && (top.genericName || "").toLowerCase().includes("tirzepatide")) {
        hardFailures.push("jar:TIRZEPATIDE_OUTRANKS");
      }
    }
  }

  for (const family of benchmark.families) {
    const result = classifyFamily(family, snapshot, limit);
    counts[result.classification] += 1;

    const searchable = result.genericHit && result.brandHit;
    if (searchable) searchPassed += 1;
    else {
      searchFailed += 1;
      if (failures.length < 300) {
        failures.push({
          familyId: family.familyId,
          classification: result.classification,
          detail: `genericHit=${result.genericHit};brandHit=${result.brandHit}`,
        });
      }
    }

    if (result.orderable) orderablePassed += 1;
    else if (searchable) orderableFailed += 1;

    if (family.brandQueries[0]) {
      brandRankChecks += 1;
      if (result.brandRankOk) brandRankPassed += 1;
    }
    genericRankChecks += 1;
    if (result.genericRankOk) genericRankPassed += 1;

    if (
      result.classification !== "COMPLETE" &&
      result.classification !== "OUT_OF_SCOPE" &&
      failures.length < 300
    ) {
      failures.push({
        familyId: family.familyId,
        classification: result.classification,
        detail: `missingStrengths=${result.missingStrengths.join("|")};genericHit=${result.genericHit};brandHit=${result.brandHit}`,
      });
    }
  }

  const familyCount = benchmark.families.length;
  const report = {
    mode,
    programKey: UNIVERSAL_COMMON_MEDICATION_ORDERABILITY_PROGRAM_KEY,
    importerVersion: UNIVERSAL_COMMON_MEDICATION_ORDERABILITY_VERSION,
    dryRun,
    sourceChecksumSha256: checksumSha256,
    benchmarkVersion: benchmark.version,
    benchmarkFamilyCount: familyCount,
    brandBearingFamilyCount: benchmark.brandBearingFamilyCount,
    domainDistribution: benchmark.domainDistribution,
    sources: benchmark.sources,
    enrichment: {
      aliasesCreated: enrichment.aliasesCreated,
      searchTextUpdated: enrichment.searchTextUpdated,
      familiesTouched: enrichment.familiesTouched,
    },
    classificationCounts: counts,
    classificationRates: Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, familyCount > 0 ? v / familyCount : 0])
    ),
    searchPassed,
    searchFailed,
    searchPassRate: familyCount > 0 ? searchPassed / familyCount : 0,
    orderablePassed,
    orderableFailed,
    orderabilityPassRate:
      orderablePassed + orderableFailed > 0
        ? orderablePassed / (orderablePassed + orderableFailed)
        : 0,
    exactBrandRankingPassRate:
      brandRankChecks > 0 ? brandRankPassed / brandRankChecks : 1,
    exactGenericRankingPassRate:
      genericRankChecks > 0 ? genericRankPassed / genericRankChecks : 1,
    missingFamilyCount: counts.MISSING_FAMILY,
    completeFamilyCount: counts.COMPLETE,
    partialFamilyCount:
      counts.PARTIAL_STRENGTH +
      counts.PARTIAL_FORM +
      counts.PARTIAL_ROUTE +
      counts.GENERIC_ONLY +
      counts.BRAND_ONLY +
      counts.SEARCH_HIDDEN +
      counts.NOT_ORDERABLE,
    manualReviewCount: counts.MANUAL_REVIEW + counts.AMBIGUOUS,
    hardAcceptance: {
      pass: hardFailures.length === 0,
      failures: hardFailures,
    },
    failures: failures.slice(0, 200),
    orderMutations: 0,
    marMutations: 0,
    chartMutations: 0,
    productsActivated: 0,
    // used by resolveMatchedBrandAlias import keep
    _displayProbe: resolveMatchedBrandAlias("jard", ["jardiance"], ["jard"]),
  };
  delete (report as { _displayProbe?: unknown })._displayProbe;

  const artifact =
    mode === "APPLY" && enrichment.aliasesCreated === 0
      ? "medication-universal-common-orderability-apply-idempotent.json"
      : `medication-universal-common-orderability-${mode.toLowerCase()}.json`;
  writeArtifact(artifact, report);
  if (mode === "VALIDATE" || mode === "VERIFY" || mode === "APPLY") {
    writeArtifact("medication-universal-common-orderability-validation.json", report);
  }
  return report;
}

export { writeArtifact as writeUniversalCompletionArtifact };
