import { AuditAction, RoleCode } from "@prisma/client";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";

export type UserMutationClass =
  | "FACILITY_MEMBERSHIP"
  | "GLOBAL_IDENTITY"
  | "GLOBAL_SECURITY"
  | "GLOBAL_BILLING";

type BoundaryPrisma = Parameters<typeof resolvePlatformAuthority>[0] & {
  userRole: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
  };
};

export async function assertFacilityAdminFacilityScope(
  prisma: BoundaryPrisma,
  actorUserId: string,
  facilityId: string,
): Promise<void> {
  const actorAuthority = await resolvePlatformAuthority(prisma, actorUserId);
  if (actorAuthority.granted) return;
  const membership = await prisma.userRole.findFirst({
    where: {
      userId: actorUserId,
      facilityId,
      isActive: true,
      role: { code: RoleCode.ADMIN },
      facility: { isActive: true },
    },
    select: { id: true },
  });
  if (!membership) throw new ForbiddenException("Établissement non autorisé.");
}

/** The single policy gate for tenant-admin mutations of an existing user. */
export async function assertFacilityAdminMayMutateUser(options: {
  prisma: BoundaryPrisma;
  audit?: {
    log(
      action: AuditAction,
      entityType: string,
      data: unknown,
    ): Promise<unknown>;
  };
  actorUserId: string;
  targetUserId: string;
  facilityId: string;
  mutationClass: UserMutationClass;
}): Promise<void> {
  const {
    prisma,
    audit,
    actorUserId,
    targetUserId,
    facilityId,
    mutationClass,
  } = options;
  const actorAuthority = await resolvePlatformAuthority(prisma, actorUserId);
  if (actorAuthority.granted) return;

  const deny = async (reason: string) => {
    if (audit)
      await logSecurityAdminAudit(audit as never, AuditAction.UPDATE, {
        event: "SECURITY_ADMIN_MUTATION_DENIED",
        actorUserId,
        facilityId,
        entityType: "User",
        entityId: targetUserId,
        severity: "HIGH",
        outcome: "DENIED",
        sourceOperation: mutationClass,
        denialReason: reason,
        evidence: { mutationClass },
      });
    throw new ForbiddenException(
      "Cette modification globale exige une autorité plateforme.",
    );
  };

  if (mutationClass !== "FACILITY_MEMBERSHIP") {
    await deny("GLOBAL_MUTATION_REQUIRES_PLATFORM_AUTHORITY");
  }

  try {
    await assertFacilityAdminFacilityScope(prisma, actorUserId, facilityId);
  } catch {
    await deny("ACTOR_NOT_AUTHORIZED_FOR_FACILITY");
  }

  const targetMembership = await prisma.userRole.findFirst({
    where: {
      userId: targetUserId,
      facilityId,
      isActive: true,
      facility: { isActive: true },
    },
    select: { id: true },
  });
  if (!targetMembership) {
    // Tenant-scoped lookups deliberately do not reveal whether the global user exists.
    if (audit)
      await logSecurityAdminAudit(audit as never, AuditAction.UPDATE, {
        event: "SECURITY_ADMIN_MUTATION_DENIED",
        actorUserId,
        facilityId,
        entityType: "User",
        entityId: targetUserId,
        severity: "HIGH",
        outcome: "DENIED",
        sourceOperation: mutationClass,
        denialReason: "CROSS_TENANT_TARGET",
        evidence: { mutationClass },
      });
    throw new NotFoundException(
      "Utilisateur introuvable pour cet établissement.",
    );
  }

  if (actorUserId === targetUserId) {
    await deny("SELF_MEMBERSHIP_AUTHORITY_CHANGE");
  }

  const targetAuthority = await resolvePlatformAuthority(prisma, targetUserId);
  if (targetAuthority.granted) await deny("PROTECTED_PLATFORM_PRINCIPAL");
}
