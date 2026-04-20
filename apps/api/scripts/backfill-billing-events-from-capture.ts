/**
 * Phase 2 — Re-sync BillingEvent rows from Encounter.billingCaptureJson using the same
 * catalog enrichment + ledger upsert as live capture (idempotent by facilityId + sourceModule + sourceRecordId).
 *
 * Does not rewrite Encounter.billingCaptureJson (avoids clobbering concurrent edits).
 *
 * Usage (repo root, DATABASE_URL set):
 *   pnpm --filter @medora/api run backfill:billing-events-from-capture -- --dry-run
 *   pnpm --filter @medora/api run backfill:billing-events-from-capture -- --encounter=<uuid>
 *   pnpm --filter @medora/api run backfill:billing-events-from-capture
 */
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import { readBillingCaptureV1 } from "@medora/shared";
import { enrichBillingCaptureItem } from "../src/billing/billing-capture.enrichment";
import { upsertBillingEventFromCaptureItem } from "../src/billing/billing-ledger.sync";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const onlyEncounter = process.argv.find((a) => a.startsWith("--encounter="))?.split("=", 2)[1]?.trim();

  const prisma = new PrismaClient();
  let processedEncounters = 0;
  let processedItems = 0;
  let skippedEmpty = 0;

  try {
    const encounters = await prisma.encounter.findMany({
      where: onlyEncounter ? { id: onlyEncounter } : {},
      select: { id: true, facilityId: true, patientId: true, billingCaptureJson: true },
    });

    for (const enc of encounters) {
      if (enc.billingCaptureJson == null || typeof enc.billingCaptureJson !== "object") {
        skippedEmpty++;
        continue;
      }
      const stored = readBillingCaptureV1(enc.billingCaptureJson);
      if (stored.items.length === 0) {
        skippedEmpty++;
        continue;
      }
      processedEncounters++;
      for (const item of stored.items) {
        processedItems++;
        const ctx = {
          ...item,
          encounterId: item.encounterId ?? enc.id,
          patientId: item.patientId ?? enc.patientId,
          facilityId: item.facilityId ?? enc.facilityId,
        };
        const enriched = await enrichBillingCaptureItem(prisma, ctx);
        if (!dryRun) {
          await upsertBillingEventFromCaptureItem(prisma, enriched);
        }
      }
    }

    console.log(
      JSON.stringify(
        {
          dryRun,
          onlyEncounter: onlyEncounter ?? null,
          processedEncounters,
          processedItems,
          skippedEmptyJsonOrNoItems: skippedEmpty,
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
