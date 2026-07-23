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
  BED_NO_LONGER_AVAILABLE_CODE,
  validateConnectedAdmissionIntakeHardBlockers,
  isBedSelectableForAdmissionIntake,
  buildAdmissionPreloadFromPatientProfile,
  buildHomeMedReconLinesFromPreload,
  emptyMedSurgNursingAdmissionDocV1,
  readMedSurgNursingAdmissionFromSummary,
  mergeMedSurgNursingAdmissionIntoSummary,
  saveAdmissionSectionDraft,
  applyHistoryVerification,
  applyNurseAdmissionSignature,
  createProviderAdmissionHandoff,
  computeAdmissionCompletionSummary,
  isAdmissionHistoryVerificationStatus,
  isAdmissionCompletionState,
  patientClinicalHistoryProfileFromJson,
  MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID,
  type MedSurgNursingAdmissionDocV1,
  type InpatientAdmissionClinicalSection,
  type AdmissionHistoryVerificationStatus,
  type AdmissionSectionCompletionState,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  ENCOUNTER_DETAIL_SELECT,
  ENCOUNTER_ID_ONLY_SELECT,
} from "./encounter-query-contracts";
import { AdmissionCorrelationService } from "./admission-correlation.service";
import { FacilityBedBoardService } from "../facilities/facility-bed-board.service";
import {
  directAdmissionNotFound,
  directAdmissionSchemaIncompatible,
  isPrismaMissingHospitalEpisodeIdColumn,
} from "./direct-admission-api-errors.util";
import { sanitizePrismaException } from "../common/logging/prisma-error-sanitizer";

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
    private readonly bedBoardService: FacilityBedBoardService
  ) {}

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

    const admissionSummaryJson = mergeHospitalAdmissionCorrelationIntoSummary(
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
        const encounterBaseCreate = {
          facilityId,
          patientId: patient.id,
          type: EncounterType.INPATIENT,
          status: EncounterStatus.OPEN,
          billingClassification: BillingClassification.INPATIENT,
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
    }

    if (patch.appendCarePlanItem) {
      ops.carePlan = [
        ...(ops.carePlan ?? []),
        {
          itemId: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          discipline: String(patch.appendCarePlanItem.discipline ?? "").trim() || "medicine",
          goalText: String(patch.appendCarePlanItem.goalText ?? "").trim(),
          status: patch.appendCarePlanItem.status ?? "ACTIVE",
          updatedAt: now,
        },
      ];
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
      ops.dischargePlanning = {
        anticipatedDischargeDate:
          patch.setDischargePlanning.anticipatedDischargeDate ??
          ops.dischargePlanning?.anticipatedDischargeDate ??
          null,
        destination:
          patch.setDischargePlanning.destination ?? ops.dischargePlanning?.destination ?? null,
        workflowState: wf as InpatientDischargeWorkflowState,
        transportation:
          patch.setDischargePlanning.transportation ??
          ops.dischargePlanning?.transportation ??
          null,
        barriers: patch.setDischargePlanning.barriers ?? ops.dischargePlanning?.barriers ?? null,
        updatedAt: now,
      };
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

    const nextSummary = mergeInpatientClinicalOpsIntoAdmissionSummary(
      enc.admissionSummaryJson,
      ops
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
      encounterId: enc.id,
      entityId: enc.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_CLINICAL_OPS_PATCHED",
        keys: Object.keys(patch),
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
      return {
        certification: MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID,
        documentation: existing,
        completion: computeAdmissionCompletionSummary(existing),
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

  async patchNursingAdmissionSection(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      sectionId: string;
      draftText?: string | null;
      completionState?: string | null;
      expectedVersion: number;
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

    const result = saveAdmissionSectionDraft({
      doc,
      sectionId,
      draftText: body.draftText ?? null,
      completionState: completionState as AdmissionSectionCompletionState | undefined,
      clientExpectedVersion: Number(body.expectedVersion),
      actorUserId,
    });
    if (!result.ok) {
      throw new ConflictException(result.code);
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
    const doc =
      readMedSurgNursingAdmissionFromSummary(fresh.admissionSummaryJson) ??
      boot.documentation;

    if (Number(body.expectedVersion) !== doc.expectedVersion) {
      throw new ConflictException("EXPECTED_VERSION_CONFLICT");
    }
    if (!isAdmissionHistoryVerificationStatus(body.status)) {
      throw new BadRequestException("Invalid verification status");
    }
    const idx = doc.preloadedItems.findIndex((i) => i.itemId === body.itemId);
    if (idx < 0) throw new NotFoundException("Preload item not found");

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

    const signed = applyNurseAdmissionSignature({
      doc,
      actorUserId,
      credentials: body.credentials ?? "RN",
      displayName: body.displayName ?? null,
      clientExpectedVersion: Number(body.expectedVersion),
    });
    if (!signed.ok) {
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

    return {
      documentation: nextDoc,
      completion: computeAdmissionCompletionSummary(nextDoc),
    };
  }

  private async loadOpenInpatient(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        admissionSummaryJson: true,
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    if (enc.status !== EncounterStatus.OPEN) {
      throw new BadRequestException("Encounter is not open");
    }
    if (enc.type !== EncounterType.INPATIENT) {
      throw new BadRequestException("Clinical ops require an Inpatient encounter");
    }
    return enc;
  }
}
