import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuditAction } from "@prisma/client";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { PrismaService } from "../prisma/prisma.service";
import { PLATFORM_CAPABILITIES_METADATA, type PlatformCapabilityRequirement } from "./platform-capabilities.decorator";
import { hasRequiredCapabilities, resolvePlatformCapabilities } from "./platform-capability.resolver";
import { PLATFORM_CAPABILITY_CODES } from "./platform-capabilities";

const capabilityCodes = new Set<string>(PLATFORM_CAPABILITY_CODES);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PlatformCapabilitiesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async auditMutationDenial(requirement: PlatformCapabilityRequirement, request: any, actorUserId: string, denialReason: string) {
    const policy = requirement.denialAudit;
    if (!policy) return;
    const targetCandidate = String(request.params?.id ?? "").trim();
    const targetUserId = UUID.test(targetCandidate) ? targetCandidate : undefined;
    const codeCandidate = String(policy.requestedCapabilityFrom === "BODY" ? request.body?.code ?? "" : policy.requestedCapabilityFrom === "ROUTE" ? request.params?.code ?? "" : "").trim();
    const capabilityCode = capabilityCodes.has(codeCandidate) ? codeCandidate : undefined;
    await logSecurityAdminAudit(this.audit, AuditAction.UPDATE, {
      event: policy.event,
      actorUserId,
      entityType: policy.event === "MEDORA_STAFF_CLASSIFICATION_DENIED" ? "MedoraStaffProfile" : "PlatformCapabilityGrant",
      entityId: targetUserId ?? actorUserId,
      severity: "CRITICAL",
      outcome: "DENIED",
      sourceOperation: policy.sourceOperation,
      denialReason,
      evidence: { ...(targetUserId ? { targetUserId } : {}), ...(capabilityCode ? { capabilityCode } : {}) },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PlatformCapabilityRequirement>(PLATFORM_CAPABILITIES_METADATA, [context.getHandler(), context.getClass()]);
    if (!requirement) throw new ForbiddenException("Platform authorization policy is required");
    const userId = String(context.switchToHttp().getRequest().user?.userId ?? "").trim();
    if (!userId) throw new ForbiddenException("Authentication required");
    const platformAuthority = requirement.allowPlatformPrincipal ? await resolvePlatformAuthority(this.prisma, userId) : null;
    if (platformAuthority?.granted) return true;
    if (!requirement.codes.length) {
      await this.auditMutationDenial(requirement, context.switchToHttp().getRequest(), userId, platformAuthority?.reason ?? "PLATFORM_PRINCIPAL_REQUIRED");
      throw new ForbiddenException("Authoritative platform principal required");
    }
    const resolved = await resolvePlatformCapabilities(this.prisma, userId);
    if (!hasRequiredCapabilities(resolved, requirement.codes, requirement.mode)) throw new ForbiddenException("Required platform capability missing");
    return true;
  }
}
