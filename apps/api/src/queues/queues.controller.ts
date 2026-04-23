import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { QueuesService } from "./queues.service";
import { ClaimBuilderService } from "../billing/claim-builder.service";
import { ClaimExportService } from "../billing/claim-export.service";
import { X12837GeneratorService } from "../billing/x12-837-generator.service";
import { ClaimSubmissionService } from "../billing/claim-submission.service";
import { ClaimTransmissionService } from "../billing/claim-transmission.service";
import { displayAckSourceFromParsedJson } from "../billing/ack-inbound-parse.util";
import { ClaimAcknowledgmentService } from "../billing/claim-acknowledgment.service";
import { ClearinghouseOpsService } from "../billing/clearinghouse-ops.service";
import type { ClearinghouseTransportHint } from "../billing/clearinghouse-config.util";
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
    private readonly claimAcknowledgmentService: ClaimAcknowledgmentService,
    private readonly clearinghouseOpsService: ClearinghouseOpsService
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

  @Get("billing/encounters/:encounterId/submission-debug")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounterSubmissionDebug(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimTransmissionService.getEncounterSubmissionDebug(facilityId, encounterId);
  }

  @Get("billing/submissions/:submissionId/lifecycle-debug")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getSubmissionLifecycleDebug(@Param("submissionId") submissionId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimTransmissionService.getSubmissionLifecycleDebug(facilityId, submissionId);
  }

  @Get("billing/submissions/:submissionId")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getClaimSubmission(@Param("submissionId") submissionId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimSubmissionService.getSubmissionById(facilityId, submissionId);
  }

  @Get("billing/clearinghouse/config-status")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getClearinghouseConfigStatus() {
    return this.claimTransmissionService.getClearinghouseConfigStatus();
  }

  @Get("billing/clearinghouse/ops-status")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getClearinghouseOpsStatus(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.clearinghouseOpsService.getOpsStatus(facilityId);
  }

  /** Alias for ops / load-balancer probes — same payload as `ops-status` (no secrets). */
  @Get("billing/clearinghouse/health")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getClearinghouseHealth(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.clearinghouseOpsService.getOpsStatus(facilityId);
  }

  @Get("billing/clearinghouse/ack-dead-letters")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async listAckDeadLetters(@Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimAcknowledgmentService.listInboundAckDeadLetters(facilityId, { openOnly: true, take: 50 });
  }

  @Post("billing/clearinghouse/replay-ack/:deadLetterId")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async replayAckDeadLetter(@Param("deadLetterId") deadLetterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimAcknowledgmentService.replayInboundAckDeadLetter(facilityId, deadLetterId);
  }

  @Post("billing/submissions/:submissionId/send")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async sendSubmission(
    @Param("submissionId") submissionId: string,
    @Body() body: { transport?: ClearinghouseTransportHint },
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    return this.claimTransmissionService.sendSubmission(facilityId, submissionId, body?.transport ?? "MANUAL");
  }

  @Post("billing/submissions/:submissionId/retry-send")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async retrySubmissionSend(@Param("submissionId") submissionId: string, @Body() body: { transport?: ClearinghouseTransportHint }, @Req() req: any) {
    const facilityId = req.facilityId;
    return this.claimTransmissionService.retrySubmissionSend(facilityId, submissionId, body?.transport ?? "MANUAL");
  }

  @Post("billing/submission-batches/:batchId/send")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async sendSubmissionBatch(
    @Param("batchId") batchId: string,
    @Body() body: { transport?: ClearinghouseTransportHint },
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
    @Body()
    body: {
      rawText: string;
      kind: "999" | "277CA";
      refs?: { submissionId?: string; batchId?: string; transactionCtrl?: string; externalReference?: string };
      vendorMeta?: Record<string, unknown>;
    },
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    return this.claimAcknowledgmentService.ingestAcknowledgment({
      facilityId,
      rawText: body.rawText,
      kind: body.kind,
      refs: body.refs,
      vendorMeta: body.vendorMeta ?? { source: "MANUAL_API" },
    });
  }

  @Post("billing/submissions/:submissionId/simulate-ack")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async simulateAcknowledgment(
    @Param("submissionId") submissionId: string,
    @Body() body: { type: "999" | "277CA"; status: "ACCEPTED" | "REJECTED" | "NEEDS_CORRECTION" },
    @Req() req: any
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new BadRequestException("simulate-ack disabled in production");
    }
    const facilityId = req.facilityId;
    const submission = await this.claimSubmissionService.getSubmissionById(facilityId, submissionId);
    const ackType = body.type;
    if (ackType === "999" && body.status === "NEEDS_CORRECTION") {
      throw new BadRequestException("NEEDS_CORRECTION applies to 277CA only");
    }
    const accepted = body.status === "ACCEPTED";
    const rawText =
      ackType === "999"
        ? `ST*999*0001~AK2*837*${submission.transactionCtrl ?? "000000001"}~IK5*${accepted ? "A" : "R"}~AK9*${accepted ? "A" : "R"}~SE*5*0001~`
        : body.status === "NEEDS_CORRECTION"
          ? `ST*277*0001~TRN*2*${submission.transactionCtrl ?? "000000001"}~STC*A6:20~SE*4*0001~`
          : `ST*277*0001~TRN*2*${submission.transactionCtrl ?? "000000001"}~STC*${accepted ? "A1:20" : "A3:21"}~SE*4*0001~`;

    const result = await this.claimAcknowledgmentService.ingestAcknowledgment({
      facilityId,
      rawText,
      kind: ackType,
      refs: { submissionId, transactionCtrl: submission.transactionCtrl ?? undefined, batchId: submission.batchId ?? undefined },
      vendorMeta: { source: "DEV_SIMULATE" },
    });
    return {
      previousStatus: result.previousStatus,
      nextStatus: result.nextStatus,
      statusChanged: result.statusChanged,
      reasonCode: result.reasonCode,
      ackStored: result.ackStored,
      outOfSequence: result.outOfSequence,
      ack: result.ack,
    };
  }

  @Get("billing/submissions/:submissionId/acknowledgments")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getSubmissionAcknowledgments(@Param("submissionId") submissionId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    const rows = await this.claimAcknowledgmentService.getAcknowledgmentsForSubmission(facilityId, submissionId);
    return rows.map((a) => ({
      id: a.id,
      kind: a.kind,
      statusCode: a.statusCode,
      message: a.message,
      warningCode: a.warningCode,
      receivedAt: a.receivedAt,
      createdAt: a.createdAt,
      ackSource: displayAckSourceFromParsedJson(a.parsedJson),
    }));
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

