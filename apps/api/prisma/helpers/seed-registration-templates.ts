import { PrismaClient } from "@prisma/client";
import { seedRegistrationPacketTemplates } from "./seed-registration-packet-templates";

/** Enterprise registration packet template catalog (published versions). */
export async function seedRegistrationTemplates(prisma: PrismaClient) {
  await seedRegistrationPacketTemplates(prisma);
  console.log("→ seed templates: registration packet templates OK");
}

export { seedRegistrationPacketTemplates };
