/**
 * Enterprise ICD search certification (Phase 19 Commit 2).
 *
 *   pnpm --filter @medora/api icd:search:enterprise-diagnostic-intelligence --write-reports
 *   pnpm --filter @medora/api icd:search:enterprise-ranking --write-reports
 *   pnpm --filter @medora/api icd:search:enterprise-uniqueness --write-reports
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildIcd10CatalogSearchMatch,
  buildIcd10CatalogSearchSelectSql,
  type Icd10CatalogSearchRow,
} from "../../src/diagnoses/icd10-catalog-search.query";
import {
  ENTERPRISE_RANKING_QUERIES,
  ENTERPRISE_REQUIRED_QUERIES,
  ENTERPRISE_UNIQUENESS_QUERIES,
} from "./enterprise-search-queries";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);
const mode = arg("mode") ?? "search";

async function search(prisma: PrismaClient, q: string, take = 50): Promise<Icd10CatalogSearchRow[]> {
  const match = buildIcd10CatalogSearchMatch(q);
  if (!match) return [];
  return prisma.$queryRaw<Icd10CatalogSearchRow[]>(buildIcd10CatalogSearchSelectSql(match, take));
}

function duplicateCodes(rows: Icd10CatalogSearchRow[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.code)) dups.add(row.code);
    else seen.add(row.code);
  }
  return [...dups].sort();
}

function codeHasPrefix(code: string, prefix: string): boolean {
  return code.replace(/\./g, "").toUpperCase().startsWith(prefix.replace(/\./g, "").toUpperCase());
}

async function runSearchMode(prisma: PrismaClient) {
  const failures: string[] = [];
  const queryReports: Array<{ q: string; resultCount: number; topCode: string | null; pass: boolean }> = [];

  for (const req of ENTERPRISE_REQUIRED_QUERIES) {
    const rows = await search(prisma, req.q, 50);
    let pass = rows.length > 0;
    if (rows.length === 0) {
      failures.push(`No results for "${req.q}"`);
    }
    if (req.mustContainDescription && rows.length > 0) {
      const needle = req.mustContainDescription.toLowerCase();
      if (!rows.some((r) => r.shortDescription.toLowerCase().includes(needle))) {
        failures.push(`"${req.q}" missing description containing "${req.mustContainDescription}"`);
        pass = false;
      }
    }
    if (req.mustMatchCodePrefix && rows.length > 0) {
      if (!rows.some((r) => codeHasPrefix(r.code, req.mustMatchCodePrefix!))) {
        failures.push(`"${req.q}" missing code prefix ${req.mustMatchCodePrefix}`);
        pass = false;
      }
    }
    queryReports.push({
      q: req.q,
      resultCount: rows.length,
      topCode: rows[0]?.code ?? null,
      pass,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    certification: "enterprise-diagnostic-intelligence-search",
    queryCount: ENTERPRISE_REQUIRED_QUERIES.length,
    failures,
    queries: queryReports,
    pass: failures.length === 0,
  };
}

async function runRankingMode(prisma: PrismaClient) {
  const failures: string[] = [];
  const rankings: Array<{ q: string; top3: string[]; expectedPrefixInTop3: boolean }> = [];

  for (const q of ENTERPRISE_RANKING_QUERIES) {
    const rows = await search(prisma, q, 10);
    const top3 = rows.slice(0, 3).map((r) => r.code);
    const req = ENTERPRISE_REQUIRED_QUERIES.find((r) => r.q === q);
    let expectedPrefixInTop3 = true;
    if (req?.mustMatchCodePrefix) {
      expectedPrefixInTop3 = top3.some((code) => codeHasPrefix(code, req.mustMatchCodePrefix!));
      if (!expectedPrefixInTop3) failures.push(`Ranking: "${q}" expected prefix ${req.mustMatchCodePrefix} in top 3`);
    }
    rankings.push({ q, top3, expectedPrefixInTop3 });
  }

  return {
    generatedAt: new Date().toISOString(),
    certification: "enterprise-search-ranking",
    queryCount: ENTERPRISE_RANKING_QUERIES.length,
    rankings,
    failures,
    pass: failures.length === 0,
  };
}

async function runUniquenessMode(prisma: PrismaClient) {
  const failures: string[] = [];
  const queryReports: Array<{ q: string; duplicateCodes: string[] }> = [];

  for (const q of ENTERPRISE_UNIQUENESS_QUERIES) {
    const rows = await search(prisma, q, 50);
    const dups = duplicateCodes(rows);
    queryReports.push({ q, duplicateCodes: dups });
    if (dups.length > 0) failures.push(`"${q}" duplicate codes: ${dups.join(", ")}`);
  }

  return {
    generatedAt: new Date().toISOString(),
    certification: "enterprise-search-uniqueness",
    queryCount: ENTERPRISE_UNIQUENESS_QUERIES.length,
    duplicateIcdCodes: failures.length === 0 ? 0 : queryReports.reduce((n, q) => n + q.duplicateCodes.length, 0),
    failures,
    queries: queryReports,
    pass: failures.length === 0,
  };
}

async function main() {
  const release = arg("release") ?? "2026";
  const prisma = new PrismaClient();
  try {
    let report: Record<string, unknown>;
    let filename: string;
    if (mode === "ranking") {
      report = await runRankingMode(prisma);
      filename = "fy2026-enterprise-search-ranking-summary.json";
    } else if (mode === "uniqueness") {
      report = await runUniquenessMode(prisma);
      filename = "fy2026-enterprise-search-uniqueness-summary.json";
    } else {
      report = await runSearchMode(prisma);
      filename = "fy2026-enterprise-search-summary.json";
    }

    const summary = JSON.stringify(report, null, 2);
    if (flag("write-reports")) {
      const dir = resolve(__dirname, "certification-summaries");
      mkdirSync(join(dir, release), { recursive: true });
      writeFileSync(join(dir, filename), summary);
      writeFileSync(join(dir, release, filename), summary);
    }
    console.log(summary);
    process.exit(report.pass ? 0 : 2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
