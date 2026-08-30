/**
 * D3E.7 — Durable direct Inpatient admission + clinical ops JSON writer.
 * Zero schema migration. Facility/actor always from JWT.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  BillingClassification,
  EncounterStatus,
  EncounterType,
  Prisma,
} from "@prisma/client";
import {
  directInpatientAdmissionEnabled,
  hospitalCareActivationFlagsFromProcessEnv,
  hospitalEpisodeFoundationEnabledFromProcessEnv,
  emptyInpatientClinicalOpsV1,
  mergeInpatientClinicalOpsIntoAdmissionSummary,
  readInpatientClinicalOpsFromAdmissionSummary,
  validateDirectAdmissionHardBlockers,
  validateMedReconDecision,
  evaluateConcurrentEncounterCreate,
  inpatientStartMustNotCloseEdEncounter,
  mergeHospitalAdmissionCorrelationIntoSummary,
  readHospitalAdmissionCorrelation,
  evaluateExistingAdmissionIntent,
  formatCanonicalBedDisplay,
  type HospitalAdmissionIntent,
  parseCanonicalBedKey,
  validateBedInPool,
  resolveEncounterCanonicalBedKey,
  INPATIENT_CODE_STATUSES,
  INPATIENT_ISOLATION_PRECAUTIONS,
  INPATIENT_DISCHARGE_WORKFLOW_STATES,
  type InpatientClinicalOpsV1,
  type InpatientCodeStatus,
  type InpatientIsolationPrecaution,
  type InpatientDischargeWorkflowState,
  type MedReconDecision,
  buildInpatientClinicalOpsCertificationReport,
  inpatientOperationsFlagsFromProcessEnv,
  inpatientNursingOpsEnabled,
  inpatientConsultsOpsEnabled,
  inpatientCarePlanOpsEnabled,
  inpatientDischargePlanningOpsEnabled,
  placementActionsEnabled,
  inpatientDocumentationEnabled,
  inpatientWorkspaceFlagsFromProcessEnv,
  inpatientDepartmentalOrdersEnabled,
  inpatientMarEnabled,
  BED_NO_LONGER_AVAILABLE_CODE,
  validateConnectedAdmissionIntakeHardBlockers,
  isBedSelectableForAdmissionIntake,
  buildAdmissionPreloadFromPatientProfile,
  mergeAdmissionPreloadFromPatientProfile,
  buildHomeMedReconLinesFromPreload,
  emptyMedSurgNursingAdmissionDocV1,
  readMedSurgNursingAdmissionFromSummary,
  mergeMedSurgNursingAdmissionIntoSummary,
  saveAdmissionSectionDraft,
  applyHistoryVerification,
  applyNurseAdmissionSignature,
  applyStage6ProjectionAnswers,
  projectNursingAdmissionStage6,
  createProviderAdmissionHandoff,
  computeAdmissionCompletionSummary,
  isAdmissionHistoryVerificationStatus,
  isAdmissionCompletionState,
  activeAllergiesSummary,
  patientClinicalHistoryProfileFromJson,
  readTechnicianTasksDoc,
  mergeTechnicianTasksIntoSummary,
  emptyTechnicianTasksDoc,
  type EnterpriseTechnicianTasksDocV1,
  MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID,
  INPATIENT_LIFECYCLE_NURSING_ADMISSION_CERTIFICATION_ID,
  reviewNursingAdmission,
  validateSectionAnswersForCompletion,
  NURSING_DOMAIN_INTEGRATION_CERTIFICATION_ID,
  AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  reviewNursingAdmissionWithDomains,
  linkNursingDomainReference,
  appendNursingAdmissionAmendment,
  buildNursingAdmissionPrintSummary,
  nursingSectionIntegration,
  projectNursingSectionCompletion,
  projectAuthoritativeSectionCompletion,
  assertReferenceIsLinkable,
  isSyntheticDomainRecordId,
  isPersistedEdocRecordId,
  domainRequiresPersistedEdocId,
  buildAuthoritativeReferenceFromEdoc,
  classifyDomainReference,
  nursingAmendmentPolicyForEncounterState,
  resolveAuthoritativeCodeStatus,
  resolveAuthoritativeIsolation,
  buildProviderDomainProjection,
  nursingDocDomainReferences,
  buildNursingAdmissionWriteThrough,
  sectionNeedsAuthoritativeEdocWriteThrough,
  readInpatientLifecycleMeta,
  computeHospitalDay,
  ensureEmptyHospitalAssignmentOnAdmission,
  projectHospitalBoardAssignments,
  readHospitalAssignmentBag,
  INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
  type NursingAdmissionDomainReferenceV1,
  type NursingAdmissionDomainKey,
  type NursingAmendmentType,
  type ResolvedDomainRecordLite,
  type ClinicalAvailabilityState,
  type InpatientWorkspaceRole,
  type HospitalWorkspaceBootstrapV1,
  INPATIENT_PROVIDER_WORKSPACE_CERTIFICATION_ID,
  PROVIDER_CLINICAL_SYNTHESIS_CERTIFICATION_ID,
  PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID,
  PROVIDER_EVENT_ACK_STATUSES,
  PROVIDER_HP_SECTION_KEYS,
  PROVIDER_PRINT_PACKAGE_KINDS,
  PROVIDER_AMENDMENT_TYPES,
  PROVIDER_AMENDMENT_TARGETS,
  emptyInpatientProviderWorkspaceV1,
  readInpatientProviderWorkspace,
  mergeInpatientProviderWorkspaceIntoSummary,
  acknowledgeProviderEvent,
  upsertProviderProblemPlan,
  saveProviderHpDraft,
  signProviderHpDraft,
  deriveProviderTasksFromOps,
  buildProviderPrintPackage,
  saveProviderProgressNoteDraft,
  signProviderProgressNote,
  buildProgressNoteCarryForward,
  appendProviderDocumentAmendment,
  saveProviderHandoffDraft,
  signProviderHandoff,
  acknowledgeProviderHandoff,
  classifyPrintPackage,
  providerDocumentMatrix,
  isProviderProgressNoteFinalStatus,
  type MedSurgNursingAdmissionDocV1,
  type InpatientAdmissionClinicalSection,
  type AdmissionHistoryVerificationStatus,
  type AdmissionSectionCompletionState,
  type ProviderEventAckStatus,
  type ProviderHpSectionKey,
  type ProviderProblemPlanItemV1,
  type ProviderPrintPackageKind,
  type ProviderProgressNoteDraftV1,
  type ProviderAmendmentType,
  type ProviderAmendmentTarget,
  type ProviderHandoffDraftV1,
  type ProviderDocumentAmendmentV1,
  resolveAuthoritativeEncounterServiceLine,
  projectHospitalHeaderVitalsLiteFromJson,
  hydrateInpatientDischargeMedReconLine,
  hydrateInpatientProviderDischarge1C,
  isInpatientMedReconEffectivelyComplete,
  mergeSavedMedReconWithCurrentProviderPlan,
  projectPostDischargeHomeMedicationsFromRecon,
  validateInpatientDischargePlanningReady,
  PATIENT_CLINICAL_HISTORY_PROFILE_VERSION,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  ENCOUNTER_DETAIL_SELECT,
  ENCOUNTER_ID_ONLY_SELECT,
} from "./encounter-query-contracts";
import { AdmissionCorrelationService } from "./admission-correlation.service";
import { ClinicalDocumentationService } from "./clinical-documentation.service";
import { FacilityBedBoardService } from "../facilities/facility-bed-board.service";
import {
  directAdmissionNotFound,
  directAdmissionSchemaIncompatible,
  isPrismaMissingHospitalEpisodeIdColumn,
} from "./direct-admission-api-errors.util";
import { sanitizePrismaException } from "../common/logging/prisma-error-sanitizer";
import { ClinicalSynthesisService } from "./clinical-synthesis.service";
import { SchemaCompatibleEncounterRepository } from "./schema-compatible-encounter.repository";
import { HospitalEncounterAuthorityService } from "./hospital-encounter-authority.service";

/** Observation is a clinical lane (billing / summary), not EncounterType.OBSERVATION. */
function isExplicitObservationChart(enc: {
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
}): boolean {
  if (String(enc.billingClassification ?? "").trim().toUpperCase() === "OBSERVATION") {
    return true;
  }
  const root =
    enc.admissionSummaryJson &&
    typeof enc.admissionSummaryJson === "object" &&
    !Array.isArray(enc.admissionSummaryJson)
      ? (enc.admissionSummaryJson as Record<string, unknown>)
      : null;
  const lane = String(
    root?.clinicalDestinationContext ?? root?.requestedEncounterType ?? ""
  )
    .trim()
    .toUpperCase();
  return lane === "OBSERVATION";
}

const DIRECT_ADMIT_ENTITY = "InpatientDirectAdmission" as const;
const CLINICAL_OPS_ENTITY = "InpatientClinicalOps" as const;

export type DirectAdmissionBody = {
  patientId: string;
  admissionSource?: string;
  admittingService?: string | null;
  attendingProviderUserId?: string | null;
  admissionDiagnosis?: string | null;
  reasonForAdmission?: string | null;
  requestedLevelOfCare?: string | null;
  requestedUnit?: string | null;
  plannedAt?: string | null;
  isolationRequired?: boolean;
  isolationType?: string | null;
  codeStatus?: string | null;
  notes?: string | null;
  referringProviderOrFacility?: string | null;
  /** Optional governed bed key e.g. MS:2 — assigned atomically when available. */
  assignedBedKey?: string | null;
  /** Optional source ED encounter — linked, never closed/mutated. */
  sourceEdEncounterId?: string | null;
  /** Observation conversion — source Observation encounter (type never mutated). */
  sourceObservationEncounterId?: string | null;
  /** Explicit medication transition for Observation→Inpatient (CONTINUE|MODIFY|HOLD|DISCONTINUE|REPLACE). */
  medicationTransitionAction?: string | null;
  /** Client retry key — safe reuse of existing receiving IP. */
  idempotencyKey?: string | null;
  /** Optional explicit admission correlation id. */
  admissionCorrelationId?: string | null;
  /** Optional placement request — correlates nurse intake with placement arrival. */
  internalPlacementRequestId?: string | null;
  /** Admission clock (ISO); defaults to now. */
  admittedAt?: string | null;
};

@Injectable()
export class InpatientOperationsService {
  private readonly logger = new Logger(InpatientOperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly admissionCorrelation: AdmissionCorrelationService,
    private readonly bedBoardService: FacilityBedBoardService,
    private readonly clinicalSynthesis: ClinicalSynthesisService,
    private readonly compatibleEncounters: SchemaCompatibleEncounterRepository,
    private readonly encounterAuthority: HospitalEncounterAuthorityService,
    private readonly clinicalDocumentation: ClinicalDocumentationService
  ) {}

  private clinicalLogRef(id: string): string {
    return id.slice(0, 8);
  }

  /** Map Prisma P2022 on Encounter.hospitalEpisodeId to a coded clinical-safe error. */
  private rethrowDirectAdmissionSchemaError(
    error: unknown,
    episodeFoundationOn: boolean
  ): never {
    if (isPrismaMissingHospitalEpisodeIdColumn(error)) {
      const sanitized = sanitizePrismaException(error);
      this.logger.error("direct_admission_schema_incompatible", {
        route: "POST /inpatient-operations/direct-admission",
        prismaCode: sanitized?.prismaCode ?? "P2022",
        prismaModel: sanitized?.modelName ?? "Encounter",
        prismaMissingObject:
          sanitized?.missingDatabaseObject ?? "Encounter.hospitalEpisodeId",
        hospitalEpisodeFoundationEnabled: episodeFoundationOn,
        d3bMigrationRecorded: null,
        deploymentSha:
          process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ??
          process.env.GIT_COMMIT_SHA?.trim() ??
          null,
      });
      throw directAdmissionSchemaIncompatible();
    }
    throw error;
  }

  meta() {
    const careEnv = hospitalCareActivationFlagsFromProcessEnv();
    const opsEnv = inpatientOperationsFlagsFromProcessEnv();
    const ipEnv = inpatientWorkspaceFlagsFromProcessEnv();
    const cert = buildInpatientClinicalOpsCertificationReport();
    return {
      module: "INPATIENT_CLINICAL_OPERATIONS",
      certification: cert.certificationId,
      decision: cert.decision,
      productionDefaultsOff: cert.productionFeatureDefaultsOff,
      schemaMigrationsApplied: cert.schemaMigrationsApplied,
      flags: {
        directInpatientAdmission: directInpatientAdmissionEnabled(careEnv),
        inpatientDocumentation: inpatientDocumentationEnabled(ipEnv),
        inpatientNursing: inpatientNursingOpsEnabled(opsEnv),
        inpatientConsults: inpatientConsultsOpsEnabled(opsEnv),
        inpatientCarePlan: inpatientCarePlanOpsEnabled(opsEnv),
        inpatientDischargePlanning: inpatientDischargePlanningOpsEnabled(opsEnv),
        placementActions: placementActionsEnabled(opsEnv),
      },
      reviewItems: cert.reviewItems,
      consumesSharedEngines: {
        encounterNotes: true,
        orderEngine: true,
        laboratory: true,
        radiology: true,
        pharmacy: true,
        mar: true,
        results: true,
        floorBoard: true,
        hospitalEpisodeService: true,
        internalPlacementTransitions: true,
      },
    };
  }

