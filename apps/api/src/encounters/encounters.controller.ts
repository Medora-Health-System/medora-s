import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { EncountersService } from "./encounters.service";
import { EncounterChartExportService } from "./chart-export.service";
import { UnifiedEncounterTimelineService } from "./unified-encounter-timeline.service";
import { DiagnosesService } from "../diagnoses/diagnoses.service";
import { createDiagnosisDtoSchema, reorderDiagnosesDtoSchema } from "../diagnoses/dto";
import { appendProcedureCaptureDtoSchema } from "../billing-procedure-codes/dto/append-procedure-capture.dto";
import {
  encounterAdmissionCancelDtoSchema,
  encounterCloseDtoSchema,
  encounterCloseCheckDtoSchema,
  encounterCreateDtoSchema,
  encounterIntakeUpsertDtoSchema,
  encounterOperationalUpdateDtoSchema,
  encounterOutpatientCreateDtoSchema,
  encounterProviderAddendumCreateDtoSchema,
  encounterProviderDocumentationSignDtoSchema,
  encounterProviderDocumentationUnlockDtoSchema,
  encounterProviderHandoffCreateDtoSchema,
  encounterIvAccessInsertDtoSchema,
  encounterIvAccessRemoveDtoSchema,
  encounterProcedureDocumentDtoSchema,
  isNursingAssistMonitoringPayload,
  nursingProcedureDocumentDtoSchema,
  type EncounterProcedureDocumentDto,
  type NursingProcedureDocumentDto,
  encounterUpdateDtoSchema,
  observationOrderTemplateApplyDtoSchema,
  observationReassessmentV1BodySchema,
  encounterBillingClassificationPatchDtoSchema,
  rosterClinicalUserRoleQuerySchema,
} from "@medora/shared";
import { listPatientEncountersQuerySchema } from "./dto";
import { RoleCode } from "@prisma/client";
import { assertZodBody } from "../common/http/zod-parse";
import { ObservationOrderTemplateService } from "./observation-order-template.service";
import { BillingClassificationService } from "./billing-classification.service";
import { FacilityBillingWorkflowService } from "./facility-billing-workflow.service";
import { BillingExportReadinessService } from "./billing-export-readiness.service";
import { BillingLedgerReadinessService } from "./billing-ledger-readiness.service";
import { FacilityFeeReadinessService } from "./facility-fee-readiness.service";
import { ChargeCaptureReviewService } from "./charge-capture-review.service";
import type { Response } from "express";
import { renderEncounterChartExportHtml } from "./chart-export-html.util";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class EncountersController {
  constructor(
    private readonly encountersService: EncountersService,
    private readonly diagnosesService: DiagnosesService,
    private readonly chartExportService: EncounterChartExportService,
    private readonly unifiedTimelineService: UnifiedEncounterTimelineService,
    private readonly observationOrderTemplateService: ObservationOrderTemplateService,
    private readonly billingClassificationService: BillingClassificationService,
    private readonly facilityBillingWorkflowService: FacilityBillingWorkflowService,
    private readonly billingExportReadinessService: BillingExportReadinessService,
    private readonly billingLedgerReadinessService: BillingLedgerReadinessService,
    private readonly facilityFeeReadinessService: FacilityFeeReadinessService,
    private readonly chargeCaptureReviewService: ChargeCaptureReviewService,
  ) {}

  @Post("patients/:patientId/encounters/outpatient")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async createOutpatientVisit(
    @Param("patientId") patientId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterOutpatientCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encountersService.createOutpatientVisit(
      patientId,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("patients/:patientId/encounters")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async create(@Param("patientId") patientId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.encountersService.create(
      patientId,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** Métadonnées d’accueil (aperçu inscription) — une ligne par encounter. */
  @Post("encounters/:encounterId/intake")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async upsertEncounterIntake(
    @Param("encounterId") encounterId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterIntakeUpsertDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encountersService.upsertEncounterIntake(
      encounterId,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** Phase 19UCED.1 — explicit billing classification change (one chart; billing only). */
  @Patch("encounters/:encounterId/billing-classification")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.BILLING)
  async patchBillingClassification(
    @Param("encounterId") encounterId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterBillingClassificationPatchDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.billingClassificationService.changeBillingClassification({
      encounterId,
      facilityId,
      userId: req.user?.userId,
      dto: parsed.data,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  /** Phase 19UCED.2 — allowed billing classification transitions for encounter UI. */
  @Get("encounters/:encounterId/billing-classification/options")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.BILLING)
  async getBillingClassificationOptions(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.billingClassificationService.getTransitionOptions({
      encounterId,
      facilityId,
      userId: req.user?.userId,
    });
  }

  /** Phase 19UCED.3 — read-only billing/export route readiness preview (no claim submission). */
  @Get("encounters/:encounterId/billing-readiness")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.FRONT_DESK)
  async getEncounterBillingExportReadiness(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.billingExportReadinessService.getForEncounter({ encounterId, facilityId });
  }

  /** Phase 19UCED.4 — read-only professional vs facility ledger readiness preview. */
  @Get("encounters/:encounterId/billing-ledger-readiness")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.FRONT_DESK)
  async getEncounterBillingLedgerReadiness(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.billingLedgerReadinessService.getForEncounter({ encounterId, facilityId });
  }

  /** Phase 19UCED.5 — read-only facility-fee / observation operational readiness preview. */
  @Get("encounters/:encounterId/facility-fee-readiness")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.FRONT_DESK)
  async getEncounterFacilityFeeReadiness(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.facilityFeeReadinessService.getForEncounter({ encounterId, facilityId });
  }

  /** Phase 19UCED.6 — read-only charge capture / revenue review summary (no claim submission). */
  @Get("encounters/:encounterId/charge-review")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.FRONT_DESK)
  async getEncounterChargeReview(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.chargeCaptureReviewService.getForEncounter({ encounterId, facilityId });
  }

  /** Phase 19UCED.2 — facility billing workflow config for active facility. */
  @Get("facilities/billing-workflow")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.BILLING)
  async getFacilityBillingWorkflow(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.facilityBillingWorkflowService.getForFacility(facilityId);
  }

  @Get("patients/:patientId/encounters")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK
  )
  async findByPatient(
    @Param("patientId") patientId: string,
    @Query() query: Record<string, string>,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const q = listPatientEncountersQuerySchema.safeParse(query);
    if (!q.success) {
      throw new BadRequestException("Invalid query", { cause: q.error });
    }

    return this.encountersService.findByPatient(
      patientId,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      Object.keys(q.data).length ? q.data : undefined
    );
  }

  @Post("encounters/:encounterId/diagnoses")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async createDiagnosis(
    @Param("encounterId") encounterId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = createDiagnosisDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.diagnosesService.create(
      encounterId,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("encounters/:encounterId/procedure-capture")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.BILLING)
  async appendProcedureCapture(
    @Param("encounterId") encounterId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = appendProcedureCaptureDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encountersService.appendProcedureCapture(
      encounterId,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("encounters/:encounterId/diagnoses/reorder")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async reorderEncounterDiagnoses(
    @Param("encounterId") encounterId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = reorderDiagnosesDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.diagnosesService.reorderEncounterDiagnoses(
      encounterId,
      facilityId,
      parsed.data.orderedIds,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("roster/clinical-users")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async searchClinicalUsers(
    @Query("q") q: string | undefined,
    @Query("role") roleRaw: string | undefined,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const roleParsed = rosterClinicalUserRoleQuerySchema.safeParse(roleRaw);
    if (!roleParsed.success) {
      throw new BadRequestException("Rôle de recherche invalide (PROVIDER ou RN).", {
        cause: roleParsed.error,
      });
    }
    const roleCode = roleParsed.data === "PROVIDER" ? RoleCode.PROVIDER : RoleCode.RN;
    return this.encountersService.searchClinicalUsers(facilityId, q ?? "", roleCode);
  }

  @Get("roster/providers")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async listProviders(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.encountersService.listProviders(facilityId);
  }

  /**
   * Phase 5D / 5E — read-only encounter chart export.
   *
   * - `?format=json` (default): JSON manifest (`application/json` via Nest defaults).
   * - `?format=html`: same manifest composed server-side, then rendered to HTML
   *   (`text/html; charset=utf-8`). No second data path, no PDF, no persistence.
   *
   * RBAC: PROVIDER + ADMIN. Audit: `CHART_ACCESS` with PHI-safe metadata including
   * `exportFormat: "json" | "html"`.
   */
  @Get("encounters/:id/chart-export")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async getChartExport(
    @Param("id") id: string,
    @Query("format") formatRaw: string | undefined,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const fmt = (formatRaw ?? "json").trim().toLowerCase();
    if (fmt !== "json" && fmt !== "html") {
      throw new BadRequestException('Invalid format. Use "json" (default) or "html".');
    }
    const exportFormat = fmt === "html" ? "html" : "json";
    const manifest = await this.chartExportService.getManifest(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      { exportFormat }
    );
    if (exportFormat === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return renderEncounterChartExportHtml(manifest);
    }
    return manifest;
  }

  /**
   * Phase 5F — create an immutable encounter chart export snapshot.
   *
   * CLOSED encounters only (the service raises `409 ConflictException` on OPEN /
   * livePreview). RBAC: PROVIDER + ADMIN. Audit: `RECORD_EXPORT` (critical) with
   * PHI-safe metadata (ids + version + hash, no names / MRN / clinical text).
   */
  @Post("encounters/:id/chart-export/snapshots")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async createChartExportSnapshot(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.chartExportService.createSnapshot(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /**
   * Phase 5F — retrieve a previously created snapshot.
   *
   * Hash is verified before responding; mismatch returns 500 with an integrity
   * marker. HTML is rendered from the **stored** manifest, never the live chart.
   * Default format: `json`.
   */
  @Get("encounters/:id/chart-export/snapshots/:snapshotId")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async getChartExportSnapshot(
    @Param("id") id: string,
    @Param("snapshotId") snapshotId: string,
    @Query("format") formatRaw: string | undefined,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const fmt = (formatRaw ?? "json").trim().toLowerCase();
    if (fmt !== "json" && fmt !== "html") {
      throw new BadRequestException('Invalid format. Use "json" (default) or "html".');
    }
    const format = fmt === "html" ? "html" : "json";
    const result = await this.chartExportService.getSnapshot(
      facilityId,
      id,
      snapshotId,
      format,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return result.html;
    }
    return {
      snapshot: result.row,
      manifest: result.manifest,
    };
  }

  @Get("encounters/:id/audit-timeline")
  @RequireRoles(
    RoleCode.FRONT_DESK,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.BILLING,
    RoleCode.PHARMACY,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN
  )
  async getAuditTimeline(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.encountersService.getAuditTimeline(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("encounters/:id/vitals-history")
  @RequireRoles(
    RoleCode.FRONT_DESK,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.BILLING,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN
  )
  async getVitalsHistory(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.encountersService.getVitalsHistory(facilityId, id);
  }

  @Get("encounters/:id/clinical-timeline")
  @RequireRoles(
    RoleCode.FRONT_DESK,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.BILLING,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN
  )
  async getClinicalTimeline(@Param("id") id: string, @Query("limit") limit: string | undefined, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = limit != null && String(limit).trim() !== "" ? Number.parseInt(String(limit), 10) : undefined;
    return this.encountersService.getClinicalTimeline(facilityId, id, parsed);
  }

  @Get("encounters/:id/unified-timeline")
  @RequireRoles(
    RoleCode.FRONT_DESK,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.BILLING,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN
  )
  async getUnifiedTimeline(@Param("id") id: string, @Query("limit") limit: string | undefined, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = limit != null && String(limit).trim() !== "" ? Number.parseInt(String(limit), 10) : undefined;
    return this.unifiedTimelineService.getUnifiedTimeline(facilityId, id, parsed);
  }

  @Get("encounters/:id/clinical-documentation-events")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN
  )
  async listClinicalDocumentationEvents(
    @Param("id") id: string,
    @Query("types") types: string | undefined,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.encountersService.listClinicalDocumentationEvents(facilityId, id, types);
  }

  @Get("encounters/:id/iv-access")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async getIvAccess(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.encountersService.getIvAccess(facilityId, id);
  }

  @Post("encounters/:id/iv-access/insert")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async recordIvInsertion(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterIvAccessInsertDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encountersService.recordIvInsertion(facilityId, id, parsed.data, req.user?.userId);
  }

  @Post("encounters/:id/iv-access/:eventId/remove")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async recordIvRemoval(
    @Param("id") id: string,
    @Param("eventId") eventId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterIvAccessRemoveDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encountersService.recordIvRemoval(facilityId, id, eventId, parsed.data, req.user?.userId);
  }

  @Get("encounters/:id/procedures")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async getDocumentedProcedures(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.encountersService.getDocumentedProcedures(facilityId, id);
  }

  /**
   * Append-only ER nursing reassessment column history. Returns the most recent saved
   * reassessment events for the encounter (newest first), each with a denormalized performer
   * snapshot and the reassessment + trauma JSON snapshots captured at save time. Bounded
   * `take` (default 50, max 100); facility-scoped.
   */
  @Get("encounters/:id/nursing-reassessment-events")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN
  )
  async listNursingReassessmentEvents(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.encountersService.listNursingReassessmentEvents(facilityId, id);
  }

  @Post("encounters/:id/procedures/document")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async recordProcedureDocumented(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const raw = (body ?? {}) as Record<string, unknown>;
    let dto: EncounterProcedureDocumentDto | NursingProcedureDocumentDto;
    let documentationRole: "PROVIDER" | "NURSING" = "PROVIDER";

    if (isNursingAssistMonitoringPayload(raw)) {
      const nursingParsed = nursingProcedureDocumentDtoSchema.safeParse(raw);
      if (!nursingParsed.success) {
        throw new BadRequestException("Invalid payload", { cause: nursingParsed.error });
      }
      dto = nursingParsed.data;
      documentationRole = "NURSING";
    } else {
      const parsed = encounterProcedureDocumentDtoSchema.safeParse(raw);
      if (!parsed.success) {
        throw new BadRequestException("Invalid payload", { cause: parsed.error });
      }
      dto = parsed.data;
      documentationRole = raw.documentationRole === "NURSING" ? "NURSING" : "PROVIDER";
    }

    return this.encountersService.recordProcedureDocumented(facilityId, id, dto, req.user?.userId, {
      documentationRole,
    });
  }

  @Get("encounters/:id/disposition-readiness")
  @RequireRoles(
    RoleCode.FRONT_DESK,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.BILLING,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN
  )
  async getDispositionReadiness(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.encountersService.getDispositionSafetyReadiness(facilityId, id, undefined);
  }

  @Get("encounters/:id")
  @RequireRoles(
    RoleCode.FRONT_DESK,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.BILLING,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN
  )
  async findOne(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.encountersService.findOne(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("encounters/:id/operational")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.ADMIN)
  async updateOperational(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterOperationalUpdateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.encountersService.updateOperational(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("encounters/:id/sign-provider-documentation")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async signProviderDocumentation(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterProviderDocumentationSignDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Provider attestation is required before signing documentation.", {
        cause: parsed.error,
      });
    }
    return this.encountersService.signProviderDocumentation(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /**
   * Phase 13E — Provider-confirmed observation CARE order template (non-medication lines).
   * Creates a single CARE order via `OrdersService.create` (same pipeline as manual orders).
   */
  @Post("encounters/:id/observation-order-template/apply")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async applyObservationOrderTemplate(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const dto = assertZodBody(observationOrderTemplateApplyDtoSchema.safeParse(body));
    const langHeader = String(req.headers["x-medora-ui-language"] ?? "").toLowerCase();
    const orderLabelLocale = langHeader === "en" ? ("en" as const) : ("fr" as const);
    return this.observationOrderTemplateService.apply(
      id,
      facilityId,
      dto,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      { orderLabelLocale }
    );
  }

  @Post("encounters/:id/observation-reassessment")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async appendObservationReassessment(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const dto = assertZodBody(observationReassessmentV1BodySchema.safeParse(body));
    return this.encountersService.appendObservationReassessment(
      facilityId,
      id,
      dto,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("encounters/:id/unlock-provider-documentation")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async unlockProviderDocumentation(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterProviderDocumentationUnlockDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encountersService.unlockProviderDocumentation(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("encounters/:id/provider-addenda")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async addProviderAddendum(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterProviderAddendumCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encountersService.addProviderAddendum(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("encounters/:id/provider-handoff")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async recordProviderHandoff(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterProviderHandoffCreateDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encountersService.recordProviderHandoff(facilityId, id, parsed.data, req.user?.userId);
  }

  /**
   * Phase 10A — operational ER ownership.
   *
   * Self-assignment endpoints. The caller becomes the encounter's
   * provider/nurse owner. Pure operational metadata: no clinical authorship,
   * no signature, no order authority. RBAC unchanged downstream.
   */
  @Post("encounters/:id/assign-provider/me")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async selfAssignProvider(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    if (!req.user?.userId) {
      throw new BadRequestException("Authentication required.");
    }
    return this.encountersService.selfAssignProvider(
      facilityId,
      id,
      req.user.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("encounters/:id/assign-nurse/me")
  @RequireRoles(RoleCode.RN, RoleCode.ADMIN)
  async selfAssignNurse(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    if (!req.user?.userId) {
      throw new BadRequestException("Authentication required.");
    }
    return this.encountersService.selfAssignNurse(
      facilityId,
      id,
      req.user.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("encounters/:id")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.BILLING)
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterUpdateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    if (parsed.data.admissionSummaryJson !== undefined) {
      if (req.userRole !== RoleCode.PROVIDER && req.userRole !== RoleCode.ADMIN) {
        throw new ForbiddenException(
          "Le dossier d'admission est réservé aux médecins et aux administrateurs."
        );
      }
    }

    return this.encountersService.update(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /**
   * Clinical cancellation of a saved admission decision.
   * Required: { cancellationReason }. No record is deleted; admission JSON + admittedAt are cleared
   * and a critical AuditLog row is written with PHI-safe metadata (no patient name / MRN).
   */
  @Post("encounters/:id/admission/cancel")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async cancelAdmissionDecision(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterAdmissionCancelDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encountersService.cancelAdmissionDecision(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("encounters/:id/close-check")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async closeDocumentationCheck(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterCloseCheckDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.encountersService.getCloseDocumentationCheck(facilityId, id, parsed.data.discharge);
  }

  @Post("encounters/:id/close")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async close(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterCloseDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.encountersService.close(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

