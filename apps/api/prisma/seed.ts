/**
 * Medora Prisma seed orchestrator (MEDUI.PLATFORM.SEED_MODULARIZATION).
 *
 * Default (`prisma db seed`): full profile = enterprise config + Haiti demo.
 * Production-safe: MEDORA_SEED_PROFILE=enterprise (no demo credentials/patients).
 *
 * Modules: core | facilities | catalogs | icd10 | templates | demo
 * Override list: MEDORA_SEED_MODULES=core,catalogs,templates
 */

import { PrismaClient, AuditAction } from "@prisma/client";
import { join } from "node:path";
import {
  resolveMedoraSeedModules,
  resolveMedoraSeedProfile,
  seedModuleEnabled,
} from "./helpers/seed-profiles";
import { seedCoreRoles } from "./helpers/seed-core-roles";
import { seedCoreGeo } from "./helpers/seed-core-geo";
import { seedBootstrapFacilities } from "./helpers/seed-bootstrap-facilities";
import { seedEnterpriseCatalogs } from "./helpers/seed-enterprise-catalogs";
import { seedIcd10SampleCatalog } from "./helpers/seed-icd10-sample";
import { seedRegistrationPacketTemplates } from "./helpers/seed-registration-packet-templates";
import { seedDemoHaiti } from "./helpers/seed-demo-haiti";

const prisma = new PrismaClient();

async function main() {
  const profile = resolveMedoraSeedProfile();
  const modules = resolveMedoraSeedModules();
  console.log(`\n→ Medora seed profile=${profile} modules=${modules.join(",")}\n`);

  let rolesResult: Awaited<ReturnType<typeof seedCoreRoles>> | null = null;
  let facilitiesResult: Awaited<ReturnType<typeof seedBootstrapFacilities>> | null = null;
  let catalogsResult: Awaited<ReturnType<typeof seedEnterpriseCatalogs>> | null = null;

  if (seedModuleEnabled(modules, "core")) {
    rolesResult = await seedCoreRoles(prisma);
    await seedCoreGeo(prisma);
  }

  if (seedModuleEnabled(modules, "facilities")) {
    facilitiesResult = await seedBootstrapFacilities(prisma);
  }

  if (seedModuleEnabled(modules, "catalogs")) {
    catalogsResult = await seedEnterpriseCatalogs(prisma);
  }

  if (seedModuleEnabled(modules, "icd10")) {
    seedIcd10SampleCatalog(join(__dirname, ".."));
  }

  if (seedModuleEnabled(modules, "templates")) {
    await seedRegistrationPacketTemplates(prisma);
  }

  if (seedModuleEnabled(modules, "demo")) {
    if (!rolesResult || !facilitiesResult || !catalogsResult) {
      // Demo depends on prior modules; ensure they ran even if caller used MEDORA_SEED_MODULES=demo alone.
      rolesResult = rolesResult ?? (await seedCoreRoles(prisma));
      if (!facilitiesResult) {
        await seedCoreGeo(prisma);
        facilitiesResult = await seedBootstrapFacilities(prisma);
      }
      catalogsResult = catalogsResult ?? (await seedEnterpriseCatalogs(prisma));
    }
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
  } else {
    await prisma.auditLog.createMany({
      data: [
        {
          action: AuditAction.SEED,
          entityType: "SYSTEM",
          entityId: "seed",
          metadata: {
            note: "Enterprise configuration seed completed",
            profile,
            modules,
          },
        },
      ],
      skipDuplicates: true,
    });
    console.log("\n---------- Seed complete: enterprise configuration ----------");
    console.log("Profile:", profile);
    console.log("Modules:", modules.join(", "));
    console.log("Demo users/patients/clinical rows: skipped");
    console.log("----------------------------------------\n");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
