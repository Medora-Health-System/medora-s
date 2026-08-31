import { PrismaClient, RoleCode } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@medora.local";
  const password = process.env.ADMIN_PASSWORD || "MedoraAdmin123!";
  const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
  const lastName = process.env.ADMIN_LAST_NAME || "User";

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, firstName, lastName },
    create: { email, passwordHash, firstName, lastName },
  });

  const adminRole = await prisma.role.upsert({
    where: { code: RoleCode.ADMIN },
    update: {},
    create: { code: RoleCode.ADMIN, name: "Admin" },
  });

  const facility = await prisma.facility.findFirst();
  if (!facility) throw new Error("No facility found. Run seed first.");

  // MEDUI.D4C.11 — UserRole now requires an enterprise workforce professionCode and
  // no longer exposes a (userId, roleId, facilityId) compound unique (uniqueness is a
  // DB expression index over userId/facilityId/professionCode/COALESCE(departmentId)).
  // Idempotency is therefore handled with an explicit find + create.
  const professionCode = "ADMINISTRATION";
  const existingUserRole = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: adminRole.id, facilityId: facility.id },
  });
  if (existingUserRole) {
    await prisma.userRole.update({
      where: { id: existingUserRole.id },
      data: { isActive: true, professionCode },
    });
  } else {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
        facilityId: facility.id,
        professionCode,
        isActive: true,
      },
    });
  }

  console.log("✅ Admin user ready:");
  console.log("Email:", email);
  console.log("Password:", password);
  console.log("User ID:", user.id);
  console.log("Role:", adminRole.code);
  console.log("Facility:", facility.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

