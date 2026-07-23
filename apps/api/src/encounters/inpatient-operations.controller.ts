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
import { InpatientLifecycleService } from "./inpatient-lifecycle.service";

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
  constructor(
    private readonly ops: InpatientOperationsService,
    private readonly lifecycle: InpatientLifecycleService
  ) {}

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
        draftText: typeof body.draftText === "string" ? body.draftText : undefined,
        answers:
          body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
            ? (body.answers as Record<string, unknown>)
            : undefined,
        unableReason: typeof body.unableReason === "string" ? body.unableReason : undefined,
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

  /** D4A.2.5 — Nursing admission review (incomplete sections + warnings). */
  @Get("encounters/:encounterId/nursing-admission/review")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async reviewNursingAdmission(@Param("encounterId") encounterId: string, @Req() req: any) {
    return this.ops.reviewNursingAdmissionDocumentation(
      facilityIdFromReq(req),
      encounterId
    );
  }

  /** D4A.2.5A — Link enterprise domain record into nursing admission orchestration. */
  @Post("encounters/:encounterId/nursing-admission/domain-references")
  @RequireRoles(RoleCode.RN, RoleCode.ADMIN)
  async linkNursingDomainReference(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    const reference = body.reference;
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
      throw new BadRequestException("reference is required");
    }
    return this.ops.linkNursingAdmissionDomainReference(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      { reference: reference as any, expectedVersion }
    );
  }

  /** D4A.2.5A — Post-sign addendum / correction / entered-in-error (RN only). */
  @Post("encounters/:encounterId/nursing-admission/amendments")
  @RequireRoles(RoleCode.RN)
  async createNursingAmendment(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const expectedVersion = Number(body.expectedVersion);
    const clientRequestId = String(body.clientRequestId ?? "").trim();
    const type = String(body.type ?? "").trim();
    const reason = String(body.reason ?? "").trim();
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    if (!clientRequestId) throw new BadRequestException("clientRequestId is required");
    if (!type) throw new BadRequestException("type is required");
    if (!reason) throw new BadRequestException("reason is required");
    const roles = Array.isArray(req.user?.roles)
      ? req.user.roles.map((r: unknown) => String(r))
      : Array.isArray(req.user?.roleCodes)
        ? req.user.roleCodes.map((r: unknown) => String(r))
        : ["RN"];
    return this.ops.createNursingAdmissionAmendment(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      roles,
      {
        type,
        clientRequestId,
        reason,
        note: typeof body.note === "string" ? body.note : null,
        sectionId: typeof body.sectionId === "string" ? body.sectionId : null,
        originalValue: body.originalValue,
        correctedValue: body.correctedValue,
        linkedDomainRecordIds: Array.isArray(body.linkedDomainRecordIds)
          ? body.linkedDomainRecordIds.map(String)
          : [],
        expectedVersion,
        expectedAmendmentVersion:
          body.expectedAmendmentVersion != null
            ? Number(body.expectedAmendmentVersion)
            : undefined,
        credentials: typeof body.credentials === "string" ? body.credentials : null,
      }
    );
  }

  /** D4A.2.5A — Dedicated Nursing Admission Summary (authoritative server load + audit). */
  @Get("encounters/:encounterId/nursing-admission/print-summary")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async nursingAdmissionPrintSummary(
    @Param("encounterId") encounterId: string,
    @Req() req: any
  ) {
    const requestId =
      typeof req.headers?.["x-request-id"] === "string"
        ? req.headers["x-request-id"]
        : null;
    return this.ops.getNursingAdmissionPrintSummary(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      requestId
    );
  }

  /** D4A.2.6H — Provider/nursing authoritative clinical projection (no synthetic sources). */
  @Get("encounters/:encounterId/authoritative-clinical-projection")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async authoritativeClinicalProjection(
    @Param("encounterId") encounterId: string,
    @Req() req: any
  ) {
    return this.ops.getInpatientAuthoritativeClinicalProjection(
      facilityIdFromReq(req),
      encounterId
    );
  }

  @Get("encounters/:encounterId/lifecycle")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async getLifecycle(@Param("encounterId") encounterId: string, @Req() req: any) {
    return this.lifecycle.getEncounterLifecycle(facilityIdFromReq(req), encounterId);
  }

  @Post("encounters/:encounterId/lifecycle/edit-admission")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.RN)
  async editAdmission(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const editReason = String(body.editReason ?? "").trim();
    if (!editReason) throw new BadRequestException("editReason is required");
    return this.lifecycle.editAdmissionDetails(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        admittedAt: typeof body.admittedAt === "string" ? body.admittedAt : null,
        admissionSource: typeof body.admissionSource === "string" ? body.admissionSource : null,
        admittingService: typeof body.admittingService === "string" ? body.admittingService : null,
        requestedLevelOfCare:
          typeof body.requestedLevelOfCare === "string" ? body.requestedLevelOfCare : null,
        attendingProviderUserId:
          typeof body.attendingProviderUserId === "string" ? body.attendingProviderUserId : null,
        admissionDiagnosis:
          typeof body.admissionDiagnosis === "string" ? body.admissionDiagnosis : null,
        reasonForAdmission:
          typeof body.reasonForAdmission === "string" ? body.reasonForAdmission : null,
        editReason,
      },
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  @Post("encounters/:encounterId/lifecycle/transfer-bed")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async transferBed(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const toBedKey = String(body.toBedKey ?? "").trim();
    const reason = String(body.reason ?? "").trim();
    if (!toBedKey) throw new BadRequestException("toBedKey is required");
    if (!reason) throw new BadRequestException("reason is required");
    return this.lifecycle.transferBed(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        toBedKey,
        reason,
        effectiveAt: typeof body.effectiveAt === "string" ? body.effectiveAt : null,
      },
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  @Post("encounters/:encounterId/lifecycle/discharge")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async discharge(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const disposition = String(body.disposition ?? "").trim();
    if (!disposition) throw new BadRequestException("disposition is required");
    return this.lifecycle.dischargeEncounter(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        disposition,
        dischargedAt: typeof body.dischargedAt === "string" ? body.dischargedAt : null,
        condition: typeof body.condition === "string" ? body.condition : null,
        destination: typeof body.destination === "string" ? body.destination : null,
        responsibleProviderUserId:
          typeof body.responsibleProviderUserId === "string"
            ? body.responsibleProviderUserId
            : null,
        nursingDischargeComplete: body.nursingDischargeComplete === true,
        instructionsStatus:
          typeof body.instructionsStatus === "string" ? body.instructionsStatus : null,
        medReconStatus: typeof body.medReconStatus === "string" ? body.medReconStatus : null,
        followUpStatus: typeof body.followUpStatus === "string" ? body.followUpStatus : null,
        note: typeof body.note === "string" ? body.note : null,
      },
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  @Post("encounters/:encounterId/lifecycle/cancel-admission")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async cancelAdmission(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const reasonCode = String(body.reasonCode ?? "").trim();
    const explanation = String(body.explanation ?? "").trim();
    if (!reasonCode) throw new BadRequestException("reasonCode is required");
    if (!explanation) throw new BadRequestException("explanation is required");
    return this.lifecycle.cancelAdmission(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      { reasonCode, explanation },
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  @Post("encounters/:encounterId/lifecycle/void-encounter")
  @RequireRoles(RoleCode.ADMIN)
  async voidEncounter(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const reason = String(body.reason ?? "").trim();
    if (!reason) throw new BadRequestException("reason is required");
    return this.lifecycle.voidEncounter(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        reason,
        confirm: body.confirm === true,
        adminOverride: body.adminOverride === true,
      },
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  /** D4A.2.6 — Provider clinical workspace (events, problem plans, H&P draft, tasks). */
  @Get("encounters/:encounterId/provider-workspace")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async getProviderWorkspace(@Param("encounterId") encounterId: string, @Req() req: any) {
    return this.ops.getProviderWorkspace(facilityIdFromReq(req), encounterId);
  }

  @Post("encounters/:encounterId/provider-workspace/events/acknowledge")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async acknowledgeProviderEvent(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const eventId = String(body.eventId ?? "").trim();
    const status = String(body.status ?? "").trim();
    const expectedVersion = Number(body.expectedVersion);
    if (!eventId) throw new BadRequestException("eventId is required");
    if (!status) throw new BadRequestException("status is required");
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.acknowledgeProviderWorkspaceEvent(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        eventId,
        status,
        actionTaken: typeof body.actionTaken === "string" ? body.actionTaken : null,
        expectedVersion,
      }
    );
  }

  @Post("encounters/:encounterId/provider-workspace/problem-plans")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async upsertProviderProblemPlan(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    const item = body.item;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new BadRequestException("item is required");
    }
    return this.ops.upsertProviderProblemPlanItem(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        item: item as any,
        expectedVersion,
      }
    );
  }

  @Patch("encounters/:encounterId/provider-workspace/hp")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async saveProviderHp(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const sectionKey = String(body.sectionKey ?? "").trim();
    const expectedVersion = Number(body.expectedVersion);
    if (!sectionKey) throw new BadRequestException("sectionKey is required");
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.saveProviderHpSectionDraft(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        sectionKey,
        text: typeof body.text === "string" ? body.text : null,
        structured:
          body.structured && typeof body.structured === "object" && !Array.isArray(body.structured)
            ? (body.structured as Record<string, unknown>)
            : null,
        expectedVersion,
      }
    );
  }

  @Post("encounters/:encounterId/provider-workspace/hp/sign")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async signProviderHp(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.signProviderHp(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      { expectedVersion }
    );
  }

  /** D4A.2.6A — Live enterprise provider clinical synthesis (read projection). */
  @Get("encounters/:encounterId/provider-clinical-synthesis")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async getProviderClinicalSynthesis(
    @Param("encounterId") encounterId: string,
    @Req() req: any
  ) {
    return this.ops.getProviderClinicalSynthesis(facilityIdFromReq(req), encounterId);
  }

  @Patch("encounters/:encounterId/provider-workspace/progress-notes")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async saveProviderProgressNote(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    const note = body.note;
    if (!note || typeof note !== "object" || Array.isArray(note)) {
      throw new BadRequestException("note is required");
    }
    return this.ops.saveProviderProgressNote(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      { note: note as any, expectedVersion }
    );
  }

  @Post("encounters/:encounterId/provider-workspace/progress-notes/sign")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async signProviderProgressNote(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const noteId = String(body.noteId ?? "").trim();
    const expectedVersion = Number(body.expectedVersion);
    if (!noteId) throw new BadRequestException("noteId is required");
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.signProviderProgressNoteDoc(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      { noteId, expectedVersion }
    );
  }

  @Post("encounters/:encounterId/provider-workspace/progress-notes/carry-forward")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async carryForwardProviderProgressNote(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const fromNoteId = String(body.fromNoteId ?? "").trim();
    const serviceDate = String(body.serviceDate ?? "").trim();
    const expectedVersion = Number(body.expectedVersion);
    if (!fromNoteId) throw new BadRequestException("fromNoteId is required");
    if (!serviceDate) throw new BadRequestException("serviceDate is required");
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.carryForwardProviderProgressNote(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      { fromNoteId, serviceDate, expectedVersion }
    );
  }

  @Get("encounters/:encounterId/provider-print-package/:kind")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async getProviderPrintPackage(
    @Param("encounterId") encounterId: string,
    @Param("kind") kind: string,
    @Req() req: any
  ) {
    return this.ops.getProviderPrintPackage(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      kind
    );
  }

  @Get("encounters/:encounterId/command-center-clinical-synthesis")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async commandCenterClinicalSynthesis(
    @Param("encounterId") encounterId: string,
    @Req() req: any
  ) {
    return this.ops.getCommandCenterClinicalSynthesis(
      facilityIdFromReq(req),
      encounterId
    );
  }

  @Get("provider-census/facets")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  providerCensusFacets() {
    return this.ops.getProviderCensusFacets();
  }

  @Post("encounters/:encounterId/provider-workspace/amendments")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async appendProviderAmendment(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const clientRequestId = String(body.clientRequestId ?? "").trim();
    const type = String(body.type ?? "").trim();
    const target = String(body.target ?? "").trim();
    const reason = String(body.reason ?? "").trim();
    const expectedVersion = Number(body.expectedVersion);
    if (!clientRequestId) throw new BadRequestException("clientRequestId is required");
    if (!type) throw new BadRequestException("type is required");
    if (!target) throw new BadRequestException("target is required");
    if (!reason) throw new BadRequestException("reason is required");
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.appendProviderAmendment(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      {
        type,
        target,
        clientRequestId,
        reason,
        note: typeof body.note === "string" ? body.note : null,
        targetNoteId: typeof body.targetNoteId === "string" ? body.targetNoteId : null,
        sectionKey: typeof body.sectionKey === "string" ? body.sectionKey : null,
        originalValue: body.originalValue,
        correctedValue: body.correctedValue,
        expectedVersion,
        expectedAmendmentVersion:
          body.expectedAmendmentVersion != null
            ? Number(body.expectedAmendmentVersion)
            : undefined,
        credentials: typeof body.credentials === "string" ? body.credentials : null,
        role: typeof body.role === "string" ? body.role : null,
      }
    );
  }

  @Patch("encounters/:encounterId/provider-workspace/handoff")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async saveProviderHandoff(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const expectedVersion = Number(body.expectedVersion);
    const handoff = body.handoff;
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) {
      throw new BadRequestException("handoff is required");
    }
    return this.ops.saveProviderHandoffDoc(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      { handoff: handoff as any, expectedVersion }
    );
  }

  @Post("encounters/:encounterId/provider-workspace/handoff/sign")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async signProviderHandoff(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.signProviderHandoffDoc(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      { expectedVersion }
    );
  }

  @Post("encounters/:encounterId/provider-workspace/handoff/acknowledge")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async acknowledgeProviderHandoff(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isFinite(expectedVersion)) {
      throw new BadRequestException("expectedVersion is required");
    }
    return this.ops.acknowledgeProviderHandoffDoc(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      { expectedVersion }
    );
  }
}
