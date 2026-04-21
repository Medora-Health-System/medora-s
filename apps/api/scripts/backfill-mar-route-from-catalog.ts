/**
 * Optional one-off: copy CatalogMedication.route → MedicationAdministration.route when MAR.route is NULL.
 * Safe to re-run: only updates rows still missing route.
 * Skips MAR rows whose encounter billing is FINALIZED.
 *
 *   pnpm --filter @medora/api run backfill:mar-route-from-catalog -- --dry-run
 *   pnpm --filter @medora/api run backfill:mar-route-from-catalog -- --dry-run --limit 100 --offset 0
 *   pnpm --filter @medora/api run backfill:mar-route-from-catalog
 */
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";

function parseArgValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

function parseNonNegativeInt(raw: string | undefined, defaultValue: number): number {
  if (raw === undefined) return defaultValue;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return defaultValue;
  return n;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limit = parseNonNegativeInt(parseArgValue("--limit"), 500);
  const offset = parseNonNegativeInt(parseArgValue("--offset"), 0);
  const prisma = new PrismaClient();

  let examined = 0;
  let updated = 0;
  let skippedNoCatalogRoute = 0;

  try {
    const rows = await prisma.medicationAdministration.findMany({
      where: {
        route: null,
        encounter: {
          billingFinalizationStatus: { not: "FINALIZED" },
        },
      },
      include: {
        orderItem: {
          select: { catalogItemId: true, catalogItemType: true },
        },
      },
      orderBy: { id: "asc" },
      skip: offset,
      take: limit,
    });

    for (const r of rows) {
      examined++;
      const oi = r.orderItem;
      if (!oi || oi.catalogItemType !== "MEDICATION" || !oi.catalogItemId) continue;

      const cat = await prisma.catalogMedication.findUnique({
        where: { id: oi.catalogItemId },
        select: { route: true },
      });
      const route = cat?.route?.trim();
      if (!route) {
        skippedNoCatalogRoute++;
        continue;
      }

      const beforeRoute = r.route ?? null;
      const afterRoute = route;

      if (dryRun) {
        console.log(
          JSON.stringify({
            medicationAdministrationId: r.id,
            encounterId: r.encounterId,
            beforeRoute,
            afterRoute,
          })
        );
      }

      if (!dryRun) {
        await prisma.medicationAdministration.update({
          where: { id: r.id },
          data: { route },
        });
      }
      updated++;
    }

    console.log(
      JSON.stringify(
        {
          dryRun,
          limit,
          offset,
          examined,
          updated,
          skippedNoCatalogRoute,
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
