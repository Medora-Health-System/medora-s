/**
 * Medora Prisma seed orchestrator (MEDUI.PLATFORM.SEED_MODULARIZATION).
 *
 * MEDORA_SEED_MODE=core|templates|clinical-content|demo|all
 * Defaults: production → core; development → all
 *
 * Demo in production requires MEDORA_ALLOW_DEMO_SEED_IN_PRODUCTION=true
 */

import { PrismaClient, AuditAction } from "@prisma/client";
import {
  assertDemoSeedAllowed,
  resolveMedoraSeedMode,
  resolveMedoraSeedSteps,
  seedStepEnabled,
} from "./helpers/seed-modes";
import { seedCore } from "./helpers/seed-core";
import { seedIcd } from "./helpers/seed-icd";
import { seedMedications } from "./helpers/seed-medications";
import { seedRegistrationTemplates } from "./helpers/seed-registration-templates";
import { seedBootstrapFacilities } from "./helpers/seed-bootstrap-facilities";
import { seedDemoHaiti } from "./helpers/seed-demo-haiti";
import { seedCoreRoles } from "./helpers/seed-core-roles";
import { seedCoreGeo } from "./helpers/seed-core-geo";

const prisma = new PrismaClient();

async function main() {
  const mode = resolveMedoraSeedMode();
  const steps = resolveMedoraSeedSteps();
  console.log(`\n→ Medora seed mode=${mode} steps=${steps.join(",")}\n`);

  if (seedStepEnabled(steps, "demo")) {
    assertDemoSeedAllowed();
  }

  let rolesResult: Awaited<ReturnType<typeof seedCore>> | null = null;
  let catalogsResult: Awaited<ReturnType<typeof seedMedications>> | null = null;
  let facilitiesResult: Awaited<ReturnType<typeof seedBootstrapFacilities>> | null = null;

  if (seedStepEnabled(steps, "core")) {
    rolesResult = await seedCore(prisma);
  }

  if (seedStepEnabled(steps, "clinical-content")) {
    seedIcd();
    catalogsResult = await seedMedications(prisma);
  }

  if (seedStepEnabled(steps, "templates")) {
    await seedRegistrationTemplates(prisma);
  }

  if (seedStepEnabled(steps, "demo")) {
    // Demo depends on roles, geo, facilities, and catalogs for inventory links.
    rolesResult = rolesResult ?? (await seedCoreRoles(prisma));
    await seedCoreGeo(prisma);
    facilitiesResult = await seedBootstrapFacilities(prisma);
    catalogsResult = catalogsResult ?? (await seedMedications(prisma));

    await seedDemoHaiti({
      prisma,
      roles: rolesResult.roles,
      adminRole: rolesResult.adminRole,
      medoraSuperAdminRole: rolesResult.medoraSuperAdminRole,
      facilityDR: facilitiesResult.facilityDR,
      facilityHT: facilitiesResult.facilityHT,
      medCatalogIds: catalogsResult.medCatalogIds,
      vaccineCatalogIds: catalogsResult.vaccineCatalogIds,
    });
  }

  if (!seedStepEnabled(steps, "demo")) {
    await prisma.auditLog.createMany({
      data: [
        {
          action: AuditAction.SEED,
          entityType: "SYSTEM",
          entityId: "seed",
          metadata: {
            note: "Configuration seed completed",
            mode,
            steps,
          },
        },
      ],
      skipDuplicates: true,
    });
    console.log("\n---------- Seed complete ----------");
    console.log("Mode:", mode);
    console.log("Steps:", steps.join(", "));
    console.log("Demo users/patients/clinical rows: skipped");
    console.log("----------------------------------------\n");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
