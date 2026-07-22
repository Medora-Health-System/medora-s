/**
 * D3E.7 — Durable direct Inpatient admission + clinical ops JSON writer.
 * Zero schema migration. Facility/actor always from JWT.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
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
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { ENCOUNTER_DETAIL_SELECT } from "./encounter-query-contracts";
import { AdmissionCorrelationService } from "./admission-correlation.service";

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly admissionCorrelation: AdmissionCorrelationService
  ) {}

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

    const patient = await this.prisma.patient.findFirst({
      where: { id: body.patientId, facilityId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const idempotencyKey = String(body.idempotencyKey ?? "").trim() || null;
    const placementRequestId =
      typeof body.internalPlacementRequestId === "string"
        ? body.internalPlacementRequestId.trim() || null
        : null;
    const admissionCorrelationIdInput =
      typeof body.admissionCorrelationId === "string"
        ? body.admissionCorrelationId.trim() || null
        : null;

    const openRows = await this.prisma.encounter.findMany({
      where: { patientId: patient.id, facilityId, status: EncounterStatus.OPEN },
      select: {
        id: true,
        type: true,
        status: true,
        hospitalEpisodeId: true,
        admissionSummaryJson: true,
      },
    });

    // Invariant: never close or mutate ED when starting Inpatient
    void inpatientStartMustNotCloseEdEncounter();

    let sourceEdEncounterId: string | null =
      typeof body.sourceEdEncounterId === "string" ? body.sourceEdEncounterId.trim() : "";
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
      if (!ed) throw new BadRequestException("sourceEdEncounterId is not a valid ED encounter");
    } else {
      sourceEdEncounterId = null;
    }

    let activeEpisodeId: string | null = null;
    if (hospitalEpisodeFoundationEnabledFromProcessEnv()) {
      const active = await this.prisma.hospitalEpisode.findFirst({
        where: { facilityId, patientId: patient.id, status: "ACTIVE" },
        select: { id: true },
      });
      activeEpisodeId = active?.id ?? null;
    }

    const openIpCandidates = openRows
      .filter((e) => e.type === EncounterType.INPATIENT)
      .map((e) => ({
        id: e.id,
        hospitalEpisodeId: e.hospitalEpisodeId,
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
      sourceEncounterId: sourceEdEncounterId,
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
      sourceEncounterId: sourceEdEncounterId,
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
          throw new ConflictException("Selected bed is already occupied");
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
        throw new BadRequestException("Attending provider is not valid at this facility");
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
      sourceEncounterId: sourceEdEncounterId,
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
          observationEncounterId: null,
          receivingNurseUserId: actorUserId,
          admissionInitiatedAt: new Date().toISOString(),
          arrivalAt: admittedAt.toISOString(),
          d3e6dIdempotencyKey: idempotencyKey,
          assignedBedKey: bedKeyRaw || null,
          // Explicit: ED chart is not closed or mutated by this writer
          edEncounterClosed: false,
          edEncounterMutated: false,
        },
        ops
      ),
      correlationDraft
    );

    const created = await this.prisma.$transaction(async (tx) => {
      // Re-check correlated reuse inside transaction (concurrency)
      const openIps = await tx.encounter.findMany({
        where: {
          patientId: patient.id,
          facilityId,
          status: EncounterStatus.OPEN,
          type: EncounterType.INPATIENT,
        },
        select: { id: true, hospitalEpisodeId: true, admissionSummaryJson: true },
      });
      const txReuse = this.admissionCorrelation.resolveReuse({
        patientId: patient.id,
        facilityId,
        admissionIntent,
        hospitalEpisodeId: activeEpisodeId,
        sourceEncounterId: sourceEdEncounterId,
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
      if (hospitalEpisodeFoundationEnabledFromProcessEnv() && !hospitalEpisodeId) {
        // Episode created after encounter so originatingEncounterId can be set
      }

      const encounter = await tx.encounter.create({
        data: {
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
          hospitalEpisodeId: hospitalEpisodeId ?? undefined,
        },
        select: { id: true },
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

      if (hospitalEpisodeFoundationEnabledFromProcessEnv()) {
        if (!hospitalEpisodeId) {
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
          });
        } else {
          await tx.encounter.update({
            where: { id: encounter.id },
            data: {
              hospitalEpisodeId,
              admissionSummaryJson: summaryWithReceiver as Prisma.InputJsonValue,
              version: { increment: 1 },
            },
          });
        }
      } else {
        await tx.encounter.update({
          where: { id: encounter.id },
          data: {
            admissionSummaryJson: summaryWithReceiver as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
        });
      }

      return {
        encounterId: encounter.id,
        hospitalEpisodeId,
        idempotentReuse: false,
        admissionCorrelationId: correlationFinal.admissionCorrelationId,
      };
    });

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
          edEncounterClosed: false,
          edEncounterMutated: false,
          assignedBedKey: bedKeyRaw || null,
          concurrentWithOpenEd: decision.code === "ALLOW_ED_PLUS_INPATIENT",
        },
      });
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
      receivingNurseUserId: actorUserId,
      admissionCorrelationId: created.admissionCorrelationId,
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
