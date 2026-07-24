import { PrismaClient, RoleCode } from "@prisma/client";

/** Idempotent core Role rows required by all environments. */
export async function seedCoreRoles(prisma: PrismaClient) {
  const roles = await Promise.all(
    (
      [
        { code: RoleCode.ADMIN, name: "Admin" },
        { code: RoleCode.MEDORA_SUPER_ADMIN, name: "Medora platform operator" },
        { code: RoleCode.PROVIDER, name: "Provider" },
        { code: RoleCode.RN, name: "Registered Nurse" },
        { code: RoleCode.FRONT_DESK, name: "Front Desk" },
        { code: RoleCode.LAB, name: "Lab" },
        { code: RoleCode.RADIOLOGY, name: "Radiology" },
        { code: RoleCode.PHARMACY, name: "Pharmacy" },
        { code: RoleCode.BILLING, name: "Billing" },
        { code: RoleCode.MEDICATION_REVIEWER, name: "Medication reviewer (RxNorm)" },
        { code: RoleCode.MEDICATION_ADMIN, name: "Medication admin (governance)" },
        {
          code: RoleCode.PATIENT_CARE_TECH,
          name: "Patient care technician",
        },
      ] as const
    ).map((r) =>
      prisma.role.upsert({
        where: { code: r.code },
        update: { name: r.name },
        create: { code: r.code, name: r.name },
      }),
    ),
  );

  const adminRole = roles.find((r) => r.code === RoleCode.ADMIN);
  if (!adminRole) throw new Error("ADMIN role missing after seed");
  const medoraSuperAdminRole = roles.find((r) => r.code === RoleCode.MEDORA_SUPER_ADMIN);
  if (!medoraSuperAdminRole) throw new Error("MEDORA_SUPER_ADMIN role missing after seed");

  return { roles, adminRole, medoraSuperAdminRole };
}
