/**
 * MEDUI.TRILANG.DX.SEARCH.1 live catalog relevance + performance benchmark.
 * Uses the same SQL as Icd10CatalogService.search. Does not print DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client";
import {
  ICD10_SEARCH_ADVERSARIAL_BENCHMARK,
  ICD10_SEARCH_RELEVANCE_BENCHMARK,
  evaluateIcd10SearchBenchmarkCase,
  type Icd10SearchBenchmarkCase,
  type ProductUiLanguage,
} from "@medora/shared";
import {
  buildIcd10CatalogSearchMatch,
  buildIcd10CatalogSearchSelectSql,
  type Icd10CatalogSearchRow,
} from "../../src/diagnoses/icd10-catalog-search.query";

type SetName = "original" | "adversarial" | "combined";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.floor((sorted.length - 1) * p)] ?? 0;
}

function corpusFor(setName: SetName): readonly Icd10SearchBenchmarkCase[] {
  if (setName === "original") return ICD10_SEARCH_RELEVANCE_BENCHMARK;
  if (setName === "adversarial") return ICD10_SEARCH_ADVERSARIAL_BENCHMARK;
  return [...ICD10_SEARCH_RELEVANCE_BENCHMARK, ...ICD10_SEARCH_ADVERSARIAL_BENCHMARK];
}

async function runSearch(
  prisma: PrismaClient,
  query: string,
  locale: ProductUiLanguage,
  releaseVersion: string,
  take = 25,
): Promise<{ rows: Icd10CatalogSearchRow[]; ms: number }> {
  const match = buildIcd10CatalogSearchMatch(query, locale);
  if (!match) return { rows: [], ms: 0 };
  const started = Date.now();
  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('jit', 'off', true)`;
    return tx.$queryRaw<Icd10CatalogSearchRow[]>(
      buildIcd10CatalogSearchSelectSql(match, take, { releaseVersion, locale }),
    );
  });
  return { rows, ms: Date.now() - started };
}

async function scoreCorpus(
  prisma: PrismaClient,
  specs: readonly Icd10SearchBenchmarkCase[],
  releaseVersion: string,
) {
  const latencies: number[] = [];
  let top1 = 0;
  let top3 = 0;
  let top5 = 0;
  let mrrSum = 0;
  let duplicateResults = 0;
  const samples: Record<string, string[]> = {};
  const failed: Record<string, string[]> = {};

  for (const spec of specs) {
    const locale = spec.locale as ProductUiLanguage;
    const { rows, ms } = await runSearch(prisma, spec.query, locale, releaseVersion);
    latencies.push(ms);
    const codes = rows.map((row) => row.code);
    samples[spec.id] = codes.slice(0, 8);
    const ids = rows.map((row) => row.id);
    if (new Set(ids).size !== ids.length) duplicateResults += 1;
    const metrics = evaluateIcd10SearchBenchmarkCase(spec, codes);
    if (metrics.top1) top1 += 1;
    if (metrics.top3) top3 += 1;
    if (metrics.top5) top5 += 1;
    mrrSum += metrics.reciprocalRank;
    if (!metrics.top5) failed[spec.id] = codes.slice(0, 8);
  }

  latencies.sort((a, b) => a - b);
  const n = specs.length;
  return {
    n,
    TOP1: `${top1}/${n}`,
    TOP3: `${top3}/${n}`,
    TOP5: `${top5}/${n}`,
    MRR: n === 0 ? 0 : Number((mrrSum / n).toFixed(3)),
    top1,
    top3,
    top5,
    duplicateResults,
    latencies,
    samples,
    failed,
    SEARCH_P50_MS: percentile(latencies, 0.5),
    SEARCH_P95_MS: percentile(latencies, 0.95),
    SEARCH_MAX_MS: latencies[latencies.length - 1] ?? 0,
  };
}

async function runConcurrency(
  prisma: PrismaClient,
  releaseVersion: string,
  concurrency: number,
  query = "dolor abdominal",
) {
  const errors: string[] = [];
  const started = Date.now();
  const results = await Promise.all(
    Array.from({ length: concurrency }, async () => {
      try {
        return await runSearch(prisma, query, "es", releaseVersion);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
        return { rows: [], ms: Date.now() - started };
      }
    }),
  );
  const latencies = results.map((row) => row.ms).sort((a, b) => a - b);
  return {
    concurrency,
    SEARCH_P50_MS: percentile(latencies, 0.5),
    SEARCH_P95_MS: percentile(latencies, 0.95),
    SEARCH_MAX_MS: latencies[latencies.length - 1] ?? 0,
    ERROR_RATE: `${errors.length}/${concurrency}`,
    errors,
  };
}

async function main() {
  const releaseVersion = (process.env.ICD10_SEARCH_RELEASE ?? "FY2026").trim();
  const setName = ((process.env.ICD10_SEARCH_SET ?? "combined").trim() || "combined") as SetName;
  const prisma = new PrismaClient();

  try {
    const selectable = await prisma.icd10DiagnosisCode.count({
      where: { isActive: true, isSelectable: true, releaseVersion },
    });
    if (selectable < 1000) {
      console.log(
        JSON.stringify({
          ok: false,
          reason: "CATALOG_TOO_SMALL",
          releaseVersion,
          selectable,
        }),
      );
      process.exitCode = 2;
      return;
    }

    const original = await scoreCorpus(prisma, ICD10_SEARCH_RELEVANCE_BENCHMARK, releaseVersion);
    const adversarial = await scoreCorpus(prisma, ICD10_SEARCH_ADVERSARIAL_BENCHMARK, releaseVersion);
    const combinedSpecs = corpusFor(setName === "original" || setName === "adversarial" ? setName : "combined");
    const combined =
      setName === "original"
        ? original
        : setName === "adversarial"
          ? adversarial
          : await scoreCorpus(prisma, combinedSpecs, releaseVersion);

    const exactCode = await runSearch(prisma, "R11.0", "es", releaseVersion);
    const exactLatencies = [exactCode.ms];
    for (let i = 0; i < 4; i++) {
      exactLatencies.push((await runSearch(prisma, "R11.0", "es", releaseVersion)).ms);
    }
    exactLatencies.sort((a, b) => a - b);

    const shortQueries = [
      { q: "r", locale: "en" as const },
      { q: "gi", locale: "en" as const },
      { q: "uti", locale: "en" as const },
      { q: "dol", locale: "es" as const },
      { q: "pain", locale: "en" as const },
    ];
    const short = [];
    for (const probe of shortQueries) {
      const match = buildIcd10CatalogSearchMatch(probe.q, probe.locale);
      const { rows, ms } = match
        ? await runSearch(prisma, probe.q, probe.locale, releaseVersion)
        : { rows: [], ms: 0 };
      short.push({
        q: probe.q,
        match: Boolean(match),
        rows: rows.length,
        ms,
        top: rows.slice(0, 5).map((row) => row.code),
      });
    }

    const concurrency5 = await runConcurrency(prisma, releaseVersion, 5);
    const concurrency10 = await runConcurrency(prisma, releaseVersion, 10);

    const report = {
      ok: original.top5 === original.n && original.duplicateResults === 0,
      releaseVersion,
      selectable,
      ORIGINAL_35_TOP1: original.TOP1,
      ORIGINAL_35_TOP3: original.TOP3,
      ORIGINAL_35_TOP5: original.TOP5,
      ORIGINAL_35_MRR: original.MRR,
      ADVERSARIAL_TOP1: adversarial.TOP1,
      ADVERSARIAL_TOP3: adversarial.TOP3,
      ADVERSARIAL_TOP5: adversarial.TOP5,
      ADVERSARIAL_MRR: adversarial.MRR,
      COMBINED_TOP1: combined.TOP1,
      COMBINED_TOP3: combined.TOP3,
      COMBINED_TOP5: combined.TOP5,
      COMBINED_MRR: combined.MRR,
      DUPLICATE_RESULTS: original.duplicateResults + adversarial.duplicateResults,
      SEARCH_P50_MS: original.SEARCH_P50_MS,
      SEARCH_P95_MS: original.SEARCH_P95_MS,
      SEARCH_MAX_MS: original.SEARCH_MAX_MS,
      COMBINED_SEARCH_P50_MS: combined.SEARCH_P50_MS,
      COMBINED_SEARCH_P95_MS: combined.SEARCH_P95_MS,
      EXACT_CODE_P50_MS: percentile(exactLatencies, 0.5),
      EXACT_CODE_P95_MS: percentile(exactLatencies, 0.95),
      CONCURRENCY_5_P95_MS: concurrency5.SEARCH_P95_MS,
      CONCURRENCY_10_P95_MS: concurrency10.SEARCH_P95_MS,
      ERROR_RATE: concurrency10.ERROR_RATE,
      SHORT_QUERIES: short,
      DOLOR_TORACICO_TOP_RESULTS: original.samples["es-dolor-toracico"] ?? [],
      DOLOR_ABDOMINAL_TOP_RESULTS: original.samples["es-dolor-abdominal"] ?? [],
      SANGRADO_GASTROINTESTINAL_TOP_RESULTS: original.samples["es-sangrado-gi"] ?? [],
      NAUSEAS_TOP_RESULTS: original.samples["es-nauseas"] ?? [],
      EN_ABDOMINAL_PAIN_WHILE_ES: original.samples["es-en-abdominal-pain"] ?? [],
      CODE_SEARCH_EXACT_TOP1: original.samples["es-code-r110"]?.[0] ?? exactCode.rows[0]?.code ?? null,
      FAILED_ORIGINAL: original.failed,
      FAILED_ADVERSARIAL: adversarial.failed,
    };
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
