/**
 * RxNorm synthetic reference import CLI (Phase 3 — staging only).
 *
 * Usage:
 *   pnpm --filter @medora/api medication:rxnorm:validate
 *   pnpm --filter @medora/api medication:rxnorm:stage -- --allow-synthetic
 *   pnpm --filter @medora/api medication:rxnorm:candidates
 *   pnpm --filter @medora/api medication:rxnorm:activate -- --confirm-activate
 *   pnpm --filter @medora/api medication:rxnorm:rollback -- --confirm-rollback
 */
import "reflect-metadata";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { RXNORM_IMPORT_MODE_VALUES, type RxNormImportMode } from "@medora/shared";
import { runRxNormImport } from "./rxnorm-import-service";

const DEFAULT_SYNTHETIC_FIXTURE = join(
  __dirname,
  "fixtures",
  "synthetic-rxnorm-cert-p3.json"
);
const DEFAULT_RELEASE = "SYNTHETIC-CERT-P3-20260717";

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function resolveMode(): RxNormImportMode {
  const raw = getArg("mode");
  if (!raw) {
    console.error(`Missing --mode= (${RXNORM_IMPORT_MODE_VALUES.join("|")})`);
    process.exit(1);
  }
  if (!(RXNORM_IMPORT_MODE_VALUES as readonly string[]).includes(raw)) {
    console.error(`Invalid mode: ${raw}`);
    process.exit(1);
  }
  return raw as RxNormImportMode;
}

function resolveFilePath(mode: RxNormImportMode): string {
  const explicit = getArg("file");
  if (explicit) return explicit;
  if (hasFlag("allow-synthetic") || mode === "VALIDATE_ONLY" || mode === "STAGE_ONLY") {
    return DEFAULT_SYNTHETIC_FIXTURE;
  }
  console.error("Missing --file= or pass --allow-synthetic for the certification fixture.");
  process.exit(1);
}

async function main() {
  const mode = resolveMode();
  const filePath = resolveFilePath(mode);
  const releaseIdentifier = getArg("release") ?? DEFAULT_RELEASE;
  const dryRun = hasFlag("dry-run");
  const confirmActivate = hasFlag("confirm-activate");
  const confirmRollback = hasFlag("confirm-rollback");

  console.log("=== RxNorm reference import (Phase 3 — synthetic staging only) ===");
  console.log(`Mode:              ${mode}`);
  console.log(`Release:           ${releaseIdentifier}`);
  console.log(`File:              ${filePath}`);
  console.log(`RealRxNormDataUsed: NO`);

  const prisma = new PrismaClient();
  try {
    const result = await runRxNormImport(prisma, {
      mode,
      filePath,
      releaseIdentifier,
      dryRun,
      confirmActivate,
      confirmRollback,
    });

    console.log(`OK:                ${result.ok}`);
    console.log(`Import status:     ${result.importStatus ?? "(n/a)"}`);
    console.log(`Accepted:          ${result.acceptedCount}`);
    console.log(`Rejected:          ${result.rejectedCount}`);
    console.log(`Duplicates:        ${result.duplicateCount}`);
    console.log(`Warnings:          ${result.warningCount}`);
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
