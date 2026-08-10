import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, type Prisma } from "@prisma/client";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { PrismaService } from "../prisma/prisma.service";
import { hasRequiredCapabilities, resolvePlatformCapabilities } from "./platform-capability.resolver";
import { PERSONA_CAPABILITY_TEMPLATES, type MedoraStaffPersonaCode, type PlatformCapabilityCode } from "./platform-capabilities";
import { OPERATION_POLICY, PRIVILEGED_ACTION_TTL_MS, hasFreshMfa, scopeDigest, type GovernedOperation, type PrivilegedScope } from "./privileged-action-policy";

type Actor = { userId: string; sessionId: string };
type CreateInput = { operationType: GovernedOperation; targetUserId: string; reason: string; ticketReference?: string; persona?: MedoraStaffPersonaCode; capabilityCode?: PlatformCapabilityCode };

@Injectable()
export class PrivilegedActionService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async principal(userId: string, tx: any = this.prisma) { return (await resolvePlatformAuthority(tx, userId)).granted; }
  private async has(userId: string, code: PlatformCapabilityCode, tx: any = this.prisma) {
    if (await this.principal(userId, tx)) return true;
    return hasRequiredCapabilities(await resolvePlatformCapabilities(tx, userId), [code], "ALL");
  }
  private async requireFreshSession(actor: Actor, tx: any = this.prisma) {
    const session = await tx.authSession.findFirst({ where: { id: actor.sessionId, userId: actor.userId }, select: { mfaVerifiedAt: true, mfaMethod: true, revokedAt: true, expiresAt: true } });
    if (!session || !hasFreshMfa(session)) throw new ForbiddenException("RECENT_SESSION_MFA_REQUIRED");
  }
  private async event(tx: Prisma.TransactionClient | undefined, event: string, actorUserId: string, requestId: string, outcome: "SUCCESS" | "DENIED", evidence: Record<string, unknown> = {}, denialReason?: string) {
    await logSecurityAdminAudit(this.audit, AuditAction.UPDATE, { event, actorUserId, entityType: "PrivilegedActionRequest", entityId: requestId, severity: "CRITICAL", outcome, sourceOperation: `platform.privileged-action.${event.toLowerCase()}`, denialReason, evidence, tx });
  }
  private scope(input: CreateInput): PrivilegedScope {
    if (input.operationType === "STAFF_PROVISION") return { operationType: input.operationType, targetUserId: input.targetUserId, persona: input.persona! };
    return { operationType: input.operationType, targetUserId: input.targetUserId, capabilityCode: input.capabilityCode! };
  }

  async create(actor: Actor, input: CreateInput) {
    const policy = OPERATION_POLICY[input.operationType];
    await this.requireFreshSession(actor);
    if (!(await this.has(actor.userId, policy.authority))) return this.deny(actor.userId, actor.userId, "REQUESTER_AUTHORITY_REQUIRED");
    if (actor.userId === input.targetUserId) return this.deny(actor.userId, actor.userId, "SELF_PRIVILEGE_ELEVATION_PROHIBITED");
    const target = await this.prisma.user.findUnique({ where: { id: input.targetUserId }, select: { isActive: true, medoraStaffProfile: { select: { isActive: true, persona: true } } } });
    if (!target?.isActive) throw new BadRequestException("Target user must be active");
    if (input.operationType === "STAFF_PROVISION" && target.medoraStaffProfile?.persona) throw new BadRequestException("Staff is already provisioned");
    if (input.operationType === "STAFF_GRANT_CAPABILITY") {
      if (!target.medoraStaffProfile?.isActive) throw new BadRequestException("Target must be active Medora staff");
      const capability = await this.prisma.platformCapability.findUnique({ where: { code: input.capabilityCode! }, select: { isActive: true } });
      if (!capability?.isActive) throw new BadRequestException("Capability must exist and be active");
    }
    const scope = this.scope(input); const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.privilegedActionRequest.create({ data: { operationType: input.operationType, requesterUserId: actor.userId, requesterSessionId: actor.sessionId, targetUserId: input.targetUserId, scope: scope as any, scopeDigest: scopeDigest(scope), reason: input.reason, ticketReference: input.ticketReference, expiresAt: new Date(now.getTime() + PRIVILEGED_ACTION_TTL_MS) } });
      await this.event(tx, "PRIVILEGED_ACTION_REQUESTED", actor.userId, request.id, "SUCCESS", { operationType: input.operationType, targetUserId: input.targetUserId, scopeDigest: request.scopeDigest, expiresAt: request.expiresAt.toISOString(), ...(input.ticketReference ? { ticketReference: input.ticketReference } : {}) });
      return request;
    });
  }
  private async deny(actorUserId: string, requestId: string, reason: string): Promise<never> { await this.event(undefined, "PRIVILEGED_ACTION_DENIED", actorUserId, requestId, "DENIED", {}, reason); throw new ForbiddenException(reason); }
  private async get(id: string) { const r = await this.prisma.privilegedActionRequest.findUnique({ where: { id } }); if (!r) throw new NotFoundException("Privileged action request not found"); return r; }
  async list(actorUserId: string, status: any, take: number) {
    const canApprove = await this.has(actorUserId, "PRIVILEGED_ACTION_APPROVE");
    return this.prisma.privilegedActionRequest.findMany({ where: { ...(status ? { status } : {}), ...(canApprove ? {} : { OR: [{ requesterUserId: actorUserId }, { targetUserId: actorUserId }] }) }, select: { id:true,operationType:true,status:true,requesterUserId:true,targetUserId:true,scope:true,reason:true,ticketReference:true,requestedAt:true,expiresAt:true,approverUserId:true,approvedAt:true,executedAt:true,failureCode:true }, orderBy: { requestedAt: "desc" }, take });
  }
  async one(actorUserId: string, id: string) { const r = await this.get(id); if (r.requesterUserId !== actorUserId && r.targetUserId !== actorUserId && !(await this.has(actorUserId, "PRIVILEGED_ACTION_APPROVE"))) throw new NotFoundException("Privileged action request not found"); const { requesterSessionId, approverSessionId, scopeDigest: _digest, ...safe } = r; return safe; }
  async approve(actor: Actor, id: string) {
    await this.requireFreshSession(actor); if (!(await this.has(actor.userId, "PRIVILEGED_ACTION_APPROVE"))) return this.deny(actor.userId, id, "APPROVAL_AUTHORITY_REQUIRED");
    const r = await this.get(id); if (r.requesterUserId === actor.userId) return this.deny(actor.userId, id, "SELF_APPROVAL_PROHIBITED"); if (r.targetUserId === actor.userId) return this.deny(actor.userId, id, "TARGET_APPROVAL_PROHIBITED");
    if (r.status !== "PENDING") throw new BadRequestException("Request is not pending"); if (r.expiresAt <= new Date()) return this.expire(actor.userId, id);
    return this.prisma.$transaction(async tx => { const changed = await tx.privilegedActionRequest.updateMany({ where: { id, status: "PENDING", expiresAt: { gt: new Date() } }, data: { status: "APPROVED", approverUserId: actor.userId, approverSessionId: actor.sessionId, approvedAt: new Date() } }); if (changed.count !== 1) throw new BadRequestException("Request transition conflict"); await this.event(tx, "PRIVILEGED_ACTION_APPROVED", actor.userId, id, "SUCCESS", { requesterUserId: r.requesterUserId, targetUserId: r.targetUserId, operationType: r.operationType }); return tx.privilegedActionRequest.findUnique({ where: { id } }); });
  }
  private async expire(actorUserId: string, id: string): Promise<never> { await this.prisma.$transaction(async tx => { await tx.privilegedActionRequest.updateMany({ where: { id, status: { in: ["PENDING","APPROVED"] } }, data: { status: "EXPIRED", closedAt: new Date() } }); await this.event(tx, "PRIVILEGED_ACTION_EXPIRED", actorUserId, id, "DENIED", {}, "REQUEST_EXPIRED"); }); throw new BadRequestException("Request expired"); }
  async reject(actor: Actor, id: string, reason: string) { await this.requireFreshSession(actor); if (!(await this.has(actor.userId, "PRIVILEGED_ACTION_APPROVE"))) return this.deny(actor.userId,id,"APPROVAL_AUTHORITY_REQUIRED"); return this.close(actor.userId,id,"REJECTED","PRIVILEGED_ACTION_REJECTED",reason); }
  async cancel(actor: Actor, id: string, reason: string) { const r=await this.get(id); if (r.requesterUserId!==actor.userId && !(await this.principal(actor.userId))) return this.deny(actor.userId,id,"CANCELLATION_AUTHORITY_REQUIRED"); return this.close(actor.userId,id,"CANCELLED","PRIVILEGED_ACTION_CANCELLED",reason); }
  private async close(actorUserId:string,id:string,status:"REJECTED"|"CANCELLED",event:string,reason:string) { return this.prisma.$transaction(async tx => { const changed=await tx.privilegedActionRequest.updateMany({where:{id,status:"PENDING"},data:{status,closedByUserId:actorUserId,closedAt:new Date(),failureCode:reason}}); if(changed.count!==1) throw new BadRequestException("Request is not pending"); await this.event(tx,event,actorUserId,id,"SUCCESS",{result:status}); return tx.privilegedActionRequest.findUnique({where:{id}}); }); }

  async execute(actor: Actor, id: string) {
    const original = await this.get(id); if (original.requesterUserId !== actor.userId && !(await this.principal(actor.userId))) return this.deny(actor.userId,id,"EXECUTION_AUTHORITY_REQUIRED");
    if (original.status !== "APPROVED") throw new BadRequestException("Request is not approved"); if (original.expiresAt <= new Date()) return this.expire(actor.userId,id);
    const scope = original.scope as unknown as PrivilegedScope; if (scopeDigest(scope) !== original.scopeDigest || scope.operationType !== original.operationType || scope.targetUserId !== original.targetUserId) return this.deny(actor.userId,id,"SCOPE_INTEGRITY_FAILURE");
    try { return await this.prisma.$transaction(async tx => {
      const claimed=await tx.privilegedActionRequest.updateMany({where:{id,status:"APPROVED",expiresAt:{gt:new Date()}},data:{status:"EXECUTED",executionActorUserId:actor.userId,executedAt:new Date()}}); if(claimed.count!==1) throw new BadRequestException("Request already claimed");
      await this.requireFreshSession({userId:original.requesterUserId,sessionId:original.requesterSessionId},tx); await this.requireFreshSession({userId:original.approverUserId!,sessionId:original.approverSessionId!},tx);
      const policy=OPERATION_POLICY[original.operationType]; if(!(await this.has(original.requesterUserId,policy.authority,tx)) || !(await this.has(original.approverUserId!,"PRIVILEGED_ACTION_APPROVE",tx))) throw new ForbiddenException("AUTHORITY_REVALIDATION_FAILED");
      const target=await tx.user.findUnique({where:{id:original.targetUserId},select:{isActive:true,medoraStaffProfile:{select:{id:true,isActive:true,persona:true}}}}); if(!target?.isActive) throw new ForbiddenException("TARGET_STATE_CHANGED");
      if(scope.operationType==="STAFF_GRANT_CAPABILITY") await this.executeGrant(tx,original.requesterUserId,scope,original.reason,original.ticketReference);
      else await this.executeProvision(tx,original.requesterUserId,scope,original.reason,original.ticketReference,target);
      await this.event(tx,"PRIVILEGED_ACTION_EXECUTED",actor.userId,id,"SUCCESS",{operationType:original.operationType,targetUserId:original.targetUserId,scopeDigest:original.scopeDigest}); return tx.privilegedActionRequest.findUnique({where:{id}});
    }); } catch(error) { if(error instanceof BadRequestException && error.message==="Request already claimed") throw error; await this.event(undefined,"PRIVILEGED_ACTION_EXECUTION_FAILED",actor.userId,id,"DENIED",{operationType:original.operationType},error instanceof Error ? error.message.slice(0,100) : "EXECUTION_FAILED"); throw error; }
  }
  private async executeGrant(tx:any,actorUserId:string,scope:Extract<PrivilegedScope,{operationType:"STAFF_GRANT_CAPABILITY"}>,reason:string,ticketReference?:string|null){ const capability=await tx.platformCapability.findUnique({where:{code:scope.capabilityCode}}); if(!capability?.isActive) throw new ForbiddenException("CAPABILITY_STATE_CHANGED"); const target=await tx.user.findUnique({where:{id:scope.targetUserId},select:{isActive:true,medoraStaffProfile:{select:{isActive:true}}}}); if(!target?.isActive||!target.medoraStaffProfile?.isActive) throw new ForbiddenException("TARGET_STATE_CHANGED"); const existing=await tx.platformCapabilityGrant.findFirst({where:{userId:scope.targetUserId,capabilityId:capability.id,isActive:true}}); if(existing) return; const grant=await tx.platformCapabilityGrant.create({data:{userId:scope.targetUserId,capabilityId:capability.id,grantedByUserId:actorUserId,grantReason:reason,ticketReference}}); await logSecurityAdminAudit(this.audit,AuditAction.CREATE,{event:"PLATFORM_CAPABILITY_GRANTED",actorUserId,entityType:"PlatformCapabilityGrant",entityId:grant.id,severity:"CRITICAL",outcome:"SUCCESS",sourceOperation:"platform.privileged-action.execute",evidence:{targetUserId:scope.targetUserId,capabilityCode:scope.capabilityCode,result:"GRANTED",reason},tx}); }
  private async executeProvision(tx:any,actorUserId:string,scope:Extract<PrivilegedScope,{operationType:"STAFF_PROVISION"}>,reason:string,ticketReference:string|null|undefined,target:any){ if(target.medoraStaffProfile?.persona) throw new ForbiddenException("TARGET_STATE_CHANGED"); const profile=target.medoraStaffProfile ? await tx.medoraStaffProfile.update({where:{userId:scope.targetUserId},data:{persona:scope.persona,isActive:true}}) : await tx.medoraStaffProfile.create({data:{userId:scope.targetUserId,persona:scope.persona,isActive:true,classifiedByUserId:actorUserId,classificationReason:reason}}); const codes=PERSONA_CAPABILITY_TEMPLATES[scope.persona as MedoraStaffPersonaCode]; const caps=await tx.platformCapability.findMany({where:{code:{in:[...codes]},isActive:true}}); if(caps.length!==codes.length||caps.some((c:any)=>c.riskLevel==="CRITICAL")) throw new ForbiddenException("PERSONA_POLICY_FAILURE"); for(const c of caps){const exists=await tx.platformCapabilityGrant.findFirst({where:{userId:scope.targetUserId,capabilityId:c.id,isActive:true}});if(!exists)await tx.platformCapabilityGrant.create({data:{userId:scope.targetUserId,capabilityId:c.id,grantedByUserId:actorUserId,grantReason:reason,ticketReference,provenance:"PERSONA",managedPersona:scope.persona}});} await tx.medoraStaffLifecycleEvent.create({data:{staffProfileId:profile.id,actorUserId,eventType:"PROVISION",newPersona:scope.persona,newIsActive:true,reason,ticketReference}}); await logSecurityAdminAudit(this.audit,AuditAction.CREATE,{event:"STAFF_PROVISIONED",actorUserId,entityType:"MedoraStaffProfile",entityId:profile.id,severity:"CRITICAL",outcome:"SUCCESS",sourceOperation:"platform.privileged-action.execute",evidence:{targetUserId:scope.targetUserId,result:"PROVISIONED",persona:scope.persona},tx}); }
}
