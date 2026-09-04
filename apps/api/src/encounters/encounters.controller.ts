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
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  RolesGuard,
  RequireRoles,
  AllowPlatformPrincipalWithFacilityContext,
} from "../common/guards/roles.guard";
import { EncountersService } from "./encounters.service";
import { EncounterChartExportService } from "./chart-export.service";
import { UnifiedEncounterTimelineService } from "./unified-encounter-timeline.service";
import { DiagnosesService } from "../diagnoses/diagnoses.service";
import { createDiagnosisDtoSchema, reorderDiagnosesDtoSchema } from "../diagnoses/dto";
import { appendProcedureCaptureDtoSchema } from "../billing-procedure-codes/dto/append-procedure-capture.dto";
import {
  admissionOperationalActionDtoSchema,
  encounterAdmissionCancelDtoSchema,
  encounterAdmissionDecisionDtoSchema,
  encounterCloseDtoSchema,
  encounterCloseCheckDtoSchema,
  encounterReopenDtoSchema,
  encounterCreateDtoSchema,
  encounterIntakeUpsertDtoSchema,
  encounterOperationalUpdateDtoSchema,
  encounterRoomUpdateDtoSchema,
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
  inpatientNursingAssessmentSaveSchema,
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
import { CodingIntegrityReviewService } from "./coding-integrity-review.service";
import { ClaimAssemblyPreviewService } from "./claim-assembly-preview.service";
import { EncounterNotesService } from "./encounter-notes.service";
import { ClinicalDocumentationService } from "./clinical-documentation.service";
import { ChartCertificationB1Service } from "./chart-certification-b1.service";
import {
  encounterNoteCreateDtoSchema,
  encounterNoteAmendDtoSchema,
  encounterNoteVoidDtoSchema,
  clinicalDocumentationEntryCreateDtoSchema,
  clinicalDocumentationEntryCreateWithWitnessDtoSchema,
  resolvePublicProductUiLanguageOrDefault,
  resolveInternalProductUiLanguageOrDefault,
} from "@medora/shared";
import type { Response } from "express";
import { renderEncounterChartExportHtml } from "./chart-export-html.util";
import { AdmissionCommandCenterService } from "./admission-command-center.service";
import { EnterpriseEncounterLifecycleService } from "./enterprise-encounter-lifecycle.service";

/**
 * MEDUI.D4C.7J / D4C.7K — actor roles for server-side closure/reopen authorization.
 * Prefer complete facility role set from JWT (`facilityRoles`) over the single RolesGuard stamp.
 */
function resolveActorRoleCodes(req: {
  userRole?: unknown;
  user?: {
    roleCodes?: unknown;
    roles?: unknown;
    facilityRoles?: unknown;
    canCreateFacilities?: unknown;
  };
  facilityId?: unknown;
  headers?: Record<string, unknown>;
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: unknown) => {
    const r = typeof raw === "string" ? raw.trim().toUpperCase() : "";
    if (!r || seen.has(r)) return;
    seen.add(r);
    out.push(r);
  };

  push(req.userRole);
  if (Array.isArray(req.user?.roleCodes)) {
    for (const r of req.user!.roleCodes as unknown[]) push(r);
  }
  if (Array.isArray(req.user?.roles)) {
    for (const r of req.user!.roles as unknown[]) {
      if (typeof r === "string") push(r);
      else if (r && typeof r === "object" && typeof (r as { code?: unknown }).code === "string") {
        push((r as { code: string }).code);
      }
    }
  }

  const facilityIdRaw =
    (typeof req.facilityId === "string" && req.facilityId) ||
    (typeof req.user && typeof (req.user as { facilityId?: unknown }).facilityId === "string"
      ? (req.user as { facilityId: string }).facilityId
      : null) ||
    req.headers?.["x-facility-id"];
  const facilityId =
    typeof facilityIdRaw === "string"
      ? facilityIdRaw
      : Array.isArray(facilityIdRaw)
        ? String(facilityIdRaw[0] ?? "")
        : "";

  if (Array.isArray(req.user?.facilityRoles)) {
    for (const fr of req.user!.facilityRoles as unknown[]) {
      if (!fr || typeof fr !== "object") continue;
      const row = fr as { facilityId?: unknown; role?: unknown; isActive?: unknown };
      if (row.isActive === false) continue;
      if (facilityId && typeof row.facilityId === "string" && row.facilityId !== facilityId) continue;
      push(row.role);
    }
  }

  if (req.user?.canCreateFacilities === true) {
    push("MEDORA_SUPER_ADMIN");
  }

  return out;
}

/**
 * MEDUI.D4C.7K — platform support context stamped by `RolesGuard`.
 * Recorded in lifecycle audit / timeline metadata; never used to widen authorization.
 */
function resolvePlatformActionContext(req: {
  platformPrincipal?: unknown;
  platformFacilityMembership?: unknown;
}): { platformPrincipal: boolean; hasFacilityMembership: boolean } {
  return {
    platformPrincipal: req.platformPrincipal === true,
    hasFacilityMembership: req.platformFacilityMembership !== false,
  };
}

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
    private readonly codingIntegrityReviewService: CodingIntegrityReviewService,
    private readonly claimAssemblyPreviewService: ClaimAssemblyPreviewService,
    private readonly encounterNotesService: EncounterNotesService,
    private readonly clinicalDocumentationService: ClinicalDocumentationService,
    private readonly chartCertificationB1Service: ChartCertificationB1Service,
    private readonly admissionCommandCenterService: AdmissionCommandCenterService,
    private readonly enterpriseLifecycle: EnterpriseEncounterLifecycleService
  ) {}

  /** MEDNOTE.1 — list append-only encounter notes (+ optional legacy erNotesV1 read-only). */
  @Get("encounters/:id/notes")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY)
  async listEncounterNotes(
    @Param("id") id: string,
    @Query("noteType") noteTypeRaw: string | undefined,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const noteType = noteTypeRaw?.trim().toUpperCase();
    const allowed = new Set(["PROVIDER", "NURSING", "TECHNICIAN", "OTHER"]);
    return this.encounterNotesService.listForEncounter(facilityId, id, {
      noteType: noteType && allowed.has(noteType) ? (noteType as never) : undefined,
    });
  }

  @Post("encounters/:id/notes")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY)
  async createEncounterNote(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const parsed = encounterNoteCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encounterNotesService.createNote(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** MEDNOTE.2 — author-only amendment (creates linked note; original untouched). */
  @Post("encounters/:id/notes/:noteId/amend")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY)
  async amendEncounterNote(
    @Param("id") id: string,
    @Param("noteId") noteId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const parsed = encounterNoteAmendDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encounterNotesService.amendNote(
      facilityId,
      id,
      noteId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** MEDNOTE.2 — author or authorized reviewer void (note body preserved). */
  @Post("encounters/:id/notes/:noteId/void")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async voidEncounterNote(
    @Param("id") id: string,
    @Param("noteId") noteId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const parsed = encounterNoteVoidDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.encounterNotesService.voidNote(
      facilityId,
      id,
      noteId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** MEDNOTE.2 — authorized reviewer cosign. */
  @Post("encounters/:id/notes/:noteId/cosign")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async cosignEncounterNote(
    @Param("id") id: string,
    @Param("noteId") noteId: string,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    return this.encounterNotesService.cosignNote(
      facilityId,
      id,
      noteId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** EDOC.2 — list append-only structured clinical documentation entries. */
  @Get("encounters/:id/clinical-documentation")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY)
  async listClinicalDocumentationEntries(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    return this.clinicalDocumentationService.listForEncounter(facilityId, id, {
      includeVoided: true,
    });
  }

  @Post("encounters/:id/clinical-documentation")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY)
  async createClinicalDocumentationEntry(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const parsed = clinicalDocumentationEntryCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.clinicalDocumentationService.createEntry(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** EDOC.8B — create high-risk clinical documentation with immediate witness in one transaction. */
  @Post("encounters/:id/clinical-documentation/with-witness")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY)
  async createClinicalDocumentationEntryWithWitness(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    const parsed = clinicalDocumentationEntryCreateWithWitnessDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.clinicalDocumentationService.createEntryWithWitness(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** EDOC.4 — second signer witnesses structured clinical documentation entry. */
  @Post("encounters/:id/clinical-documentation/:entryId/witness")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.PHARMACY)
  async witnessClinicalDocumentationEntry(
    @Param("id") id: string,
    @Param("entryId") entryId: string,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    return this.clinicalDocumentationService.witnessEntry(
      facilityId,
      id,
      entryId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

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

  /** Phase 19UCED.7 — read-only coding integrity / documentation review summary. */
  @Get("encounters/:encounterId/coding-review")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.FRONT_DESK)
  async getEncounterCodingReview(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.codingIntegrityReviewService.getForEncounter({ encounterId, facilityId });
  }

  /** Phase 19UCED.8 — read-only claim assembly / export orchestration preview (no claim submission). */
  @Get("encounters/:encounterId/claim-assembly-preview")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.FRONT_DESK)
  async getEncounterClaimAssemblyPreview(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.claimAssemblyPreviewService.getForEncounter({ encounterId, facilityId });
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
    @Query("locale") localeRaw: string | undefined,
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
    const exportLocale = resolveInternalProductUiLanguageOrDefault(localeRaw);
    const manifest = await this.chartExportService.getManifest(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      { exportFormat, locale: exportLocale }
    );
    if (exportFormat === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return renderEncounterChartExportHtml(manifest, { locale: exportLocale });
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
    @Res({ passthrough: true }) res: Response,
    @Query("locale") localeRaw?: string
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
    const exportLocale = resolveInternalProductUiLanguageOrDefault(localeRaw);
    const result = await this.chartExportService.getSnapshot(
      facilityId,
      id,
      snapshotId,
      format,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      { locale: exportLocale }
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

  @Post("encounters/:id/inpatient-nursing-assessments")
  @RequireRoles(RoleCode.RN, RoleCode.ADMIN)
  async saveInpatientNursingAssessment(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    const actorUserId = req.user?.userId;
    if (!facilityId || !actorUserId) throw new BadRequestException("Authentication and facility required");
    const parsed = inpatientNursingAssessmentSaveSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid inpatient nursing assessment", { cause: parsed.error });
    return this.encountersService.saveInpatientNursingAssessment(facilityId, id, parsed.data, actorUserId);
  }

  @Get("encounters/:id/inpatient-nursing-assessment-events")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async listInpatientNursingAssessmentEvents(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Facility ID required");
    return this.encountersService.listInpatientNursingAssessmentEvents(facilityId, id);
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

  /**
   * Stage B1 — server-owned chart certification (advisory / partial).
   * Read-only. Facility-scoped. Does not mutate the chart.
   */
  @Get("encounters/:id/chart-certification")
  @RequireRoles(
    RoleCode.FRONT_DESK,
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.BILLING,
    RoleCode.LAB,
    RoleCode.RADIOLOGY,
    RoleCode.ADMIN
  )
  async getChartCertification(
    @Param("id") id: string,
    @Query("encounterVersion") encounterVersionRaw: string | undefined,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    // Prefer JWT facility; never trust a client-supplied facility override for scope.
    const jwtFacility = req.user?.facilityId;
    if (jwtFacility && jwtFacility !== facilityId) {
      throw new ForbiddenException("Facility scope violation");
    }
    const encounterVersion =
      encounterVersionRaw != null && encounterVersionRaw !== ""
        ? Number(encounterVersionRaw)
        : undefined;
    return this.chartCertificationB1Service.getChartCertification(facilityId, id, {
      encounterVersion: Number.isFinite(encounterVersion) ? encounterVersion : undefined,
    });
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

  @Patch("encounters/:id/room")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async updateRoom(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterRoomUpdateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.encountersService.updateRoom(
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
    const orderLabelLocale = resolvePublicProductUiLanguageOrDefault(langHeader);
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
      // Do not trust singleton req.userRole — dual-role users (RN+PROVIDER) may be tagged RN.
      const actorUserId = req.user?.userId || req.user?.id;
      if (!actorUserId) {
        throw new ForbiddenException(
          "Le dossier d'admission est réservé aux médecins et aux administrateurs."
        );
      }
      const canWriteAdmission = await this.encountersService.actorHasProviderOrAdminAtFacility(
        facilityId,
        String(actorUserId)
      );
      if (!canWriteAdmission) {
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
   * Governed admission decision (draft or sign). Prefer this over PATCH admissionSummaryJson.
   * Does not close the ED encounter. Optionally creates/submits internal placement when enabled.
   */
  @Post("encounters/:id/admission/decision")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async recordAdmissionDecision(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterAdmissionDecisionDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          code: "ADMISSION_DECISION_INVALID_PAYLOAD",
          errorCode: "ADMISSION_DECISION_INVALID_PAYLOAD",
          message: "Invalid admission decision payload",
          requestId: typeof req.requestId === "string" ? req.requestId : null,
        },
        { cause: parsed.error }
      );
    }
    return this.encountersService.recordAdmissionDecision(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers?.["user-agent"],
      typeof req.requestId === "string" ? req.requestId : null
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

  /**
   * D4A.2.3 — Multidisciplinary operational admission acceptance (not clinical SIGN).
   * Authorized via active facility membership (ADMIN | PROVIDER | RN), not singleton req.userRole.
   * Does not create inpatient encounters; does not mutate clinical admission packet fields.
   */
  @Post("encounters/:id/admission/operational-action")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async recordAdmissionOperationalAction(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = admissionOperationalActionDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.admissionCommandCenterService.recordOperationalAction(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers?.["user-agent"],
      typeof req.requestId === "string" ? req.requestId : null
    );
  }

  @Post("encounters/:id/close-check")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @AllowPlatformPrincipalWithFacilityContext()
  async closeDocumentationCheck(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterCloseCheckDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    const [documentation, closePreflight] = await Promise.all([
      this.encountersService.getCloseDocumentationCheck(facilityId, id, parsed.data.discharge),
      /** MEDUI.D4C.7J — typed advisory preflight reuses the same request (no extra round-trip). */
      this.encountersService.getEncounterClosePreflight(
        facilityId,
        id,
        parsed.data.discharge,
        resolveActorRoleCodes(req)
      ),
    ]);

    return { ...documentation, closePreflight };
  }

  @Post("encounters/:id/close")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @AllowPlatformPrincipalWithFacilityContext()
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
      req.headers["user-agent"],
      resolveActorRoleCodes(req),
      typeof req.requestId === "string" ? req.requestId : null,
      resolvePlatformActionContext(req)
    );
  }

  /** MEDUI.D4C.7K — administrative reopen (Facility ADMIN / platform admin only). */
  @Post("encounters/:id/reopen")
  @RequireRoles(RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @AllowPlatformPrincipalWithFacilityContext()
  async reopen(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const parsed = encounterReopenDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.enterpriseLifecycle.reopenEncounter(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      resolveActorRoleCodes(req),
      {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: typeof req.requestId === "string" ? req.requestId : null,
        ...resolvePlatformActionContext(req),
      }
    );
  }

  /** MEDUI.D4C.7K — append-only encounter lifecycle timeline. */
  @Get("encounters/:id/lifecycle-timeline")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @AllowPlatformPrincipalWithFacilityContext()
  async lifecycleTimeline(
    @Param("id") id: string,
    @Query("limit") limit: string | undefined,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const limitNum = limit != null && limit !== "" ? Number(limit) : undefined;
    return this.enterpriseLifecycle.listLifecycleTimeline(
      facilityId,
      id,
      Number.isFinite(limitNum) ? limitNum : undefined
    );
  }
}
