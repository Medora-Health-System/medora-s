import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import {
  resolveFacilityModuleCapabilitiesD4c1,
  parseStoredFacilityServiceLines,
  resolveFacilityServiceLines,
  canReadFreestandingErObservationPatients,
  canReadFreestandingErTrackboard,
  hasStandardTrackboardClinicalRole,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

const STANDARD_TRACKBOARD_ROLE_CODES: RoleCode[] = [
  RoleCode.FRONT_DESK,
  RoleCode.RN,
  RoleCode.PROVIDER,
  RoleCode.ADMIN,
];

@Injectable()
export class TrackboardReadAccessGuard implements CanActivate {
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
        department: { select: { code: true } },
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
    const primary = memberships[0]!;
    const facility = primary.facility;
    const facilityType = facility?.facilityType ?? "CLINIC";
    const facilityServiceLines = resolveFacilityServiceLines({
      facilityType,
      configuredServiceLines: parseStoredFacilityServiceLines(facility?.serviceLinesJson),
    });
    /** MEDUI.D4C.2A — ED trackboard requires edEnabled (Admin cannot override Clinic-only). */
    const capabilities = resolveFacilityModuleCapabilitiesD4c1({
      facilityType,
      careProfileJson: facility?.facilityCareProfileJson,
      serviceLines: facilityServiceLines,
      facilityCountry: facility?.country ?? null,
    });
    const encounterTypeQuery = String(request.query?.type ?? "")
      .trim()
      .toUpperCase();
    const inpatientBoard = encounterTypeQuery === "INPATIENT";
    if (inpatientBoard) {
      if (!capabilities.observationEnabled && !capabilities.inpatientEnabled) {
        throw new ForbiddenException(
          "Hospital / Observation trackboard is not enabled for this facility."
        );
      }
    } else if (!capabilities.edEnabled) {
      throw new ForbiddenException("Emergency trackboard is not enabled for this facility.");
    }

    const departmentCode =
      memberships.find((row) => row.department?.code)?.department?.code ?? null;

    request.facilityId = facilityId;
    request.user = request.user || {};
    request.user.facilityId = facilityId;
    request.userRole = primary.role.code;
    request.trackboardObservationPatientsOnly = false;

    if (hasStandardTrackboardClinicalRole(roleCodes)) {
      const standardMembership = memberships.find((row) =>
        STANDARD_TRACKBOARD_ROLE_CODES.includes(row.role.code)
      );
      if (standardMembership) {
        request.userRole = standardMembership.role.code;
      }
      return true;
    }

    const technicianInput = {
      roleCodes,
      facilityType,
      facilityServiceLines,
      departmentCode,
    };

    const allowed = inpatientBoard
      ? canReadFreestandingErObservationPatients(technicianInput)
      : canReadFreestandingErTrackboard(technicianInput);

    if (!allowed) {
      throw new ForbiddenException("Access denied. Required roles: FRONT_DESK, RN, PROVIDER, ADMIN");
    }

    if (inpatientBoard) {
      request.trackboardObservationPatientsOnly = true;
    }

    return true;
  }
}
