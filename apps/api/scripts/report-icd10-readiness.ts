/**
 * Read-only ICD-10 catalog readiness report.
 *
 * Usage (from repo root):
 *   pnpm --filter @medora/api run icd10:report-readiness
 *
 * This script does not import or modify catalog data. It verifies that the
 * currently connected database has enough active ICD-10 rows for the ER sample
 * phase and that core diagnosis search terms return at least one active row.
 */
import "reflect-metadata";
import { Prisma, PrismaClient } from "@prisma/client";
import { normalizeIcd10CodeForLookup } from "@medora/shared";

const prisma = new PrismaClient();

/** Demo/sample readiness only. Production completeness uses `pnpm icd:coverage`. */
const MIN_SAMPLE_ROWS = 20;
/** Soft signal that a full FY catalog may be present (not a certification gate). */
const PRODUCTION_HINT_ROWS = 50000;
const REQUIRED_SMOKE_QUERIES = ["abd", "chest", "urin", "fever", "nausea"];

function searchWhere(rawQuery: string): Prisma.Icd10DiagnosisCodeWhereInput {
  const raw = rawQuery.trim();
  const norm = normalizeIcd10CodeForLookup(raw);
  const tokens = raw.split(/\s+/).filter(Boolean);
  const pattern = raw.length >= 2 ? raw : null;
  const or: Prisma.Icd10DiagnosisCodeWhereInput[] = [];

  if (norm.length > 0) {
    or.push({ normalizedCode: { startsWith: norm, mode: "insensitive" } });
    or.push({ code: { startsWith: raw, mode: "insensitive" } });
  }

  if (pattern) {
    or.push({ shortDescription: { contains: raw, mode: "insensitive" } });
    or.push({ longDescription: { contains: raw, mode: "insensitive" } });
    or.push({ searchText: { contains: raw.toLowerCase(), mode: "insensitive" } });
  }

  for (const token of tokens) {
    if (token.length < 2) continue;
    or.push({ shortDescription: { contains: token, mode: "insensitive" } });
  }

  return {
    isActive: true,
    OR: or.length > 0 ? or : [{ id: "__no_match__" }],
  };
}

async function main() {
  const [totalRows, activeRows] = await Promise.all([
    prisma.icd10DiagnosisCode.count(),
    prisma.icd10DiagnosisCode.count({ where: { isActive: true } }),
  ]);

  const productionReleaseRows = await prisma.icd10DiagnosisCode.count({
    where: { isActive: true, releaseVersion: "FY2026" },
  });

  console.log("=== ICD-10 catalog readiness ===");
  console.log(`Total rows:  ${totalRows}`);
  console.log(`Active rows: ${activeRows}`);
  console.log(`FY2026 production-release rows: ${productionReleaseRows}`);
  console.log(`Minimum rows required for ER sample phase: ${MIN_SAMPLE_ROWS}`);
  console.log(
    productionReleaseRows >= PRODUCTION_HINT_ROWS
      ? "Production hint: FY2026 release appears loaded. Run `pnpm --filter @medora/api icd:coverage` for certification."
      : "Production hint: FY2026 full catalog not detected. Demo sample may be present — not production-complete.",
  );
  console.log("");

  const failures: string[] = [];
  if (totalRows < MIN_SAMPLE_ROWS) {
    failures.push(`Total ICD-10 rows ${totalRows} is below required minimum ${MIN_SAMPLE_ROWS}.`);
  }
  if (activeRows < MIN_SAMPLE_ROWS) {
    failures.push(`Active ICD-10 rows ${activeRows} is below required minimum ${MIN_SAMPLE_ROWS}.`);
  }

  console.log("=== ICD-10 smoke search queries ===");
  for (const query of REQUIRED_SMOKE_QUERIES) {
    const count = await prisma.icd10DiagnosisCode.count({ where: searchWhere(query) });
    console.log(`${query.padEnd(8)} ${count}`);
    if (count === 0) {
      failures.push(`Smoke query "${query}" returned 0 active ICD-10 rows.`);
    }
  }

  if (failures.length > 0) {
    console.error("\n=== ICD-10 readiness FAILED ===");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\n=== ICD-10 readiness: OK ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
