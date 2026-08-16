import { Injectable } from "@nestjs/common";
import {
  D4C10D_CERTIFICATION_ID,
  dentalWorklistServiceLineWhere,
  dedupeWorklistRowsByEncounterId,
  isDentalWorklistEncounter,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ENCOUNTER_LIST_SELECT } from "../encounters/encounter-query-contracts";
import { toEncounterClinicResponse } from "../encounters/encounter-response.util";

/**
 * MEDUI.D5A.3 / D4C.10D — Dental worklist projection over enterprise Encounter rows.
 * OPEN Dental-routed encounters only (serviceLine + legacy tag fallback).
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
        // MEDUI.D4C.10D — prefilter Dental + null legacy; then assert Dental projection.
        ...dentalWorklistServiceLineWhere(),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: ENCOUNTER_LIST_SELECT,
    });

    const dental = dedupeWorklistRowsByEncounterId(
      encounters.filter((e) =>
        isDentalWorklistEncounter({
          id: e.id,
          type: e.type,
          status: e.status,
          serviceLine: e.serviceLine,
          nursingAssessment: e.nursingAssessment,
          admissionSummaryJson: e.admissionSummaryJson,
        })
      )
    );

    return {
      certificationId: D4C10D_CERTIFICATION_ID,
      items: dental.map((e) => toEncounterClinicResponse(e)),
    };
  }
}
