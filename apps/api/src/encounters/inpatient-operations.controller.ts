/**
 * D3E.7 — Inpatient clinical operations HTTP surface.
 * Facility/actor always derived from JWT — never trusted from client body.
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { InpatientOperationsService } from "./inpatient-operations.service";

function facilityIdFromReq(req: { user?: { facilityId?: string } }): string {
  const facilityId = req.user?.facilityId;
  if (!facilityId || typeof facilityId !== "string") {
    throw new BadRequestException("Facility ID required");
  }
  return facilityId;
}

function userIdFromReq(req: { user?: { userId?: string; id?: string } }): string {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) throw new BadRequestException("User ID required");
  return userId;
}

@Controller("inpatient-operations")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class InpatientOperationsController {
  constructor(private readonly ops: InpatientOperationsService) {}

  @Get("meta")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  meta() {
    return this.ops.meta();
  }

  @Post("direct-admission")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async directAdmission(@Body() body: Record<string, unknown>, @Req() req: any) {
    const patientId = String(body?.patientId ?? "").trim();
    if (!patientId) throw new BadRequestException("patientId is required");
    return this.ops.createDirectAdmission(
      facilityIdFromReq(req),
      userIdFromReq(req),
      {
        patientId,
        admissionSource: typeof body.admissionSource === "string" ? body.admissionSource : "DIRECT",
        admittingService:
          typeof body.admittingService === "string" ? body.admittingService : null,
        attendingProviderUserId:
          typeof body.attendingProviderUserId === "string"
            ? body.attendingProviderUserId
            : null,
        admissionDiagnosis:
          typeof body.admissionDiagnosis === "string" ? body.admissionDiagnosis : null,
        reasonForAdmission:
          typeof body.reasonForAdmission === "string" ? body.reasonForAdmission : null,
        requestedLevelOfCare:
          typeof body.requestedLevelOfCare === "string" ? body.requestedLevelOfCare : null,
        requestedUnit: typeof body.requestedUnit === "string" ? body.requestedUnit : null,
        plannedAt: typeof body.plannedAt === "string" ? body.plannedAt : null,
        isolationRequired: body.isolationRequired === true,
        isolationType: typeof body.isolationType === "string" ? body.isolationType : null,
        codeStatus: typeof body.codeStatus === "string" ? body.codeStatus : null,
        notes: typeof body.notes === "string" ? body.notes : null,
        referringProviderOrFacility:
          typeof body.referringProviderOrFacility === "string"
            ? body.referringProviderOrFacility
            : null,
      },
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  @Get("encounters/:encounterId/clinical-ops")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async getClinicalOps(@Param("encounterId") encounterId: string, @Req() req: any) {
    return this.ops.getClinicalOps(facilityIdFromReq(req), encounterId);
  }

  @Patch("encounters/:encounterId/clinical-ops")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async patchClinicalOps(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    return this.ops.patchClinicalOps(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      body as never,
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }
}
