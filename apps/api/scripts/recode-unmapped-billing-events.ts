/**
 * Phase 4.8.1 — Safe recode/backfill for BillingEvent rows still marked UNMAPPED after BillingCatalog seed.
 * Idempotent: rerun skips rows that are no longer unmapped.
 *
 * Usage (DATABASE_URL set):
 *   pnpm --filter @medora/api run billing:recode-unmapped -- --dry-run
 *   pnpm --filter @medora/api run billing:recode-unmapped
 */
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import type { PrismaService } from "../src/prisma/prisma.service";
import { recodeBillingEventIfPossible } from "../src/billing/billing-event-recode.util";

const BATCH = 100;

const unmappedWhere = {
  OR: [
    { procedureCode: "UNMAPPED" },
    { hcpcsCode: "UNMAPPED" },
    { code: "UNMAPPED" },
  ],
} as const;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const prisma = new PrismaClient() as unknown as PrismaService;

  let scanned = 0;
  let recoded = 0;
  let skipped = 0;
  let unchanged = 0;
  let errors = 0;

  let afterId: string | undefined;

  try {
    for (;;) {
      const batch = await prisma.billingEvent.findMany({
        where: {
          AND: [
            ...(afterId ? [{ id: { gt: afterId } }] : []),
            unmappedWhere,
          ],
        },
        orderBy: { id: "asc" },
        take: BATCH,
        select: { id: true },
      });

      if (batch.length === 0) break;

      for (const row of batch) {
        scanned++;
        const outcome = await recodeBillingEventIfPossible(prisma, row.id, { dryRun });

        if (outcome === "recoded") {
          recoded++;
        } else if (outcome === "skipped") {
          skipped++;
        } else if (outcome === "error") {
          errors++;
        } else {
          unchanged++;
        }
      }

      afterId = batch[batch.length - 1]!.id;
      if (batch.length < BATCH) break;
    }

    let remainingUnmappedRows: number | null = null;
    if (!dryRun) {
      remainingUnmappedRows = await prisma.billingEvent.count({ where: unmappedWhere });
    }

    console.log(
      JSON.stringify(
        {
          dryRun,
          scanned,
          recoded,
          skipped,
          unchanged,
          errors,
          remainingUnmappedRows,
          dryRunNote: dryRun
            ? "No DB writes; recoded = rows that would be updated. Re-run without --dry-run to apply."
            : undefined,
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
