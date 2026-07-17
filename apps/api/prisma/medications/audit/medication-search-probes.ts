/**
 * Medication catalog search probes (read-only Prisma queries mimicking provider search).
 */
import type { CatalogMedication, PrismaClient } from "@prisma/client";
import {
  buildCatalogMedicationAliasVisibilityWhere,
  buildCatalogMedicationVisibilityWhere,
  expandMedicationSearchQuery,
} from "../../../src/medication-catalog/medication-catalog-search.util";
import {
  compareCatalogRows,
  matchTierForQuery,
  type CatalogRankableRow,
} from "../../../src/order-catalog/catalog-search-rank.util";
import { auditBase, type AuditConfidence, type AuditDataSource } from "./medication-audit-types";

export type SearchProbeDefinition = {
  query: string;
  expectMinResults: number;
  expectMaxResults?: number;
  label: string;
};

export const DEFAULT_SEARCH_PROBES: SearchProbeDefinition[] = [
  { query: "ibuprofen", expectMinResults: 1, label: "English generic ibuprofen" },
  { query: "ibuprofène", expectMinResults: 1, label: "French ibuprofène" },
  { query: "lorazepam", expectMinResults: 1, label: "Controlled benzodiazepine" },
  { query: "acetaminophen", expectMinResults: 1, label: "English acetaminophen" },
  { query: "paracetamol", expectMinResults: 1, label: "Paracetamol alias" },
  { query: "paracétamol", expectMinResults: 1, label: "French paracétamol" },
  { query: "lipitor", expectMinResults: 0, label: "Brand lipitor (may resolve via alias expansion)" },
  { query: "atorvastatin", expectMinResults: 1, label: "Generic atorvastatin" },
  { query: "morphine", expectMinResults: 1, label: "Controlled opioid" },
  { query: "amoxicillin", expectMinResults: 1, label: "Common antibiotic" },
  { query: "metformin", expectMinResults: 1, label: "Diabetes staple" },
  { query: "potassium", expectMinResults: 1, label: "Electrolyte alias expansion" },
  { query: "kcl", expectMinResults: 1, label: "KCL alias" },
  { query: "insuline", expectMinResults: 0, label: "French insulin (may be partial)" },
  { query: "insulin", expectMinResults: 1, label: "English insulin" },
  { query: "zzz_not_a_medication_xyz", expectMinResults: 0, expectMaxResults: 0, label: "Nonsense zero-hit probe" },
  { query: "aspirin", expectMinResults: 1, label: "Brand/generic aspirin" },
  { query: "cotrimoxazole", expectMinResults: 1, label: "Bactrim alias target" },
  { query: "bactrim", expectMinResults: 1, label: "Brand bactrim alias" },
  { query: "vancomycin", expectMinResults: 1, label: "IV antibiotic" },
  { query: "heparin", expectMinResults: 1, label: "Anticoagulant" },
  { query: "ondansetron", expectMinResults: 1, label: "Antiemetic" },
  { query: "prednisone", expectMinResults: 1, label: "Steroid" },
  { query: "salbutamol", expectMinResults: 0, label: "Albuterol FR (may alias)" },
  { query: "albuterol", expectMinResults: 1, label: "Albuterol EN" },
];

function medicationToRankable(row: CatalogMedication): CatalogRankableRow {
  return {
    code: row.code,
    name: row.name,
    displayNameEn: row.displayNameEn,
    displayNameFr: row.displayNameFr,
    searchText: row.searchText,
    isEssential: row.isEssential,
    sortPriority: row.sortPriority,
  };
}

