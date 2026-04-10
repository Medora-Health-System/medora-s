/**
 * Phase 7D — Backfill manuel des revues MSPP manquantes pour d’anciennes déclarations.
 *
 * Audit SQL (PostgreSQL), à exécuter avant/après si besoin :
 *   SELECT COUNT(*) FROM "DiseaseCaseReport" dcr
 *   WHERE NOT EXISTS (
 *     SELECT 1 FROM "DiseaseCaseReview" r WHERE r."diseaseCaseReportId" = dcr.id
 *   );
 *
 * Usage (depuis la racine du monorepo, avec DATABASE_URL pointant vers la bonne base) :
 *   pnpm --filter @medora/api run backfill:mspp-disease-reviews -- --dry-run
 *   pnpm --filter @medora/api run backfill:mspp-disease-reviews
 *
 * Ne s’exécute pas au déploiement ; idempotent (sans revue existante + géo résolvable → crée).
 */
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { PublicHealthService } from "../src/public-health/public-health.service";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });
  try {
    const ph = app.get(PublicHealthService);
    const result = await ph.backfillMissingMsppReviews({ dryRun });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
