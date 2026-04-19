import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** Requires an active `UserRole` at the request facility (any role). Used for break-glass start/end. */
@Injectable()
export class FacilityMembershipGuard implements CanActivate {
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

    if (!userId) {
      throw new ForbiddenException("Authentication required");
    }
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const membership = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId,
        isActive: true,
        facility: { isActive: true },
      },
    });

    if (!membership) {
      throw new ForbiddenException("Access denied for this facility.");
    }

    request.facilityId = facilityId;
    request.user = request.user || {};
    request.user.facilityId = facilityId;
    return true;
  }
}
