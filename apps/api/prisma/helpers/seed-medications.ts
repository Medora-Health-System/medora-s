import { PrismaClient } from "@prisma/client";
import { seedEnterpriseCatalogs } from "./seed-enterprise-catalogs";

/**
 * Clinical medication / lab / imaging / vaccine / payer / billing catalogs.
 */
export async function seedMedications(prisma: PrismaClient) {
  const result = await seedEnterpriseCatalogs(prisma);
  console.log("→ seed clinical-content: medication/lab/imaging catalogs OK");
  return result;
}
