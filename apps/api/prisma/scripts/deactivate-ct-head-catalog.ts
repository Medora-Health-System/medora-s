/**
 * Phase 2C.5B — one-time / idempotent DB retirement for CT_HEAD (deactivate-not-delete).
 *
 * Usage:
 *   pnpm --filter @medora/api catalog:deactivate-ct-head
 */
import { PrismaClient } from "@prisma/client";
import { deactivateCtHeadCatalog } from "../../src/terminology/imaging-ct-head-catalog-retirement";

const prisma = new PrismaClient();

async function main() {
  const result = await deactivateCtHeadCatalog(prisma);
  console.log("[deactivate-ct-head-catalog] complete", result);
}

main()
  .catch((error) => {
    console.error("[deactivate-ct-head-catalog] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
