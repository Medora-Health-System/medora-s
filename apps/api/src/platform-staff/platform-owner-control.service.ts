import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { PrismaService } from "../prisma/prisma.service";
import type { PlatformCapabilityCode } from "./platform-capabilities";

@Injectable()
export class PlatformOwnerControlService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  isOwner(userId: string) { return resolvePlatformAuthority(this.prisma, userId).then(r => r.granted); }

  async assertTargetVisibleTo(actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) return;
    if (await this.isOwner(targetUserId)) throw new NotFoundException("Medora staff profile not found");
  }

  async filterProtectedUsers<T extends { userId?: string; id?: string }>(actorUserId: string, rows: T[]) {
    if (await this.isOwner(actorUserId)) return rows;
    const protectedIds = new Set<string>();
    for (const row of rows) {
      const id = String(row.userId ?? row.id ?? "");
      if (id && await this.isOwner(id)) protectedIds.add(id);
    }
    return rows.filter(row => !protectedIds.has(String(row.userId ?? row.id ?? "")));
  }

  async directGrantAsOwner(actorUserId: string, targetUserId: string, code: PlatformCapabilityCode, reason: string, ticketReference?: string) {
    if (!(await this.isOwner(actorUserId))) throw new ForbiddenException("Authoritative platform principal required");
    await this.assertTargetVisibleTo(actorUserId, targetUserId);
    const [target, capability, existing] = await Promise.all([
      this.prisma.user.findUnique({ where:{id:targetUserId}, select:{isActive:true,medoraStaffProfile:{select:{isActive:true}}} }),
      this.prisma.platformCapability.findUnique({ where:{code} }),
      this.prisma.platformCapabilityGrant.findFirst({ where:{userId:targetUserId,isActive:true,capability:{code}} }),
    ]);
    if (!target?.isActive || !target.medoraStaffProfile?.isActive) throw new ForbiddenException("Target must be active Medora staff");
    if (!capability?.isActive) throw new ForbiddenException("Capability must exist and be active");
    if (existing) return { ...existing, idempotent:true, ownerOverride:true };
    return this.prisma.$transaction(async tx => {
      const grant = await tx.platformCapabilityGrant.create({ data:{userId:targetUserId,capabilityId:capability.id,grantedByUserId:actorUserId,grantReason:reason,ticketReference} });
      await logSecurityAdminAudit(this.audit,AuditAction.CREATE,{event:"PLATFORM_OWNER_CAPABILITY_GRANTED",actorUserId,entityType:"PlatformCapabilityGrant",entityId:grant.id,severity:"CRITICAL",outcome:"SUCCESS",sourceOperation:"platform.owner.capability.grant",evidence:{targetUserId,capabilityCode:code,ownerOverride:true,reason,...(ticketReference?{ticketReference}:{})},tx});
      return { ...grant, idempotent:false, ownerOverride:true };
    });
  }
}
