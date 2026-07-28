import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  parseStoredFacilityServiceLines,
  resolveClinicCareWorkspaceRoleAccess,
  resolveFacilityModuleCapabilitiesD4c1,
  resolveFacilityServiceLines,
  resolveProfessionGroup,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

/**
 * MEDUI.D4C.2 — Clinic Care trackboard read access.
 * Requires facility membership + canAccessClinicTrackboardProjection.
 */
@Injectable()
export class ClinicCareReadAccessGuard implements CanActivate {
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
            timezone: true,
            name: true,
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
    const facilityCountry = facility?.country ?? null;
    const facilityServiceLines = resolveFacilityServiceLines({
      facilityType,
      configuredServiceLines: parseStoredFacilityServiceLines(facility?.serviceLinesJson),
    });
    const moduleCapabilities = resolveFacilityModuleCapabilitiesD4c1({
      facilityType,
      careProfileJson: facility?.facilityCareProfileJson,
      serviceLines: facilityServiceLines,
      facilityCountry,
    });
    const professionGroup = resolveProfessionGroup({ roleCodes });
    const access = resolveClinicCareWorkspaceRoleAccess({
      professionGroup,
      moduleCapabilities,
      roleCodes,
      facilityCountry,
    });

    if (!access.canAccessClinicTrackboardProjection) {
      throw new ForbiddenException("Clinic Care trackboard access denied for this role.");
    }

    request.facilityId = facilityId;
    request.user = request.user || {};
    request.user.facilityId = facilityId;
    request.clinicCareAccess = access;
    request.clinicCareProfessionGroup = professionGroup;
    request.clinicCareRoleCodes = roleCodes;
    request.clinicCareFacility = facility;
    request.clinicCareModuleCapabilities = moduleCapabilities;
    request.clinicCareServiceLines = facilityServiceLines;
    request.clinicCareFacilityCountry = facilityCountry;

    return true;
  }
}
