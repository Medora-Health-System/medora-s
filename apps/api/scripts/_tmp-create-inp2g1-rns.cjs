const { PrismaClient, RoleCode } = require("@prisma/client");
const argon2 = require("argon2");
const prisma = new PrismaClient();
(async () => {
  const FACILITY_ID = process.env.FACILITY_ID;
  const password = "MedoraAdmin123!";
  const passwordHash = await argon2.hash(password);
  const rnRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.RN } });
  const facility = await prisma.facility.findUniqueOrThrow({ where: { id: FACILITY_ID } });
  async function upsertRn(email, firstName, lastName) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, firstName, lastName, isActive: true, mfaEnabled: false },
      create: { email, passwordHash, firstName, lastName, isActive: true, mfaEnabled: false },
    });
    const existing = await prisma.userRole.findFirst({
      where: { userId: user.id, facilityId: facility.id, professionCode: "REGISTERED_NURSE", departmentId: null },
    });
    if (existing) {
      await prisma.userRole.update({
        where: { id: existing.id },
        data: { roleId: rnRole.id, isActive: true },
      });
    } else {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: rnRole.id,
          facilityId: facility.id,
          professionCode: "REGISTERED_NURSE",
          isActive: true,
        },
      });
    }
    return user;
  }
  const a = await upsertRn("rna-inp2g1-uat@test.local", "RN-A", "Inp2g1");
  const b = await upsertRn("rnb-inp2g1-uat@test.local", "RN-B", "Inp2g1");
  console.log(JSON.stringify({
    facility: { id: facility.id, name: facility.name, code: facility.code },
    password,
    rnA: { id: a.id, email: a.email, name: `${a.firstName} ${a.lastName}` },
    rnB: { id: b.id, email: b.email, name: `${b.firstName} ${b.lastName}` },
  }, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
