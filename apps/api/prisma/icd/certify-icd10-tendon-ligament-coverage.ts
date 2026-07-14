/**
 * Certify tendon/ligament ICD coverage by comparing Medora DB to the parsed official release.
 *
 *   pnpm --filter @medora/api icd:coverage -- --file=/path/to/zip --release=2026
 *   pnpm --filter @medora/api icd:coverage -- --file=/path/to/order.txt --release=2026 --write-reports
 */
import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";
import {
  LIGAMENT_SCOPE_FAMILIES,
  TENDON_SCOPE_FAMILIES,
  selectScopedCodes,
} from "./icd10-tendon-ligament-scope";

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
  officialScoped: ReturnType<typeof selectScopedCodes>,
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
    invalidSelectableHeaders: [...medoraByCode.values()].filter((r) => !r.isBillable && r.isSelectable).length,
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

  const tendonOfficial = selectScopedCodes(validation.parse.rows, TENDON_SCOPE_FAMILIES, {
    billableOnly: true,
  });
  const ligamentOfficial = selectScopedCodes(validation.parse.rows, LIGAMENT_SCOPE_FAMILIES, {
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

    const tendon = certifyFamily(tendonOfficial, medoraByCode);
    const ligament = certifyFamily(ligamentOfficial, medoraByCode);

    const report = {
      generatedAt: new Date().toISOString(),
      overall,
      tendon,
      ligament,
      certification: {
        tendonMissing: tendon.missingCodes.length,
        ligamentMissing: ligament.missingCodes.length,
        duplicateActiveCodes: new Set([...tendon.duplicateActiveCodes, ...ligament.duplicateActiveCodes]).size,
        invalidSelectableCodes: tendon.invalidSelectableHeaders + ligament.invalidSelectableHeaders,
        tendonPass: tendon.missingCodes.length === 0 && tendon.invalidSelectableHeaders === 0,
        ligamentPass: ligament.missingCodes.length === 0 && ligament.invalidSelectableHeaders === 0,
        overallParityPass: medoraRows.length === validation.parse.rows.length,
      },
    };

    console.log(JSON.stringify(report, null, 2));

    if (hasFlag("write-reports")) {
      const outDir = resolve(process.cwd(), getArg("report-dir") ?? `reports/icd10/${validation.manifest.releaseYear}`);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "overall-coverage.json"), JSON.stringify({ overall, certification: report.certification }, null, 2));
      writeFileSync(join(outDir, "tendon-coverage.json"), JSON.stringify(tendon, null, 2));
      writeFileSync(join(outDir, "ligament-coverage.json"), JSON.stringify(ligament, null, 2));
      writeFileSync(
        join(outDir, "unmapped-selectable-codes.json"),
        JSON.stringify(
          {
            tendonMissingCodes: tendon.missingCodes,
            ligamentMissingCodes: ligament.missingCodes,
          },
          null,
          2,
        ),
      );
      console.error(`Wrote reports to ${outDir}`);
    }

    const pass =
      report.certification.tendonPass &&
      report.certification.ligamentPass &&
      report.certification.overallParityPass &&
      report.certification.duplicateActiveCodes === 0;
    process.exit(pass ? 0 : 2);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
