/**
 * Read-only coverage report for nullable displayNameEn on shared catalogs.
 *
 * Usage (from repo root):
 *   pnpm --filter @medora/api catalog:report-display-en
 *
 * Phase G gates (exit 1 on failure unless relaxed):
 * - Any `isEssential` row missing displayNameEn
 * - Aggregate coverage below 90% when at least 30 catalog rows exist
 * - US ER lab checklist codes present in DB missing displayNameEn
 *
 * Empty catalog (0 total rows): warn and exit 0 (no DB / not migrated).
 * Set `CATALOG_EN_REPORT_RELAXED=1` to only fail on essential gaps (skip aggregate % gate).
 */
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import { US_ER_LAB_CATALOG } from "../prisma/data/er-us-lab-tests";

const prisma = new PrismaClient();

/** Seeded US ER lab codes (Phase E / billing-adjacent checklist). */
const US_ER_LAB_CODES = new Set(US_ER_LAB_CATALOG.map((r) => r.code));

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return `${((100 * n) / d).toFixed(1)}%`;
}

function hasEn(v: string | null | undefined): boolean {
  return (v ?? "").trim().length > 0;
}

type Row = { code: string; displayNameEn: string | null; isEssential: boolean; sortPriority: number };

function summarize(rows: Row[], label: string) {
  const total = rows.length;
  const withEn = rows.filter((r) => hasEn(r.displayNameEn)).length;
  const essentialRows = rows.filter((r) => r.isEssential);
  const essentialWithEn = essentialRows.filter((r) => hasEn(r.displayNameEn)).length;
  const missingEssential = essentialRows.filter((r) => !hasEn(r.displayNameEn)).map((r) => r.code);

  console.log(`--- ${label} ---`);
  console.log(`Total rows:                    ${total}`);
  console.log(`With displayNameEn:            ${withEn} (${pct(withEn, total)})`);
  console.log(`Missing displayNameEn:         ${total - withEn}`);
  console.log(
    `Essential rows (isEssential):  ${essentialWithEn} / ${essentialRows.length} (${pct(essentialWithEn, essentialRows.length)}) with displayNameEn`
  );
  if (missingEssential.length) {
    console.log(`Missing essential codes (${missingEssential.length}): ${missingEssential.join(", ")}`);
  } else {
    console.log("Missing essential codes:       (none)");
  }

  const missing = rows.filter((r) => !hasEn(r.displayNameEn));
  const topMissing = [...missing].sort((a, b) => {
    if (a.isEssential !== b.isEssential) return a.isEssential ? -1 : 1;
    if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    return a.code.localeCompare(b.code);
  });
  const show = topMissing.slice(0, 25);
  console.log(`Top missing by priority (essential first, then sortPriority asc, max 25):`);
  if (!show.length) {
    console.log("  (none)");
  } else {
    for (const r of show) {
      console.log(`  ${r.code}  essential=${r.isEssential}  sortPriority=${r.sortPriority}`);
    }
  }
  console.log("");
  return { total, withEn, essentialRows: essentialRows.length, essentialWithEn, missingEssential };
}

async function main() {
  const [labRows, imgRows, medRows] = await Promise.all([
    prisma.catalogLabTest.findMany({
      select: { code: true, displayNameEn: true, isEssential: true, sortPriority: true },
    }),
    prisma.catalogImagingStudy.findMany({
      select: { code: true, displayNameEn: true, isEssential: true, sortPriority: true },
    }),
    prisma.catalogMedication.findMany({
      select: { code: true, displayNameEn: true, isEssential: true, sortPriority: true },
    }),
  ]);

  const labByCode = new Map(labRows.map((r) => [r.code, r]));

  console.log("=== displayNameEn coverage (non-empty string) ===\n");
  const labS = summarize(labRows, "CatalogLabTest");
  summarize(imgRows, "CatalogImagingStudy");
  summarize(medRows, "CatalogMedication");

  const grandTotal = labS.total + imgRows.length + medRows.length;
  const grandWith =
    labS.withEn + imgRows.filter((r) => hasEn(r.displayNameEn)).length + medRows.filter((r) => hasEn(r.displayNameEn)).length;
  const essTotal = labS.essentialRows + imgRows.filter((r) => r.isEssential).length + medRows.filter((r) => r.isEssential).length;
  const essWith =
    labS.essentialWithEn +
    imgRows.filter((r) => r.isEssential && hasEn(r.displayNameEn)).length +
    medRows.filter((r) => r.isEssential && hasEn(r.displayNameEn)).length;

  console.log("=== aggregate (all three catalogs) ===");
  console.log(`Total coverage:           ${grandWith} / ${grandTotal} (${pct(grandWith, grandTotal)})`);
  console.log(`Essential rows coverage:  ${essWith} / ${essTotal} (${pct(essWith, essTotal)})`);
  console.log("");

  console.log("=== Phase E — US ER lab checklist (seeded codes present in DB but missing displayNameEn) ===");
  const usErGaps: string[] = [];
  for (const code of US_ER_LAB_CODES) {
    const row = labByCode.get(code);
    if (!row) continue;
    if (!hasEn(row.displayNameEn)) usErGaps.push(code);
  }
  if (!usErGaps.length) {
    console.log("(none — all US ER lab rows in DB have displayNameEn)");
  } else {
    console.log(usErGaps.join(", "));
  }
  console.log("");
  console.log(
    "Note: Haiti seeds historically set `name` from French (`displayNameFr`); US ER seeds set `name` from English prose (`nameEn`). English UI must use `displayNameEn`, not `name`."
  );

  const relaxed = process.env.CATALOG_EN_REPORT_RELAXED === "1" || process.env.CATALOG_EN_REPORT_RELAXED === "true";
  const failures: string[] = [];

  const allMissingEssential = [
    ...labRows.filter((r) => r.isEssential && !hasEn(r.displayNameEn)).map((r) => `lab:${r.code}`),
    ...imgRows.filter((r) => r.isEssential && !hasEn(r.displayNameEn)).map((r) => `imaging:${r.code}`),
    ...medRows.filter((r) => r.isEssential && !hasEn(r.displayNameEn)).map((r) => `med:${r.code}`),
  ];
  if (allMissingEssential.length) {
    failures.push(`Essential rows missing displayNameEn: ${allMissingEssential.join(", ")}`);
  }
  if (usErGaps.length) {
    failures.push(`US ER lab checklist missing displayNameEn: ${usErGaps.join(", ")}`);
  }

  const minTotalPct = 0.9;
  const minRowsForAgg = 30;
  if (!relaxed && grandTotal >= minRowsForAgg && grandTotal > 0) {
    const ratio = grandWith / grandTotal;
    if (ratio < minTotalPct) {
      failures.push(
        `Aggregate displayNameEn coverage ${pct(grandWith, grandTotal)} is below required ${(100 * minTotalPct).toFixed(0)}% (rows ≥ ${minRowsForAgg}). Set CATALOG_EN_REPORT_RELAXED=1 to skip this gate.`
      );
    }
  }

  if (grandTotal === 0) {
    console.warn("\n[catalog] No catalog rows in DB — skipping Phase G coverage gates (migrate + seed when ready).");
  } else if (failures.length) {
    console.error("\n=== Phase G — catalog:report-display-en FAILED ===\n" + failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("\n=== Phase G — catalog:report-display-en gates: OK ===");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
