/**
 * RxNorm real reference import CLI (Phase 5 — non-clinical staging only).
 *
 * Usage:
 *   pnpm --filter @medora/api medication:rxnorm:real:manifest -- --manifest=... --source-dir=...
 *   pnpm --filter @medora/api medication:rxnorm:real:validate -- --manifest=... --source-dir=...
 *   pnpm --filter @medora/api medication:rxnorm:real:stage -- --confirm-real-source --confirm-nonclinical-only ...
 *   pnpm --filter @medora/api medication:rxnorm:real:candidates -- --confirm-real-source --confirm-nonclinical-only ...
 *   pnpm --filter @medora/api medication:rxnorm:real:report -- ...
 *   pnpm --filter @medora/api medication:rxnorm:real:rollback -- --confirm-rollback-real-release ...
 */
import "reflect-metadata";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  REAL_IMPORT_MODE_VALUES,
  type RxNormRealImportMode,
} from "@medora/shared";
import { runRxNormRealImport } from "./rxnorm-real-import-service";

const DEFAULT_FIXTURE_DIR = join(__dirname, "fixtures");
const DEFAULT_MANIFEST = join(DEFAULT_FIXTURE_DIR, "structural-rxnorm-manifest-p5.json");

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function resolveModeFromScriptOrArg(): RxNormRealImportMode {
  const explicit = getArg("mode");
  if (explicit) {
    if (!(REAL_IMPORT_MODE_VALUES as readonly string[]).includes(explicit)) {
      console.error(`Invalid --mode=${explicit}`);
      process.exit(1);
    }
    return explicit as RxNormRealImportMode;
  }

  const lifecycleEvent = process.env.npm_lifecycle_event ?? "";
  const modeByScript: Record<string, RxNormRealImportMode> = {
    "medication:rxnorm:real:manifest": "VALIDATE_MANIFEST",
    "medication:rxnorm:real:validate": "VALIDATE_SOURCE",
    "medication:rxnorm:real:stage": "STAGE_REAL_REFERENCE",
    "medication:rxnorm:real:candidates": "GENERATE_REAL_CANDIDATES",
    "medication:rxnorm:real:report": "REPORT_RELEASE",
    "medication:rxnorm:real:rollback": "ROLLBACK_REAL_RELEASE",
  };

  const mapped = modeByScript[lifecycleEvent];
  if (mapped) return mapped;

  console.error(`Missing --mode= (${REAL_IMPORT_MODE_VALUES.join("|")})`);
  process.exit(1);
}

async function main() {
  const mode = resolveModeFromScriptOrArg();
  const manifestPath = getArg("manifest") ?? DEFAULT_MANIFEST;
  const sourceDir = getArg("source-dir") ?? DEFAULT_FIXTURE_DIR;
  const actor = getArg("actor") ?? "rxnorm-real-import-cli";
  const dryRun = hasFlag("dry-run");

  console.log("=== RxNorm real reference import (Phase 5 — non-clinical only) ===");
  console.log(`Mode:              ${mode}`);
  console.log(`Manifest:          ${manifestPath}`);
  console.log(`Source dir:        ${sourceDir}`);
  console.log(`Actor:             ${actor}`);
  console.log(`RealRxNormDataUsed: structural fixture path only unless operator supplies NLM files`);

  const prisma = new PrismaClient();
  try {
    const result = await runRxNormRealImport(prisma, {
      mode,
      manifestPath,
      sourceDir,
      actor,
      dryRun,
      confirmRealSource: hasFlag("confirm-real-source"),
      confirmNonClinicalOnly: hasFlag("confirm-nonclinical-only"),
      confirmFullRelease: hasFlag("confirm-full-release"),
      confirmRollbackRealRelease: hasFlag("confirm-rollback-real-release"),
    });

    console.log(`OK:                ${result.ok}`);
    if (result.releaseIdentifier) console.log(`Release:           ${result.releaseIdentifier}`);
    if (result.importStatus) console.log(`Import status:     ${result.importStatus}`);
    if (result.manifestHashSha256) console.log(`Manifest hash:     ${result.manifestHashSha256}`);
    console.log(`Rows read:         ${result.rowsRead}`);
    console.log(`Rows accepted:     ${result.rowsAccepted}`);
    console.log(`Rows skipped:      ${result.rowsSkipped}`);
    console.log(`Malformed:         ${result.malformedRows}`);
    if (result.candidateCount != null) console.log(`Candidates:        ${result.candidateCount}`);
    if (result.message) console.log(`Message:           ${result.message}`);
    for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
    for (const error of result.errors) console.error(`ERROR: ${error}`);

    process.exit(result.ok ? 0 : 1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
