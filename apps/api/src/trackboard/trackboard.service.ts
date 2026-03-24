import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EncounterStatus, EncounterType } from "@prisma/client";

@Injectable()
export class TrackboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveEncounters(facilityId: string, status?: string, type?: string) {
    const where: any = {
      facilityId,
      status: status === "OPEN" ? EncounterStatus.OPEN : undefined,
    };

    if (type === "INPATIENT") {
      where.type = EncounterType.INPATIENT;
    }

    // Filter to today's encounters if status is OPEN (routine trackboard), not for INPATIENT board
    if (status === "OPEN" && type !== "INPATIENT") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.createdAt = {
        gte: today,
      };
    }

    return this.prisma.encounter.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dob: true,
            sexAtBirth: true,
            mrn: true,
          },
        },
        physicianAssigned: {
          select: { id: true, firstName: true, lastName: true },
        },
        triage: {
          select: {
            esi: true,
            chiefComplaint: true,
            triageCompleteAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });
  }
}

