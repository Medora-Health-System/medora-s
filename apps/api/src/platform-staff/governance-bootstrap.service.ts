import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { PrismaService } from "../prisma/prisma.service";
import { PERSONA_CAPABILITY_TEMPLATES } from "./platform-capabilities";

export const GOVERNANCE_BOOTSTRAP_PERSONA = "COMPLIANCE_SECURITY" as const;
export const GOVERNANCE_BOOTSTRAP_CAPABILITIES = [...PERSONA_CAPABILITY_TEMPLATES.COMPLIANCE_SECURITY, "PRIVILEGED_ACTION_APPROVE"] as const;
const LOCK_KEY = 0x1c5b;

type Actor = { userId: string; sessionId: string };
type Input = { targetUserId: string; reason: string; ticketReference: string };

@Injectable()
export class GovernanceBootstrapService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private completedWhere = { entityType: "PlatformGovernanceBootstrap", metadata: { path: ["event"], equals: "PLATFORM_GOVERNANCE_BOOTSTRAP_COMPLETED" } } as const;
  private async eligibleApprover(db: any) {
    return db.user.findFirst({ where: { isActive: true, medoraStaffProfile: { is: { isActive: true } }, platformCapabilityGrants: { some: { isActive: true, capability: { code: "PRIVILEGED_ACTION_APPROVE", isActive: true } } } }, select: { id: true } });
  }
  async status(actorUserId: string) {
    if (!(await resolvePlatformAuthority(this.prisma, actorUserId)).granted) throw new ForbiddenException("Authoritative platform principal required");
    const [completed, approver] = await Promise.all([this.prisma.auditLog.findFirst({ where: this.completedWhere, select: { id: true } }), this.eligibleApprover(this.prisma)]);
    return { available: !completed && !approver, closed: !!completed || !!approver, persona: GOVERNANCE_BOOTSTRAP_PERSONA, capabilityCodes: [...GOVERNANCE_BOOTSTRAP_CAPABILITIES] };
  }
  private async denied(actorUserId: string, targetUserId: string, reason: string, input?: Input) {
    await logSecurityAdminAudit(this.audit, AuditAction.UPDATE, { event: "PLATFORM_GOVERNANCE_BOOTSTRAP_DENIED", actorUserId, entityType: "PlatformGovernanceBootstrap", entityId: targetUserId || actorUserId, severity: "CRITICAL", outcome: "DENIED", sourceOperation: "platform.governance.bootstrap", denialReason: reason, evidence: { targetUserId: targetUserId || null, persona: GOVERNANCE_BOOTSTRAP_PERSONA, capabilityCodes: [...GOVERNANCE_BOOTSTRAP_CAPABILITIES], ...(input ? { reason: input.reason, ticketReference: input.ticketReference } : {}), result: "DENIED" } });
  }
  async bootstrap(actor: Actor, input: Input) {
    if (actor.userId === input.targetUserId) { await this.denied(actor.userId, input.targetUserId, "SELF_BOOTSTRAP_PROHIBITED", input); throw new ForbiddenException("SELF_BOOTSTRAP_PROHIBITED"); }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock($1)", LOCK_KEY);
        if (!(await resolvePlatformAuthority(tx as any, actor.userId)).granted) throw new ForbiddenException("PLATFORM_PRINCIPAL_REQUIRED");
        const now = new Date();
        const configuredAge = Number(process.env.MFA_STEP_UP_MAX_AGE_SECONDS || "300");
        const maxAge = Number.isFinite(configuredAge) && configuredAge > 0 ? configuredAge * 1000 : 300_000;
        const session = await tx.authSession.findFirst({ where: { id: actor.sessionId, userId: actor.userId, revokedAt: null, expiresAt: { gt: now } }, select: { mfaVerifiedAt: true } });
        if (!session?.mfaVerifiedAt || now.getTime() - session.mfaVerifiedAt.getTime() > maxAge) throw new ForbiddenException("RECENT_SESSION_MFA_REQUIRED");
        if (await tx.auditLog.findFirst({ where: this.completedWhere, select: { id: true } })) throw new ForbiddenException("GOVERNANCE_BOOTSTRAP_CLOSED");
        if (await this.eligibleApprover(tx)) throw new ForbiddenException("INDEPENDENT_APPROVER_ALREADY_EXISTS");
        const target = await tx.user.findUnique({ where: { id: input.targetUserId }, select: { isActive: true, medoraStaffProfile: { select: { id: true, persona: true, isActive: true } }, userRoles: { select: { id: true }, take: 1 } } });
        if (!target) throw new NotFoundException("TARGET_USER_NOT_FOUND");
        if (!target.isActive) throw new BadRequestException("TARGET_USER_INACTIVE");
        if (target.medoraStaffProfile) throw new BadRequestException("TARGET_STAFF_STATE_CONFLICT");
        await logSecurityAdminAudit(this.audit, AuditAction.CREATE, { event: "PLATFORM_GOVERNANCE_BOOTSTRAP_STARTED", actorUserId: actor.userId, entityType: "PlatformGovernanceBootstrap", entityId: input.targetUserId, severity: "CRITICAL", outcome: "SUCCESS", sourceOperation: "platform.governance.bootstrap", evidence: { targetUserId: input.targetUserId, persona: GOVERNANCE_BOOTSTRAP_PERSONA, capabilityCodes: [...GOVERNANCE_BOOTSTRAP_CAPABILITIES], reason: input.reason, ticketReference: input.ticketReference, result: "STARTED" }, tx });
        const profile = await tx.medoraStaffProfile.create({ data: { userId: input.targetUserId, persona: GOVERNANCE_BOOTSTRAP_PERSONA, isActive: true, classifiedByUserId: actor.userId, classificationReason: input.reason } });
        const caps = await tx.platformCapability.findMany({ where: { code: { in: [...GOVERNANCE_BOOTSTRAP_CAPABILITIES] }, isActive: true } });
        if (caps.length !== GOVERNANCE_BOOTSTRAP_CAPABILITIES.length) throw new ForbiddenException("BOOTSTRAP_CAPABILITY_CATALOG_MISMATCH");
        for (const cap of caps) await tx.platformCapabilityGrant.create({ data: { userId: input.targetUserId, capabilityId: cap.id, grantedByUserId: actor.userId, grantReason: input.reason, ticketReference: input.ticketReference, provenance: cap.code === "PRIVILEGED_ACTION_APPROVE" ? "MANUAL" : "PERSONA", managedPersona: cap.code === "PRIVILEGED_ACTION_APPROVE" ? null : GOVERNANCE_BOOTSTRAP_PERSONA } });
        await tx.medoraStaffLifecycleEvent.create({ data: { staffProfileId: profile.id, actorUserId: actor.userId, eventType: "PROVISION", newPersona: GOVERNANCE_BOOTSTRAP_PERSONA, newIsActive: true, reason: input.reason, ticketReference: input.ticketReference } });
        await logSecurityAdminAudit(this.audit, AuditAction.CREATE, { event: "PLATFORM_GOVERNANCE_BOOTSTRAP_COMPLETED", actorUserId: actor.userId, entityType: "PlatformGovernanceBootstrap", entityId: input.targetUserId, severity: "CRITICAL", outcome: "SUCCESS", sourceOperation: "platform.governance.bootstrap", evidence: { targetUserId: input.targetUserId, persona: GOVERNANCE_BOOTSTRAP_PERSONA, capabilityCodes: [...GOVERNANCE_BOOTSTRAP_CAPABILITIES], reason: input.reason, ticketReference: input.ticketReference, result: "COMPLETED" }, tx });
        return { targetUserId: input.targetUserId, persona: GOVERNANCE_BOOTSTRAP_PERSONA, capabilityCodes: [...GOVERNANCE_BOOTSTRAP_CAPABILITIES], closed: true };
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "BOOTSTRAP_DENIED";
      await this.denied(actor.userId, input.targetUserId, code.slice(0, 100), input);
      throw error;
    }
  }
}
