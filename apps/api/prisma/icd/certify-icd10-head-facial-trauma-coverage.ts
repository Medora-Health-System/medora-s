import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { selectHeadFacialTraumaScopedCodes } from "./icd10-head-facial-trauma-scope";
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

  const scoped = selectHeadFacialTraumaScopedCodes(validation.parse.rows, { billableOnly: true });
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.icd10DiagnosisCode.findMany({
      where: {
        codeSystem: validation.manifest.codeSystem,
        releaseVersion: validation.manifest.releaseVersion,
      },
      select: { code: true, shortDescription: true, isActive: true, isBillable: true },
    });
    const byCode = new Map(rows.map((row) => [row.code, row]));
    const missingCodes = scoped.filter((row) => !byCode.get(row.code)?.isActive).map((row) => row.code);
    const descriptionMismatches = scoped
      .filter((row) => byCode.get(row.code)?.shortDescription.trim() !== row.shortDescription.trim())
      .map((row) => row.code);

    const activeScoped = rows.filter((row) => row.isActive && scoped.some((s) => s.code === row.code));
    const codeCounts = new Map<string, number>();
    for (const row of activeScoped) codeCounts.set(row.code, (codeCounts.get(row.code) ?? 0) + 1);
    const duplicateActiveCodes = [...codeCounts.entries()].filter(([, count]) => count > 1).map(([code]) => code);

    const invalidSelectableHeaders = scoped
      .filter((row) => {
        const medora = byCode.get(row.code);
        return medora?.isActive && medora.isBillable === false;
      })
      .map((row) => row.code);

    const report = {
      headFacialTrauma: {
        scopedOfficialBillable: scoped.length,
        presentInMedora: scoped.length - missingCodes.length,
        missingCodes,
        descriptionMismatches,
        duplicateActiveCodes,
        invalidSelectableHeaders,
      },
      certification: {
        pass:
          missingCodes.length === 0 &&
          descriptionMismatches.length === 0 &&
          duplicateActiveCodes.length === 0 &&
          invalidSelectableHeaders.length === 0,
      },
    };

    const summary = JSON.stringify(report, null, 2);
    const dir = resolve(__dirname, "certification-summaries");
    mkdirSync(join(dir, release), { recursive: true });
    writeFileSync(join(dir, "fy2026-head-facial-trauma-coverage-summary.json"), summary);
    writeFileSync(join(dir, release, "fy2026-head-facial-trauma-coverage-summary.json"), summary);
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
