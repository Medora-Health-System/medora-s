import { Injectable } from "@nestjs/common";
import { isDentalEncounterProjection } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ENCOUNTER_LIST_SELECT } from "../encounters/encounter-query-contracts";
import { toEncounterClinicResponse } from "../encounters/encounter-response.util";

/**
 * MEDUI.D5A.3 — Dental worklist projection over enterprise Encounter rows.
 * Filters OPEN encounters tagged with dentalServiceLineV1 (zero-schema).
 */
@Injectable()
export class DentalCareWorklistService {
  constructor(private readonly prisma: PrismaService) {}

  async listOpenDentalEncounters(facilityId: string) {
    const encounters = await this.prisma.encounter.findMany({
      where: {
        facilityId,
        status: "OPEN",
        type: "OUTPATIENT",
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: ENCOUNTER_LIST_SELECT,
    });

    const dental = encounters.filter((e) =>
      isDentalEncounterProjection({
        type: e.type,
        nursingAssessment: e.nursingAssessment,
        admissionSummaryJson: e.admissionSummaryJson,
      })
    );

    return {
      certificationId: "MEDUI.D5A.3",
      items: dental.map((e) => toEncounterClinicResponse(e)),
    };
  }
}
