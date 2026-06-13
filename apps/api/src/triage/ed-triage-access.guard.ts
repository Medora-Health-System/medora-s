import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CanActivate } from "@nestjs/common";
import { canDocumentEdTriage } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Encounter-scoped triage access (MEDUI.ED.ROLE.1A).
 * Replaces flat @RequireRoles(RN, PROVIDER, ADMIN) for ED triage endpoints.
 */
@Injectable()
export class EdTriageAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const rawFacilityId = request.user?.facilityId || request.headers["x-facility-id"];
    const facilityId =
      typeof rawFacilityId === "string"
        ? rawFacilityId
        : Array.isArray(rawFacilityId)
          ? rawFacilityId[0]
          : "";
    const encounterId = request.params?.id;

    if (!userId) {
      throw new ForbiddenException("Authentication required");
    }
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    if (!encounterId || typeof encounterId !== "string") {
      throw new BadRequestException("Encounter ID required");
    }

    const memberships = await this.prisma.userRole.findMany({
      where: {
        userId,
        facilityId,
        isActive: true,
        facility: { isActive: true },
      },
      include: { role: true },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException("Access denied for this facility.");
    }

    const roleCodes = memberships.map((row) => row.role.code);

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { type: true },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (
      canDocumentEdTriage({
        roleCodes,
        encounterType: encounter.type,
      })
    ) {
      request.userRole = memberships[0]!.role.code;
      request.facilityId = facilityId;
      request.user = request.user || {};
      request.user.facilityId = facilityId;
      return true;
    }

    throw new ForbiddenException("Access denied. Required roles: RN, PROVIDER, ADMIN");
  }
}
