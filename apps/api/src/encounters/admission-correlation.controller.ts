/**
 * D3E.8 — Admission correlation diagnostics / meta (read-oriented).
 * Correlation writes remain on admission/placement pathways.
 */

import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { AdmissionCorrelationService } from "./admission-correlation.service";
import { PrismaService } from "../prisma/prisma.service";
import { readHospitalAdmissionCorrelation } from "@medora/shared";

function facilityIdFromReq(req: any): string {
  return String(req?.user?.facilityId ?? "").trim();
}

@Controller("admission-correlation")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdmissionCorrelationController {
  constructor(
    private readonly correlation: AdmissionCorrelationService,
    private readonly prisma: PrismaService
  ) {}

  @Get("meta")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  meta() {
    return this.correlation.meta();
  }

  @Get("encounters/:encounterId/journey")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async journey(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        hospitalEpisodeId: true,
        admissionSummaryJson: true,
        admittedAt: true,
        status: true,
        type: true,
      },
    });
    if (!enc) {
      return { found: false, journey: null, findings: [] };
    }
    const corr = readHospitalAdmissionCorrelation(enc.admissionSummaryJson);
    const findings = this.correlation.diagnose({
      correlation: corr,
      receivingEncounter: {
        id: enc.id,
        patientId: enc.patientId,
        facilityId: enc.facilityId,
        hospitalEpisodeId: enc.hospitalEpisodeId,
        admissionSummaryJson: enc.admissionSummaryJson,
      },
    });
    return {
      found: true,
      journey: {
        admissionSource: corr?.admissionSource ?? null,
        sourceEncounterId: corr?.sourceEncounterId ?? null,
        placementRequestId: corr?.internalPlacementRequestId ?? null,
        receivingStatus: corr?.status ?? null,
        receivingUnit: corr?.destinationUnitId ?? null,
        receivingEncounterStatus: enc.status,
        arrivalTime: corr?.arrivedAt ?? enc.admittedAt?.toISOString() ?? null,
        diagnostics: {
          correlationStatus: corr?.status ?? null,
          linkageHealthy: findings.every((f) => f.severity !== "HARD_ERROR"),
        },
      },
      findings,
    };
  }
}
