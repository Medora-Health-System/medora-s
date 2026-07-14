import { PrismaClient } from "@prisma/client";
import { seedCoreRoles } from "./seed-core-roles";
import { seedCoreGeo } from "./seed-core-geo";

/**
 * Production-safe foundational seed:
 * - roles
 * - Haiti geo reference (facility-independent)
 *
 * Does NOT create demo users, patients, encounters, or demo facilities.
 */
export async function seedCore(prisma: PrismaClient) {
  const roles = await seedCoreRoles(prisma);
  await seedCoreGeo(prisma);
  console.log("→ seed mode=core: roles + geo reference OK");
  return roles;
}
