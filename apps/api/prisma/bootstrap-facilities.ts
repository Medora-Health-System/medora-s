/**
 * Idempotent bootstrap of the standard empty-DB facilities (DR + HT) plus their
 * clinical/service-line departments, reusing the shared seed helper.
 *
 * This is bootstrap operability data only — it creates NO users, patients, or
 * clinical rows (see helpers/seed-bootstrap-facilities.ts). It exists so a fresh
 * disposable Cloud Agent database has at least one facility for local admin
 * bootstrap and UI login, without running the (heavier, demo) `MEDORA_SEED_MODE=demo`.
 */
import { PrismaClient } from "@prisma/client";
import { seedBootstrapFacilities } from "./helpers/seed-bootstrap-facilities";

const prisma = new PrismaClient();

async function main() {
  const { facilityDR, facilityHT } = await seedBootstrapFacilities(prisma);
  console.log(
    `✅ Bootstrap facilities ready: ${facilityDR.code} (${facilityDR.name}), ${facilityHT.code} (${facilityHT.name})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
