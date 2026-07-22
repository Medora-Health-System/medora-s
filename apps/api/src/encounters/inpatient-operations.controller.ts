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
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
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
        assignedBedKey: typeof body.assignedBedKey === "string" ? body.assignedBedKey : null,
        sourceEdEncounterId:
          typeof body.sourceEdEncounterId === "string" ? body.sourceEdEncounterId : null,
        idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : null,
        admissionCorrelationId:
          typeof body.admissionCorrelationId === "string" ? body.admissionCorrelationId : null,
        internalPlacementRequestId:
          typeof body.internalPlacementRequestId === "string"
            ? body.internalPlacementRequestId
            : null,
        admittedAt: typeof body.admittedAt === "string" ? body.admittedAt : null,
        sourceObservationEncounterId:
          typeof body.sourceObservationEncounterId === "string"
            ? body.sourceObservationEncounterId
            : null,
        medicationTransitionAction:
          typeof body.medicationTransitionAction === "string"
            ? body.medicationTransitionAction
            : null,
      },
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  @Post("observation/:encounterId/convert-to-inpatient")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async convertObservationToInpatient(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const medicationTransitionAction = String(body?.medicationTransitionAction ?? "").trim();
    if (!medicationTransitionAction) {
      throw new BadRequestException("medicationTransitionAction is required");
    }
    return this.ops.convertObservationToInpatient(
      facilityIdFromReq(req),
      userIdFromReq(req),
      {
        sourceObservationEncounterId: encounterId,
        requestedUnit: typeof body.requestedUnit === "string" ? body.requestedUnit : null,
        requestedLevelOfCare:
          typeof body.requestedLevelOfCare === "string" ? body.requestedLevelOfCare : null,
        admissionDiagnosis:
          typeof body.admissionDiagnosis === "string" ? body.admissionDiagnosis : null,
        reasonForAdmission:
          typeof body.reasonForAdmission === "string" ? body.reasonForAdmission : null,
        requestedAdmissionAt:
          typeof body.requestedAdmissionAt === "string" ? body.requestedAdmissionAt : null,
        assignedBedKey: typeof body.assignedBedKey === "string" ? body.assignedBedKey : null,
        idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : null,
        medicationTransitionAction,
        expectedVersion:
          body.expectedVersion != null && Number.isFinite(Number(body.expectedVersion))
            ? Number(body.expectedVersion)
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

  /** D4A.1 — Med/Surg nursing admission documentation (longitudinal preload + verification). */
  @Get("encounters/:encounterId/nursing-admission")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async getNursingAdmission(@Param("encounterId") encounterId: string, @Req() req: any) {
    return this.ops.getNursingAdmissionDocumentation(facilityIdFromReq(req), encounterId);
  }

  @Patch("encounters/:encounterId/nursing-admission/sections")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async patchNursingAdmissionSection(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const sectionId = String(body.sectionId ?? "").trim();
    if (!sectionId) throw new BadRequestException("sectionId is required");
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.patchNursingAdmissionSection(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        sectionId,
        draftText: typeof body.draftText === "string" ? body.draftText : null,
        completionState: typeof body.completionState === "string" ? body.completionState : null,
        expectedVersion,
      }
    );
  }

  @Post("encounters/:encounterId/nursing-admission/verify-preload")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async verifyNursingAdmissionPreload(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const itemId = String(body.itemId ?? "").trim();
    const status = String(body.status ?? "").trim();
    const expectedVersion = Number(body.expectedVersion);
    if (!itemId) throw new BadRequestException("itemId is required");
    if (!status) throw new BadRequestException("status is required");
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.verifyNursingAdmissionPreloadItem(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        itemId,
        status,
        encounterNote: typeof body.encounterNote === "string" ? body.encounterNote : null,
        expectedVersion,
      }
    );
  }

  @Post("encounters/:encounterId/nursing-admission/sign")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async signNursingAdmission(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.signNursingAdmission(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        expectedVersion,
        credentials: typeof body.credentials === "string" ? body.credentials : null,
        displayName: typeof body.displayName === "string" ? body.displayName : null,
        createProviderHandoff: body.createProviderHandoff !== false,
      }
    );
  }
}
