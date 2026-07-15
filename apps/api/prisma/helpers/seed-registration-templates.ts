import { PrismaClient } from "@prisma/client";
import { seedRegistrationPacketTemplates } from "./seed-registration-packet-templates";
import { seedRegistrationPacketTemplatesV2 } from "./seed-registration-packet-templates-v2";

/** Enterprise registration packet template catalog (published versions). */
export async function seedRegistrationTemplates(prisma: PrismaClient) {
  await seedRegistrationPacketTemplates(prisma);
  await seedRegistrationPacketTemplatesV2(prisma);
  console.log("→ seed templates: registration packet templates v1 + v2 OK");
}

export { seedRegistrationPacketTemplates, seedRegistrationPacketTemplatesV2 };
