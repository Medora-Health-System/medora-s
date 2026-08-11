import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { PrismaService } from "../prisma/prisma.service";
import { PERSONA_CAPABILITY_TEMPLATES, type MedoraStaffPersonaCode, type PlatformCapabilityCode } from "./platform-capabilities";
import { hasRequiredCapabilities, resolvePlatformCapabilities } from "./platform-capability.resolver";

@Injectable()
export class PlatformStaffService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async getWorkspaceContext(userId: string) {
    const [principal, resolved, profile] = await Promise.all([
      resolvePlatformAuthority(this.prisma, userId),
      resolvePlatformCapabilities(this.prisma, userId),
      this.prisma.medoraStaffProfile.findUnique({
        where: { userId },
        select: { persona: true, isActive: true },
      }),
    ]);
    return {
      platformPrincipal: principal.granted,
      staff: profile ? { persona: profile.persona, isActive: profile.isActive } : null,
      capabilities: [...resolved.capabilities].sort(),
    };
  }

  listPlatformFacilities() {
    return this.prisma.facility.findMany({
      select: { id: true, name: true, code: true, isActive: true, facilityType: true, country: true, timezone: true },
      orderBy: { name: "asc" },
    });
  }

  listCapabilities() { return this.prisma.platformCapability.findMany({ orderBy: { code: "asc" } }); }
  listEligibleUsers(query = "") {
    const term = query.trim().slice(0, 80);
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        medoraStaffProfile: null,
        ...(term ? { OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ] } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true, isActive: true, mfaEnabled: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 50,
    });
  }
  listSecurityUsers(query = "") {
    const term=query.trim().slice(0,80);return this.prisma.user.findMany({where:{isActive:true,...(term?{OR:[{firstName:{contains:term,mode:"insensitive"}},{lastName:{contains:term,mode:"insensitive"}},{email:{contains:term,mode:"insensitive"}}]}:{})},select:{id:true,firstName:true,lastName:true,email:true,isActive:true,mfaEnabled:true},orderBy:[{lastName:"asc"},{firstName:"asc"}],take:50});
  }

  async getPlatformFacility(id: string) {
    const row = await this.prisma.facility.findUnique({ where: { id }, select: {
      id: true, name: true, code: true, isActive: true, facilityType: true, country: true,
      timezone: true, defaultLanguage: true, serviceLinesJson: true, billingClassificationMode: true,
    } });
    if (!row) throw new NotFoundException("Facility not found");
    return row;
  }
  listStaff() {
    return this.prisma.medoraStaffProfile.findMany({
      select: { id: true, userId: true, persona: true, isActive: true, classifiedAt: true, deactivatedAt: true, user: { select: { firstName: true, lastName: true, isActive: true } } }, orderBy: { classifiedAt: "desc" },
    });
  }
  async getStaff(userId: string) {
    const profile = await this.prisma.medoraStaffProfile.findUnique({ where: { userId }, include: {
      user: { select: { id: true, firstName: true, lastName: true, isActive: true, mfaEnabled: true } },
    } });
    if (!profile) throw new NotFoundException("Medora staff profile not found");
    const [grants, lifecycle] = await Promise.all([
      this.prisma.platformCapabilityGrant.findMany({ where: { userId }, include: { capability: true }, orderBy: { grantedAt: "desc" } }),
      this.prisma.medoraStaffLifecycleEvent.findMany({ where: { staffProfileId: profile.id }, select: { eventType: true, oldPersona: true, newPersona: true, oldIsActive: true, newIsActive: true, actorUserId: true, reason: true, ticketReference: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
    ]);
    return { ...profile, grants, lifecycle };
  }

  private async reconcile(tx: any, actorUserId: string, targetUserId: string, persona: MedoraStaffPersonaCode, reason: string, ticketReference?: string) {
    const expected = new Set(PERSONA_CAPABILITY_TEMPLATES[persona]);
    const capabilities = await tx.platformCapability.findMany({ where: { code: { in: [...expected] }, isActive: true } });
    if (capabilities.length !== expected.size) throw new Error("PERSONA_TEMPLATE_CATALOG_MISMATCH");
    if (capabilities.some((capability: any) => capability.riskLevel === "CRITICAL")) throw new Error("PERSONA_TEMPLATE_CRITICAL_CAPABILITY");
    const active = await tx.platformCapabilityGrant.findMany({ where: { userId: targetUserId, isActive: true }, include: { capability: { select: { code: true } } } });
    const added: string[] = [];
    for (const capability of capabilities) {
      if (active.some((grant: any) => grant.capabilityId === capability.id)) continue;
      await tx.platformCapabilityGrant.create({ data: { userId: targetUserId, capabilityId: capability.id, grantedByUserId: actorUserId, grantReason: reason, ticketReference, provenance: "PERSONA", managedPersona: persona } });
      added.push(capability.code);
    }
    const obsolete = active.filter((grant: any) => grant.provenance === "PERSONA" && !expected.has(grant.capability.code));
    for (const grant of obsolete) await tx.platformCapabilityGrant.update({ where: { id: grant.id }, data: { isActive: false, revokedAt: new Date(), revokedByUserId: actorUserId, revokeReason: reason } });
    return { added: added.sort(), revoked: obsolete.map((grant: any) => grant.capability.code).sort() };
  }

  private async lifecycle(actorUserId: string, targetUserId: string, eventType: "PROVISION" | "ACTIVATE" | "DEACTIVATE" | "PERSONA_CHANGE", persona: MedoraStaffPersonaCode | undefined, reason: string, ticketReference?: string) {
    if (eventType === "PROVISION" || eventType === "DEACTIVATE") await this.requirePrincipalOrCapability(actorUserId, "STAFF_PROVISION");
    else await this.requirePrincipal(actorUserId);
    if (actorUserId === targetUserId) { await this.denied("STAFF_MUTATION_DENIED", actorUserId, targetUserId, undefined, "SELF_MUTATION_PROHIBITED"); throw new ForbiddenException("Self staff mutation is prohibited"); }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { isActive: true } });
    if (!target) throw new NotFoundException("STAFF_TARGET_NOT_FOUND");
    if (!target.isActive) throw new BadRequestException("STAFF_TARGET_INACTIVE");
    const existing = await this.prisma.medoraStaffProfile.findUnique({ where: { userId: targetUserId } });
    if (eventType !== "PROVISION" && !existing) throw new NotFoundException("Medora staff profile not found");
    if (eventType === "PROVISION" && existing) throw new BadRequestException("STAFF_ALREADY_PROVISIONED");
    const nextPersona = persona ?? existing?.persona;
    if (!nextPersona) throw new BadRequestException("Staff persona is required");
    const nextActive = eventType !== "DEACTIVATE";
    return this.prisma.$transaction(async (tx) => {
      const profile = existing
        ? await tx.medoraStaffProfile.update({ where: { userId: targetUserId }, data: { persona: nextPersona, isActive: nextActive, ...(nextActive ? { deactivatedAt: null, deactivatedByUserId: null, deactivationReason: null } : { deactivatedAt: new Date(), deactivatedByUserId: actorUserId, deactivationReason: reason }) } })
        : await tx.medoraStaffProfile.create({ data: { userId: targetUserId, persona: nextPersona, isActive: true, classifiedByUserId: actorUserId, classificationReason: reason } });
      const changes = nextActive ? await this.reconcile(tx, actorUserId, targetUserId, nextPersona as MedoraStaffPersonaCode, reason, ticketReference) : { added: [], revoked: [] };
      await tx.medoraStaffLifecycleEvent.create({ data: { staffProfileId: profile.id, actorUserId, eventType, oldPersona: existing?.persona, newPersona: nextPersona, oldIsActive: existing?.isActive, newIsActive: nextActive, reason, ticketReference } });
      const event = ({ PROVISION: "STAFF_PROVISIONED", ACTIVATE: "STAFF_ACTIVATED", DEACTIVATE: "STAFF_DEACTIVATED", PERSONA_CHANGE: "STAFF_PERSONA_CHANGED" } as const)[eventType];
      await logSecurityAdminAudit(this.audit, eventType === "PROVISION" ? AuditAction.CREATE : AuditAction.UPDATE, { event, actorUserId, entityType: "MedoraStaffProfile", entityId: profile.id, severity: "CRITICAL", outcome: "SUCCESS", sourceOperation: `platform.staff.${eventType.toLowerCase()}`, evidence: { targetUserId, oldPersona: existing?.persona ?? null, newPersona: nextPersona, oldIsActive: existing?.isActive ?? null, newIsActive: nextActive, capabilitiesAdded: changes.added, capabilitiesRevoked: changes.revoked, reason, ...(ticketReference ? { ticketReference } : {}), result: "SUCCESS" }, tx });
      return { ...profile, capabilityChanges: changes };
    });
  }

  provision(actor: string, target: string, persona: MedoraStaffPersonaCode, reason: string, ticket?: string) { return this.lifecycle(actor, target, "PROVISION", persona, reason, ticket); }
  activate(actor: string, target: string, reason: string, ticket?: string) { return this.lifecycle(actor, target, "ACTIVATE", undefined, reason, ticket); }
  deactivate(actor: string, target: string, reason: string, ticket?: string) { return this.lifecycle(actor, target, "DEACTIVATE", undefined, reason, ticket); }
  changePersona(actor: string, target: string, persona: MedoraStaffPersonaCode, reason: string, ticket?: string) { return this.lifecycle(actor, target, "PERSONA_CHANGE", persona, reason, ticket); }

  private async requirePrincipal(actorUserId: string) {
    if (!(await resolvePlatformAuthority(this.prisma, actorUserId)).granted) throw new ForbiddenException("Authoritative platform principal required");
  }
  private async requirePrincipalOrCapability(actorUserId: string, code: PlatformCapabilityCode) {
    if ((await resolvePlatformAuthority(this.prisma, actorUserId)).granted) return;
    if (!hasRequiredCapabilities(await resolvePlatformCapabilities(this.prisma, actorUserId), [code], "ALL")) throw new ForbiddenException("Required platform capability missing");
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
    await this.requirePrincipalOrCapability(actorUserId, "STAFF_GRANT_CAPABILITIES");
    if (actorUserId === targetUserId) { await this.denied("PLATFORM_CAPABILITY_GRANT_DENIED", actorUserId, targetUserId, code, "SELF_GRANT_PROHIBITED"); throw new ForbiddenException("Self-grant is prohibited"); }
    const [target, capability, existing] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: targetUserId }, select: { isActive: true, medoraStaffProfile: { select: { isActive: true } } } }),
      this.prisma.platformCapability.findUnique({ where: { code } }),
      this.prisma.platformCapabilityGrant.findFirst({ where: { userId: targetUserId, isActive: true, capability: { code } } }),
    ]);
    if (!target?.isActive || !target.medoraStaffProfile?.isActive) { await this.denied("PLATFORM_CAPABILITY_GRANT_DENIED", actorUserId, targetUserId, code, "TARGET_NOT_ACTIVE_STAFF"); throw new BadRequestException("Target must be active Medora staff"); }
    if (!capability?.isActive) { await this.denied("PLATFORM_CAPABILITY_GRANT_DENIED", actorUserId, targetUserId, code, "CAPABILITY_NOT_ACTIVE"); throw new BadRequestException("Capability must exist and be active"); }
    if (capability.riskLevel === "CRITICAL") { await this.denied("PLATFORM_CAPABILITY_GRANT_DENIED", actorUserId, targetUserId, code, "DUAL_CONTROL_REQUIRED"); throw new ForbiddenException("DUAL_CONTROL_REQUIRED"); }
    if (existing) return { ...existing, idempotent: true };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const grant = await tx.platformCapabilityGrant.create({ data: { userId: targetUserId, capabilityId: capability.id, grantedByUserId: actorUserId, grantReason: reason, ticketReference } });
        await logSecurityAdminAudit(this.audit, AuditAction.CREATE, { event: "PLATFORM_CAPABILITY_GRANTED", actorUserId, entityType: "PlatformCapabilityGrant", entityId: grant.id, severity: "CRITICAL", outcome: "SUCCESS", sourceOperation: "platform.staff.capability.grant", evidence: { targetUserId, capabilityCode: code, result: "GRANTED", reason, ...(ticketReference ? { ticketReference } : {}) }, tx });
        return { ...grant, idempotent: false };
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== "P2002") throw error;
      const concurrentGrant = await this.prisma.platformCapabilityGrant.findFirst({ where: { userId: targetUserId, capabilityId: capability.id, isActive: true } });
      if (!concurrentGrant) throw error;
      return { ...concurrentGrant, idempotent: true };
    }
  }

  async revoke(actorUserId: string, targetUserId: string, code: PlatformCapabilityCode, reason: string) {
    await this.requirePrincipalOrCapability(actorUserId, "STAFF_REVOKE_CAPABILITIES");
    const grant = await this.prisma.platformCapabilityGrant.findFirst({ where: { userId: targetUserId, isActive: true, capability: { code } } });
    if (!grant) { await this.denied("PLATFORM_CAPABILITY_REVOKE_DENIED", actorUserId, targetUserId, code, "ACTIVE_GRANT_NOT_FOUND"); throw new NotFoundException("Active capability grant not found"); }
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.platformCapabilityGrant.update({ where: { id: grant.id }, data: { isActive: false, revokedAt: new Date(), revokedByUserId: actorUserId, revokeReason: reason } });
      await logSecurityAdminAudit(this.audit, AuditAction.UPDATE, { event: "PLATFORM_CAPABILITY_REVOKED", actorUserId, entityType: "PlatformCapabilityGrant", entityId: grant.id, severity: "CRITICAL", outcome: "SUCCESS", sourceOperation: "platform.staff.capability.revoke", evidence: { targetUserId, capabilityCode: code, result: "REVOKED", reason }, tx });
      return revoked;
    });
  }
}
