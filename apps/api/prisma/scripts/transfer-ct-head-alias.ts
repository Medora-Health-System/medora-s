/**
 * Phase 2C.3.4B — one-time / idempotent DB alias ownership transfer for CT head.
 *
 * Usage:
 *   pnpm --filter @medora/api catalog:transfer-ct-head-alias
 */
import { PrismaClient } from "@prisma/client";
import { transferCtHeadAliasOwnership } from "../../src/terminology/imaging-ct-head-alias-transfer";

const prisma = new PrismaClient();

async function main() {
  const result = await transferCtHeadAliasOwnership(prisma);
  console.log("[transfer-ct-head-alias] complete", result);
}

main()
  .catch((error) => {
    console.error("[transfer-ct-head-alias] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
