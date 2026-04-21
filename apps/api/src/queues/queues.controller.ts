import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { QueuesService } from "./queues.service";
import { ClaimBuilderService } from "../billing/claim-builder.service";
import { ClaimExportService } from "../billing/claim-export.service";
import { X12837GeneratorService } from "../billing/x12-837-generator.service";
import { ClaimSubmissionService } from "../billing/claim-submission.service";
import { ClaimTransmissionService } from "../billing/claim-transmission.service";
import { ClaimAcknowledgmentService } from "../billing/claim-acknowledgment.service";
import { RoleCode, OrderStatus } from "@prisma/client";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class QueuesController {
  constructor(
    private readonly queuesService: QueuesService,
    private readonly claimBuilderService: ClaimBuilderService,
    private readonly claimExportService: ClaimExportService,
    private readonly x12837GeneratorService: X12837GeneratorService,
    private readonly claimSubmissionService: ClaimSubmissionService,
    private readonly claimTransmissionService: ClaimTransmissionService,
    private readonly claimAcknowledgmentService: ClaimAcknowledgmentService
  ) {}

  @Get("radiology/queue")
  @RequireRoles(RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async getRadiologyQueue(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getRadiologyQueue(facilityId);
  }

  @Get("lab/queue")
  @RequireRoles(RoleCode.LAB, RoleCode.ADMIN)
  async getLabQueue(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getLabQueue(facilityId);
  }

  @Get("pharmacy/queue")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async getPharmacyQueue(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getPharmacyQueue(facilityId);
  }

  @Get("billing/queue")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getBillingQueue(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getBillingQueue(facilityId);
  }

  @Get("billing/encounters/:encounterId/summary")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getBillingEncounterSummary(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getBillingEncounterSummary(facilityId, encounterId);
  }

  @Get("billing/encounters/:encounterId/readiness")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterBillingReadiness(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.getEncounterBillingReadiness(facilityId, encounterId);
  }

  @Get("billing/encounters/:encounterId/claims")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterClaimAssembly(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimBuilderService.buildEncounterClaims(facilityId, encounterId);
  }

  @Get("billing/encounters/:encounterId/claim-export")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterClaimExport(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimExportService.buildEncounterClaimExport(facilityId, encounterId);
  }

  @Get("billing/encounters/:encounterId/x12-preview")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterX12Preview(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.x12837GeneratorService.buildEncounterX12Preview(facilityId, encounterId);
  }

  @Post("billing/encounters/:encounterId/submission-preview")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async postEncounterSubmissionPreview(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimSubmissionService.createSubmissionBatchForEncounter(facilityId, encounterId);
  }

  @Get("billing/encounters/:encounterId/submissions")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async listEncounterSubmissions(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimSubmissionService.listSubmissionsForEncounter(facilityId, encounterId);
  }

  @Get("billing/submissions/:submissionId")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getClaimSubmission(@Param("submissionId") submissionId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimSubmissionService.getSubmissionById(facilityId, submissionId);
  }

  @Post("billing/submission-batches/:batchId/send")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async sendSubmissionBatch(
    @Param("batchId") batchId: string,
    @Body() body: { transport?: "MANUAL" | "STUB_API" },
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    return this.claimTransmissionService.sendSubmissionBatch(facilityId, batchId, body?.transport ?? "MANUAL");
  }

  @Get("billing/submissions/:submissionId/attempts")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getSubmissionAttempts(@Param("submissionId") submissionId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimTransmissionService.getSubmissionAttemptHistory(facilityId, submissionId);
  }

  @Post("billing/acknowledgments/ingest")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async ingestAcknowledgment(
    @Body() body: { rawText: string; kind: "999" | "277CA"; refs?: { submissionId?: string; batchId?: string; transactionCtrl?: string } },
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    return this.claimAcknowledgmentService.ingestAcknowledgment({
      facilityId,
      rawText: body.rawText,
      kind: body.kind,
      refs: body.refs,
    });
  }

  @Get("billing/submissions/:submissionId/acknowledgments")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getSubmissionAcknowledgments(@Param("submissionId") submissionId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimAcknowledgmentService.getAcknowledgmentsForSubmission(facilityId, submissionId);
  }

  @Post("billing/encounters/:encounterId/finalize")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async finalizeEncounterBilling(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.finalizeEncounterBilling(facilityId, encounterId, req.user?.userId);
  }

  @Post("billing/encounters/:encounterId/reopen")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async reopenEncounterBilling(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.queuesService.reopenEncounterBilling(facilityId, encounterId, req.user?.userId);
  }

  @Patch("billing/events/:id")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async patchBillingEvent(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    const payload =
      body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    return this.queuesService.patchBillingEvent(facilityId, id, payload, req.user?.userId);
  }

  @Patch("orders/items/:id/status")
  @RequireRoles(RoleCode.RADIOLOGY, RoleCode.LAB, RoleCode.PHARMACY, RoleCode.ADMIN)
  async updateOrderItemStatus(
    @Param("id") id: string,
    @Body() body: { status: OrderStatus },
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    return this.queuesService.updateOrderItemStatus(facilityId, id, body.status, req.user?.userId);
  }
}

