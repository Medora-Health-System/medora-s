/**
 * Certify OB/GYN and urology ICD coverage (Phase 17) against official FY2026.
 *
 *   pnpm --filter @medora/api icd:coverage:obgyn-urology -- \
 *     --file=/path/to/official-release.zip --release=2026 --write-reports
 */
import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  selectGynecologicScopedCodes,
  selectGuTraumaScopedCodes,
  selectObGynUrologyScopedCodes,
  selectObstetricScopedCodes,
  selectUrologicScopedCodes,
} from "./icd10-obgyn-urology-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const file = arg("file");
  const release = arg("release") ?? "2026";
  if (!file) throw new Error("Missing --file=/path/to/official-release.zip");
  const validation = validateIcd10CmRelease({
    file,
    release,
    allowDevSample: flag("allow-dev-sample"),
    skipChecksum: flag("skip-checksum"),
  });
  if (!validation.ok || !validation.parse) {
    throw new Error(`Official release validation failed: ${validation.errors.join("; ")}`);
  }

  const rows = validation.parse.rows;
  const scoped = selectObGynUrologyScopedCodes(rows, { billableOnly: true });
  const obstetric = selectObstetricScopedCodes(rows, { billableOnly: true });
  const gynecologic = selectGynecologicScopedCodes(rows, { billableOnly: true });
  const urologic = selectUrologicScopedCodes(rows, { billableOnly: true });
  const guTrauma = selectGuTraumaScopedCodes(rows, { billableOnly: true });

  const ownershipGaps = (
    [
      ["obstetric", obstetric],
      ["gynecologic", gynecologic],
      ["urologic", urologic],
      ["gu_trauma", guTrauma],
    ] as const
  )
    .filter(([, bucket]) => bucket.length === 0)
    .map(([id]) => id);

  const prisma = new PrismaClient();
  try {
    const dbRows = await prisma.icd10DiagnosisCode.findMany({
      where: {
        codeSystem: validation.manifest.codeSystem,
        releaseVersion: validation.manifest.releaseVersion,
      },
      select: { code: true, shortDescription: true, isActive: true, isBillable: true },
    });
    const byCode = new Map(dbRows.map((row) => [row.code, row]));
    const missingCodes = scoped.filter((row) => !byCode.get(row.code)?.isActive).map((row) => row.code);
    const descriptionMismatches = scoped
      .filter((row) => byCode.get(row.code)?.shortDescription.trim() !== row.shortDescription.trim())
      .map((row) => row.code);

    const activeScoped = dbRows.filter((row) => row.isActive && scoped.some((s) => s.code === row.code));
    const codeCounts = new Map<string, number>();
    for (const row of activeScoped) codeCounts.set(row.code, (codeCounts.get(row.code) ?? 0) + 1);
    const duplicateActiveCodes = [...codeCounts.entries()].filter(([, count]) => count > 1).map(([code]) => code);

    const invalidSelectableHeaders = scoped
      .filter((row) => {
        const medora = byCode.get(row.code);
        return medora?.isActive && medora.isBillable === false;
      })
      .map((row) => row.code);

    const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
    const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));

    // Must never reclaim Phase 13 bite external causes or other cross-phase steals as exclusive Phase 17 ownership.
    const crossPhaseOwnershipSteals = scoped
      .filter((row) => starts(row.code, "W54") || starts(row.code, "W55") || starts(row.code, "W50"))
      .map((row) => row.code);

    // N49.3 Fournier is intentionally in scope for coverage; Phase 13 retains routing ownership.
    const fournierCoveragePresent = scoped.some((row) => starts(row.code, "N49.3"));

    const report = {
      obgynUrology: {
        scopedOfficialBillable: scoped.length,
        presentInMedora: scoped.length - missingCodes.length,
        missingCodes,
        descriptionMismatches,
        duplicateActiveCodes,
        invalidSelectableHeaders,
      },
      buckets: {
        obstetric: obstetric.length,
        gynecologic: gynecologic.length,
        urologic: urologic.length,
        guTrauma: guTrauma.length,
      },
      ownershipGaps,
      crossPhaseOwnershipSteals,
      fournierCoveragePresent,
      certification: {
        pass:
          missingCodes.length === 0 &&
          descriptionMismatches.length === 0 &&
          duplicateActiveCodes.length === 0 &&
          invalidSelectableHeaders.length === 0 &&
          ownershipGaps.length === 0 &&
          crossPhaseOwnershipSteals.length === 0,
      },
    };

    const summary = JSON.stringify(report, null, 2);
    const dir = resolve(__dirname, "certification-summaries");
    mkdirSync(join(dir, release), { recursive: true });
    writeFileSync(join(dir, "fy2026-obgyn-urology-coverage-summary.json"), summary);
    writeFileSync(join(dir, release, "fy2026-obgyn-urology-coverage-summary.json"), summary);
    console.log(summary);
    process.exit(report.certification.pass ? 0 : 2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
