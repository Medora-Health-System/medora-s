/**
 * Certify penetrating trauma ICD coverage against an official release.
 *
 * pnpm --filter @medora/api icd:coverage:penetrating-trauma -- --file=/path/to/official-release.zip --release=2026 --write-reports
 */
import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { selectPenetratingTraumaScopedCodes } from "./icd10-penetrating-trauma-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const file = getArg("file");
  const release = getArg("release") ?? "2026";
  if (!file) {
    console.error("Missing --file=/path/to/official-release.(zip|txt)");
    process.exit(1);
  }
  const validation = validateIcd10CmRelease({
    file,
    release,
    allowDevSample: hasFlag("allow-dev-sample"),
    skipChecksum: hasFlag("skip-checksum"),
  });
  if (!validation.ok || !validation.parse) {
    console.error("Official release validation failed; cannot certify.");
    for (const error of validation.errors) console.error(`- ${error}`);
    process.exit(1);
  }

  const official = selectPenetratingTraumaScopedCodes(validation.parse.rows, { billableOnly: true });
  const prisma = new PrismaClient();
  try {
    const medoraRows = await prisma.icd10DiagnosisCode.findMany({
      where: { codeSystem: validation.manifest.codeSystem, releaseVersion: validation.manifest.releaseVersion },
      select: { code: true, shortDescription: true, isBillable: true, isSelectable: true, isActive: true },
    });
    const medoraByCode = new Map(medoraRows.map((row) => [row.code, row]));
    const missingCodes = official.filter((row) => !medoraByCode.get(row.code)?.isActive).map((row) => row.code);
    const descriptionMismatches = official.flatMap((row) => {
      const medora = medoraByCode.get(row.code);
      return medora && medora.shortDescription.trim() !== row.shortDescription.trim()
        ? [{ code: row.code, official: row.shortDescription, medora: medora.shortDescription }]
        : [];
    });
    const invalidSelectableHeaders = medoraRows.filter((row) => !row.isBillable && row.isSelectable).length;
    const report = {
      generatedAt: new Date().toISOString(),
      overall: {
        officialReleaseTotalRows: validation.parse.rows.length,
        officialBillableRows: validation.parse.billableCount,
        medoraImportedRows: medoraRows.length,
        releaseVersion: validation.manifest.releaseVersion,
        artifactSha256: validation.artifactSha256,
      },
      penetratingTrauma: {
        scopedOfficialBillable: official.length,
        presentInMedora: official.length - missingCodes.length,
        missingCodes,
        descriptionMismatches: descriptionMismatches.slice(0, 50),
        invalidSelectableHeaders,
      },
      certification: {
        penetratingTraumaPass: missingCodes.length === 0 && invalidSelectableHeaders === 0,
        overallParityPass: medoraRows.length === validation.parse.rows.length,
      },
    };
    console.log(JSON.stringify(report, null, 2));

    const summaryDir = resolve(__dirname, "certification-summaries");
    const summary = JSON.stringify(report, null, 2);
    mkdirSync(summaryDir, { recursive: true });
    writeFileSync(join(summaryDir, "fy2026-penetrating-trauma-coverage-summary.json"), summary);
    const releaseSummaryDir = join(summaryDir, String(validation.manifest.releaseYear));
    mkdirSync(releaseSummaryDir, { recursive: true });
    writeFileSync(join(releaseSummaryDir, "fy2026-penetrating-trauma-coverage-summary.json"), summary);

    if (hasFlag("write-reports")) {
      const outDir = resolve(process.cwd(), getArg("report-dir") ?? `reports/icd10/${validation.manifest.releaseYear}`);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "penetrating-trauma-coverage.json"), JSON.stringify(report.penetratingTrauma, null, 2));
      console.error(`Wrote reports to ${outDir}`);
    }
    process.exit(report.certification.penetratingTraumaPass && report.certification.overallParityPass ? 0 : 2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
