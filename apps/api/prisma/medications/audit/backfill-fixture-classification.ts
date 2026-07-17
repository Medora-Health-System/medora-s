/**
 * Optional one-time backfill: set CatalogMedication.dataClassification for MST_/fixture codes.
 * Dry-run by default — pass `--apply` to write.
 *
 *   pnpm --filter @medora/api exec ts-node --transpile-only prisma/medications/audit/backfill-fixture-classification.ts
 *   pnpm --filter @medora/api exec ts-node --transpile-only prisma/medications/audit/backfill-fixture-classification.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import { classifyMedicationCode, isNonProductionDataClassification } from "@medora/shared";
import { ensureAuditEnvLoaded } from "./medication-audit-types";

ensureAuditEnvLoaded();

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not configured — aborting.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();

    const rows = await prisma.catalogMedication.findMany({
      select: { id: true, code: true, dataClassification: true },
      orderBy: { code: "asc" },
    });

    const candidates = rows.filter((row) => {
      const inferred = classifyMedicationCode(row.code);
      if (!isNonProductionDataClassification(inferred)) return false;
      const current = row.dataClassification?.trim().toUpperCase() ?? "UNKNOWN";
      return current === "UNKNOWN" || current !== inferred;
    });

    console.log(`Scanned ${rows.length} catalog rows.`);
    console.log(`Candidate updates: ${candidates.length}. Mode: ${APPLY ? "APPLY" : "DRY-RUN"}.`);

    for (const row of candidates.slice(0, 20)) {
      const next = classifyMedicationCode(row.code);
      console.log(`  ${row.code}: ${row.dataClassification} -> ${next}`);
    }
    if (candidates.length > 20) {
      console.log(`  ... and ${candidates.length - 20} more`);
    }

    if (!APPLY) {
      console.log("Dry-run complete. Re-run with --apply to persist changes.");
      return;
    }

    let updated = 0;
    for (const row of candidates) {
      const next = classifyMedicationCode(row.code);
      await prisma.catalogMedication.update({
        where: { id: row.id },
        data: { dataClassification: next },
      });
      updated += 1;
    }
    console.log(`Applied ${updated} classification updates.`);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
