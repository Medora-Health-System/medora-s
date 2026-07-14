import { spawnSync } from "node:child_process";
import { resolveApiPackageRoot } from "./resolve-prisma-data-directory";

/**
 * ICD-10-CM sample/dev catalog import (idempotent upserts via shared importer).
 * Not a full national code set — required for diagnosis search in MVP environments.
 */
export function seedIcd10SampleCatalog(cwd = resolveApiPackageRoot()): void {
  const icdCsvRel = "prisma/data/icd10-cm-sample-dev.csv";
  const icdImport = spawnSync(
    "pnpm",
    ["exec", "ts-node", "--transpile-only", "scripts/import-icd10-catalog.ts", `--file=${icdCsvRel}`],
    { cwd, stdio: "inherit", env: process.env },
  );
  if (icdImport.status !== 0) {
    throw new Error("ICD-10 catalog import failed (see logs above).");
  }
}
