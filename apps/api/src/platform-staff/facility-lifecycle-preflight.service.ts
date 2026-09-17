import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FacilityLifecyclePreflightService {
  constructor(private readonly prisma: PrismaService) {}

  async get(facilityId: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, name: true, isActive: true },
    });
    if (!facility) throw new NotFoundException("Facility not found");

    const [openEncounters, activeAssignments, pendingPrivilegedActions] = await Promise.all([
      this.prisma.encounter.count({ where: { facilityId, status: "OPEN" } }),
      this.prisma.userRole.count({ where: { facilityId, isActive: true } }),
      this.prisma.privilegedActionRequest.count({
        where: {
          targetFacilityId: facilityId,
          operationType: "FACILITY_ACTIVATION_CHANGE",
          status: { in: ["PENDING", "APPROVED"] },
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return {
      facility: { id: facility.id, name: facility.name, isActive: facility.isActive },
      deactivation: {
        nonDestructive: true,
        openEncounters,
        activeAssignments,
        pendingPrivilegedActions,
        warnings: [
          ...(openEncounters > 0 ? ["OPEN_ENCOUNTERS_PRESENT"] : []),
          ...(activeAssignments > 0 ? ["ACTIVE_USER_ASSIGNMENTS_PRESENT"] : []),
          ...(pendingPrivilegedActions > 0 ? ["LIFECYCLE_REQUEST_ALREADY_PENDING"] : []),
        ],
      },
    };
  }
}
