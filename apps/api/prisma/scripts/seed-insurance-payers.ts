import { PrismaClient } from "@prisma/client";
import { seedUsInsurancePayers } from "../helpers/seed-us-insurance-payers";

const prisma = new PrismaClient();

async function main() {
  await seedUsInsurancePayers(prisma);
  console.log("US insurance payers seeded.");
}

main()
  .catch((err) => {
    console.error("Failed to seed US insurance payers.", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
