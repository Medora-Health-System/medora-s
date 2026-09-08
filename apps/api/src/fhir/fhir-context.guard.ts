import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JurisdictionProfileRegistry } from "./jurisdiction-profile.registry";

export type FhirRequestContext = { actorType: "human"; actorId: string; facilityId: string; role?: string; scopes: readonly string[]; jurisdiction: string; profiles: readonly string[]; correlationId: string };

@Injectable()
export class FhirDeploymentGuard implements CanActivate {
  canActivate(): boolean {
    if ((process.env.MEDORA_INTEROP_ENABLED ?? "false").trim().toLowerCase() !== "true") throw new NotFoundException("Resource not found");
    return true;
  }
}

@Injectable()
export class FhirContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly profiles: JurisdictionProfileRegistry) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const actorId = String(req.user?.userId ?? "");
    const tokenFacility = String(req.user?.facilityId ?? req.facilityId ?? "");
    const headerFacility = typeof req.headers["x-facility-id"] === "string" ? req.headers["x-facility-id"].trim() : "";
    if (!actorId) throw new ForbiddenException("Authentication required");
    if (!tokenFacility) throw new BadRequestException("Facility context required");
    if (headerFacility && headerFacility !== tokenFacility) throw new ForbiddenException("Conflicting facility context");
    if (req.headers["x-jurisdiction"] || req.query?.jurisdiction || req.query?.country) throw new BadRequestException("Jurisdiction is server controlled");
    const membership = await this.prisma.userRole.findFirst({ where: { userId: actorId, facilityId: tokenFacility, isActive: true, facility: { isActive: true } }, include: { role: true, facility: { select: { country: true } } } });
    if (!membership) throw new ForbiddenException("Access denied for this facility");
    const effective = this.profiles.resolve(membership.facility.country);
    req.fhirContext = { actorType: "human", actorId, facilityId: tokenFacility, role: membership.role.code, scopes: [], jurisdiction: membership.facility.country, profiles: effective.map((p) => p.packageId), correlationId: String(req.requestId ?? "") } satisfies FhirRequestContext;
    return true;
  }
}
