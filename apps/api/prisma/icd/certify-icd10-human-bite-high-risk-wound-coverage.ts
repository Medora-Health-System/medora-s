import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { selectHumanBiteHighRiskWoundScopedCodes } from "./icd10-human-bite-high-risk-wound-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const file = arg("file");
  const release = arg("release") ?? "2026";
  if (!file) throw new Error("Missing --file=/path/to/official-release.zip");
  const validation = validateIcd10CmRelease({ file, release, allowDevSample: flag("allow-dev-sample"), skipChecksum: flag("skip-checksum") });
  if (!validation.ok || !validation.parse) throw new Error(`Official release validation failed: ${validation.errors.join("; ")}`);
  const scoped = selectHumanBiteHighRiskWoundScopedCodes(validation.parse.rows, { billableOnly: true });
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.icd10DiagnosisCode.findMany({ where: { codeSystem: validation.manifest.codeSystem, releaseVersion: validation.manifest.releaseVersion }, select: { code: true, shortDescription: true, isActive: true, isBillable: true, isSelectable: true } });
    const byCode = new Map(rows.map((row) => [row.code, row]));
    const missingCodes = scoped.filter((row) => !byCode.get(row.code)?.isActive).map((row) => row.code);
    const descriptionMismatches = scoped.filter((row) => byCode.get(row.code) && byCode.get(row.code)!.shortDescription.trim() !== row.shortDescription.trim()).map((row) => row.code);
    const duplicateCodes = rows.map((row) => row.code).filter((code, i, all) => all.indexOf(code) !== i);
    const invalidSelectableHeaders = rows.filter((row) => !row.isBillable && row.isSelectable).length;
    const report = { humanBiteHighRiskWound: { scopedOfficialBillable: scoped.length, presentInMedora: scoped.length - missingCodes.length, missingCodes, descriptionMismatches, duplicateCodes: [...new Set(duplicateCodes)], invalidSelectableHeaders }, certification: { pass: !missingCodes.length && !descriptionMismatches.length && !duplicateCodes.length && !invalidSelectableHeaders } };
    console.log(JSON.stringify(report, null, 2));
    const summary = JSON.stringify(report, null, 2); const dir = resolve(__dirname, "certification-summaries"); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, "fy2026-human-bite-high-risk-wound-coverage-summary.json"), summary); const releaseDir = join(dir, String(validation.manifest.releaseYear)); mkdirSync(releaseDir, { recursive: true }); writeFileSync(join(releaseDir, "fy2026-human-bite-high-risk-wound-coverage-summary.json"), summary);
    process.exit(report.certification.pass ? 0 : 2);
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