  async createDirectAdmission(
    facilityId: string,
    actorUserId: string,
    body: DirectAdmissionBody,
    options?: { ip?: string; userAgent?: string }
  ) {
    if (!directInpatientAdmissionEnabled(hospitalCareActivationFlagsFromProcessEnv())) {
      throw new ForbiddenException("Direct inpatient admission is disabled");
    }
    if (!facilityId?.trim()) throw new BadRequestException("Facility ID required");
    if (!actorUserId?.trim()) throw new BadRequestException("User ID required");

    const admissionSource = String(body.admissionSource ?? "DIRECT")
      .trim()
      .toUpperCase();
    const allowedSources = new Set([
      "EMERGENCY_DEPARTMENT",
      "DIRECT",
      "CLINIC",
      "SCHEDULED",
      "EXTERNAL_TRANSFER",
      "OBSERVATION_CONVERSION",
      "OTHER",
    ]);
    if (!allowedSources.has(admissionSource)) {
      throw new BadRequestException("Invalid admissionSource");
    }

    const blockers = validateDirectAdmissionHardBlockers({
      patientId: body.patientId,
      admissionSource: admissionSource as "DIRECT",
    });
    if (blockers.length) {
      throw new BadRequestException(blockers.join(", "));
    }

    const connectedBlockers = validateConnectedAdmissionIntakeHardBlockers({
      selectedPatientId: body.patientId,
      demographicsConfirmed: true,
      admissionSource,
      sourceEncounterId: body.sourceEdEncounterId ?? body.sourceObservationEncounterId,
      admittedAt: body.admittedAt,
      requestedUnit: body.requestedUnit,
      assignedBedKey: body.assignedBedKey,
      admissionDiagnosis: body.admissionDiagnosis,
      reasonForAdmission: body.reasonForAdmission,
      admittingService: body.admittingService,
      requestedLevelOfCare: body.requestedLevelOfCare,
      receivingNurseUserIdFromClient: null,
    });
    // Connected nurse intake (diagnosis/reason/bed/service present) enforces full D4A.0 gates.
    const requireConnectedFields =
      String(body.admissionDiagnosis ?? "").trim() !== "" ||
      String(body.assignedBedKey ?? "").trim() !== "" ||
      String(body.reasonForAdmission ?? "").trim() !== "" ||
      String(body.admittingService ?? "").trim() !== "" ||
      String(body.requestedLevelOfCare ?? "").trim() !== "";
    if (requireConnectedFields) {
      const must = connectedBlockers.filter((b) =>
        [
          "PATIENT_REQUIRED",
          "REQUESTED_UNIT_REQUIRED",
          "ASSIGNED_BED_REQUIRED",
          "BED_UNIT_MISMATCH",
          "BED_NOT_IN_POOL",
          "ADMISSION_DIAGNOSIS_REQUIRED",
          "REASON_FOR_ADMISSION_REQUIRED",
          "ADMITTING_SERVICE_REQUIRED",
          "ADMITTING_SERVICE_INVALID",
          "LEVEL_OF_CARE_REQUIRED",
          "LEVEL_OF_CARE_INVALID",
          "LEVEL_OF_CARE_UNIT_INCOMPATIBLE",
          "ADMITTED_AT_INVALID",
          "ADMITTED_AT_FUTURE_PROHIBITED",
          "CLIENT_RECEIVING_NURSE_FORBIDDEN",
        ].includes(b)
      );
      if (must.length) {
        throw new BadRequestException(must.join(", "));
      }
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: body.patientId, facilityId },
      select: { id: true },
    });
    if (!patient) {
      throw directAdmissionNotFound("PATIENT_NOT_FOUND_IN_FACILITY");
    }

    const idempotencyKey = String(body.idempotencyKey ?? "").trim() || null;
    const placementRequestId =
      typeof body.internalPlacementRequestId === "string"
        ? body.internalPlacementRequestId.trim() || null
        : null;
    const admissionCorrelationIdInput =
      typeof body.admissionCorrelationId === "string"
        ? body.admissionCorrelationId.trim() || null
        : null;

    // Expand-and-contract: never select Encounter.hospitalEpisodeId while D3B is unapplied.
    // Feature flags cannot suppress Prisma SQL generation (prod P2022 → 500).
    const episodeFoundationOn = hospitalEpisodeFoundationEnabledFromProcessEnv();

    let openRows: Array<{
      id: string;
      type: EncounterType;
      status: EncounterStatus;
      admissionSummaryJson: unknown;
      hospitalEpisodeId?: string | null;
    }>;
    try {
      openRows = await this.prisma.encounter.findMany({
        where: { patientId: patient.id, facilityId, status: EncounterStatus.OPEN },
        select: episodeFoundationOn
          ? {
              id: true,
              type: true,
              status: true,
              hospitalEpisodeId: true,
              admissionSummaryJson: true,
            }
          : {
              id: true,
              type: true,
              status: true,
              admissionSummaryJson: true,
            },
      });
    } catch (error) {
      this.rethrowDirectAdmissionSchemaError(error, episodeFoundationOn);
    }

    // Invariant: never close or mutate ED when starting Inpatient
    void inpatientStartMustNotCloseEdEncounter();

    let sourceEdEncounterId: string | null =
      typeof body.sourceEdEncounterId === "string" ? body.sourceEdEncounterId.trim() : "";
    const sourceObservationEncounterId =
      typeof body.sourceObservationEncounterId === "string"
        ? body.sourceObservationEncounterId.trim()
        : "";

    let sourceEncounterId: string | null = null;
    let observationHospitalEpisodeId: string | null = null;
    if (admissionSource === "OBSERVATION_CONVERSION") {
      const obsId = sourceObservationEncounterId || sourceEdEncounterId || "";
      if (!obsId) {
        throw new BadRequestException(
          "sourceObservationEncounterId is required for observation conversion"
        );
      }
      const obs = await this.prisma.encounter.findFirst({
        where: {
          id: obsId,
          facilityId,
          patientId: patient.id,
          status: EncounterStatus.OPEN,
        },
        select: episodeFoundationOn
          ? {
              id: true,
              type: true,
              status: true,
              hospitalEpisodeId: true,
              billingClassification: true,
              admissionSummaryJson: true,
            }
          : {
              id: true,
              type: true,
              status: true,
              billingClassification: true,
              admissionSummaryJson: true,
            },
      });
      if (!obs || !isExplicitObservationChart(obs)) {
        throw new BadRequestException(
          "sourceObservationEncounterId is not a valid Observation encounter"
        );
      }
      sourceEncounterId = obs.id;
      observationHospitalEpisodeId =
        episodeFoundationOn && "hospitalEpisodeId" in obs
          ? ((obs as { hospitalEpisodeId?: string | null }).hospitalEpisodeId ?? null)
          : null;
      sourceEdEncounterId = null;
    } else {
      if (!sourceEdEncounterId && admissionSource === "EMERGENCY_DEPARTMENT") {
        sourceEdEncounterId = openRows.find((e) => e.type === EncounterType.EMERGENCY)?.id ?? "";
      }
      if (sourceEdEncounterId) {
        const ed = await this.prisma.encounter.findFirst({
          where: {
            id: sourceEdEncounterId,
            facilityId,
            patientId: patient.id,
            type: EncounterType.EMERGENCY,
          },
          select: { id: true },
        });
        if (!ed) throw directAdmissionNotFound("SOURCE_ED_ENCOUNTER_NOT_FOUND");
        sourceEncounterId = ed.id;
      } else {
        sourceEdEncounterId = null;
        sourceEncounterId = null;
      }
    }

    let activeEpisodeId: string | null = null;
    if (episodeFoundationOn) {
      const active = await this.prisma.hospitalEpisode.findFirst({
        where: { facilityId, patientId: patient.id, status: "ACTIVE" },
        select: { id: true },
      });
      activeEpisodeId = active?.id ?? observationHospitalEpisodeId ?? null;
    }

    const openIpCandidates = openRows
      .filter((e) => e.type === EncounterType.INPATIENT)
      .map((e) => ({
        id: e.id,
        hospitalEpisodeId:
          episodeFoundationOn && "hospitalEpisodeId" in e
            ? ((e as { hospitalEpisodeId?: string | null }).hospitalEpisodeId ?? null)
            : null,
        admissionSummaryJson: e.admissionSummaryJson,
      }));

    const admissionIntent: HospitalAdmissionIntent =
      admissionSource === "OBSERVATION_CONVERSION"
        ? "OBSERVATION_CONVERSION"
        : placementRequestId
          ? "PLACEMENT_RECEIVING"
          : admissionSource === "SCHEDULED"
            ? "SCHEDULED_ADMISSION"
            : admissionSource === "EXTERNAL_TRANSFER"
              ? "TRANSFER_IN"
              : admissionSource === "EMERGENCY_DEPARTMENT"
                ? "NURSE_ADMISSION_INTAKE"
                : "DIRECT_ADMISSION";

    const correlationIntent = this.admissionCorrelation.createAdmissionIntent({
      admissionIntent,
      patientId: patient.id,
      facilityId,
      actorUserId,
      admissionSource,
      destinationUnitId: body.requestedUnit?.trim() || null,
      hospitalEpisodeId: activeEpisodeId,
      sourceEncounterId: sourceEncounterId,
      internalPlacementRequestId: placementRequestId,
      idempotencyKey,
      clientAdmissionCorrelationId: admissionCorrelationIdInput,
      requestedAdmissionAt: body.admittedAt?.trim() || null,
    });

    const reuseDecision = this.admissionCorrelation.resolveReuse({
      patientId: patient.id,
      facilityId,
      admissionIntent,
      hospitalEpisodeId: activeEpisodeId,
      sourceEncounterId: sourceEncounterId,
      internalPlacementRequestId: placementRequestId,
      idempotencyKey,
      admissionCorrelationId: correlationIntent.admissionCorrelationId,
      openInpatientCandidates: openIpCandidates,
    });

    if (reuseDecision.action === "DENY") {
      throw new ConflictException(reuseDecision.detail);
    }

    const concurrentPathway =
      admissionIntent === "DIRECT_ADMISSION" ||
      admissionIntent === "SCHEDULED_ADMISSION" ||
      admissionIntent === "TRANSFER_IN"
        ? "DIRECT_ADMISSION"
        : admissionIntent === "PLACEMENT_RECEIVING"
          ? "PLACEMENT_RECEIVING"
          : "NURSE_ADMISSION_INTAKE";

    const decision = evaluateConcurrentEncounterCreate({
      pathway: concurrentPathway,
      requestedType: "INPATIENT",
      existingOpen: openRows,
      correlatedReceivingEncounterId:
        reuseDecision.action === "REUSE" ? reuseDecision.receivingEncounterId : null,
    });
    if (!decision.allowed) {
      throw new ConflictException(decision.detail);
    }
    if (decision.code === "IDEMPOTENT_REUSE" && decision.reuseEncounterId) {
      const prior = await this.prisma.encounter.findFirst({
        where: {
          id: decision.reuseEncounterId,
          facilityId,
          patientId: patient.id,
          status: EncounterStatus.OPEN,
          type: EncounterType.INPATIENT,
        },
        select: ENCOUNTER_DETAIL_SELECT,
      });
      if (prior) {
        return {
          encounter: prior,
          hospitalEpisodeId: activeEpisodeId,
          createdEdEncounter: false,
          createdObservationEncounter: false,
          clinicalContext: "INPATIENT" as const,
          idempotentReuse: true,
          edEncounterMutated: false,
          edEncounterClosed: false,
          receivingNurseUserId: actorUserId,
          admissionCorrelationId: correlationIntent.admissionCorrelationId,
        };
      }
    }

    let roomLabel: string | null = null;
    const bedKeyRaw = String(body.assignedBedKey ?? "").trim();
    if (bedKeyRaw) {
      const parsed = parseCanonicalBedKey(bedKeyRaw);
      if (!parsed || !validateBedInPool(parsed.unit, parsed.room)) {
        throw new BadRequestException("assignedBedKey is not a valid facility bed");
      }
      const requestedUnit = String(body.requestedUnit ?? "").trim().toUpperCase();
      if (requestedUnit && requestedUnit !== parsed.unit) {
        throw new BadRequestException("assignedBedKey does not belong to requestedUnit");
      }

      const bedRow = await this.bedBoardService.getEffectiveBedRow(facilityId, bedKeyRaw);
      if (!bedRow) {
        throw new BadRequestException("assignedBedKey is not a valid facility bed");
      }
      if (!isBedSelectableForAdmissionIntake(bedRow.status) || bedRow.occupantEncounterId) {
        throw new ConflictException(BED_NO_LONGER_AVAILABLE_CODE);
      }
      try {
        this.bedBoardService.assertBedAssignableOrThrow({ bedRow });
      } catch {
        throw new ConflictException(BED_NO_LONGER_AVAILABLE_CODE);
      }

      const occupants = await this.prisma.encounter.findMany({
        where: { facilityId, status: EncounterStatus.OPEN },
        select: {
          id: true,
          roomLabel: true,
          type: true,
          admissionSummaryJson: true,
        },
      });
      for (const row of occupants) {
        const key = resolveEncounterCanonicalBedKey({
          roomLabel: row.roomLabel,
          type: row.type,
          admissionSummaryJson: row.admissionSummaryJson,
        });
        if (key === `${parsed.unit}:${parsed.room}`) {
          throw new ConflictException(BED_NO_LONGER_AVAILABLE_CODE);
        }
      }
      roomLabel = formatCanonicalBedDisplay(parsed.unit, parsed.room);
    }

    if (body.attendingProviderUserId) {
      const membership = await this.prisma.userRole.findFirst({
        where: {
          userId: body.attendingProviderUserId,
          facilityId,
          isActive: true,
          role: { code: { in: ["PROVIDER", "ADMIN"] } },
        },
        select: { id: true },
      });
      if (!membership) {
        throw directAdmissionNotFound("ATTENDING_NOT_FOUND");
      }
    }

    const ops = emptyInpatientClinicalOpsV1();
    const codeStatus = String(body.codeStatus ?? "")
      .trim()
      .toUpperCase();
    if (codeStatus && (INPATIENT_CODE_STATUSES as readonly string[]).includes(codeStatus)) {
      ops.codeStatus = {
        status: codeStatus as InpatientCodeStatus,
        effectiveAt: new Date().toISOString(),
        documentedByUserId: actorUserId,
      };
    }
    if (body.isolationRequired === true) {
      const iso = String(body.isolationType ?? "CONTACT")
        .trim()
        .toUpperCase();
      const precaution = (INPATIENT_ISOLATION_PRECAUTIONS as readonly string[]).includes(iso)
        ? (iso as InpatientIsolationPrecaution)
        : "CONTACT";
      ops.isolation = {
        precautions: [precaution],
        reason: "Documented at direct admission",
        startedAt: new Date().toISOString(),
        orderedByUserId: actorUserId,
      };
    }
    ops.dischargePlanning = {
      workflowState: "PLANNING",
      updatedAt: new Date().toISOString(),
    };

    const admittedAt = body.admittedAt?.trim()
      ? new Date(body.admittedAt)
      : new Date();
    if (!Number.isFinite(admittedAt.getTime())) {
      throw new BadRequestException("admittedAt is invalid");
    }

    const correlationDraft = {
      ...correlationIntent,
      status: "RECEIVING_STARTED" as const,
      receivingUserId: actorUserId,
      receivingStartedAt: new Date().toISOString(),
      hospitalEpisodeId: activeEpisodeId,
      sourceEncounterId: sourceEncounterId,
      internalPlacementRequestId: placementRequestId,
      destinationUnitId: body.requestedUnit?.trim() || correlationIntent.destinationUnitId,
    };

    // D4A.3.0 — hospital active team starts empty (never copy ED provider/RN/tech or attending into bag).
    const admissionSummaryJson = ensureEmptyHospitalAssignmentOnAdmission(
      mergeHospitalAdmissionCorrelationIntoSummary(
        mergeInpatientClinicalOpsIntoAdmissionSummary(
          {
            d3e7DirectAdmission: true,
            d3e6dHospitalAdmissionIntake: true,
            requestedEncounterType: "INPATIENT",
            clinicalDestinationContext: "INPATIENT",
            admissionSource,
            admittingService: body.admittingService?.trim() || null,
            admissionDiagnosis: body.admissionDiagnosis?.trim() || null,
            admissionReason: body.reasonForAdmission?.trim() || null,
            careLevel: body.requestedLevelOfCare?.trim() || null,
            serviceUnit: body.requestedUnit?.trim() || null,
            plannedAt: body.plannedAt?.trim() || null,
            referringProviderOrFacility: body.referringProviderOrFacility?.trim() || null,
            originatingEdEncounterId: sourceEdEncounterId,
            observationEncounterId:
              admissionSource === "OBSERVATION_CONVERSION" ? sourceEncounterId : null,
            observationEncounterTypePreserved: admissionSource === "OBSERVATION_CONVERSION",
            medicationTransitionAction:
              typeof body.medicationTransitionAction === "string"
                ? body.medicationTransitionAction.trim().toUpperCase()
                : null,
            receivingNurseUserId: actorUserId,
            admissionInitiatedAt: new Date().toISOString(),
            arrivalAt: admittedAt.toISOString(),
            d3e6dIdempotencyKey: idempotencyKey,
            assignedBedKey: bedKeyRaw || null,
            // Explicit: ED/Observation chart is not closed or type-mutated by this writer
            edEncounterClosed: false,
            edEncounterMutated: false,
            observationEncounterMutated: false,
          },
          ops
        ),
        correlationDraft
      ),
      "INPATIENT"
    );

    let created: {
      encounterId: string;
      hospitalEpisodeId: string | null;
      idempotentReuse: boolean;
      admissionCorrelationId: string;
    };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        // Re-check correlated reuse inside transaction (concurrency)
        const openIpsRaw = await tx.encounter.findMany({
          where: {
            patientId: patient.id,
            facilityId,
            status: EncounterStatus.OPEN,
            type: EncounterType.INPATIENT,
          },
          // Separate select objects — never share a select that includes hospitalEpisodeId.
          select: episodeFoundationOn
            ? { id: true, hospitalEpisodeId: true, admissionSummaryJson: true }
            : { id: true, admissionSummaryJson: true },
        });
        const openIps = openIpsRaw.map((row) => ({
          id: row.id,
          hospitalEpisodeId:
            episodeFoundationOn && "hospitalEpisodeId" in row
              ? ((row as { hospitalEpisodeId?: string | null }).hospitalEpisodeId ?? null)
              : null,
          admissionSummaryJson: row.admissionSummaryJson,
        }));
        const txReuse = this.admissionCorrelation.resolveReuse({
          patientId: patient.id,
          facilityId,
          admissionIntent,
          hospitalEpisodeId: activeEpisodeId,
          sourceEncounterId: sourceEncounterId,
          internalPlacementRequestId: placementRequestId,
          idempotencyKey,
          admissionCorrelationId: correlationDraft.admissionCorrelationId,
          openInpatientCandidates: openIps,
        });
        if (txReuse.action === "REUSE") {
          return {
            encounterId: txReuse.receivingEncounterId,
            hospitalEpisodeId: activeEpisodeId,
            idempotentReuse: true,
            admissionCorrelationId: correlationDraft.admissionCorrelationId,
          };
        }
        if (txReuse.action === "DENY") {
          throw new ConflictException(txReuse.detail);
        }

        let hospitalEpisodeId: string | null = activeEpisodeId;

        // Pre-D3B create data: never include hospitalEpisodeId key (even as undefined).
        const serviceLine = resolveAuthoritativeEncounterServiceLine({
          encounterType: EncounterType.INPATIENT,
          workflowHint: "DIRECT_ADMISSION",
          billingClassification: BillingClassification.INPATIENT,
        }).serviceLine;
        const encounterBaseCreate = {
          facilityId,
          patientId: patient.id,
          type: EncounterType.INPATIENT,
          status: EncounterStatus.OPEN,
          billingClassification: BillingClassification.INPATIENT,
          serviceLine,
          providerId: actorUserId,
          physicianAssignedUserId: body.attendingProviderUserId?.trim() || null,
          nurseAssignedUserId: actorUserId,
          chiefComplaint:
            body.reasonForAdmission?.trim() ||
            body.admissionDiagnosis?.trim() ||
            "Admission hospitalière",
          notes: body.notes?.trim() || undefined,
          admissionSummaryJson: admissionSummaryJson as Prisma.InputJsonValue,
          admittedAt,
          roomLabel: roomLabel ?? undefined,
        };

        const encounter = episodeFoundationOn
          ? await tx.encounter.create({
              data: {
                ...encounterBaseCreate,
                ...(hospitalEpisodeId ? { hospitalEpisodeId } : {}),
              },
              select: ENCOUNTER_ID_ONLY_SELECT,
            })
          : await tx.encounter.create({
              data: encounterBaseCreate,
              select: ENCOUNTER_ID_ONLY_SELECT,
            });

        const correlationFinal = {
          ...correlationDraft,
          status: "ENCOUNTER_CREATED" as const,
          receivingEncounterId: encounter.id,
          hospitalEpisodeId,
          correlationVersion: (correlationDraft.correlationVersion ?? 1) + 1,
        };
        const summaryWithReceiver = mergeHospitalAdmissionCorrelationIntoSummary(
          admissionSummaryJson,
          correlationFinal
        );

        // Pre-D3B base update — never share this object with D3B branch data.
        const encounterBaseUpdate = {
          admissionSummaryJson: summaryWithReceiver as Prisma.InputJsonValue,
          version: { increment: 1 as const },
        };

        if (!episodeFoundationOn) {
          // Critical: explicit select — Prisma update without select RETURNINGs all
          // schema scalars including hospitalEpisodeId → P2022 on pre-D3B Postgres.
          await tx.encounter.update({
            where: { id: encounter.id },
            data: encounterBaseUpdate,
            select: ENCOUNTER_ID_ONLY_SELECT,
          });
        } else if (!hospitalEpisodeId) {
          const episode = await tx.hospitalEpisode.create({
            data: {
              facilityId,
              patientId: patient.id,
              status: "ACTIVE",
              originatingEncounterId: encounter.id,
              version: 1,
              createdByUserId: actorUserId,
              updatedByUserId: actorUserId,
            },
            select: { id: true },
          });
          hospitalEpisodeId = episode.id;
          correlationFinal.hospitalEpisodeId = episode.id;
          await tx.encounter.update({
            where: { id: encounter.id },
            data: {
              hospitalEpisodeId: episode.id,
              admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary(
                summaryWithReceiver,
                correlationFinal
              ) as Prisma.InputJsonValue,
              version: { increment: 1 },
            },
            select: ENCOUNTER_ID_ONLY_SELECT,
          });
        } else {
          await tx.encounter.update({
            where: { id: encounter.id },
            data: {
              hospitalEpisodeId,
              ...encounterBaseUpdate,
            },
            select: ENCOUNTER_ID_ONLY_SELECT,
          });
        }

        return {
          encounterId: encounter.id,
          hospitalEpisodeId,
          idempotentReuse: false,
          admissionCorrelationId: correlationFinal.admissionCorrelationId,
        };
      });
    } catch (error) {
      this.rethrowDirectAdmissionSchemaError(error, episodeFoundationOn);
    }

    if (!created.idempotentReuse) {
      await this.audit.log(AuditAction.ENCOUNTER_CREATE, DIRECT_ADMIT_ENTITY, {
        userId: actorUserId,
        facilityId,
        patientId: patient.id,
        encounterId: created.encounterId,
        entityId: created.encounterId,
        critical: true,
        ip: options?.ip,
        userAgent: options?.userAgent,
        metadata: {
          event: "INPATIENT_HOSPITAL_ADMISSION_CREATED",
          admissionSource,
          hospitalEpisodeId: created.hospitalEpisodeId,
          admissionCorrelationId: created.admissionCorrelationId,
          createdEdEncounter: false,
          createdObservationEncounter: false,
          encounterType: "INPATIENT",
          receivingNurseUserId: actorUserId,
          sourceEdEncounterId,
          sourceObservationEncounterId:
            admissionSource === "OBSERVATION_CONVERSION" ? sourceEncounterId : null,
          edEncounterClosed: false,
          edEncounterMutated: false,
          observationEncounterMutated: false,
          assignedBedKey: bedKeyRaw || null,
          concurrentWithOpenEd: decision.code === "ALLOW_ED_PLUS_INPATIENT",
        },
      });
    }

    // Stamp conversion correlation onto Observation without mutating Encounter.type.
    if (
      admissionSource === "OBSERVATION_CONVERSION" &&
      sourceEncounterId &&
      !created.idempotentReuse
    ) {
      const obs = await this.prisma.encounter.findFirst({
        where: { id: sourceEncounterId, facilityId },
        select: {
          id: true,
          type: true,
          billingClassification: true,
          admissionSummaryJson: true,
        },
      });
      if (obs && isExplicitObservationChart(obs)) {
        const priorType = obs.type;
        const priorBilling = obs.billingClassification;
        await this.prisma.encounter.update({
          where: { id: obs.id },
          data: {
            // Identity preservation: never mutate type or billing classification.
            type: priorType,
            billingClassification: priorBilling,
            admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary(
              obs.admissionSummaryJson,
              {
                ...correlationIntent,
                status: "ENCOUNTER_CREATED",
                receivingEncounterId: created.encounterId,
                hospitalEpisodeId: created.hospitalEpisodeId,
              }
            ) as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
          select: ENCOUNTER_ID_ONLY_SELECT,
        });
      }
    }

    const detail = await this.prisma.encounter.findFirst({
      where: { id: created.encounterId, facilityId },
      select: ENCOUNTER_DETAIL_SELECT,
    });
    return {
      encounter: detail,
      hospitalEpisodeId: created.hospitalEpisodeId,
      createdEdEncounter: false,
      createdObservationEncounter: false,
      clinicalContext: "INPATIENT" as const,
      idempotentReuse: created.idempotentReuse,
      edEncounterMutated: false,
      edEncounterClosed: false,
      observationEncounterMutated: false,
      receivingNurseUserId: actorUserId,
      admissionCorrelationId: created.admissionCorrelationId,
      sourceObservationEncounterId:
        admissionSource === "OBSERVATION_CONVERSION" ? sourceEncounterId : null,
    };
  }

  /**
   * D3E.8A — Governed Observation → Inpatient conversion writer.
   * Creates a new correlation + new Inpatient encounter; Observation type unchanged.
   */
  async convertObservationToInpatient(
    facilityId: string,
    actorUserId: string,
    body: {
      sourceObservationEncounterId: string;
      requestedUnit?: string | null;
      requestedLevelOfCare?: string | null;
      admissionDiagnosis?: string | null;
      reasonForAdmission?: string | null;
      requestedAdmissionAt?: string | null;
      assignedBedKey?: string | null;
      idempotencyKey?: string | null;
      medicationTransitionAction: string;
      expectedVersion?: number | null;
    },
    options?: { ip?: string; userAgent?: string }
  ) {
    if (!this.admissionCorrelation.isObservationConversionEnabled()) {
      throw new ForbiddenException("Observation inpatient conversion is disabled");
    }
    const obsId = String(body.sourceObservationEncounterId ?? "").trim();
    if (!obsId) throw new BadRequestException("sourceObservationEncounterId is required");

    const episodeFoundationOn = hospitalEpisodeFoundationEnabledFromProcessEnv();
    const obs = await this.prisma.encounter.findFirst({
      where: { id: obsId, facilityId },
      select: episodeFoundationOn
        ? {
            id: true,
            patientId: true,
            type: true,
            status: true,
            hospitalEpisodeId: true,
            billingClassification: true,
            admissionSummaryJson: true,
          }
        : {
            id: true,
            patientId: true,
            type: true,
            status: true,
            billingClassification: true,
            admissionSummaryJson: true,
          },
    });
    if (!obs || !isExplicitObservationChart(obs)) {
      throw new NotFoundException("Observation encounter not found");
    }
    if (obs.status !== EncounterStatus.OPEN) {
      throw new ConflictException("Observation encounter is not eligible for conversion");
    }
    const observationTypeBefore = obs.type;
    const observationBillingBefore = obs.billingClassification;
    const obsHospitalEpisodeId =
      episodeFoundationOn && "hospitalEpisodeId" in obs
        ? ((obs as { hospitalEpisodeId?: string | null }).hospitalEpisodeId ?? null)
        : null;

    const priorCorr = readHospitalAdmissionCorrelation(obs.admissionSummaryJson);
    if (priorCorr) {
      const dup = evaluateExistingAdmissionIntent({
        sourceEncounterId: obs.id,
        destinationContext: "INPATIENT",
        existingCorrelations: [priorCorr],
      });
      if (dup.code === "EXISTING_ADMISSION_INTENT") {
        if (
          body.expectedVersion != null &&
          dup.correlation.correlationVersion !== body.expectedVersion
        ) {
          throw new ConflictException({
            code: "ADMISSION_CORRELATION_VERSION_CONFLICT",
            detail: "Stale expectedVersion for existing conversion intent",
            currentVersion: dup.correlation.correlationVersion,
          });
        }
        return {
          code: "EXISTING_ADMISSION_INTENT" as const,
          admissionCorrelation: dup.correlation,
          observationEncounterId: obs.id,
          observationEncounterType: "OBSERVATION" as const,
          observationEncounterMutated: false,
        };
      }
    }

    const plan = this.admissionCorrelation.planObservationConversion({
      patientId: obs.patientId,
      facilityId,
      sourceObservationEncounterId: obs.id,
      // Clinical lane identity (not Prisma EncounterType — Observation has no EncounterType enum).
      sourceEncounterType: "OBSERVATION",
      medicationTransitionAction: String(body.medicationTransitionAction ?? "")
        .trim()
        .toUpperCase() as never,
      destinationUnitId: body.requestedUnit?.trim() || null,
      hospitalEpisodeId: obsHospitalEpisodeId,
      idempotencyKey: body.idempotencyKey?.trim() || null,
      initiatedByUserId: actorUserId,
    });
    if ("ok" in plan && plan.ok === false) {
      throw new BadRequestException({ code: plan.code, detail: plan.detail });
    }
    if (!("correlation" in plan)) {
      throw new BadRequestException("Observation conversion plan failed");
    }

    // Persist INTENT_CREATED on Observation before receiving (type unchanged).
    await this.prisma.encounter.update({
      where: { id: obs.id },
      data: {
        admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary(
          obs.admissionSummaryJson,
          plan.correlation
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: ENCOUNTER_ID_ONLY_SELECT,
    });

    const result = await this.createDirectAdmission(
      facilityId,
      actorUserId,
      {
        patientId: obs.patientId,
        admissionSource: "OBSERVATION_CONVERSION",
        sourceObservationEncounterId: obs.id,
        requestedUnit: body.requestedUnit,
        requestedLevelOfCare: body.requestedLevelOfCare,
        admissionDiagnosis: body.admissionDiagnosis,
        reasonForAdmission: body.reasonForAdmission,
        admittedAt: body.requestedAdmissionAt,
        assignedBedKey: body.assignedBedKey,
        idempotencyKey: body.idempotencyKey,
        admissionCorrelationId: plan.correlation.admissionCorrelationId,
        medicationTransitionAction: body.medicationTransitionAction,
      },
      options
    );

    const obsAfter = await this.prisma.encounter.findFirst({
      where: { id: obs.id, facilityId },
      select: {
        id: true,
        type: true,
        status: true,
        billingClassification: true,
        admissionSummaryJson: true,
      },
    });
    if (
      !obsAfter ||
      obsAfter.type !== observationTypeBefore ||
      obsAfter.billingClassification !== observationBillingBefore ||
      !isExplicitObservationChart(obsAfter)
    ) {
      throw new ConflictException(
        "Observation encounter identity must remain unchanged after conversion"
      );
    }

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, DIRECT_ADMIT_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: obs.patientId,
      encounterId: obs.id,
      entityId: plan.correlation.admissionCorrelationId,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "OBSERVATION_CONVERSION_COMPLETED",
        receivingEncounterId: result.encounter?.id ?? null,
        observationEncounterTypePreserved: true,
        medicationTransitionAction: body.medicationTransitionAction,
      },
    });

    return {
      ...result,
      observationEncounterId: obs.id,
      observationEncounterType: "OBSERVATION" as const,
      observationEncounterPrismaType: obsAfter.type,
      observationEncounterMutated: false,
      admissionCorrelation: plan.correlation,
      code: "OBSERVATION_CONVERSION_CREATED" as const,
    };
  }

  async getClinicalOps(facilityId: string, encounterId: string) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    return {
      encounterId: enc.id,
      facilityId: enc.facilityId,
      ops: readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson),
    };
  }

  /** D4A.2.7C — Technician tasks (JSON in admissionSummaryJson; zero migration). */
  async getTechnicianTasks(facilityId: string, encounterId: string) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const doc = readTechnicianTasksDoc(enc.admissionSummaryJson);
    return {
      encounterId: enc.id,
      expectedVersion: doc.expectedVersion,
      tasks: doc.tasks,
      admissionSummaryJson:
        enc.admissionSummaryJson &&
        typeof enc.admissionSummaryJson === "object" &&
        !Array.isArray(enc.admissionSummaryJson)
          ? (enc.admissionSummaryJson as Record<string, unknown>)
          : {},
    };
  }

  async patchTechnicianTasks(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { expectedVersion: number; doc: EnterpriseTechnicianTasksDocV1 },
    options?: { ip?: string; userAgent?: string }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const current = readTechnicianTasksDoc(enc.admissionSummaryJson);
    if (Number(body.expectedVersion) !== current.expectedVersion) {
      throw new ConflictException("Technician tasks version conflict");
    }
    const nextDoc: EnterpriseTechnicianTasksDocV1 = {
      ...emptyTechnicianTasksDoc(),
      ...body.doc,
      version: 1,
      expectedVersion: current.expectedVersion + 1,
      updatedAt: new Date().toISOString(),
      tasks: Array.isArray(body.doc?.tasks) ? body.doc.tasks : [],
    };
    const merged = mergeTechnicianTasksIntoSummary(enc.admissionSummaryJson, nextDoc);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: { admissionSummaryJson: merged as Prisma.InputJsonValue },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "TechnicianTasks", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      encounterId: enc.id,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "TECHNICIAN_TASKS_PATCHED",
        taskCount: nextDoc.tasks.length,
        expectedVersion: nextDoc.expectedVersion,
      },
    });
    return {
      encounterId: enc.id,
      expectedVersion: nextDoc.expectedVersion,
      tasks: nextDoc.tasks,
    };
  }

  /**
   * D4A.2.7B — Bounded hospital workspace bootstrap.
   * Validates encounter type before any writers. Emits chart-access audit.
   * Never treats ED/Observation as Inpatient.
   */
  async getWorkspaceBootstrap(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    options?: {
      role?: InpatientWorkspaceRole;
      ip?: string;
      userAgent?: string;
      workspace?: string;
    }
  ): Promise<HospitalWorkspaceBootstrapV1> {
    const requested = String(encounterId ?? "").trim();
    const role: InpatientWorkspaceRole = options?.role ?? "CHART";
    const generatedAt = new Date().toISOString();

    if (!requested) {
      return {
        certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
        resolution: {
          ok: false,
          requestedEncounterId: null,
          category: "MISSING_ID",
          writersEnabled: false,
          messageCode: "inpatientWorkspaceRecovery.errors.MISSING_ID",
        },
        generatedAt,
        header: null,
        readiness: {
          role,
          encounterResolved: false,
          roleAuthorized: true,
          modules: { bootstrap: "ENCOUNTER_MISMATCH" },
        },
        alertCounts: { criticalResults: null, pendingTasks: null, escalations: null },
        writersEnabled: false,
      };
    }

    // D4A.2.8-HF2: authority resolves by ID first (FACILITY_MISMATCH ≠ NOT_FOUND),
    // optional unambiguous lineage redirect, pre-D3B-safe projection (HF1).
    const authority = await this.encounterAuthority.resolveRequestedEncounter(
      facilityId,
      requested,
      { workspace: "INPATIENT", allowLineageRedirect: true }
    );

    if (!authority.ok) {
      const mappedCategory =
        authority.category === "CROSS_FACILITY_LINEAGE"
          ? ("FACILITY_MISMATCH" as const)
          : authority.category === "CROSS_PATIENT_LINEAGE" ||
              authority.category === "LINEAGE_AMBIGUOUS"
            ? ("LINEAGE_AMBIGUOUS" as const)
            : authority.category;
      await this.audit.log(AuditAction.CHART_ACCESS, "InpatientWorkspace", {
        userId: actorUserId,
        facilityId,
        patientId: authority.patientId ?? undefined,
        entityId: requested,
        encounterId: requested,
        ip: options?.ip,
        userAgent: options?.userAgent,
        metadata: {
          event:
            mappedCategory === "FACILITY_MISMATCH"
              ? "INPATIENT_WORKSPACE_BOOTSTRAP_FACILITY_MISMATCH"
              : mappedCategory === "NOT_FOUND" || mappedCategory === "MISSING_ID"
                ? "INPATIENT_WORKSPACE_BOOTSTRAP_FAILED"
                : "INPATIENT_WORKSPACE_BOOTSTRAP_REJECTED_TYPE",
          category: mappedCategory,
          actualType: authority.actualEncounterType ?? null,
          actualFacilityId: authority.actualFacilityId ?? null,
          workspace: options?.workspace ?? "inpatient",
          accessKind: "OPEN",
        },
      });
      return {
        certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
        resolution: {
          ok: false,
          requestedEncounterId: requested,
          category: mappedCategory,
          writersEnabled: false,
          actualEncounterType: authority.actualEncounterType ?? null,
          actualFacilityId: authority.actualFacilityId ?? null,
          messageCode: authority.messageCode,
        },
        generatedAt,
        header: null,
        readiness: {
          role,
          encounterResolved: false,
          roleAuthorized: true,
          modules: {
            bootstrap:
              mappedCategory === "NOT_FOUND" || mappedCategory === "MISSING_ID"
                ? "SOURCE_UNAVAILABLE"
                : "ENCOUNTER_MISMATCH",
          },
        },
        alertCounts: { criticalResults: null, pendingTasks: null, escalations: null },
        writersEnabled: false,
      };
    }

    const enc = await this.compatibleEncounters.findFacilityEncounterForWorkspace(
      facilityId,
      authority.resolvedEncounterId
    );
    if (!enc) {
      // Should be unreachable after authority ok — treat as NOT_FOUND safely
      return {
        certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
        resolution: {
          ok: false,
          requestedEncounterId: requested,
          category: "NOT_FOUND",
          writersEnabled: false,
          messageCode: "inpatientWorkspaceRecovery.errors.NOT_FOUND",
        },
        generatedAt,
        header: null,
        readiness: {
          role,
          encounterResolved: false,
          roleAuthorized: true,
          modules: { bootstrap: "SOURCE_UNAVAILABLE" },
        },
        alertCounts: { criticalResults: null, pendingTasks: null, escalations: null },
        writersEnabled: false,
      };
    }

    const ops = readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson);
    const flags = inpatientWorkspaceFlagsFromProcessEnv();
    const opsFlags = inpatientOperationsFlagsFromProcessEnv();
    const docsOn = inpatientDocumentationEnabled(flags);
    const nursingOn = inpatientNursingOpsEnabled(opsFlags);
    const ordersOn = inpatientDepartmentalOrdersEnabled(flags);
    const marOn = inpatientMarEnabled(flags);
    const avail = (on: boolean): ClinicalAvailabilityState =>
      on ? "AVAILABLE" : "NOT_CONFIGURED";

    const patientName =
      `${enc.patient?.firstName ?? ""} ${enc.patient?.lastName ?? ""}`.trim() || "—";
    // D4A.3.0 — hospital care team from independent bag only (never ED physician/nurse columns).
    const hospitalAssignment = projectHospitalBoardAssignments(
      readHospitalAssignmentBag(enc.admissionSummaryJson)
    );
    const attendingName = hospitalAssignment.providerName;
    const assignedRnName = hospitalAssignment.nurseName;
    const assignedPctName = hospitalAssignment.technicianName ?? null;
    let ageYears: number | null = null;
    if (enc.patient?.dob) {
      const dob = new Date(enc.patient.dob);
      if (Number.isFinite(dob.getTime())) {
        const now = new Date();
        ageYears = now.getUTCFullYear() - dob.getUTCFullYear();
      }
    }
    const roomParts = String(enc.roomLabel ?? "")
      .split(/[-:]/)
      .map((x) => x.trim())
      .filter(Boolean);
    const unitHint = roomParts[0] ?? null;

    const modules: Record<string, ClinicalAvailabilityState> = {
      header: "AVAILABLE",
      overview: "AVAILABLE",
      historyPhysical: avail(docsOn),
      problemsPlan: avail(docsOn),
      progressNotes: avail(docsOn),
      orders: avail(ordersOn),
      results: avail(ordersOn),
      medications: avail(marOn),
      consults: avail(inpatientConsultsOpsEnabled(opsFlags)),
      carePlan: avail(inpatientCarePlanOpsEnabled(opsFlags)),
      dischargePlanning: avail(inpatientDischargePlanningOpsEnabled(opsFlags)),
      admission: avail(nursingOn),
      nursing: avail(nursingOn),
      timeline: "AVAILABLE",
      summary: "AVAILABLE",
    };

    await this.audit.log(AuditAction.CHART_OPEN, "InpatientWorkspace", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      encounterId: enc.id,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_WORKSPACE_OPENED",
        workspace: options?.workspace ?? "inpatient",
        role,
        hospitalEpisodeId: enc.hospitalEpisodeId,
        accessKind: "OPEN",
        hospitalEpisodeFoundationEnabled:
          this.compatibleEncounters.isHospitalEpisodeFoundationEnabled(),
      },
    });

    return {
      certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
      resolution: {
        ok: true,
        encounterId: enc.id,
        encounterType: "INPATIENT",
        clinicalContext: "INPATIENT",
        facilityId: enc.facilityId,
        patientId: enc.patientId,
        status: String(enc.status),
        hospitalEpisodeId: enc.hospitalEpisodeId,
        writersEnabled: true,
        requestedEncounterId: requested,
        redirectedFromEncounterId: authority.redirected ? requested : null,
      },
      generatedAt,
      header: {
        encounterId: enc.id,
        patientId: enc.patientId,
        patientName,
        preferredName: null,
        mrn: enc.patient?.mrn ?? null,
        dateOfBirth: enc.patient?.dob ? new Date(enc.patient.dob).toISOString() : null,
        ageYears,
        sexAtBirth: enc.patient?.sexAtBirth ?? null,
        preferredLanguage: enc.patient?.language ?? null,
        interpreterRequired: null,
        encounterType: String(enc.type),
        hospitalDay: computeHospitalDay(enc.admittedAt),
        admittedAt: enc.admittedAt ? new Date(enc.admittedAt).toISOString() : null,
        admissionSource: null,
        attendingName,
        assignedRnName,
        assignedPctName,
        residentOrAppName: null,
        facilityName: enc.facility?.name ?? null,
        unit: unitHint,
        room: enc.roomLabel ?? null,
        bed: roomParts.length > 2 ? roomParts[2]! : null,
        levelOfCare: null,
        encounterStatus: String(enc.status),
        chiefConcern: enc.chiefComplaint ?? null,
        codeStatus: ops.codeStatus?.status ?? null,
        isolation: ops.isolation?.precautions ?? null,
        fallRisk: null,
        allergiesSummary: (() => {
          try {
            const profile = patientClinicalHistoryProfileFromJson(
              enc.patient?.clinicalHistoryProfileJson ?? null
            );
            return activeAllergiesSummary(profile?.allergies ?? null).summary;
          } catch {
            return null;
          }
        })(),
        allergiesAvailability: (() => {
          try {
            const profile = patientClinicalHistoryProfileFromJson(
              enc.patient?.clinicalHistoryProfileJson ?? null
            );
            if (!profile) return "SOURCE_UNAVAILABLE" as const;
            return activeAllergiesSummary(profile.allergies ?? null).availability;
          } catch {
            return "SOURCE_UNAVAILABLE" as const;
          }
        })(),
        oxygenSupport: null,
        dietNpo: null,
        weightKg: projectHospitalHeaderVitalsLiteFromJson(
          enc.patient?.latestVitalsJson,
          enc.patient?.latestVitalsAt ? new Date(enc.patient.latestVitalsAt).toISOString() : null
        ).weightKg,
        latestVitals: projectHospitalHeaderVitalsLiteFromJson(
          enc.patient?.latestVitalsJson,
          enc.patient?.latestVitalsAt ? new Date(enc.patient.latestVitalsAt).toISOString() : null
        ),
        indicators: [
          {
            code: "ISOLATION",
            state: (ops.isolation?.precautions?.length ? "PRESENT" : "NOT_DOCUMENTED") as
              | "PRESENT"
              | "NOT_DOCUMENTED",
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.isolation",
          },
          {
            code: "CODE_STATUS",
            state: (ops.codeStatus?.status ? "PRESENT" : "NOT_DOCUMENTED") as
              | "PRESENT"
              | "NOT_DOCUMENTED",
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.codeStatus",
          },
          {
            code: "PERIPHERAL_IV",
            state: "SOURCE_UNAVAILABLE" as const,
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.peripheralIv",
          },
          {
            code: "CENTRAL_LINE",
            state: "SOURCE_UNAVAILABLE" as const,
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.centralLine",
          },
          {
            code: "URINARY_CATHETER",
            state: "SOURCE_UNAVAILABLE" as const,
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.urinaryCatheter",
          },
          {
            code: "TELEMETRY",
            state: "SOURCE_UNAVAILABLE" as const,
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.telemetry",
          },
          {
            code: "CRITICAL_RESULT",
            state: "SOURCE_UNAVAILABLE" as const,
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.criticalResult",
          },
        ],
      },
      readiness: {
        role,
        encounterResolved: true,
        roleAuthorized: true,
        modules,
      },
      alertCounts: {
        criticalResults: null,
        pendingTasks: null,
        escalations: null,
      },
      writersEnabled: true,
    };
  }

  async patchClinicalOps(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    patch: Partial<InpatientClinicalOpsV1> & {
      appendCarePlanItem?: {
        discipline: string;
        goalText: string;
        status?: "ACTIVE" | "MET" | "DISCONTINUED";
      };
      appendConsult?: {
        specialty: string;
        reason: string;
        priority?: "ROUTINE" | "URGENT" | "STAT";
      };
      consultTransition?: {
        consultId: string;
        status: "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED" | "DECLINED" | "CANCELLED";
      };
      appendMedRecon?: {
        sourceLabel: string;
        decision: string;
        reason?: string | null;
      };
      setCodeStatus?: {
        status: string;
        comments?: string | null;
      };
      setIsolation?: {
        precautions: string[];
        reason?: string | null;
      };
      setDischargePlanning?: {
        anticipatedDischargeDate?: string | null;
        destination?: string | null;
        workflowState?: string;
        transportation?: string | null;
        barriers?: string | null;
        homeHealth?: string | null;
        specialNeedsEquipment?: string | null;
        careTeamNotified?: boolean | null;
      };
      /** INP.DIS.1F — finalize canonical inpatientMedRecon on dischargeSummaryJson. */
      finalizeInpatientMedRecon?: {
        lines?: Array<Record<string, unknown>>;
        markComplete?: boolean;
      };
      setNursing?: {
        admissionAssessmentComplete?: boolean;
        lastShiftAssessmentAt?: string | null;
      };
      appendCareTeamAssignment?: {
        role: string;
        assigneeUserId: string;
      };
    },
    options?: { ip?: string; userAgent?: string }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const ops = readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson);
    const now = new Date().toISOString();
    const previousCodeStatus = ops.codeStatus?.status ?? null;
    const previousIsolation = ops.isolation?.precautions ?? null;
    let nextCodeStatus: string | null = previousCodeStatus;
    let nextIsolation: string[] | null = previousIsolation;

    if (patch.setCodeStatus) {
      const status = String(patch.setCodeStatus.status ?? "")
        .trim()
        .toUpperCase();
      if (!(INPATIENT_CODE_STATUSES as readonly string[]).includes(status)) {
        throw new BadRequestException("Invalid code status");
      }
      ops.codeStatus = {
        status: status as InpatientCodeStatus,
        effectiveAt: now,
        documentedByUserId: actorUserId,
        comments: patch.setCodeStatus.comments ?? null,
      };
      nextCodeStatus = status;
    }

    if (patch.setIsolation) {
      const precautions = (patch.setIsolation.precautions ?? [])
        .map((p) => String(p).trim().toUpperCase())
        .filter((p) =>
          (INPATIENT_ISOLATION_PRECAUTIONS as readonly string[]).includes(p)
        ) as InpatientIsolationPrecaution[];
      if (!precautions.length) throw new BadRequestException("Invalid isolation precautions");
      ops.isolation = {
        precautions,
        reason: patch.setIsolation.reason ?? null,
        startedAt: now,
        orderedByUserId: actorUserId,
      };
      nextIsolation = precautions;
    }

    if (patch.appendCarePlanItem) {
      // MEDUI.CP.1A — EncounterCarePlan is the only inpatient Care Plan write authority.
      // Historical ops.carePlan rows remain readable; new writes are rejected.
      throw new BadRequestException("CARE_PLAN_LEGACY_OPS_WRITE_FROZEN");
    }

    if (patch.appendConsult) {
      ops.consults = [
        ...(ops.consults ?? []),
        {
          consultId: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          specialty: String(patch.appendConsult.specialty ?? "").trim(),
          reason: String(patch.appendConsult.reason ?? "").trim(),
          priority: patch.appendConsult.priority ?? "ROUTINE",
          status: "REQUESTED",
          requestedAt: now,
          requestedByUserId: actorUserId,
          completedAt: null,
        },
      ];
    }

    if (patch.consultTransition) {
      const id = patch.consultTransition.consultId;
      ops.consults = (ops.consults ?? []).map((c) => {
        if (c.consultId !== id) return c;
        const status = patch.consultTransition!.status;
        return {
          ...c,
          status,
          completedAt: status === "COMPLETED" ? now : c.completedAt,
        };
      });
    }

    if (patch.appendMedRecon) {
      const decision = String(patch.appendMedRecon.decision ?? "")
        .trim()
        .toUpperCase();
      if (!validateMedReconDecision(decision)) {
        throw new BadRequestException("Invalid medication reconciliation decision");
      }
      ops.medicationReconciliation = [
        ...(ops.medicationReconciliation ?? []),
        {
          lineId: `mr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sourceLabel: String(patch.appendMedRecon.sourceLabel ?? "").trim(),
          decision: decision as MedReconDecision,
          reason: patch.appendMedRecon.reason ?? null,
          actorUserId: actorUserId,
          decidedAt: now,
          resultingOrderId: null,
        },
      ];
    }

    if (patch.setDischargePlanning) {
      const wf = String(patch.setDischargePlanning.workflowState ?? ops.dischargePlanning?.workflowState ?? "PLANNING")
        .trim()
        .toUpperCase();
      if (!(INPATIENT_DISCHARGE_WORKFLOW_STATES as readonly string[]).includes(wf)) {
        throw new BadRequestException("Invalid discharge workflow state");
      }
      const prevPlan = ops.dischargePlanning;
      ops.dischargePlanning = {
        anticipatedDischargeDate:
          patch.setDischargePlanning.anticipatedDischargeDate ??
          prevPlan?.anticipatedDischargeDate ??
          null,
        destination:
          patch.setDischargePlanning.destination ?? prevPlan?.destination ?? null,
        workflowState: wf as InpatientDischargeWorkflowState,
        transportation:
          patch.setDischargePlanning.transportation ?? prevPlan?.transportation ?? null,
        barriers: patch.setDischargePlanning.barriers ?? prevPlan?.barriers ?? null,
        homeHealth:
          patch.setDischargePlanning.homeHealth !== undefined
            ? patch.setDischargePlanning.homeHealth
            : (prevPlan?.homeHealth ?? null),
        specialNeedsEquipment:
          patch.setDischargePlanning.specialNeedsEquipment !== undefined
            ? patch.setDischargePlanning.specialNeedsEquipment
            : (prevPlan?.specialNeedsEquipment ?? null),
        careTeamNotified:
          patch.setDischargePlanning.careTeamNotified !== undefined
            ? patch.setDischargePlanning.careTeamNotified
            : (prevPlan?.careTeamNotified ?? null),
        updatedAt: now,
      };
      if (wf === "READY") {
        const ready = validateInpatientDischargePlanningReady(ops.dischargePlanning);
        if (!ready.ok) {
          throw new BadRequestException({
            code: "PLANNING_NOT_READY",
            errors: ready.errors,
          });
        }
      }
    }

    if (patch.setNursing) {
      ops.nursing = {
        ...(ops.nursing ?? {}),
        ...patch.setNursing,
      };
    }

    // Optional care-team history projection (does not replace Encounter assignment columns)
    if (patch.appendCareTeamAssignment) {
      ops.careTeamHistory = [
        ...(ops.careTeamHistory ?? []),
        {
          assignmentId: `cta-${Date.now()}`,
          role: patch.appendCareTeamAssignment.role,
          assigneeUserId: patch.appendCareTeamAssignment.assigneeUserId,
          startAt: now,
          endAt: null,
          assignedByUserId: actorUserId,
          facilityId,
          encounterId,
        },
      ];
    }

    let nextDischargeSummary: Prisma.InputJsonValue | undefined;
    let medReconAudit:
      | {
          event: string;
          markComplete: boolean;
          medicationCount: number;
          revision: number | null;
        }
      | undefined;
    if (patch.finalizeInpatientMedRecon) {
      const prevRoot =
        enc.dischargeSummaryJson &&
        typeof enc.dischargeSummaryJson === "object" &&
        !Array.isArray(enc.dischargeSummaryJson)
          ? { ...(enc.dischargeSummaryJson as Record<string, unknown>) }
          : {};
      const prevMed =
        prevRoot.inpatientMedRecon &&
        typeof prevRoot.inpatientMedRecon === "object" &&
        !Array.isArray(prevRoot.inpatientMedRecon)
          ? { ...(prevRoot.inpatientMedRecon as Record<string, unknown>) }
          : {};
      const linesFromOps = (ops.medicationReconciliation ?? []).map((line) => ({
        id: line.lineId,
        sourceLabel: line.sourceLabel,
        decision: line.decision,
        reason: line.reason ?? null,
      }));
      const lines =
        Array.isArray(patch.finalizeInpatientMedRecon.lines) &&
        patch.finalizeInpatientMedRecon.lines.length > 0
          ? patch.finalizeInpatientMedRecon.lines
          : Array.isArray(prevMed.lines) && (prevMed.lines as unknown[]).length > 0
            ? (prevMed.lines as Array<Record<string, unknown>>)
            : linesFromOps;
      // Draft (markComplete === false) must not set finalizedAt.
      // Omitted markComplete still finalizes (legacy completeMedRec shortcut).
      const markComplete = patch.finalizeInpatientMedRecon.markComplete !== false;
      const hydratedLines = lines
        .map((raw) => hydrateInpatientDischargeMedReconLine(raw))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));
      const providerDoc = hydrateInpatientProviderDischarge1C(
        prevRoot.inpatientProviderDischarge
      );
      const effectiveLines = mergeSavedMedReconWithCurrentProviderPlan({
        savedLines: hydratedLines,
        providerDischargeMedications: providerDoc?.dischargeMedications ?? null,
      });
      if (
        markComplete &&
        !isInpatientMedReconEffectivelyComplete({
          storedComplete: true,
          lines: effectiveLines,
        })
      ) {
        throw new BadRequestException("MEDICATION_RECONCILIATION_INCOMPLETE");
      }
      const priorRevision =
        typeof prevMed.revision === "number" && Number.isFinite(prevMed.revision)
          ? prevMed.revision
          : 0;
      const nextRevision = priorRevision + 1;
      prevRoot.inpatientMedRecon = {
        ...prevMed,
        schemaVersion: "INP.DIS.1A",
        lines: markComplete && effectiveLines.length > 0 ? effectiveLines : lines,
        revision: nextRevision,
        finalizedAt: markComplete ? now : null,
        finalizedByUserId: markComplete ? actorUserId : null,
      };
      nextDischargeSummary = prevRoot as Prisma.InputJsonValue;
      medReconAudit = {
        event: markComplete
          ? "INPATIENT_MED_RECON_FINALIZED"
          : "INPATIENT_MED_RECON_DRAFT_SAVED",
        markComplete,
        medicationCount: lines.length,
        revision: nextRevision,
      };

      // Longitudinal home meds via existing Patient.clinicalHistoryProfileJson only.
      // No new PatientMedication table — summary-based homeMedications section.
      if (markComplete) {
        const projected = projectPostDischargeHomeMedicationsFromRecon(effectiveLines);
        const patient = await this.prisma.patient.findFirst({
          where: { id: enc.patientId, facilityId },
          select: { id: true, clinicalHistoryProfileJson: true },
        });
        if (patient) {
          const current = patientClinicalHistoryProfileFromJson(
            patient.clinicalHistoryProfileJson
          );
          const profile = {
            ...(current ?? {
              version: PATIENT_CLINICAL_HISTORY_PROFILE_VERSION,
              provenance: {},
            }),
            updatedAt: now,
            updatedBy: actorUserId,
            homeMedications: projected,
            provenance: {
              ...(current?.provenance ?? {}),
              homeMedications: {
                sourceEncounterId: enc.id,
                sourceFacilityId: facilityId,
                sourceType: "reconciled_update" as const,
                lastReviewedAt: now,
                reviewerId: actorUserId,
              },
            },
          };
          await this.prisma.patient.update({
            where: { id: patient.id },
            data: {
              clinicalHistoryProfileJson: profile as unknown as Prisma.InputJsonValue,
            },
          });
        }
      }
    }

    const nextSummary = mergeInpatientClinicalOpsIntoAdmissionSummary(
      enc.admissionSummaryJson,
      ops
    );

    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: nextSummary as Prisma.InputJsonValue,
        ...(nextDischargeSummary !== undefined
          ? { dischargeSummaryJson: nextDischargeSummary }
          : {}),
        version: { increment: 1 },
      },
      select: { id: true },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: enc.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_CLINICAL_OPS_PATCHED",
        keys: Object.keys(patch),
        originModule: "inpatientClinicalOps",
        ...(medReconAudit ? { medRecon: medReconAudit } : {}),
        ...(patch.setCodeStatus
          ? { codeStatus: { previous: previousCodeStatus, next: nextCodeStatus } }
          : {}),
        ...(patch.setIsolation
          ? { isolation: { previous: previousIsolation, next: nextIsolation } }
          : {}),
      },
    });

    return {
      encounterId: enc.id,
      facilityId,
      ops: readInpatientClinicalOpsFromAdmissionSummary(nextSummary),
    };
  }

  /**
   * D4A.1 — Load or initialize Med/Surg nursing admission documentation with longitudinal preload.
   * Patient history is preloaded with provenance; never treated as newly verified.
   */
  async getNursingAdmissionDocumentation(facilityId: string, encounterId: string) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const existing = readMedSurgNursingAdmissionFromSummary(enc.admissionSummaryJson);
    if (existing) {
      const corr = readHospitalAdmissionCorrelation(enc.admissionSummaryJson);
      const documentation = await this.overlayNursingAdmissionPreloadFromProfile({
        facilityId,
        patientId: enc.patientId,
        sourceEncounterId: corr?.sourceEncounterId ?? existing.sourceEncounterId ?? null,
        doc: existing,
      });
      return {
        certification: MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID,
        documentation,
        completion: computeAdmissionCompletionSummary(documentation),
      };
    }

    const corr = readHospitalAdmissionCorrelation(enc.admissionSummaryJson);
    const sourceEncounterId = corr?.sourceEncounterId ?? null;
    const patient = await this.prisma.patient.findFirst({
      where: { id: enc.patientId, facilityId },
      select: { clinicalHistoryProfileJson: true },
    });
    const profile = patientClinicalHistoryProfileFromJson(
      patient?.clinicalHistoryProfileJson ?? null
    );
    const preloadedItems = buildAdmissionPreloadFromPatientProfile({
      profile,
      sourceEncounterId,
    });
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: enc.patientId,
      facilityId,
      encounterId: enc.id,
      sourceEncounterId,
    });
    doc.preloadedItems = preloadedItems;
    doc.homeMedicationLines = buildHomeMedReconLinesFromPreload(preloadedItems);

    const nextSummary = mergeMedSurgNursingAdmissionIntoSummary(
      enc.admissionSummaryJson,
      doc
    );
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: nextSummary as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });

    return {
      certification: MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID,
      documentation: doc,
      completion: computeAdmissionCompletionSummary(doc),
    };
  }

  async reviewNursingAdmissionDocumentation(facilityId: string, encounterId: string) {
    const payload = await this.getNursingAdmissionDocumentation(facilityId, encounterId);
    const domainReview = reviewNursingAdmissionWithDomains(payload.documentation);
    return {
      certification: NURSING_DOMAIN_INTEGRATION_CERTIFICATION_ID,
      legacyCertification: INPATIENT_LIFECYCLE_NURSING_ADMISSION_CERTIFICATION_ID,
      review: {
        ...reviewNursingAdmission(payload.documentation),
        ...domainReview,
        providerHpNotRequired: true,
      },
      completion: payload.completion,
      documentation: payload.documentation,
    };
  }

  /**
   * D4A.2.5A / D4A.2.6H — Link enterprise domain record without copying payload.
   * Rejects synthetic IDs; resolves EDOC rows for encounter/patient/facility match.
   */
  async linkNursingAdmissionDomainReference(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      reference: NursingAdmissionDomainReferenceV1;
      expectedVersion: number;
    }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getNursingAdmissionDocumentation(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readMedSurgNursingAdmissionFromSummary(fresh.admissionSummaryJson) ??
      boot.documentation;

    const incoming = body.reference;
    const gate = assertReferenceIsLinkable(incoming);
    if (!gate.ok) {
      await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
        userId: actorUserId,
        facilityId,
        patientId: enc.patientId,
        entityId: enc.id,
        metadata: {
          event: "NURSING_DOMAIN_SYNTHETIC_REFERENCE_REJECTED",
          domain: incoming.domain,
          code: gate.code,
        },
      });
      throw new BadRequestException(gate.code);
    }

    const domain = String(incoming.domain ?? "").trim() as NursingAdmissionDomainKey;
    let referenceToStore: NursingAdmissionDomainReferenceV1 = {
      ...incoming,
      domain,
      source: "ENTERPRISE_DOMAIN",
    };

    if (domainRequiresPersistedEdocId(domain)) {
      if (!isPersistedEdocRecordId(incoming.recordId)) {
        throw new BadRequestException("DOMAIN_REFERENCE_SYNTHETIC");
      }
      const row = await this.prisma.encounterClinicalDocumentationEntry.findFirst({
        where: { id: String(incoming.recordId).trim(), facilityId },
        select: {
          id: true,
          facilityId: true,
          encounterId: true,
          patientId: true,
          category: true,
          cardId: true,
          createdAt: true,
          voidedAt: true,
          authorUserId: true,
          authorDisplayNameSnapshot: true,
        },
      });
      const resolved: ResolvedDomainRecordLite | null = row
        ? {
            id: row.id,
            facilityId: row.facilityId,
            encounterId: row.encounterId,
            patientId: row.patientId,
            category: row.category,
            cardId: row.cardId,
            createdAt: row.createdAt.toISOString(),
            voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
            authorUserId: row.authorUserId,
            authorDisplayName: row.authorDisplayNameSnapshot,
          }
        : null;
      const classification = classifyDomainReference({
        reference: incoming,
        expectedEncounterId: enc.id,
        expectedPatientId: enc.patientId,
        expectedFacilityId: facilityId,
        resolved,
        expectedDomain: domain,
      });
      if (!classification.authoritative || !resolved) {
        await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
          userId: actorUserId,
          facilityId,
          patientId: enc.patientId,
          entityId: enc.id,
          metadata: {
            event: "NURSING_DOMAIN_REFERENCE_RESOLUTION_FAILED",
            state: classification.state,
            reasons: classification.reasons,
          },
        });
        throw new BadRequestException(
          classification.reasons[0] ?? "DOMAIN_REFERENCE_UNRESOLVED"
        );
      }
      referenceToStore = buildAuthoritativeReferenceFromEdoc({
        domain,
        sectionId: (incoming.sectionId ?? "OVERVIEW") as InpatientAdmissionClinicalSection,
        row: resolved,
        actorUserId,
        status: incoming.status ?? "LINKED",
      });
    }

    const priorSynthetic = nursingDocDomainReferences(doc).some(
      (r) =>
        r.sectionId === referenceToStore.sectionId &&
        isSyntheticDomainRecordId(r.recordId)
    );

    const result = linkNursingDomainReference({
      doc,
      reference: referenceToStore,
      clientExpectedVersion: Number(body.expectedVersion),
      actorUserId,
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeMedSurgNursingAdmissionIntoSummary(
          fresh.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: {
        event: priorSynthetic
          ? "NURSING_DOMAIN_LEGACY_REFERENCE_REPLACED"
          : "NURSING_ADMISSION_DOMAIN_LINKED",
        domain: referenceToStore.domain,
        recordId: referenceToStore.recordId,
        sectionId: referenceToStore.sectionId ?? null,
        source: "ENTERPRISE_DOMAIN",
        certification: AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID,
      },
    });
    const sectionId = (referenceToStore.sectionId ??
      "OVERVIEW") as InpatientAdmissionClinicalSection;
    return {
      certification: AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID,
      documentation: result.doc,
      completion: computeAdmissionCompletionSummary(result.doc),
      projection: projectAuthoritativeSectionCompletion({
        doc: result.doc,
        sectionId,
        expectedEncounterId: enc.id,
        expectedPatientId: enc.patientId,
        expectedFacilityId: facilityId,
      }),
    };
  }

  /**
   * D4A.2.5A — Post-sign addendum / correction / entered-in-error.
   * RN-authored only — ADMIN/PROVIDER cannot clinically rewrite nursing content here.
   */
  async createNursingAdmissionAmendment(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    actorRoles: string[],
    body: {
      type: string;
      clientRequestId: string;
      reason: string;
      note?: string | null;
      sectionId?: string | null;
      originalValue?: unknown;
      correctedValue?: unknown;
      linkedDomainRecordIds?: string[];
      expectedVersion: number;
      expectedAmendmentVersion?: number;
      credentials?: string | null;
    }
  ) {
    const isRn = actorRoles.includes("RN");
    if (!isRn) {
      throw new ForbiddenException("NURSING_ADMISSION_AMENDMENT_NOT_AUTHORIZED");
    }
    const enc = await this.loadEncounterForNursingAmendment(facilityId, encounterId);
    const lifecycle = readInpatientLifecycleMeta(enc.admissionSummaryJson);
    const doc = readMedSurgNursingAdmissionFromSummary(enc.admissionSummaryJson);
    if (!doc) throw new NotFoundException("Nursing admission documentation not found");
    const policy = nursingAmendmentPolicyForEncounterState({
      encounterStatus: String(enc.status),
      voided: Boolean(lifecycle?.voidedAt),
      cancelled: Boolean(lifecycle?.cancelledAt),
      nursingSigned: Boolean(doc.nurseSignature?.signed),
    });
    if (policy === "DENY" || policy === "READ_ONLY") {
      throw new ForbiddenException("AMENDMENT_NOT_ALLOWED_FOR_ENCOUNTER_STATE");
    }
    if (policy === "ADMINISTRATIVE_ONLY" && String(body.type).toUpperCase() !== "ENTERED_IN_ERROR") {
      throw new ForbiddenException("AMENDMENT_NOT_ALLOWED_FOR_ENCOUNTER_STATE");
    }
    const type = String(body.type ?? "").trim().toUpperCase() as NursingAmendmentType;
    const result = appendNursingAdmissionAmendment({
      doc,
      type,
      clientRequestId: String(body.clientRequestId ?? "").trim(),
      reason: String(body.reason ?? ""),
      note: body.note ?? null,
      sectionId: body.sectionId
        ? (String(body.sectionId).trim() as InpatientAdmissionClinicalSection)
        : null,
      originalValue: body.originalValue,
      correctedValue: body.correctedValue,
      linkedDomainRecordIds: Array.isArray(body.linkedDomainRecordIds)
        ? body.linkedDomainRecordIds.map(String)
        : [],
      actorUserId,
      credentials: body.credentials ?? null,
      role: "RN",
      clientExpectedVersion: Number(body.expectedVersion),
      expectedAmendmentVersion:
        body.expectedAmendmentVersion != null
          ? Number(body.expectedAmendmentVersion)
          : undefined,
    });
    if (!result.ok) {
      if (result.code === "NURSING_ADMISSION_NOT_DOCUMENT_OWNER") {
        throw new ForbiddenException(result.code);
      }
      if (result.code === "NURSING_ADMISSION_OWNER_UNRESOLVED") {
        throw new ForbiddenException(result.code);
      }
      if (result.code === "NURSING_ADMISSION_AMENDMENT_NOT_AUTHORIZED") {
        throw new BadRequestException(result.code);
      }
      throw new ConflictException(result.code);
    }
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeMedSurgNursingAdmissionIntoSummary(
          enc.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: {
        event:
          type === "CORRECTION"
            ? "NURSING_ADMISSION_CORRECTION_CREATED"
            : type === "ENTERED_IN_ERROR"
              ? "NURSING_ADMISSION_ENTERED_IN_ERROR"
              : enc.status !== EncounterStatus.OPEN
                ? "NURSING_ADMISSION_ADDENDUM_AFTER_DISCHARGE"
                : "NURSING_ADMISSION_ADDENDUM_CREATED",
        amendmentId: result.amendment.amendmentId,
        type,
        sectionId: result.amendment.sectionId ?? null,
        documentRevision: result.amendment.documentRevisionAtCreate,
        encounterStatus: enc.status,
      },
    });
    return {
      certification: AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID,
      documentation: result.doc,
      amendment: result.amendment,
    };
  }

  /** D4A.2.5A / D4A.2.6H — Authoritative print summary (never trust unsaved client state). */
  async getNursingAdmissionPrintSummary(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    requestId?: string | null
  ) {
    const enc = await this.loadEncounterForNursingRead(facilityId, encounterId);
    const documentation =
      readMedSurgNursingAdmissionFromSummary(enc.admissionSummaryJson) ??
      emptyMedSurgNursingAdmissionDocV1({
        patientId: enc.patientId,
        facilityId,
        encounterId: enc.id,
      });
    const printEnc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        admittedAt: true,
        roomLabel: true,
        physicianAssignedUserId: true,
        physicianAssigned: {
          select: { firstName: true, lastName: true },
        },
      },
    });
    const attendingName = printEnc?.physicianAssigned
      ? `${printEnc.physicianAssigned.firstName ?? ""} ${printEnc.physicianAssigned.lastName ?? ""}`.trim()
      : null;
    const patient = await this.prisma.patient.findFirst({
      where: { id: enc.patientId, facilityId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mrn: true,
        dob: true,
        sexAtBirth: true,
      },
    });
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, name: true },
    });

    const refs = nursingDocDomainReferences(documentation);
    const edocIds = refs
      .map((r) => r.recordId)
      .filter((id) => isPersistedEdocRecordId(id));
    const edocRows =
      edocIds.length > 0
        ? await this.prisma.encounterClinicalDocumentationEntry.findMany({
            where: { facilityId, id: { in: edocIds } },
            select: {
              id: true,
              facilityId: true,
              encounterId: true,
              patientId: true,
              category: true,
              cardId: true,
              createdAt: true,
              voidedAt: true,
              authorUserId: true,
              authorDisplayNameSnapshot: true,
            },
          })
        : [];
    const resolvedByRecordId: Record<string, ResolvedDomainRecordLite | null> = {};
    for (const id of edocIds) resolvedByRecordId[id] = null;
    for (const row of edocRows) {
      resolvedByRecordId[row.id] = {
        id: row.id,
        facilityId: row.facilityId,
        encounterId: row.encounterId,
        patientId: row.patientId,
        category: row.category,
        cardId: row.cardId,
        createdAt: row.createdAt.toISOString(),
        voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
        authorUserId: row.authorUserId,
        authorDisplayName: row.authorDisplayNameSnapshot,
      };
    }

    const domainLoadErrors: Partial<Record<InpatientAdmissionClinicalSection, string>> = {};
    const resolvedRefMeta: Array<{
      sectionId: string;
      recordId: string;
      state: string;
      clinicalTimestamp: string | null;
    }> = [];
    for (const sectionId of INPATIENT_ADMISSION_CLINICAL_SECTIONS) {
      const integration = nursingSectionIntegration(sectionId);
      if (integration.writeMode !== "EMBED_CANONICAL_EDITOR") continue;
      const projection = projectAuthoritativeSectionCompletion({
        doc: documentation,
        sectionId,
        expectedEncounterId: enc.id,
        expectedPatientId: enc.patientId,
        expectedFacilityId: facilityId,
        resolvedByRecordId,
      });
      if (projection.requiresDomainRecord && projection.authoritativeLinkedCount === 0) {
        domainLoadErrors[sectionId] =
          projection.legacySyntheticCount > 0
            ? `Legacy synthetic reference — Unable to load ${sectionId} at print time`
            : `Authoritative ${sectionId} assessment unavailable`;
      }
      for (const ref of refs.filter((r) => r.sectionId === sectionId)) {
        const resolved = resolvedByRecordId[ref.recordId] ?? null;
        const c = classifyDomainReference({
          reference: ref,
          expectedEncounterId: enc.id,
          expectedPatientId: enc.patientId,
          expectedFacilityId: facilityId,
          resolved,
          expectedDomain:
            integration.authoritativeDomain === "ADMISSION_OWNED"
              ? null
              : (integration.authoritativeDomain as NursingAdmissionDomainKey),
        });
        resolvedRefMeta.push({
          sectionId,
          recordId: isSyntheticDomainRecordId(ref.recordId) ? "REDACTED_SYNTHETIC" : ref.recordId,
          state: c.state,
          clinicalTimestamp: resolved?.createdAt ?? null,
        });
      }
    }

    const ops = readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson);
    const codeStatus = resolveAuthoritativeCodeStatus(ops);
    const isolation = resolveAuthoritativeIsolation(ops);

    const summary = buildNursingAdmissionPrintSummary({
      doc: documentation,
      facility: { id: facilityId, name: facility?.name ?? null },
      patient: {
        id: enc.patientId,
        legalName: patient
          ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim()
          : null,
        mrn: patient?.mrn ?? null,
        dob: patient?.dob ? patient.dob.toISOString() : null,
        sexAtBirth: patient?.sexAtBirth ?? null,
      },
      encounter: {
        id: enc.id,
        admittedAt: printEnc?.admittedAt ? printEnc.admittedAt.toISOString() : null,
        unit: null,
        roomBed: printEnc?.roomLabel ?? null,
        attending: attendingName || null,
      },
      domainLoadErrors,
    });
    await this.audit.log(AuditAction.ENCOUNTER_VIEW, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: {
        event: "NURSING_ADMISSION_SUMMARY_PRINTED",
        documentRevision: summary.documentRevision,
        printType: "NURSING_ADMISSION_SUMMARY",
        printStatus: summary.printStatus,
        requestId: requestId ?? null,
        unresolvedReferenceCount: Object.keys(domainLoadErrors).length,
        referencedDomainCount: resolvedRefMeta.length,
        referencedDomains: resolvedRefMeta,
        codeStatusDocumented: codeStatus.documented,
        isolationDocumented: isolation.documented,
        certification: AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID,
      },
    });
    return {
      ...summary,
      certification: AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID,
      authoritativeCodeStatus: codeStatus,
      authoritativeIsolation: isolation,
      referenceResolution: resolvedRefMeta,
    };
  }

  /** D4A.2.6H — Provider projection over authoritative domain records only. */
  async getInpatientAuthoritativeClinicalProjection(
    facilityId: string,
    encounterId: string
  ) {
    const enc = await this.loadEncounterForNursingRead(facilityId, encounterId);
    const documentation =
      readMedSurgNursingAdmissionFromSummary(enc.admissionSummaryJson) ??
      emptyMedSurgNursingAdmissionDocV1({
        patientId: enc.patientId,
        facilityId,
        encounterId: enc.id,
      });
    const ops = readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson);
    const refs = nursingDocDomainReferences(documentation);
    const edocIds = refs.map((r) => r.recordId).filter((id) => isPersistedEdocRecordId(id));
    const edocRows =
      edocIds.length > 0
        ? await this.prisma.encounterClinicalDocumentationEntry.findMany({
            where: { facilityId, id: { in: edocIds } },
            select: {
              id: true,
              facilityId: true,
              encounterId: true,
              patientId: true,
              category: true,
              cardId: true,
              createdAt: true,
              voidedAt: true,
              authorUserId: true,
              authorDisplayNameSnapshot: true,
            },
          })
        : [];
    const resolvedByRecordId: Record<string, ResolvedDomainRecordLite | null> = {};
    for (const row of edocRows) {
      resolvedByRecordId[row.id] = {
        id: row.id,
        facilityId: row.facilityId,
        encounterId: row.encounterId,
        patientId: row.patientId,
        category: row.category,
        cardId: row.cardId,
        createdAt: row.createdAt.toISOString(),
        voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
        authorUserId: row.authorUserId,
        authorDisplayName: row.authorDisplayNameSnapshot,
      };
    }
    const currentPain = await this.prisma.encounterClinicalDocumentationEntry.findFirst({
      where: {
        facilityId,
        encounterId: enc.id,
        voidedAt: null,
        cardId: { contains: "pain" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        facilityId: true,
        encounterId: true,
        patientId: true,
        category: true,
        cardId: true,
        createdAt: true,
        voidedAt: true,
        authorUserId: true,
        authorDisplayNameSnapshot: true,
      },
    });
    const toLite = (row: typeof currentPain): ResolvedDomainRecordLite | null =>
      row
        ? {
            id: row.id,
            facilityId: row.facilityId,
            encounterId: row.encounterId,
            patientId: row.patientId,
            category: row.category,
            cardId: row.cardId,
            createdAt: row.createdAt.toISOString(),
            voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
            authorUserId: row.authorUserId,
            authorDisplayName: row.authorDisplayNameSnapshot,
          }
        : null;

    return {
      certification: AUTHORITATIVE_DOMAIN_LINKAGE_CERTIFICATION_ID,
      encounterId: enc.id,
      codeStatus: resolveAuthoritativeCodeStatus(ops),
      isolation: resolveAuthoritativeIsolation(ops),
      pain: buildProviderDomainProjection({
        domain: "PAIN_EDOC13",
        admissionRefs: refs,
        resolvedByRecordId,
        expectedEncounterId: enc.id,
        expectedPatientId: enc.patientId,
        expectedFacilityId: facilityId,
        currentRecord: toLite(currentPain),
      }),
      fallRisk: buildProviderDomainProjection({
        domain: "FALL_SAFETY_EDOC14",
        admissionRefs: refs,
        resolvedByRecordId,
        expectedEncounterId: enc.id,
        expectedPatientId: enc.patientId,
        expectedFacilityId: facilityId,
      }),
      wounds: buildProviderDomainProjection({
        domain: "SKIN_WOUND_EDOC20",
        admissionRefs: refs,
        resolvedByRecordId,
        expectedEncounterId: enc.id,
        expectedPatientId: enc.patientId,
        expectedFacilityId: facilityId,
      }),
    };
  }

  async patchNursingAdmissionSection(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      sectionId: string;
      draftText?: string | null;
      answers?: Record<string, unknown> | null;
      unableReason?: string | null;
      completionState?: string | null;
      expectedVersion: number;
      clinicalDocumentedAt?: string | null;
    }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    let doc =
      readMedSurgNursingAdmissionFromSummary(enc.admissionSummaryJson) ??
      (
        await this.getNursingAdmissionDocumentation(facilityId, encounterId)
      ).documentation;
    // Re-read after possible init
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    doc =
      readMedSurgNursingAdmissionFromSummary(fresh.admissionSummaryJson) ?? doc;

    const sectionId = String(body.sectionId ?? "").trim() as InpatientAdmissionClinicalSection;
    const completionState = body.completionState
      ? String(body.completionState).trim()
      : null;
    if (completionState && !isAdmissionCompletionState(completionState)) {
      throw new BadRequestException("Invalid completionState");
    }

    const answers =
      body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
        ? body.answers
        : undefined;
    if (completionState === "COMPLETE" || completionState === "UNABLE_TO_COMPLETE") {
      const validation = validateSectionAnswersForCompletion({
        sectionId,
        answers: answers ?? (doc.sections[sectionId]?.answers as Record<string, unknown>) ?? {},
        completionState: completionState as AdmissionSectionCompletionState,
        unableReason: body.unableReason ?? doc.sections[sectionId]?.unableReason,
      });
      if (!validation.ok) {
        this.logger.warn({
          event: "SECTION_SAVE_FAILURE",
          code: "SECTION_VALIDATION_FAILED",
          sectionId,
          facilityId,
          encounterRef: this.clinicalLogRef(encounterId),
          expectedVersion: Number(body.expectedVersion),
        });
        throw new BadRequestException({
          code: "SECTION_VALIDATION_FAILED",
          missing: validation.missing,
        });
      }
    }

    let clinicalDocumentedAt: string | null | undefined = body.clinicalDocumentedAt;
    if (typeof clinicalDocumentedAt === "string") {
      const parsed = Date.parse(clinicalDocumentedAt);
      if (!Number.isFinite(parsed)) {
        throw new BadRequestException("clinicalDocumentedAt must be an ISO timestamp");
      }
      clinicalDocumentedAt = new Date(parsed).toISOString();
    }

    const requestedVersion = Number(body.expectedVersion);
    let draftExpectedVersion = requestedVersion;

    if (completionState === "COMPLETE" && sectionNeedsAuthoritativeEdocWriteThrough(sectionId)) {
      if (requestedVersion !== doc.expectedVersion) {
        throw new ConflictException("EXPECTED_VERSION_CONFLICT");
      }
      const writeAnswers =
        answers ?? (doc.sections[sectionId]?.answers as Record<string, unknown>) ?? {};
      const plan = buildNursingAdmissionWriteThrough({
        sectionId,
        answers: writeAnswers,
        clinicalDocumentedAt,
      });
      if (!plan.ok) {
        throw new BadRequestException({
          code: "SECTION_VALIDATION_FAILED",
          missing: plan.missing,
        });
      }
      if (!plan.skip) {
        const row = await this.clinicalDocumentation.upsertLatestActiveEntryForCard(
          facilityId,
          enc.id,
          {
            category: plan.category,
            cardId: plan.cardId,
            payloadJson: plan.payload,
          },
          actorUserId
        );
        const lite: ResolvedDomainRecordLite = {
          id: row.id,
          facilityId: row.facilityId,
          encounterId: row.encounterId,
          patientId: row.patientId,
          category: row.category,
          cardId: row.cardId,
          createdAt: row.createdAt.toISOString(),
          voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
          authorUserId: row.authorUserId,
          authorDisplayName: row.authorDisplayNameSnapshot,
        };
        const linked = linkNursingDomainReference({
          doc,
          clientExpectedVersion: requestedVersion,
          actorUserId,
          reference: buildAuthoritativeReferenceFromEdoc({
            domain: plan.domain,
            sectionId,
            row: lite,
            actorUserId,
            status: "LINKED",
          }),
        });
        if (!linked.ok) {
          throw new ConflictException(linked.code);
        }
        doc = linked.doc;
        draftExpectedVersion = doc.expectedVersion;
      }
    }

    const result = saveAdmissionSectionDraft({
      doc,
      sectionId,
      draftText: body.draftText,
      answers,
      unableReason: body.unableReason,
      completionState: completionState as AdmissionSectionCompletionState | undefined,
      clientExpectedVersion: draftExpectedVersion,
      actorUserId,
      clinicalDocumentedAt,
    });
    if (!result.ok) {
      this.logger.warn({
        event: "SECTION_SAVE_FAILURE",
        code: result.code,
        sectionId,
        facilityId,
        encounterRef: this.clinicalLogRef(encounterId),
        expectedVersion: draftExpectedVersion,
      });
      if (result.code === "NURSING_ADMISSION_NOT_DOCUMENT_OWNER") {
        throw new ForbiddenException(result.code);
      }
      if (result.code === "NURSING_ADMISSION_OWNER_UNRESOLVED") {
        throw new ForbiddenException(result.code);
      }
      throw new ConflictException(result.code);
    }

    // D4A.2.6H — EDOC sections need an authoritative (non-synthetic) linked record.
    if (completionState === "COMPLETE") {
      const resolvedByRecordId = await this.resolveNursingAdmissionEdocRecords({
        facilityId,
        encounterId: enc.id,
        recordIds: nursingDocDomainReferences(result.doc).map((r) => r.recordId),
      });
      const projection = projectAuthoritativeSectionCompletion({
        doc: result.doc,
        sectionId,
        expectedEncounterId: enc.id,
        expectedPatientId: enc.patientId,
        expectedFacilityId: facilityId,
        resolvedByRecordId,
      });
      if (
        projection.requiresDomainRecord &&
        projection.authoritativeLinkedCount === 0
      ) {
        this.logger.warn({
          event: "SECTION_SAVE_FAILURE",
          code: "AUTHORITATIVE_DOMAIN_RECORD_REQUIRED",
          sectionId,
          facilityId,
          encounterRef: this.clinicalLogRef(encounterId),
          expectedVersion: draftExpectedVersion,
        });
        throw new BadRequestException({
          code: "AUTHORITATIVE_DOMAIN_RECORD_REQUIRED",
          sectionId,
          authoritativeDomain: projection.authoritativeDomain,
          reasons: projection.reasons,
        });
      }
    }

    const ops = readInpatientClinicalOpsFromAdmissionSummary(fresh.admissionSummaryJson);
    const summary = computeAdmissionCompletionSummary(result.doc);
    ops.nursing = {
      ...(ops.nursing ?? {}),
      admissionAssessmentComplete: summary.allRequiredComplete,
    };
    let nextSummary = mergeMedSurgNursingAdmissionIntoSummary(
      fresh.admissionSummaryJson,
      result.doc
    );
    nextSummary = mergeInpatientClinicalOpsIntoAdmissionSummary(nextSummary, ops);

    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: nextSummary as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: {
        event: "NURSING_ADMISSION_SECTION_DRAFT",
        sectionId,
        expectedVersion: result.doc.expectedVersion,
      },
    });

    this.logger.log({
      event: "SECTION_SAVE_SUCCESS",
      sectionId,
      facilityId,
      encounterRef: this.clinicalLogRef(encounterId),
      expectedVersion: requestedVersion,
      returnedVersion: result.doc.expectedVersion,
    });

    return {
      documentation: result.doc,
      completion: computeAdmissionCompletionSummary(result.doc),
    };
  }

  async verifyNursingAdmissionPreloadItem(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      itemId: string;
      status: string;
      encounterNote?: string | null;
      expectedVersion: number;
    }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getNursingAdmissionDocumentation(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const stored =
      readMedSurgNursingAdmissionFromSummary(fresh.admissionSummaryJson) ??
      boot.documentation;

    if (Number(body.expectedVersion) !== stored.expectedVersion) {
      this.logger.warn({
        event: "VERIFY_PRELOAD_FAILURE",
        code: "EXPECTED_VERSION_CONFLICT",
        facilityId,
        encounterRef: this.clinicalLogRef(encounterId),
        expectedVersion: body.expectedVersion,
        returnedVersion: stored.expectedVersion,
      });
      throw new ConflictException("EXPECTED_VERSION_CONFLICT");
    }
    if (!isAdmissionHistoryVerificationStatus(body.status)) {
      this.logger.warn({
        event: "VERIFY_PRELOAD_FAILURE",
        code: "INVALID_STATUS",
        facilityId,
        encounterRef: this.clinicalLogRef(encounterId),
        expectedVersion: body.expectedVersion,
      });
      throw new BadRequestException("Invalid verification status");
    }
    const corr = readHospitalAdmissionCorrelation(fresh.admissionSummaryJson);
    const doc = await this.overlayNursingAdmissionPreloadFromProfile({
      facilityId,
      patientId: enc.patientId,
      sourceEncounterId: corr?.sourceEncounterId ?? stored.sourceEncounterId ?? null,
      doc: stored,
    });
    const idx = doc.preloadedItems.findIndex((i) => i.itemId === body.itemId);
    if (idx < 0) {
      this.logger.warn({
        event: "VERIFY_PRELOAD_FAILURE",
        code: "PRELOAD_ITEM_NOT_FOUND",
        facilityId,
        encounterRef: this.clinicalLogRef(encounterId),
        expectedVersion: body.expectedVersion,
      });
      throw new BadRequestException({
        code: "PRELOAD_ITEM_NOT_FOUND",
        itemId: body.itemId,
      });
    }

    const nextItems = [...doc.preloadedItems];
    nextItems[idx] = applyHistoryVerification({
      item: nextItems[idx]!,
      status: body.status as AdmissionHistoryVerificationStatus,
      actorUserId,
      encounterNote: body.encounterNote ?? null,
    });

    const nextDoc: MedSurgNursingAdmissionDocV1 = {
      ...doc,
      preloadedItems: nextItems,
      expectedVersion: doc.expectedVersion + 1,
      updatedAt: new Date().toISOString(),
      updatedByUserId: actorUserId,
    };

    const nextSummary = mergeMedSurgNursingAdmissionIntoSummary(
      fresh.admissionSummaryJson,
      nextDoc
    );
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: nextSummary as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: {
        event: "NURSING_ADMISSION_HISTORY_VERIFICATION",
        itemId: body.itemId,
        status: body.status,
      },
    });

    this.logger.log({
      event: "VERIFY_PRELOAD_SUCCESS",
      facilityId,
      encounterRef: this.clinicalLogRef(encounterId),
      expectedVersion: body.expectedVersion,
      returnedVersion: nextDoc.expectedVersion,
    });

    return { documentation: nextDoc };
  }

  async signNursingAdmission(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      expectedVersion: number;
      credentials?: string | null;
      displayName?: string | null;
      createProviderHandoff?: boolean;
    }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    await this.getNursingAdmissionDocumentation(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc = readMedSurgNursingAdmissionFromSummary(fresh.admissionSummaryJson);
    if (!doc) throw new NotFoundException("Nursing admission documentation not found");

    const opsForStage = readInpatientClinicalOpsFromAdmissionSummary(fresh.admissionSummaryJson);
    const orderRows = await this.prisma.order.findMany({
      where: { encounterId: enc.id, facilityId },
      include: { items: true },
    });
    const orders = orderRows.map((row) => ({
      id: row.id,
      encounterId: row.encounterId,
      type: row.type,
      status: row.status,
      items: row.items.map((item) => ({
        id: item.id,
        status: item.status,
        catalogItemType: item.catalogItemType,
      })),
    }));
    const projection = projectNursingAdmissionStage6({
      doc,
      ops: opsForStage,
      orders,
    });
    this.logger.log({
      event: "STAGE6_PROJECTION",
      sectionId: "PROVIDER_ADMISSION",
      facilityId,
      encounterRef: this.clinicalLogRef(encounterId),
      satisfied: projection.nursingResponsibilitiesSatisfied,
      handoffSource: projection.sources.handoff,
      ordersSource: projection.sources.admissionOrders,
      codeStatusSource: projection.sources.codeStatus,
      reconSource: projection.sources.medicationReconciliation,
    });
    const prepared = projection.nursingResponsibilitiesSatisfied
      ? applyStage6ProjectionAnswers(doc, projection)
      : doc;

    const signed = applyNurseAdmissionSignature({
      doc: prepared,
      actorUserId,
      credentials: body.credentials ?? "RN",
      displayName: body.displayName ?? null,
      clientExpectedVersion: Number(body.expectedVersion),
    });
    if (!signed.ok) {
      this.logger.warn({
        event: "ADMISSION_COMPLETE_BLOCKED",
        code: signed.code,
        facilityId,
        encounterRef: this.clinicalLogRef(encounterId),
        expectedVersion: body.expectedVersion,
      });
      if (signed.code === "EXPECTED_VERSION_CONFLICT") {
        throw new ConflictException(signed.code);
      }
      throw new BadRequestException(signed.code);
    }

    let nextDoc = signed.doc;
    if (body.createProviderHandoff !== false) {
      nextDoc = createProviderAdmissionHandoff({
        doc: nextDoc,
        actorUserId,
      });
    }

    const ops = readInpatientClinicalOpsFromAdmissionSummary(fresh.admissionSummaryJson);
    ops.nursing = {
      ...(ops.nursing ?? {}),
      admissionAssessmentComplete: computeAdmissionCompletionSummary(nextDoc)
        .allRequiredComplete,
    };
    let nextSummary = mergeMedSurgNursingAdmissionIntoSummary(
      fresh.admissionSummaryJson,
      nextDoc
    );
    nextSummary = mergeInpatientClinicalOpsIntoAdmissionSummary(nextSummary, ops);

    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: nextSummary as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: {
        event: "NURSING_ADMISSION_SIGNED",
        providerHandoffId: nextDoc.providerHandoff?.taskId ?? null,
      },
    });

    this.logger.log({
      event: "ADMISSION_COMPLETE_SUCCESS",
      facilityId,
      encounterRef: this.clinicalLogRef(encounterId),
      expectedVersion: body.expectedVersion,
      returnedVersion: nextDoc.expectedVersion,
    });

    return {
      documentation: nextDoc,
      completion: computeAdmissionCompletionSummary(nextDoc),
    };
  }

  /** D4A.2.6 — Provider workspace durable JSON (events, problem plans, H&P draft, tasks). */
  async getProviderWorkspace(facilityId: string, encounterId: string) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    let doc = readInpatientProviderWorkspace(enc.admissionSummaryJson);
    if (!doc) {
      doc = emptyInpatientProviderWorkspaceV1();
      // Seed a sample critical event only when empty — never auto-acknowledged.
      doc.events = [
        {
          eventId: `evt-seed-${enc.id.slice(0, 8)}`,
          type: "ADMISSION",
          severity: "INFO",
          summary: "Inpatient encounter open — provider review pending",
          source: "SYSTEM",
          occurredAt: new Date().toISOString(),
          status: "NEW",
        },
      ];
      const ops = readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson);
      doc.tasks = deriveProviderTasksFromOps({
        codeStatusPresent: Boolean(ops.codeStatus?.status),
        medReconComplete: (ops.medicationReconciliation?.length ?? 0) > 0,
        hpSigned: doc.hpDraft?.status === "SIGNED",
        dischargeWorkflowState: ops.dischargePlanning?.workflowState ?? null,
      });
      const nextSummary = mergeInpatientProviderWorkspaceIntoSummary(
        enc.admissionSummaryJson,
        doc
      );
      await this.prisma.encounter.update({
        where: { id: enc.id },
        data: {
          admissionSummaryJson: nextSummary as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
        select: { id: true },
      });
    }
    const ops = readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson);
    return {
      certification: INPATIENT_PROVIDER_WORKSPACE_CERTIFICATION_ID,
      documentation: doc,
      clinicalOps: ops,
      boundary: {
        providerWorkspaceNotNursingWorkspace: true,
        sharesInpatientEncounter: true,
        noSecondOrderEngine: true,
      },
    };
  }

  async acknowledgeProviderWorkspaceEvent(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      eventId: string;
      status: string;
      actionTaken?: string | null;
      expectedVersion: number;
    }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    const status = String(body.status ?? "").trim().toUpperCase() as ProviderEventAckStatus;
    if (!(PROVIDER_EVENT_ACK_STATUSES as readonly string[]).includes(status) || status === "NEW") {
      throw new BadRequestException("Invalid provider event acknowledgment status");
    }
    const result = acknowledgeProviderEvent({
      doc,
      eventId: String(body.eventId ?? "").trim(),
      actorUserId,
      status,
      actionTaken: body.actionTaken ?? null,
      clientExpectedVersion: Number(body.expectedVersion),
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: { event: "PROVIDER_EVENT_ACKNOWLEDGED", eventId: body.eventId, status },
    });
    return { documentation: result.doc };
  }

  async upsertProviderProblemPlanItem(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { item: ProviderProblemPlanItemV1; expectedVersion: number }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    const result = upsertProviderProblemPlan({
      doc,
      item: body.item,
      clientExpectedVersion: Number(body.expectedVersion),
      actorUserId,
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    return { documentation: result.doc };
  }

  async saveProviderHpSectionDraft(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      sectionKey: string;
      text?: string | null;
      structured?: Record<string, unknown> | null;
      expectedVersion: number;
    }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    const sectionKey = String(body.sectionKey).trim() as ProviderHpSectionKey;
    if (!(PROVIDER_HP_SECTION_KEYS as readonly string[]).includes(sectionKey)) {
      throw new BadRequestException("Invalid H&P sectionKey");
    }
    const result = saveProviderHpDraft({
      doc,
      sectionKey,
      text: body.text,
      structured: body.structured,
      clientExpectedVersion: Number(body.expectedVersion),
      actorUserId,
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    return { documentation: result.doc };
  }

  async signProviderHp(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { expectedVersion: number }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    const result = signProviderHpDraft({
      doc,
      actorUserId,
      clientExpectedVersion: Number(body.expectedVersion),
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: { event: "PROVIDER_HP_SIGNED" },
    });
    return { documentation: result.doc };
  }

  /**
   * D4A.2.6B — Provider workspace consumes reusable ClinicalSynthesisService.
   */
  async getProviderClinicalSynthesis(facilityId: string, encounterId: string) {
    return this.clinicalSynthesis.buildProviderProjection(facilityId, encounterId, {
      audience: "PROVIDER",
    });
  }

  async getCommandCenterClinicalSynthesis(facilityId: string, encounterId: string) {
    return this.clinicalSynthesis.buildCommandCenterProjection(facilityId, encounterId);
  }

  async getProviderCensusFacets() {
    return this.clinicalSynthesis.describeCensusFacets();
  }

  async saveProviderProgressNote(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      note: ProviderProgressNoteDraftV1;
      expectedVersion: number;
    }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    const result = saveProviderProgressNoteDraft({
      notes: (doc.progressNotes ?? []) as ProviderProgressNoteDraftV1[],
      note: body.note,
      clientExpectedVersion: Number(body.expectedVersion),
      documentExpectedVersion: doc.expectedVersion,
    });
    if (!result.ok) throw new ConflictException(result.code);
    const nextDoc = {
      ...doc,
      progressNotes: result.notes,
      expectedVersion: result.nextDocumentVersion,
      updatedAt: new Date().toISOString(),
      updatedByUserId: actorUserId,
    };
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          nextDoc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    return { documentation: nextDoc };
  }

  async signProviderProgressNoteDoc(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { noteId: string; expectedVersion: number }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    const result = signProviderProgressNote({
      notes: (doc.progressNotes ?? []) as ProviderProgressNoteDraftV1[],
      noteId: String(body.noteId),
      actorUserId,
      clientExpectedVersion: Number(body.expectedVersion),
      documentExpectedVersion: doc.expectedVersion,
    });
    if (!result.ok) throw new ConflictException(result.code);
    const nextDoc = {
      ...doc,
      progressNotes: result.notes,
      expectedVersion: result.nextDocumentVersion,
      updatedAt: new Date().toISOString(),
      updatedByUserId: actorUserId,
    };
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          nextDoc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: { event: "PROVIDER_PROGRESS_NOTE_SIGNED", noteId: body.noteId },
    });
    return { documentation: nextDoc };
  }

  async carryForwardProviderProgressNote(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { fromNoteId: string; serviceDate: string; expectedVersion: number }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    if (Number(body.expectedVersion) !== doc.expectedVersion) {
      throw new ConflictException("PROVIDER_DOCUMENT_STALE");
    }
    const from = (doc.progressNotes ?? []).find((n) => n.noteId === body.fromNoteId);
    if (!from) throw new NotFoundException("Progress note not found");
    const carried = buildProgressNoteCarryForward({
      from: from as ProviderProgressNoteDraftV1,
      actorUserId,
      serviceDate: String(body.serviceDate),
    });
    const nextDoc = {
      ...doc,
      progressNotes: [...(doc.progressNotes ?? []), carried],
      expectedVersion: doc.expectedVersion + 1,
      updatedAt: new Date().toISOString(),
      updatedByUserId: actorUserId,
    };
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          nextDoc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    return { documentation: nextDoc, note: carried };
  }

  async getProviderPrintPackage(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    kindRaw: string
  ) {
    const kind = String(kindRaw ?? "").trim().toUpperCase() as ProviderPrintPackageKind;
    if (!(PROVIDER_PRINT_PACKAGE_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestException("Invalid provider print package kind");
    }
    const syn = await this.getProviderClinicalSynthesis(facilityId, encounterId);
    const s = syn.synthesis;
    const workspace =
      readInpatientProviderWorkspace(
        (
          await this.prisma.encounter.findFirst({
            where: { id: encounterId, facilityId },
            select: { admissionSummaryJson: true },
          })
        )?.admissionSummaryJson
      ) ?? emptyInpatientProviderWorkspaceV1();

    const sections: Array<{ heading: string; body: string }> = [];
    if (kind === "HISTORY_PHYSICAL" || kind === "PROVIDER_ROUNDING_SUMMARY") {
      sections.push({
        heading: "Overview",
        body: [
          `Hospital day: ${s.overview.hospitalDay ?? "—"}`,
          `Code status: ${s.overview.codeStatus ?? "—"}`,
          `Isolation: ${s.overview.isolation ?? "—"}`,
          `Attending: ${s.overview.attending ?? "—"}`,
          `Primary dx: ${s.overview.primaryDiagnosis ?? "—"}`,
          `Bed/Unit: ${s.overview.currentBed ?? "—"} / ${s.overview.currentUnit ?? "—"}`,
        ].join("\n"),
      });
    }
    if (kind === "PROBLEM_LIST" || kind === "PROVIDER_ROUNDING_SUMMARY" || kind === "DAILY_PROGRESS_NOTE") {
      sections.push({
        heading: "Problems",
        body:
          s.problems.length > 0
            ? s.problems
                .map(
                  (p) =>
                    `${p.displayLabel} [${p.status}] — ${p.assessment ?? "—"} / ${p.plan ?? "—"}`
                )
                .join("\n")
            : "—",
      });
    }
    if (kind === "DAILY_PROGRESS_NOTE") {
      const notes = workspace.progressNotes ?? [];
      const signed = notes.filter((n) => isProviderProgressNoteFinalStatus(n.status));
      const latestSigned = signed[signed.length - 1];
      sections.push({
        heading: "Progress note",
        body: latestSigned?.text ?? "—",
      });
    }
    if (kind === "HISTORY_PHYSICAL") {
      const hp = workspace.hpDraft;
      const hpSigned = String(hp?.status ?? "").toUpperCase() === "SIGNED";
      sections.push({
        heading: "H&P",
        body:
          hp && hpSigned
            ? Object.entries(hp.sections ?? {})
                .map(([k, v]) => `${k}: ${v?.text ?? ""}`)
                .join("\n")
            : "—",
      });
    }
    if (kind === "DISCHARGE_SUMMARY" || kind === "PROVIDER_HANDOFF") {
      sections.push({
        heading: "Discharge readiness",
        body: [
          `State: ${s.dischargeReadiness.workflowState ?? "—"}`,
          `EDD: ${s.dischargeReadiness.estimatedDischargeDate ?? "—"}`,
          `Destination: ${s.dischargeReadiness.destination ?? "—"}`,
          `Barriers: ${s.dischargeReadiness.barriers.map((b) => b.label).join("; ") || "—"}`,
        ].join("\n"),
      });
      sections.push({
        heading: "Medications snapshot",
        body: Object.entries(s.medications.groups)
          .map(
            ([g, lines]) =>
              `${g}: ${(lines ?? []).map((l) => l.drug).join(", ") || "—"}`
          )
          .join("\n") || "—",
      });
    }
    if (kind === "PROVIDER_ROUNDING_SUMMARY") {
      sections.push({
        heading: "Vitals",
        body: s.vitals
          .map((v) => `${v.label}: ${v.current ?? "—"} (${v.trend24h}${v.abnormal ? " ABX" : ""})`)
          .join("\n"),
      });
      sections.push({
        heading: "Critical results",
        body:
          [...s.laboratories.critical, ...s.radiology.critical]
            .map((x) => ("label" in x ? x.label : ""))
            .join("; ") || "—",
      });
    }

    const printClass = classifyPrintPackage(kind);
    if (printClass === "CLINICAL_SYNTHESIS") {
      sections.unshift({
        heading: "NOTICE",
        body: "UNSIGNED CLINICAL SYNTHESIS — not a signed provider note. Generated from authoritative enterprise domains at the timestamp below.",
      });
    } else {
      sections.unshift({
        heading: "LEGAL RECORD",
        body: "Signed provider documentation (exact revision). Amendments and corrections are append-only.",
      });
      const amendments = (workspace.amendments ?? []) as ProviderDocumentAmendmentV1[];
      if (amendments.length) {
        sections.push({
          heading: "Amendments",
          body: amendments
            .map(
              (a) =>
                `${a.type}${a.postDischarge ? " (post-discharge)" : ""} — ${a.reason}${
                  a.type === "CORRECTION"
                    ? ` | original: ${JSON.stringify(a.originalValue)} → corrected: ${JSON.stringify(a.correctedValue)}`
                    : a.note
                      ? ` | ${a.note}`
                      : ""
                }${a.type === "ENTERED_IN_ERROR" ? " [ENTERED IN ERROR]" : ""}`
            )
            .join("\n"),
        });
      }
    }

    const pkg = buildProviderPrintPackage({
      kind,
      title: kind.replace(/_/g, " "),
      signed:
        printClass === "LEGAL_RECORD" &&
        (workspace.hpDraft?.status === "SIGNED" ||
          (workspace.progressNotes ?? []).some((n) => n.status === "SIGNED") ||
          (workspace as { handoff?: { status?: string } }).handoff?.status === "SIGNED" ||
          (workspace as { handoff?: { status?: string } }).handoff?.status === "ACKNOWLEDGED"),
      revision: workspace.expectedVersion,
      providerSigned:
        printClass === "LEGAL_RECORD" &&
        (workspace.hpDraft?.status === "SIGNED" ||
          (workspace.progressNotes ?? []).some((n) => n.status === "SIGNED")),
      sections,
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: s.patientId,
      entityId: encounterId,
      metadata: {
        event:
          printClass === "LEGAL_RECORD"
            ? "PROVIDER_LEGAL_RECORD_PRINT_GENERATED"
            : "PROVIDER_CLINICAL_SYNTHESIS_PRINT_GENERATED",
        kind,
        printClass,
        revision: pkg.revision,
        amendmentCount: Array.isArray(workspace.amendments) ? workspace.amendments.length : 0,
      },
    });

    return {
      certification: PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID,
      printClass,
      package: pkg,
      documentMatrix: providerDocumentMatrix(),
    };
  }

  async appendProviderAmendment(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      type: string;
      target: string;
      clientRequestId: string;
      reason: string;
      note?: string | null;
      targetNoteId?: string | null;
      sectionKey?: string | null;
      originalValue?: unknown;
      correctedValue?: unknown;
      expectedVersion: number;
      expectedAmendmentVersion?: number;
      credentials?: string | null;
      role?: string | null;
    }
  ) {
    const enc = await this.loadEncounterForNursingRead(facilityId, encounterId);
    const type = String(body.type).toUpperCase() as ProviderAmendmentType;
    const target = String(body.target).toUpperCase() as ProviderAmendmentTarget;
    if (!(PROVIDER_AMENDMENT_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException("Invalid amendment type");
    }
    if (!(PROVIDER_AMENDMENT_TARGETS as readonly string[]).includes(target)) {
      throw new BadRequestException("Invalid amendment target");
    }
    const fresh = await this.loadEncounterForNursingRead(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ??
      emptyInpatientProviderWorkspaceV1();
    // Seed empty workspace JSON only when missing; do not require OPEN for amendments.
    const result = appendProviderDocumentAmendment({
      doc,
      type,
      target,
      clientRequestId: String(body.clientRequestId).trim(),
      reason: body.reason,
      note: body.note,
      targetNoteId: body.targetNoteId,
      sectionKey: body.sectionKey,
      originalValue: body.originalValue,
      correctedValue: body.correctedValue,
      actorUserId,
      credentials: body.credentials,
      role: body.role,
      clientExpectedVersion: Number(body.expectedVersion),
      expectedAmendmentVersion: body.expectedAmendmentVersion,
      encounterStatus: enc.status,
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: {
        event:
          type === "ADDENDUM"
            ? "PROVIDER_ADDENDUM_CREATED"
            : type === "CORRECTION"
              ? "PROVIDER_CORRECTION_CREATED"
              : "PROVIDER_NOTE_ENTERED_IN_ERROR",
        target,
        amendmentId: result.amendment.amendmentId,
        postDischarge: result.amendment.postDischarge === true,
      },
    });
    return { documentation: result.doc, amendment: result.amendment };
  }

  async saveProviderHandoffDoc(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { handoff: ProviderHandoffDraftV1; expectedVersion: number }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    const result = saveProviderHandoffDraft({
      doc,
      handoff: body.handoff,
      clientExpectedVersion: Number(body.expectedVersion),
      actorUserId,
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    return { documentation: result.doc };
  }

  async signProviderHandoffDoc(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { expectedVersion: number }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    const result = signProviderHandoff({
      doc,
      actorUserId,
      clientExpectedVersion: Number(body.expectedVersion),
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: { event: "PROVIDER_HANDOFF_SIGNED" },
    });
    return { documentation: result.doc };
  }

  async acknowledgeProviderHandoffDoc(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { expectedVersion: number }
  ) {
    const enc = await this.loadOpenInpatient(facilityId, encounterId);
    const boot = await this.getProviderWorkspace(facilityId, encounterId);
    const fresh = await this.loadOpenInpatient(facilityId, encounterId);
    const doc =
      readInpatientProviderWorkspace(fresh.admissionSummaryJson) ?? boot.documentation;
    const result = acknowledgeProviderHandoff({
      doc,
      actorUserId,
      clientExpectedVersion: Number(body.expectedVersion),
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeInpatientProviderWorkspaceIntoSummary(
          fresh.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, CLINICAL_OPS_ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: { event: "PROVIDER_HANDOFF_ACKNOWLEDGED" },
    });
    return { documentation: result.doc };
  }

  /**
   * Hydrate EDOC rows for Nursing Admission domain-reference classification.
   */
  private async resolveNursingAdmissionEdocRecords(input: {
    facilityId: string;
    encounterId: string;
    recordIds: string[];
  }): Promise<Record<string, ResolvedDomainRecordLite | null>> {
    const ids = [
      ...new Set(input.recordIds.filter((id) => isPersistedEdocRecordId(id))),
    ];
    const out: Record<string, ResolvedDomainRecordLite | null> = {};
    if (ids.length === 0) return out;
    const rows = await this.prisma.encounterClinicalDocumentationEntry.findMany({
      where: {
        facilityId: input.facilityId,
        encounterId: input.encounterId,
        id: { in: ids },
      },
      select: {
        id: true,
        facilityId: true,
        encounterId: true,
        patientId: true,
        category: true,
        cardId: true,
        createdAt: true,
        voidedAt: true,
        authorUserId: true,
        authorDisplayNameSnapshot: true,
      },
    });
    for (const id of ids) out[id] = null;
    for (const row of rows) {
      out[row.id] = {
        id: row.id,
        facilityId: row.facilityId,
        encounterId: row.encounterId,
        patientId: row.patientId,
        category: row.category,
        cardId: row.cardId,
        createdAt: row.createdAt.toISOString(),
        voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
        authorUserId: row.authorUserId,
        authorDisplayName: row.authorDisplayNameSnapshot,
      };
    }
    return out;
  }

  /**
   * Refresh preload display from the patient history profile without bumping expectedVersion.
   * Encounter verification provenance is preserved; new profile domains are appended.
   */
  private async overlayNursingAdmissionPreloadFromProfile(input: {
    facilityId: string;
    patientId: string;
    sourceEncounterId?: string | null;
    doc: MedSurgNursingAdmissionDocV1;
  }): Promise<MedSurgNursingAdmissionDocV1> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, facilityId: input.facilityId },
      select: { clinicalHistoryProfileJson: true },
    });
    const profile = patientClinicalHistoryProfileFromJson(
      patient?.clinicalHistoryProfileJson ?? null
    );
    const preloadedItems = mergeAdmissionPreloadFromPatientProfile({
      existing: input.doc.preloadedItems ?? [],
      profile,
      sourceEncounterId: input.sourceEncounterId ?? null,
    });
    const homeMedicationLines =
      (input.doc.homeMedicationLines ?? []).length > 0
        ? input.doc.homeMedicationLines
        : buildHomeMedReconLinesFromPreload(preloadedItems);
    return {
      ...input.doc,
      preloadedItems,
      homeMedicationLines,
    };
  }

  private async loadOpenInpatient(facilityId: string, encounterId: string) {
    const enc = await this.loadEncounterForNursingRead(facilityId, encounterId);
    if (enc.status !== EncounterStatus.OPEN) {
      throw new BadRequestException("Encounter is not open");
    }
    return enc;
  }

  /** Read nursing/print/projection for open or discharged inpatient encounters. */
  private async loadEncounterForNursingRead(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        admissionSummaryJson: true,
        dischargeSummaryJson: true,
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    if (enc.type !== EncounterType.INPATIENT) {
      throw new BadRequestException("Clinical ops require an Inpatient encounter");
    }
    return enc;
  }

  /**
   * Amendments allowed on open or discharged inpatient encounters.
   * Voided encounters are loaded so policy can return ADMINISTRATIVE_ONLY.
   */
  private async loadEncounterForNursingAmendment(facilityId: string, encounterId: string) {
    return this.loadEncounterForNursingRead(facilityId, encounterId);
  }
}
