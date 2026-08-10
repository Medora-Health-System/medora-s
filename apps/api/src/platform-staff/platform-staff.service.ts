import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { PrismaService } from "../prisma/prisma.service";
import type { PlatformCapabilityCode } from "./platform-capabilities";

@Injectable()
export class PlatformStaffService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  listCapabilities() { return this.prisma.platformCapability.findMany({ orderBy: { code: "asc" } }); }
  listStaff() {
    return this.prisma.medoraStaffProfile.findMany({
      select: { id: true, userId: true, isActive: true, classifiedAt: true, deactivatedAt: true, user: { select: { firstName: true, lastName: true, isActive: true } } }, orderBy: { classifiedAt: "desc" },
    });
  }
  async getStaff(userId: string) {
    const profile = await this.prisma.medoraStaffProfile.findUnique({ where: { userId }, include: {
      user: { select: { id: true, firstName: true, lastName: true, isActive: true, mfaEnabled: true } },
    } });
    if (!profile) throw new NotFoundException("Medora staff profile not found");
    const grants = await this.prisma.platformCapabilityGrant.findMany({ where: { userId }, include: { capability: true }, orderBy: { grantedAt: "desc" } });
    return { ...profile, grants };
  }

  private async requirePrincipal(actorUserId: string) {
    if (!(await resolvePlatformAuthority(this.prisma, actorUserId)).granted) throw new ForbiddenException("Authoritative platform principal required");
  }
  private async denied(event: string, actorUserId: string, targetUserId: string, code: string | undefined, reason: string) {
    await logSecurityAdminAudit(this.audit, AuditAction.UPDATE, { event, actorUserId, entityType: "PlatformCapabilityGrant", entityId: targetUserId,
      severity: "CRITICAL", outcome: "DENIED", sourceOperation: event, denialReason: reason, evidence: { targetUserId, ...(code ? { capabilityCode: code } : {}) } });
  }

  async classify(actorUserId: string, targetUserId: string, reason: string) {
    await this.requirePrincipal(actorUserId);
    if (actorUserId === targetUserId) throw new ForbiddenException("Self-classification is prohibited");
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { isActive: true } });
    if (!target?.isActive) throw new BadRequestException("Target user must be active");
    const existing = await this.prisma.medoraStaffProfile.findUnique({ where: { userId: targetUserId } });
    if (existing?.isActive) return existing;
    return this.prisma.$transaction(async (tx) => {
      const profile = existing
        ? await tx.medoraStaffProfile.update({ where: { userId: targetUserId }, data: { isActive: true, classifiedByUserId: actorUserId, classifiedAt: new Date(), classificationReason: reason, deactivatedAt: null, deactivatedByUserId: null, deactivationReason: null } })
        : await tx.medoraStaffProfile.create({ data: { userId: targetUserId, classifiedByUserId: actorUserId, classificationReason: reason } });
      await logSecurityAdminAudit(this.audit, AuditAction.CREATE, { event: "MEDORA_STAFF_CLASSIFIED", actorUserId, entityType: "MedoraStaffProfile", entityId: profile.id, severity: "CRITICAL", outcome: "SUCCESS", sourceOperation: "platform.staff.classify", evidence: { targetUserId, result: "CLASSIFIED", reason }, tx });
      return profile;
    });
  }

  async grant(actorUserId: string, targetUserId: string, code: PlatformCapabilityCode, reason: string, ticketReference?: string) {
    await this.requirePrincipal(actorUserId);
    if (actorUserId === targetUserId) { await this.denied("PLATFORM_CAPABILITY_GRANT_DENIED", actorUserId, targetUserId, code, "SELF_GRANT_PROHIBITED"); throw new ForbiddenException("Self-grant is prohibited"); }
    const [target, capability, existing] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: targetUserId }, select: { isActive: true, medoraStaffProfile: { select: { isActive: true } } } }),
      this.prisma.platformCapability.findUnique({ where: { code } }),
      this.prisma.platformCapabilityGrant.findFirst({ where: { userId: targetUserId, isActive: true, capability: { code } } }),
    ]);
    if (!target?.isActive || !target.medoraStaffProfile?.isActive) { await this.denied("PLATFORM_CAPABILITY_GRANT_DENIED", actorUserId, targetUserId, code, "TARGET_NOT_ACTIVE_STAFF"); throw new BadRequestException("Target must be active Medora staff"); }
    if (!capability?.isActive) { await this.denied("PLATFORM_CAPABILITY_GRANT_DENIED", actorUserId, targetUserId, code, "CAPABILITY_NOT_ACTIVE"); throw new BadRequestException("Capability must exist and be active"); }
    if (existing) return { ...existing, idempotent: true };
    return this.prisma.$transaction(async (tx) => {
      const grant = await tx.platformCapabilityGrant.create({ data: { userId: targetUserId, capabilityId: capability.id, grantedByUserId: actorUserId, grantReason: reason, ticketReference } });
      await logSecurityAdminAudit(this.audit, AuditAction.CREATE, { event: "PLATFORM_CAPABILITY_GRANTED", actorUserId, entityType: "PlatformCapabilityGrant", entityId: grant.id, severity: "CRITICAL", outcome: "SUCCESS", sourceOperation: "platform.staff.capability.grant", evidence: { targetUserId, capabilityCode: code, result: "GRANTED", reason, ...(ticketReference ? { ticketReference } : {}) }, tx });
      return { ...grant, idempotent: false };
    });
  }

  async revoke(actorUserId: string, targetUserId: string, code: PlatformCapabilityCode, reason: string) {
    await this.requirePrincipal(actorUserId);
    const grant = await this.prisma.platformCapabilityGrant.findFirst({ where: { userId: targetUserId, isActive: true, capability: { code } } });
    if (!grant) { await this.denied("PLATFORM_CAPABILITY_REVOKE_DENIED", actorUserId, targetUserId, code, "ACTIVE_GRANT_NOT_FOUND"); throw new NotFoundException("Active capability grant not found"); }
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.platformCapabilityGrant.update({ where: { id: grant.id }, data: { isActive: false, revokedAt: new Date(), revokedByUserId: actorUserId, revokeReason: reason } });
      await logSecurityAdminAudit(this.audit, AuditAction.UPDATE, { event: "PLATFORM_CAPABILITY_REVOKED", actorUserId, entityType: "PlatformCapabilityGrant", entityId: grant.id, severity: "CRITICAL", outcome: "SUCCESS", sourceOperation: "platform.staff.capability.revoke", evidence: { targetUserId, capabilityCode: code, result: "REVOKED", reason }, tx });
      return revoked;
    });
  }
}
