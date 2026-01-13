import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EncounterStatus } from "@prisma/client";

@Injectable()
export class TrackboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveEncounters(facilityId: string, status?: string) {
    const where: any = {
      facilityId,
      status: status === "OPEN" ? EncounterStatus.OPEN : undefined,
    };

    // Filter to today's encounters if status is OPEN
    if (status === "OPEN") {
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

