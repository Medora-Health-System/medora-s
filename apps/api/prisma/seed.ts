import { PrismaClient, RoleCode, DepartmentCode, AuditAction } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  // Roles
  const roles = await Promise.all(
    ([
      { code: RoleCode.ADMIN, name: "Admin" },
      { code: RoleCode.PROVIDER, name: "Provider" },
      { code: RoleCode.RN, name: "Registered Nurse" },
      { code: RoleCode.FRONT_DESK, name: "Front Desk" },
      { code: RoleCode.LAB, name: "Lab" },
      { code: RoleCode.RADIOLOGY, name: "Radiology" },
      { code: RoleCode.PHARMACY, name: "Pharmacy" },
      { code: RoleCode.BILLING, name: "Billing" }
    ] as const).map((r) =>
      prisma.role.upsert({
        where: { code: r.code },
        update: { name: r.name },
        create: { code: r.code, name: r.name }
      })
    )
  );
  const adminRole = roles.find((r) => r.code === RoleCode.ADMIN);
  if (!adminRole) throw new Error("ADMIN role missing after seed");

  // Facilities
  const facilityDR = await prisma.facility.upsert({
    where: { code: "DR" },
    update: { name: "Facility A (DR)", country: "Dominican Republic", timezone: "America/Santo_Domingo" },
    create: { code: "DR", name: "Facility A (DR)", country: "Dominican Republic", timezone: "America/Santo_Domingo" }
  });

  const facilityHT = await prisma.facility.upsert({
    where: { code: "HT" },
    update: { name: "Facility B (Haiti)", country: "Haiti", timezone: "America/Port-au-Prince" },
    create: { code: "HT", name: "Facility B (Haiti)", country: "Haiti", timezone: "America/Port-au-Prince" }
  });

  // Departments per facility
  const deptDefs: Array<{ code: DepartmentCode; name: string }> = [
    { code: DepartmentCode.PRIMARY_CARE, name: "Primary Care" },
    { code: DepartmentCode.LAB, name: "Laboratory" },
    { code: DepartmentCode.RAD, name: "Radiology" },
    { code: DepartmentCode.PHARM, name: "Pharmacy" },
    { code: DepartmentCode.INPATIENT, name: "Inpatient" }
  ];

  await Promise.all(
    [facilityDR, facilityHT].flatMap((facility) =>
      deptDefs.map((d) =>
        prisma.department.upsert({
          where: { facilityId_code: { facilityId: facility.id, code: d.code } },
          update: { name: d.name },
          create: { facilityId: facility.id, code: d.code, name: d.name }
        })
      )
    )
  );

  // Admin user (deterministic credentials for local dev)
  // Username/email: admin@medora.local
  // Password: Admin123!
  const passwordHash = await argon2.hash("Admin123!");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@medora.local" },
    update: { firstName: "Admin", lastName: "User", isActive: true },
    create: {
      email: "admin@medora.local",
      firstName: "Admin",
      lastName: "User",
      passwordHash,
      isActive: true
    }
  });

  // Admin role assignment to both facilities
  await Promise.all(
    [facilityDR.id, facilityHT.id].map((facilityId) =>
      prisma.userRole.upsert({
        where: {
          userId_roleId_facilityId: {
            userId: adminUser.id,
            roleId: adminRole.id,
            facilityId
          }
        },
        update: { isActive: true },
        create: { userId: adminUser.id, roleId: adminRole.id, facilityId }
      })
    )
  );

  // Seed a couple of example audit events (not required for seeding logic)
  await prisma.auditLog.createMany({
    data: [
      {
        action: AuditAction.SEED,
        entityType: "SYSTEM",
        entityId: "seed",
        metadata: { note: "Initial seed completed" }
      },
      {
        action: AuditAction.SEED,
        entityType: "USER",
        entityId: adminUser.id,
        userId: adminUser.id,
        metadata: { note: "Seeded admin user" }
      }
    ],
    skipDuplicates: true
  });
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

