import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { PrismaService } from "../prisma/prisma.service";
import { PLATFORM_CAPABILITIES_METADATA, type PlatformCapabilityRequirement } from "./platform-capabilities.decorator";
import { hasRequiredCapabilities, resolvePlatformCapabilities } from "./platform-capability.resolver";

@Injectable()
export class PlatformCapabilitiesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PlatformCapabilityRequirement>(PLATFORM_CAPABILITIES_METADATA, [context.getHandler(), context.getClass()]);
    if (!requirement) throw new ForbiddenException("Platform authorization policy is required");
    const userId = String(context.switchToHttp().getRequest().user?.userId ?? "").trim();
    if (!userId) throw new ForbiddenException("Authentication required");
    if (requirement.allowPlatformPrincipal && (await resolvePlatformAuthority(this.prisma, userId)).granted) return true;
    if (!requirement.codes.length) throw new ForbiddenException("Authoritative platform principal required");
    const resolved = await resolvePlatformCapabilities(this.prisma, userId);
    if (!hasRequiredCapabilities(resolved, requirement.codes, requirement.mode)) throw new ForbiddenException("Required platform capability missing");
    return true;
  }
}
