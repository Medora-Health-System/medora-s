/**
 * Certify crush / amputation / foreign-body ICD coverage vs official FY2026 release.
 *
 *   pnpm --filter @medora/api icd:coverage:crush-amp-fb -- --file=/path/to/zip --release=2026 --write-reports
 */
import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";
import {
  selectAmputationScopedCodes,
  selectCrushScopedCodes,
  selectForeignBodyScopedCodes,
} from "./icd10-crush-amputation-foreign-body-scope";

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

type CoverageBucket = {
  scopedOfficialBillable: number;
  presentInMedora: number;
  missingCodes: string[];
  descriptionMismatches: Array<{ code: string; official: string; medora: string }>;
  duplicateActiveCodes: string[];
  invalidSelectableHeaders: number;
};

function certifyFamily(
  officialScoped: ReturnType<typeof selectCrushScopedCodes>,
  medoraByCode: Map<
    string,
    {
      code: string;
      shortDescription: string;
      longDescription: string | null;
      isBillable: boolean;
      isSelectable: boolean;
      isActive: boolean;
    }
  >,
): CoverageBucket {
  const missingCodes: string[] = [];
  const descriptionMismatches: CoverageBucket["descriptionMismatches"] = [];
  let present = 0;
  for (const row of officialScoped) {
    const m = medoraByCode.get(row.code);
    if (!m || !m.isActive) {
      missingCodes.push(row.code);
      continue;
    }
    present++;
    if (m.shortDescription.trim() !== row.shortDescription.trim()) {
      descriptionMismatches.push({
        code: row.code,
        official: row.shortDescription,
        medora: m.shortDescription,
      });
    }
  }
  const counts = new Map<string, number>();
  for (const code of medoraByCode.keys()) {
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const duplicateActiveCodes = [...counts.entries()].filter(([, n]) => n > 1).map(([c]) => c);
  return {
    scopedOfficialBillable: officialScoped.length,
    presentInMedora: present,
    missingCodes,
    descriptionMismatches: descriptionMismatches.slice(0, 50),
    duplicateActiveCodes,
    invalidSelectableHeaders: [...medoraByCode.values()].filter((r) => !r.isBillable && r.isSelectable)
      .length,
  };
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
    for (const e of validation.errors) console.error(`- ${e}`);
    process.exit(1);
  }

  const crushOfficial = selectCrushScopedCodes(validation.parse.rows, { billableOnly: true });
  const amputationOfficial = selectAmputationScopedCodes(validation.parse.rows, { billableOnly: true });
  const foreignBodyOfficial = selectForeignBodyScopedCodes(validation.parse.rows, {
    billableOnly: true,
  });

  const prisma = new PrismaClient();
  try {
    const medoraRows = await prisma.icd10DiagnosisCode.findMany({
      where: {
        codeSystem: validation.manifest.codeSystem,
        releaseVersion: validation.manifest.releaseVersion,
      },
      select: {
        code: true,
        shortDescription: true,
        longDescription: true,
        isBillable: true,
        isSelectable: true,
        isActive: true,
      },
    });
    const medoraByCode = new Map(medoraRows.map((r) => [r.code, r]));

    const overall = {
      officialReleaseTotalRows: validation.parse.rows.length,
      officialBillableRows: validation.parse.billableCount,
      medoraImportedRows: medoraRows.length,
      medoraActiveSelectableRows: medoraRows.filter((r) => r.isActive && r.isSelectable).length,
      releaseVersion: validation.manifest.releaseVersion,
      artifactSha256: validation.artifactSha256,
      sourceSha256: validation.parse.sourceSha256,
    };

    const crush = certifyFamily(crushOfficial, medoraByCode);
    const amputation = certifyFamily(amputationOfficial, medoraByCode);
    const foreignBody = certifyFamily(foreignBodyOfficial, medoraByCode);

    const duplicateActiveCodes = new Set([
      ...crush.duplicateActiveCodes,
      ...amputation.duplicateActiveCodes,
      ...foreignBody.duplicateActiveCodes,
    ]).size;

    const report = {
      generatedAt: new Date().toISOString(),
      overall,
      crush,
      amputation,
      foreignBody,
      certification: {
        crushOfficialCount: crush.scopedOfficialBillable,
        crushImportedCount: crush.presentInMedora,
        crushMissing: crush.missingCodes.length,
        amputationOfficialCount: amputation.scopedOfficialBillable,
        amputationImportedCount: amputation.presentInMedora,
        amputationMissing: amputation.missingCodes.length,
        foreignBodyOfficialCount: foreignBody.scopedOfficialBillable,
        foreignBodyImportedCount: foreignBody.presentInMedora,
        foreignBodyMissing: foreignBody.missingCodes.length,
        duplicateActiveCodes,
        invalidSelectableCodes:
          crush.invalidSelectableHeaders +
          amputation.invalidSelectableHeaders +
          foreignBody.invalidSelectableHeaders,
        crushPass: crush.missingCodes.length === 0 && crush.invalidSelectableHeaders === 0,
        amputationPass:
          amputation.missingCodes.length === 0 && amputation.invalidSelectableHeaders === 0,
        foreignBodyPass:
          foreignBody.missingCodes.length === 0 && foreignBody.invalidSelectableHeaders === 0,
        overallParityPass: medoraRows.length === validation.parse.rows.length,
      },
    };

    console.log(JSON.stringify(report, null, 2));

    const summaryDir = resolve(__dirname, "certification-summaries");
    mkdirSync(summaryDir, { recursive: true });
    writeFileSync(
      join(summaryDir, "fy2026-crush-amputation-foreign-body-coverage-summary.json"),
      JSON.stringify(
        {
          generatedAt: report.generatedAt,
          overall,
          certification: report.certification,
          crush: {
            scopedOfficialBillable: crush.scopedOfficialBillable,
            missing: crush.missingCodes.length,
          },
          amputation: {
            scopedOfficialBillable: amputation.scopedOfficialBillable,
            missing: amputation.missingCodes.length,
          },
          foreignBody: {
            scopedOfficialBillable: foreignBody.scopedOfficialBillable,
            missing: foreignBody.missingCodes.length,
          },
        },
        null,
        2,
      ),
    );

    if (hasFlag("write-reports")) {
      const outDir = resolve(
        process.cwd(),
        getArg("report-dir") ?? `reports/icd10/${validation.manifest.releaseYear}`,
      );
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "crush-coverage.json"), JSON.stringify(crush, null, 2));
      writeFileSync(join(outDir, "amputation-coverage.json"), JSON.stringify(amputation, null, 2));
      writeFileSync(join(outDir, "foreign-body-coverage.json"), JSON.stringify(foreignBody, null, 2));
      writeFileSync(
        join(outDir, "crush-amputation-foreign-body-unmapped.json"),
        JSON.stringify(
          {
            crushMissingCodes: crush.missingCodes,
            amputationMissingCodes: amputation.missingCodes,
            foreignBodyMissingCodes: foreignBody.missingCodes,
          },
          null,
          2,
        ),
      );
      console.error(`Wrote reports to ${outDir}`);
    }

    const pass =
      report.certification.crushPass &&
      report.certification.amputationPass &&
      report.certification.foreignBodyPass &&
      report.certification.duplicateActiveCodes === 0 &&
      report.certification.overallParityPass;
    process.exit(pass ? 0 : 2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
