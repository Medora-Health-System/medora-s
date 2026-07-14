import { join } from "node:path";
import { seedIcd10SampleCatalog } from "./seed-icd10-sample";

/**
 * Clinical ICD catalog seed.
 * Uses prisma/data/icd10-cm-sample-dev.csv (MVP search catalog, not a full national set).
 */
export function seedIcd(cwd = join(__dirname, "../.."), env: NodeJS.ProcessEnv = process.env): void {
  if ((env.NODE_ENV || "").toLowerCase() === "production") {
    console.warn(
      "→ seed clinical-content: importing ICD sample catalog (icd10-cm-sample-dev.csv). " +
        "This is an MVP search subset, not a full ICD-10-CM release.",
    );
  }
  seedIcd10SampleCatalog(cwd);
  console.log("→ seed clinical-content: ICD catalog OK");
}
