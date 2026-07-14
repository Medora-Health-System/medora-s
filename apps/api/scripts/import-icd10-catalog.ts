/**
 * Compatibility wrapper — demo/sample ICD CSV import.
 *
 * Production official releases MUST use:
 *   pnpm --filter @medora/api icd:import -- --file=<official> --release=2026
 *
 * This script routes Medora CSV files through the versioned importer as
 * FY2026-MEDORA-DEV-SAMPLE (development only).
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

const fileArg = getArg("file");
if (!fileArg) {
  console.error("Missing --file=/path/to/icd10.csv");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const args = [
  "exec",
  "ts-node",
  "--transpile-only",
  "prisma/icd/import-icd10-cm.ts",
  `--file=${resolve(process.cwd(), fileArg)}`,
  "--release=FY2026-MEDORA-DEV-SAMPLE",
  "--allow-dev-sample",
  "--skip-checksum",
];
if (dryRun) args.push("--dry-run");
const limit = getArg("limit");
if (limit) args.push(`--limit=${limit}`);

const result = spawnSync("pnpm", args, { cwd: resolve(__dirname, ".."), stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