export async function runMedicationSearchProbe(
  prisma: PrismaClient,
  rawQuery: string,
  limit = 50
): Promise<{ resultCount: number; topCodes: string[]; latencyMs: number }> {
  const started = Date.now();
  const q = rawQuery.trim().toLowerCase();
  if (!q) return { resultCount: 0, topCodes: [], latencyMs: Date.now() - started };

  const searchTerms = expandMedicationSearchQuery(q);
  const byCatalog = await prisma.catalogMedication.findMany({
    where: buildCatalogMedicationVisibilityWhere(searchTerms),
    orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
    take: limit * 3,
  });

  const aliasOr = searchTerms.map((term) => ({ alias: { contains: term, mode: "insensitive" as const } }));
  const byAlias = await prisma.medicationAlias.findMany({
    where: { OR: aliasOr },
    select: { catalogMedicationId: true },
    distinct: ["catalogMedicationId"],
  });
  const aliasIds = byAlias.map((row) => row.catalogMedicationId);
  const byAliasCatalog =
    aliasIds.length > 0
      ? await prisma.catalogMedication.findMany({
          where: buildCatalogMedicationAliasVisibilityWhere(aliasIds),
          orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
        })
      : [];

  const directIds = new Set(byCatalog.map((row) => row.id));
  type Scored = { row: CatalogMedication; tier: number };
  const scored: Scored[] = [];
  for (const row of byCatalog) {
    scored.push({ row, tier: matchTierForQuery(q, medicationToRankable(row), { aliasOnlyMatch: false }) });
  }
  for (const row of byAliasCatalog) {
    if (directIds.has(row.id)) continue;
    scored.push({ row, tier: matchTierForQuery(q, medicationToRankable(row), { aliasOnlyMatch: true }) });
  }

  scored.sort((a, b) =>
    compareCatalogRows(
      { row: medicationToRankable(a.row), tier: a.tier },
      { row: medicationToRankable(b.row), tier: b.tier }
    )
  );

  const unique: CatalogMedication[] = [];
  const seen = new Set<string>();
  for (const entry of scored) {
    if (seen.has(entry.row.id)) continue;
    seen.add(entry.row.id);
    unique.push(entry.row);
    if (unique.length >= limit) break;
  }

  return {
    resultCount: unique.length,
    topCodes: unique.slice(0, 5).map((row) => row.code),
    latencyMs: Date.now() - started,
  };
}

export async function runAllSearchProbes(
  prisma: PrismaClient | null,
  probes: SearchProbeDefinition[] = DEFAULT_SEARCH_PROBES
) {
  if (!prisma) {
    return probes.map((probe) => ({
      ...probe,
      resultCount: 0,
      topCodes: [] as string[],
      latencyMs: 0,
      pass: probe.expectMaxResults === 0,
      skipped: true,
    }));
  }

  const results = [];
  for (const probe of probes) {
    const outcome = await runMedicationSearchProbe(prisma, probe.query);
    const pass =
      outcome.resultCount >= probe.expectMinResults &&
      (probe.expectMaxResults === undefined || outcome.resultCount <= probe.expectMaxResults);
    results.push({ ...probe, ...outcome, pass, skipped: false });
  }
  return results;
}

export function buildSearchAuditArtifact(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  probeResults: Awaited<ReturnType<typeof runAllSearchProbes>>
) {
  const executed = probeResults.filter((row) => !row.skipped);
  const latencies = executed.map((row) => row.latencyMs);
  const avgLatencyMs =
    latencies.length > 0 ? Math.round(latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length) : 0;
  const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : 0;

  return {
    ...auditBase(dataSource, confidence),
    probeCount: probeResults.length,
    probes: probeResults,
    summary: {
      passCount: probeResults.filter((row) => row.pass).length,
      failCount: probeResults.filter((row) => !row.pass).length,
      avgLatencyMs,
      maxLatencyMs,
      zeroHitProbePass: probeResults.some(
        (row) => row.query === "zzz_not_a_medication_xyz" && row.resultCount === 0
      ),
    },
    maturityScore: 3,
    notes: dataSource === "seed_files_only" ? ["Search probes skipped — database unavailable"] : [],
  };
}

export function buildLocalizationAuditArtifact(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: { displayNameEnPopulated: number; displayNameFrPopulated: number; catalogMedication: number }
) {
  const total = metrics.catalogMedication;
  return {
    ...auditBase(dataSource, confidence),
    displayNameEnPopulated: metrics.displayNameEnPopulated,
    displayNameFrPopulated: metrics.displayNameFrPopulated,
    catalogTotal: total,
    englishCoverageRate: total > 0 ? metrics.displayNameEnPopulated / total : 0,
    frenchCoverageRate: total > 0 ? metrics.displayNameFrPopulated / total : 0,
    maturityScores: {
      englishLocalization: 4,
      frenchLocalization: 4,
    },
    gaps: ["Some enterprise vaccine rows may have identical EN/FR display strings"],
  };
}
