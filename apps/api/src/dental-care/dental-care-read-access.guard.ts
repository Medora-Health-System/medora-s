import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  parseStoredFacilityServiceLines,
  resolveDentalSpecialtiesFromCareProfile,
  resolveDentalWorkspaceAccess,
  resolveFacilityModuleCapabilitiesD4c1,
  resolveFacilityServiceLines,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

/**
 * MEDUI.D5A.2 — Dental Care read access.
 * Requires facility membership + DENTAL service line + DENTAL_VIEW capability.
 * Admin cannot bypass a facility without the Dental service line.
 */
@Injectable()
export class DentalCareReadAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId as string | undefined;
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

    const memberships = await this.prisma.userRole.findMany({
      where: {
        userId,
        facilityId,
        isActive: true,
        facility: { isActive: true },
      },
      include: {
        role: true,
        facility: {
          select: {
            facilityType: true,
            serviceLinesJson: true,
            facilityCareProfileJson: true,
            country: true,
          },
        },
      },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException("Access denied for this facility.");
    }

    const roleCodes = memberships.map((row) => row.role.code);
    const facility = memberships[0]!.facility;
    const facilityType = facility?.facilityType ?? "CLINIC";
    const facilityServiceLines = resolveFacilityServiceLines({
      facilityType,
      configuredServiceLines: parseStoredFacilityServiceLines(facility?.serviceLinesJson),
    });
    const moduleCapabilities = resolveFacilityModuleCapabilitiesD4c1({
      facilityType,
      careProfileJson: facility?.facilityCareProfileJson,
      serviceLines: facilityServiceLines,
      facilityCountry: facility?.country ?? null,
    });

    if (!moduleCapabilities.dentalCareEnabled) {
      throw new ForbiddenException("Dental Care is not enabled for this facility.");
    }

    const specialties = resolveDentalSpecialtiesFromCareProfile(facility?.facilityCareProfileJson);
    const access = resolveDentalWorkspaceAccess({
      roleCodes,
      dentalCareEnabled: true,
      specialties,
    });

    if (!access.canAccessDentalShell) {
      throw new ForbiddenException("You do not have Dental Care access for this facility.");
    }

    request.dentalCareAccess = access;
    request.dentalCareRoleCodes = roleCodes;
    return true;
  }
}
