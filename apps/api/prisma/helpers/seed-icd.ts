import { seedIcd10SampleCatalog } from "./seed-icd10-sample";
import { resolveApiPackageRoot } from "./resolve-prisma-data-directory";

/**
 * Clinical ICD catalog seed (DEVELOPMENT SAMPLE ONLY).
 * Uses prisma/data/icd10-cm-sample-dev.csv — never production-complete.
 *
 * Production official CDC/NCHS catalogs must be loaded with:
 *   pnpm --filter @medora/api icd:import -- --file=<official-artifact> --release=2026
 */
export function seedIcd(cwd = resolveApiPackageRoot(), env: NodeJS.ProcessEnv = process.env): void {
  console.warn(
    "→ seed clinical-content: importing DEVELOPMENT ICD sample (icd10-cm-sample-dev.csv / FY2026-MEDORA-DEV-SAMPLE). " +
      "This is NOT a full ICD-10-CM release and must not be used for production certification.",
  );
  if ((env.NODE_ENV || "").toLowerCase() === "production") {
    console.warn(
      "→ seed clinical-content: NODE_ENV=production detected. Demo sample will still load if clinical-content seed runs; " +
        "load the official catalog separately via `pnpm --filter @medora/api icd:import`.",
    );
  }
  seedIcd10SampleCatalog(cwd);
  console.log("→ seed clinical-content: ICD development sample OK");
}
