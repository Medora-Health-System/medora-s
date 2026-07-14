import { PrismaClient } from "@prisma/client";
import { HAITI_GEO_DEPARTMENTS } from "../data/haiti-geo-departments";
import { HAITI_SEED_COMMUNES } from "../data/haiti-seed-communes";

/** Idempotent Haiti geo reference data (MSPP departments + seed communes). */
export async function seedCoreGeo(prisma: PrismaClient) {
  await Promise.all(
    HAITI_GEO_DEPARTMENTS.map((d) =>
      prisma.geoDepartment.upsert({
        where: { code: d.code },
        update: { name: d.name, sortOrder: d.sortOrder },
        create: { code: d.code, name: d.name, sortOrder: d.sortOrder },
      }),
    ),
  );

  for (const sc of HAITI_SEED_COMMUNES) {
    const dept = await prisma.geoDepartment.findUnique({ where: { code: sc.departmentCode } });
    if (!dept) continue;
    await prisma.geoCommune.upsert({
      where: {
        geoDepartmentId_name: {
          geoDepartmentId: dept.id,
          name: sc.name,
        },
      },
      update: {},
      create: { geoDepartmentId: dept.id, name: sc.name },
    });
  }
}
