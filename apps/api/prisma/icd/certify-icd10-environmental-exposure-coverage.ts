/**
 * Certify environmental-exposure ICD coverage (Phase 15) by comparing Medora DB
 * to the parsed official FY2026 release. Mirrors the soft-tissue/dermatology
 * coverage certifiers (certify-icd10-soft-tissue-wound-infections-coverage.ts,
 * certify-icd10-dermatology-coverage.ts).
 *
 *   pnpm --filter @medora/api icd:coverage:environmental-exposure -- \
 *     --file=/path/to/official-release.zip --release=2026 --write-reports
 */
import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  selectAltitudeDivingScopedCodes,
  selectColdIllnessScopedCodes,
  selectElectricalLightningScopedCodes,
  selectEnvironmentalExposureScopedCodes,
  selectFrostbiteScopedCodes,
  selectHeatIllnessScopedCodes,
  selectRadiationScopedCodes,
  selectSubmersionScopedCodes,
} from "./icd10-environmental-exposure-scope";
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
  const scoped = selectEnvironmentalExposureScopedCodes(rows, { billableOnly: true });
  const heatOwned = selectHeatIllnessScopedCodes(rows, { billableOnly: true });
  const coldOwned = selectColdIllnessScopedCodes(rows, { billableOnly: true });
  const frostbiteOwned = selectFrostbiteScopedCodes(rows, { billableOnly: true });
  const submersionOwned = selectSubmersionScopedCodes(rows, { billableOnly: true });
  const electricalLightningOwned = selectElectricalLightningScopedCodes(rows, { billableOnly: true });
  const altitudeDivingOwned = selectAltitudeDivingScopedCodes(rows, { billableOnly: true });
  const radiationOwned = selectRadiationScopedCodes(rows, { billableOnly: true });

  const ownershipGaps = (
    [
      ["heat_illness", heatOwned],
      ["cold_illness", coldOwned],
      ["frostbite", frostbiteOwned],
      ["submersion", submersionOwned],
      ["electrical_lightning", electricalLightningOwned],
      ["altitude_diving", altitudeDivingOwned],
      ["radiation", radiationOwned],
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

    // Excluded phases must never be reclaimed as environmental-exposure-exclusive scope.
    const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
    const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));
    const crossPhaseOwnershipSteals = scoped
      .filter(
        (row) =>
          starts(row.code, "L55") ||
          starts(row.code, "T20") ||
          starts(row.code, "T21") ||
          starts(row.code, "T22") ||
          starts(row.code, "T23") ||
          starts(row.code, "T24") ||
          starts(row.code, "T25") ||
          starts(row.code, "T26") ||
          starts(row.code, "T27") ||
          starts(row.code, "T28") ||
          starts(row.code, "T30") ||
          starts(row.code, "T31") ||
          starts(row.code, "T32") ||
          starts(row.code, "T58"),
      )
      .map((row) => row.code);

    const report = {
      environmentalExposure: {
        scopedOfficialBillable: scoped.length,
        presentInMedora: scoped.length - missingCodes.length,
        missingCodes,
        descriptionMismatches,
        duplicateActiveCodes,
        invalidSelectableHeaders,
      },
      buckets: {
        heatIllness: heatOwned.length,
        coldIllness: coldOwned.length,
        frostbite: frostbiteOwned.length,
        submersion: submersionOwned.length,
        electricalLightning: electricalLightningOwned.length,
        altitudeDiving: altitudeDivingOwned.length,
        radiation: radiationOwned.length,
      },
      ownershipGaps,
      crossPhaseOwnershipSteals,
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
    writeFileSync(join(dir, "fy2026-environmental-exposure-coverage-summary.json"), summary);
    writeFileSync(join(dir, release, "fy2026-environmental-exposure-coverage-summary.json"), summary);
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
