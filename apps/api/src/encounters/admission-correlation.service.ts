/**
 * D3E.8 / D3E.8A — Server-owned AdmissionCorrelationService.
 * Correlation is authoritative admission identity (JSON on Encounter).
 * Wrong open-IP reuse prevention is always enforced (not feature-flagged).
 * Expected-version mutations are mandatory for correlation updates.
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
  EncounterStatus,
  EncounterType,
  InternalPlacementStatus,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";
import {
  ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID,
  admissionCorrelationFlagsFromProcessEnv,
  admissionCorrelationReconciliationEnabled,
  admissionCorrelationUiEnabled,
  admissionIntentOriginationFlagsFromProcessEnv,
  admissionIntentOriginationProductionDefaultsAreOff,
  admissionJourneyLifecycleSteps,
  applyAdmissionCorrelationMutation,
  assertPlacementReceivingMatchesCorrelation,
  buildHospitalAdmissionCorrelationV1,
  diagnoseAdmissionCorrelation,
  diagnoseAdmissionOrphans,
  earlyAdmissionCorrelationEnabled,
  evaluateDuplicateAdmission,
  evaluateExistingAdmissionIntent,
  evaluateLegacyAdmissionLinkage,
  evaluateLegacyReconciliationEvidence,
  hospitalEpisodeFoundationEnabledFromProcessEnv,
  mergeHospitalAdmissionCorrelationIntoSummary,
  observationInpatientConversionEnabled,
  planCancelAdmissionBeforeArrival,
  planCancelAfterReceivingStarted,
  planEdAdmitIntentOrigination,
  planObservationToInpatientConversion,
  planResolveOrCreateReceivingEncounter,
  placementSpecialNeedsWithCorrelation,
  readHospitalAdmissionCorrelation,
  readPlacementAdmissionCorrelationId,
  resolveReceivingEncounterReuse,
  wrongOpenInpatientReusePreventionAlwaysOn,
  type AdmissionCorrelationMutationPatch,
  type AdmissionCorrelationReuseDecision,
  type HospitalAdmissionCorrelationV1,
  type HospitalAdmissionIntent,
  type MedicationTransitionAction,
} from "@medora/shared";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { ENCOUNTER_ID_ONLY_SELECT } from "./encounter-query-contracts";

export const ADMISSION_CORRELATION_ENTITY = "AdmissionCorrelation" as const;

@Injectable()
export class AdmissionCorrelationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  meta() {
    const corrEnv = admissionCorrelationFlagsFromProcessEnv();
    const intentEnv = admissionIntentOriginationFlagsFromProcessEnv();
    return {
      module: "ADMISSION_CORRELATION",
      certification: ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID,
      priorCertification: "MEDUI.INPATIENT_ADMISSION_CORRELATION.D3E8",
      storage: "OPTION_A_VERSIONED_JSON_ON_ENCOUNTER",
      structuredModel: false,
      wrongReusePreventionAlwaysOn: wrongOpenInpatientReusePreventionAlwaysOn(),
      uiEnabled: admissionCorrelationUiEnabled(corrEnv),
      earlyAdmissionCorrelationEnabled: earlyAdmissionCorrelationEnabled(intentEnv),
      observationInpatientConversionEnabled: observationInpatientConversionEnabled(intentEnv),
      admissionCorrelationReconciliationEnabled:
        admissionCorrelationReconciliationEnabled(intentEnv),
      productionDefaultsOff: admissionIntentOriginationProductionDefaultsAreOff({}),
    };
  }

  /** Server-owned correlation id seed — clients must not forge authoritative ids. */
  newServerCorrelationSeed(): string {
    return randomUUID();
  }

  isEarlyAdmissionEnabled(processEnv: NodeJS.ProcessEnv = process.env): boolean {
    return earlyAdmissionCorrelationEnabled(
      admissionIntentOriginationFlagsFromProcessEnv(processEnv)
    );
  }

  isObservationConversionEnabled(processEnv: NodeJS.ProcessEnv = process.env): boolean {
    return observationInpatientConversionEnabled(
      admissionIntentOriginationFlagsFromProcessEnv(processEnv)
    );
  }

  isReconciliationEnabled(processEnv: NodeJS.ProcessEnv = process.env): boolean {
    return admissionCorrelationReconciliationEnabled(
      admissionIntentOriginationFlagsFromProcessEnv(processEnv)
    );
  }

  createAdmissionIntent(input: {
    admissionIntent: HospitalAdmissionIntent;
    patientId: string;
    facilityId: string;
    actorUserId: string;
    admissionSource?: string | null;
    destinationUnitId?: string | null;
    hospitalEpisodeId?: string | null;
    sourceEncounterId?: string | null;
    internalPlacementRequestId?: string | null;
    idempotencyKey?: string | null;
    /** Ignored for authority — server regenerates if unsafe/missing. */
    clientAdmissionCorrelationId?: string | null;
    requestedAdmissionAt?: string | null;
  }): HospitalAdmissionCorrelationV1 {
    void input.clientAdmissionCorrelationId;
    return buildHospitalAdmissionCorrelationV1({
      admissionIntent: input.admissionIntent,
      status: input.internalPlacementRequestId ? "PLACEMENT_REQUESTED" : "INTENT_CREATED",
      patientId: input.patientId,
      facilityId: input.facilityId,
      admissionSource: input.admissionSource,
      destinationUnitId: input.destinationUnitId,
      hospitalEpisodeId: input.hospitalEpisodeId,
      sourceEncounterId: input.sourceEncounterId,
      internalPlacementRequestId: input.internalPlacementRequestId,
      idempotencyKey: input.idempotencyKey,
      initiatedByUserId: input.actorUserId,
      requestedAdmissionAt: input.requestedAdmissionAt,
      serverGeneratedId: this.newServerCorrelationSeed(),
    });
  }

  /**
   * Compare-and-set mutation — expectedVersion required.
   * Persists on the encounter that currently hosts the correlation JSON.
   */
  async mutateCorrelationOnEncounter(input: {
    facilityId: string;
    encounterId: string;
    expectedVersion: number;
    patch: AdmissionCorrelationMutationPatch;
    actorUserId: string;
    auditEvent: string;
    ip?: string;
    userAgent?: string;
  }): Promise<HospitalAdmissionCorrelationV1> {
    return this.prisma.$transaction(async (tx) => {
      const enc = await tx.encounter.findFirst({
        where: { id: input.encounterId, facilityId: input.facilityId },
        select: {
          id: true,
          patientId: true,
          facilityId: true,
          admissionSummaryJson: true,
          version: true,
        },
      });
      if (!enc) throw new NotFoundException("Encounter not found");

      const current = readHospitalAdmissionCorrelation(enc.admissionSummaryJson);
      if (!current) {
        throw new BadRequestException("No admission correlation on encounter");
      }

      const result = applyAdmissionCorrelationMutation(
        current,
        input.expectedVersion,
        input.patch
      );
      if (!result.ok) {
        if (result.code === "VERSION_CONFLICT") {
          throw new ConflictException({
            code: "ADMISSION_CORRELATION_VERSION_CONFLICT",
            detail: result.detail,
            currentVersion: result.currentVersion,
          });
        }
        throw new BadRequestException({
          code: result.code,
          detail: result.detail,
        });
      }

      await tx.encounter.update({
        where: { id: enc.id },
        data: {
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary(
            enc.admissionSummaryJson,
            result.correlation
          ) as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
        select: ENCOUNTER_ID_ONLY_SELECT,
      });

      await this.audit.log(AuditAction.UPDATE, ADMISSION_CORRELATION_ENTITY, {
        userId: input.actorUserId,
        facilityId: input.facilityId,
        patientId: enc.patientId,
        encounterId: enc.id,
        entityId: result.correlation.admissionCorrelationId,
        critical: true,
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: {
          event: input.auditEvent,
          status: result.correlation.status,
          correlationVersion: result.correlation.correlationVersion,
          expectedVersion: input.expectedVersion,
        },
      });

      return result.correlation;
    });
  }

  /**
   * D3E.8A — Create ED admit correlation + attach placement atomically.
   * Caller creates the placement row; this stamps both directions.
   */
  async originateEdAdmitWithPlacement(input: {
    facilityId: string;
    sourceEncounterId: string;
    placementId: string;
    patientId: string;
    hospitalEpisodeId?: string | null;
    destinationUnitId?: string | null;
    specialPlacementNeedsJson?: unknown;
    actorUserId: string;
    idempotencyKey?: string | null;
    ip?: string;
    userAgent?: string;
  }): Promise<{
    correlation: HospitalAdmissionCorrelationV1;
    placementSpecialNeeds: Record<string, unknown>;
  }> {
    const plan = planEdAdmitIntentOrigination({
      patientId: input.patientId,
      facilityId: input.facilityId,
      sourceEncounterId: input.sourceEncounterId,
      placementRequestId: input.placementId,
      initiatedByUserId: input.actorUserId,
      destinationUnitId: input.destinationUnitId,
      hospitalEpisodeId: input.hospitalEpisodeId,
      idempotencyKey: input.idempotencyKey,
      serverGeneratedId: this.newServerCorrelationSeed(),
    });

    let corr = plan.initialCorrelation;
    const attachMut = applyAdmissionCorrelationMutation(corr, corr.correlationVersion, {
      internalPlacementRequestId: input.placementId,
    });
    if (!attachMut.ok) {
      throw new ConflictException(attachMut.detail);
    }
    corr = attachMut.correlation;

    const statusMut = applyAdmissionCorrelationMutation(corr, corr.correlationVersion, {
      status: "PLACEMENT_REQUESTED",
    });
    if (!statusMut.ok) {
      throw new ConflictException(statusMut.detail);
    }
    corr = statusMut.correlation;

    const needs = placementSpecialNeedsWithCorrelation(
      input.specialPlacementNeedsJson,
      corr.admissionCorrelationId
    );
    if (readPlacementAdmissionCorrelationId(needs) !== corr.admissionCorrelationId) {
      throw new ConflictException("Bidirectional placement correlation linkage failed");
    }

    await this.prisma.$transaction(async (tx) => {
      const ed = await tx.encounter.findFirst({
        where: {
          id: input.sourceEncounterId,
          facilityId: input.facilityId,
          patientId: input.patientId,
        },
        select: { id: true, admissionSummaryJson: true },
      });
      if (!ed) throw new NotFoundException("Source encounter not found");

      await tx.encounter.update({
        where: { id: ed.id },
        data: {
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary(
            ed.admissionSummaryJson,
            corr
          ) as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
        select: ENCOUNTER_ID_ONLY_SELECT,
      });

      await tx.internalPlacementRequest.update({
        where: { id: input.placementId },
        data: {
          specialPlacementNeedsJson: needs as Prisma.InputJsonValue,
          updatedByUserId: input.actorUserId,
        },
      });
    });

    await this.audit.log(AuditAction.CREATE, ADMISSION_CORRELATION_ENTITY, {
      userId: input.actorUserId,
      facilityId: input.facilityId,
      patientId: input.patientId,
      encounterId: input.sourceEncounterId,
      entityId: corr.admissionCorrelationId,
      critical: true,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        event: "ADMISSION_INTENT_CREATED",
        status: corr.status,
        placementRequestId: input.placementId,
        correlationVersion: corr.correlationVersion,
      },
    });

    return { correlation: corr, placementSpecialNeeds: needs };
  }

  async findExistingEdAdmissionIntent(
    facilityId: string,
    sourceEncounterId: string
  ): Promise<HospitalAdmissionCorrelationV1 | null> {
    const ed = await this.prisma.encounter.findFirst({
      where: { id: sourceEncounterId, facilityId },
      select: { admissionSummaryJson: true },
    });
    const corr = readHospitalAdmissionCorrelation(ed?.admissionSummaryJson);
    if (!corr) return null;
    const evalResult = evaluateExistingAdmissionIntent({
      sourceEncounterId,
      destinationContext: "INPATIENT",
      existingCorrelations: [corr],
    });
    return evalResult.code === "EXISTING_ADMISSION_INTENT" ? evalResult.correlation : null;
  }

  async cancelAdmissionIntent(input: {
    facilityId: string;
    sourceEncounterId: string;
    expectedVersion: number;
    actorUserId: string;
    reason?: string | null;
    ip?: string;
    userAgent?: string;
  }): Promise<HospitalAdmissionCorrelationV1> {
    const ed = await this.prisma.encounter.findFirst({
      where: { id: input.sourceEncounterId, facilityId: input.facilityId },
      select: {
        id: true,
        patientId: true,
        admissionSummaryJson: true,
      },
    });
    if (!ed) throw new NotFoundException("Source encounter not found");

    const current = readHospitalAdmissionCorrelation(ed.admissionSummaryJson);
    if (!current) throw new BadRequestException("No admission correlation to cancel");

    const patientArrived =
      current.status === "ARRIVED" ||
      current.status === "ACTIVE" ||
      current.status === "COMPLETED" ||
      Boolean(current.arrivedAt);

    let next: HospitalAdmissionCorrelationV1;

    if (
      current.receivingEncounterId &&
      (current.status === "RECEIVING_STARTED" ||
        current.status === "ENCOUNTER_CREATED" ||
        current.status === "ARRIVED")
    ) {
      const plan = planCancelAfterReceivingStarted({
        correlation: current,
        expectedVersion: input.expectedVersion,
        patientArrived: Boolean(current.arrivedAt),
      });
      if (!plan.ok) {
        if ("code" in plan && plan.code === "VERSION_CONFLICT") {
          throw new ConflictException({
            code: "ADMISSION_CORRELATION_VERSION_CONFLICT",
            detail: plan.detail,
            currentVersion: "currentVersion" in plan ? plan.currentVersion : undefined,
          });
        }
        throw new BadRequestException(plan);
      }
      next = plan.correlation;

      await this.prisma.$transaction(async (tx) => {
        await tx.encounter.update({
          where: { id: ed.id },
          data: {
            admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary(
              ed.admissionSummaryJson,
              next
            ) as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
          select: ENCOUNTER_ID_ONLY_SELECT,
        });

        if (current.receivingEncounterId) {
          const recv = await tx.encounter.findFirst({
            where: {
              id: current.receivingEncounterId,
              facilityId: input.facilityId,
            },
            select: { id: true, admissionSummaryJson: true, status: true },
          });
          if (recv && recv.status === EncounterStatus.OPEN) {
            const recvCorr = {
              ...next,
              receivingEncounterId: recv.id,
            };
            await tx.encounter.update({
              where: { id: recv.id },
              data: {
                status: EncounterStatus.CANCELLED,
                admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary(
                  recv.admissionSummaryJson,
                  recvCorr
                ) as Prisma.InputJsonValue,
                version: { increment: 1 },
              },
              select: ENCOUNTER_ID_ONLY_SELECT,
            });
          }
        }

        if (current.internalPlacementRequestId) {
          await tx.internalPlacementRequest.updateMany({
            where: {
              id: current.internalPlacementRequestId,
              facilityId: input.facilityId,
            },
            data: {
              status: InternalPlacementStatus.CANCELLED,
              cancellationReason: input.reason?.trim() || "ADMISSION_INTENT_CANCELLED",
              cancelledAt: new Date(),
              cancelledByUserId: input.actorUserId,
              assignedBedKey: null,
              assignedRoomKey: null,
              updatedByUserId: input.actorUserId,
              version: { increment: 1 },
            },
          });
        }
      });
    } else {
      const plan = planCancelAdmissionBeforeArrival({
        correlation: current,
        patientArrived,
        expectedVersion: input.expectedVersion,
      });
      if (!plan.ok) {
        if ("code" in plan && plan.code === "VERSION_CONFLICT") {
          throw new ConflictException({
            code: "ADMISSION_CORRELATION_VERSION_CONFLICT",
            detail: plan.detail,
            currentVersion: "currentVersion" in plan ? plan.currentVersion : undefined,
          });
        }
        throw new BadRequestException(plan);
      }
      next = plan.correlation;

      await this.prisma.$transaction(async (tx) => {
        await tx.encounter.update({
          where: { id: ed.id },
          data: {
            admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary(
              ed.admissionSummaryJson,
              next
            ) as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
          select: ENCOUNTER_ID_ONLY_SELECT,
        });

        if (current.internalPlacementRequestId) {
          await tx.internalPlacementRequest.updateMany({
            where: {
              id: current.internalPlacementRequestId,
              facilityId: input.facilityId,
            },
            data: {
              status: InternalPlacementStatus.CANCELLED,
              cancellationReason: input.reason?.trim() || "ADMISSION_INTENT_CANCELLED",
              cancelledAt: new Date(),
              cancelledByUserId: input.actorUserId,
              assignedBedKey: null,
              assignedRoomKey: null,
              updatedByUserId: input.actorUserId,
              version: { increment: 1 },
            },
          });
        }
      });
    }

    await this.audit.log(AuditAction.UPDATE, ADMISSION_CORRELATION_ENTITY, {
      userId: input.actorUserId,
      facilityId: input.facilityId,
      patientId: ed.patientId,
      encounterId: ed.id,
      entityId: next.admissionCorrelationId,
      critical: true,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        event: "ADMISSION_CANCELLED",
        status: next.status,
        reason: input.reason?.trim() || null,
        correlationVersion: next.correlationVersion,
        expectedVersion: input.expectedVersion,
        receivingEncounterPreserved: Boolean(current.receivingEncounterId),
      },
    });

    return next;
  }

  async buildJourney(facilityId: string, encounterId: string) {
    const episodeFoundationOn = hospitalEpisodeFoundationEnabledFromProcessEnv();
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: episodeFoundationOn
        ? {
            id: true,
            patientId: true,
            facilityId: true,
            hospitalEpisodeId: true,
            admissionSummaryJson: true,
            admittedAt: true,
            status: true,
            type: true,
            roomLabel: true,
          }
        : {
            id: true,
            patientId: true,
            facilityId: true,
            admissionSummaryJson: true,
            admittedAt: true,
            status: true,
            type: true,
            roomLabel: true,
          },
    });
    if (!enc) {
      return { found: false as const, journey: null, findings: [], lifecycleSteps: [] };
    }

    let corr = readHospitalAdmissionCorrelation(enc.admissionSummaryJson);
    let placement: {
      id: string;
      status: string;
      assignedUnitCode: string | null;
      assignedBedKey: string | null;
      receivingEncounterId: string | null;
      specialPlacementNeedsJson: unknown;
    } | null = null;

    if (corr?.internalPlacementRequestId) {
      placement = await this.prisma.internalPlacementRequest.findFirst({
        where: { id: corr.internalPlacementRequestId, facilityId },
        select: {
          id: true,
          status: true,
          assignedUnitCode: true,
          assignedBedKey: true,
          receivingEncounterId: true,
          specialPlacementNeedsJson: true,
        },
      });
    } else if (enc.type === EncounterType.EMERGENCY) {
      const activePlacement = await this.prisma.internalPlacementRequest.findFirst({
        where: {
          originatingEncounterId: enc.id,
          facilityId,
          status: { notIn: ["CANCELLED", "DECLINED", "EXPIRED", "ERROR_REVIEW", "COMPLETED"] },
        },
        select: {
          id: true,
          status: true,
          assignedUnitCode: true,
          assignedBedKey: true,
          receivingEncounterId: true,
          specialPlacementNeedsJson: true,
        },
        orderBy: { createdAt: "desc" },
      });
      placement = activePlacement;
      if (!corr && activePlacement) {
        const corrId = readPlacementAdmissionCorrelationId(
          activePlacement.specialPlacementNeedsJson
        );
        if (corrId) {
          corr = readHospitalAdmissionCorrelation(enc.admissionSummaryJson);
        }
      }
    }

    const findings = this.diagnose({
      correlation: corr,
      receivingEncounter: {
        id: enc.id,
        patientId: enc.patientId,
        facilityId: enc.facilityId,
        hospitalEpisodeId: episodeFoundationOn && "hospitalEpisodeId" in enc
          ? ((enc as { hospitalEpisodeId?: string | null }).hospitalEpisodeId ?? null)
          : null,
        admissionSummaryJson: enc.admissionSummaryJson,
      },
      placement: placement
        ? {
            id: placement.id,
            patientId: enc.patientId,
            facilityId: enc.facilityId,
            receivingEncounterId: placement.receivingEncounterId,
            admissionCorrelationId: readPlacementAdmissionCorrelationId(
              placement.specialPlacementNeedsJson
            ),
          }
        : null,
    });

    const orphanFindings = diagnoseAdmissionOrphans({
      correlation: corr,
      placement: placement
        ? {
            id: placement.id,
            patientId: enc.patientId,
            facilityId: enc.facilityId,
            status: placement.status,
            receivingEncounterId: placement.receivingEncounterId,
            admissionCorrelationId: readPlacementAdmissionCorrelationId(
              placement.specialPlacementNeedsJson
            ),
            specialPlacementNeedsJson: placement.specialPlacementNeedsJson,
          }
        : null,
      receivingEncounter:
        enc.type === EncounterType.INPATIENT
          ? {
              id: enc.id,
              patientId: enc.patientId,
              facilityId: enc.facilityId,
              admissionSummaryJson: enc.admissionSummaryJson,
            }
          : null,
      bed: placement?.assignedBedKey
        ? {
            id: placement.assignedBedKey,
            status: corr?.status === "CANCELLED" ? "RESERVED_AFTER_CANCEL" : "ASSIGNED",
            reservedForPlacementId: placement.id,
          }
        : null,
      placementRequired: Boolean(
        corr &&
          (corr.admissionIntent === "ED_ADMIT_TO_INPATIENT" ||
            corr.admissionIntent === "PLACEMENT_RECEIVING")
      ),
    });

    const lifecycleSteps = corr ? admissionJourneyLifecycleSteps(corr) : [];

    return {
      found: true as const,
      journey: {
        admissionSource: corr?.admissionSource ?? null,
        admissionIntent: corr?.admissionIntent ?? null,
        sourceEncounterContext:
          corr?.sourceEncounterId != null ? ("LINKED" as const) : ("NONE" as const),
        requestedUnit: corr?.destinationUnitId ?? null,
        currentDestinationUnit: placement?.assignedUnitCode ?? corr?.destinationUnitId ?? null,
        placementState: placement?.status ?? null,
        /** Operational ids for resume/cancel — not rendered as clinician labels. */
        placementRequestId: corr?.internalPlacementRequestId ?? placement?.id ?? null,
        admissionCorrelationId: corr?.admissionCorrelationId ?? null,
        bed: placement?.assignedBedKey ?? null,
        receivingNurse: corr?.receivingUserId ? ("ASSIGNED" as const) : ("NONE" as const),
        receivingEncounterStatus: enc.type === EncounterType.INPATIENT ? enc.status : null,
        arrivalTime: corr?.arrivedAt ?? enc.admittedAt?.toISOString() ?? null,
        cancellationState: corr?.status === "CANCELLED" ? ("CANCELLED" as const) : null,
        correlationStatus: corr?.status ?? null,
        correlationVersion: corr?.correlationVersion ?? null,
        resumeAvailable: Boolean(
          corr &&
            corr.status !== "CANCELLED" &&
            corr.status !== "COMPLETED" &&
            !corr.receivingEncounterId
        ),
        lifecycleSteps,
        diagnostics: {
          correlationStatus: corr?.status ?? null,
          linkageHealthy: [...findings, ...orphanFindings].every(
            (f) => f.severity !== "HARD_ERROR"
          ),
        },
      },
      findings: [...findings, ...orphanFindings],
      lifecycleSteps,
    };
  }

  async listReconciliationQueue(facilityId: string) {
    if (!this.isReconciliationEnabled()) {
      throw new ForbiddenException("Admission correlation reconciliation is disabled");
    }

    const placements = await this.prisma.internalPlacementRequest.findMany({
      where: {
        facilityId,
        requestedEncounterType: "INPATIENT",
        status: {
          notIn: ["CANCELLED", "DECLINED", "EXPIRED", "ERROR_REVIEW", "COMPLETED"],
        },
      },
      select: {
        id: true,
        patientId: true,
        originatingEncounterId: true,
        receivingEncounterId: true,
        status: true,
        specialPlacementNeedsJson: true,
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    const items: Array<{
      kind: string;
      placementId?: string;
      sourceEncounterId?: string;
      receivingEncounterId?: string | null;
      detail: string;
      decision: string;
    }> = [];

    for (const p of placements) {
      const corrId = readPlacementAdmissionCorrelationId(p.specialPlacementNeedsJson);
      if (!corrId) {
        const decision = evaluateLegacyReconciliationEvidence({
          placementReceivingEncounterId: p.receivingEncounterId,
          candidateEncounterId: p.receivingEncounterId,
          samePatientOnly: true,
        });
        items.push({
          kind: "PLACEMENT_WITHOUT_CORRELATION",
          placementId: p.id,
          sourceEncounterId: p.originatingEncounterId,
          receivingEncounterId: p.receivingEncounterId,
          detail: "Active inpatient placement has no admission correlation linkage",
          decision: decision.action,
        });
      }
    }

    const episodeFoundationOn = hospitalEpisodeFoundationEnabledFromProcessEnv();
    const openIps = await this.prisma.encounter.findMany({
      where: {
        facilityId,
        status: EncounterStatus.OPEN,
        type: EncounterType.INPATIENT,
      },
      select: episodeFoundationOn
        ? {
            id: true,
            patientId: true,
            hospitalEpisodeId: true,
            admissionSummaryJson: true,
          }
        : {
            id: true,
            patientId: true,
            admissionSummaryJson: true,
          },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    for (const enc of openIps) {
      const corr = readHospitalAdmissionCorrelation(enc.admissionSummaryJson);
      if (!corr) {
        const decision = evaluateLegacyReconciliationEvidence({
          samePatientOnly: true,
          openInpatientOnly: true,
        });
        items.push({
          kind: "RECEIVING_WITHOUT_CORRELATION",
          receivingEncounterId: enc.id,
          detail: "Open inpatient encounter has no admission correlation",
          decision: decision.action,
        });
      } else if (
        corr.receivingEncounterId &&
        corr.receivingEncounterId !== enc.id
      ) {
        items.push({
          kind: "RECEIVING_ID_MISMATCH",
          receivingEncounterId: enc.id,
          detail: "Correlation receivingEncounterId does not match this encounter",
          decision: "REVIEW_REQUIRED",
        });
      }
    }

    return {
      facilityId,
      certification: ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID,
      items,
      autoLinkProhibited: true,
    };
  }

  async applyLegacyCorrection(input: {
    facilityId: string;
    actorUserId: string;
    reason: string;
    expectedVersion: number;
    hostEncounterId: string;
    patch: AdmissionCorrelationMutationPatch;
    evidence: Parameters<typeof evaluateLegacyReconciliationEvidence>[0];
    ip?: string;
    userAgent?: string;
  }) {
    if (!this.isReconciliationEnabled()) {
      throw new ForbiddenException("Admission correlation reconciliation is disabled");
    }
    const reason = String(input.reason ?? "").trim();
    if (!reason) throw new BadRequestException("reason is required");

    const decision = evaluateLegacyReconciliationEvidence(input.evidence);
    if (decision.action !== "LINK") {
      throw new BadRequestException({
        code: "ADMISSION_CORRELATION_REVIEW_REQUIRED",
        detail: "Ambiguous legacy linkage cannot be auto-corrected",
        decision,
      });
    }

    const beforeEnc = await this.prisma.encounter.findFirst({
      where: { id: input.hostEncounterId, facilityId: input.facilityId },
      select: { admissionSummaryJson: true, patientId: true },
    });
    if (!beforeEnc) throw new NotFoundException("Host encounter not found");
    const before = readHospitalAdmissionCorrelation(beforeEnc.admissionSummaryJson);

    const after = await this.mutateCorrelationOnEncounter({
      facilityId: input.facilityId,
      encounterId: input.hostEncounterId,
      expectedVersion: input.expectedVersion,
      patch: input.patch,
      actorUserId: input.actorUserId,
      auditEvent: "LEGACY_LINKAGE_CORRECTED",
      ip: input.ip,
      userAgent: input.userAgent,
    });

    await this.audit.log(AuditAction.UPDATE, ADMISSION_CORRELATION_ENTITY, {
      userId: input.actorUserId,
      facilityId: input.facilityId,
      patientId: beforeEnc.patientId,
      encounterId: input.hostEncounterId,
      entityId: after.admissionCorrelationId,
      critical: true,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        event: "LEGACY_RECONCILIATION_AUDIT",
        reason,
        beforeLinkage: before,
        afterLinkage: after,
        expectedVersion: input.expectedVersion,
        evidence: input.evidence,
      },
    });

    return { before, after, decision };
  }

  planObservationConversion(input: {
    patientId: string;
    facilityId: string;
    sourceObservationEncounterId: string;
    sourceEncounterType: string;
    medicationTransitionAction: MedicationTransitionAction;
    destinationUnitId?: string | null;
    hospitalEpisodeId?: string | null;
    idempotencyKey?: string | null;
    initiatedByUserId: string;
  }) {
    return planObservationToInpatientConversion({
      ...input,
      serverGeneratedId: this.newServerCorrelationSeed(),
    });
  }

  async listOpenInpatientCandidates(facilityId: string, patientId: string) {
    const episodeFoundationOn = hospitalEpisodeFoundationEnabledFromProcessEnv();
    return this.prisma.encounter.findMany({
      where: {
        facilityId,
        patientId,
        status: EncounterStatus.OPEN,
        type: EncounterType.INPATIENT,
      },
      select: episodeFoundationOn
        ? { id: true, hospitalEpisodeId: true, admissionSummaryJson: true }
        : { id: true, admissionSummaryJson: true },
    });
  }

  resolveReuse(input: {
    patientId: string;
    facilityId: string;
    admissionIntent: HospitalAdmissionIntent;
    hospitalEpisodeId?: string | null;
    sourceEncounterId?: string | null;
    internalPlacementRequestId?: string | null;
    idempotencyKey?: string | null;
    admissionCorrelationId?: string | null;
    placementReceivingEncounterId?: string | null;
    openInpatientCandidates: Array<{
      id: string;
      hospitalEpisodeId?: string | null;
      admissionSummaryJson?: unknown;
    }>;
  }): AdmissionCorrelationReuseDecision {
    void wrongOpenInpatientReusePreventionAlwaysOn();
    return resolveReceivingEncounterReuse(input);
  }

  resolveOrCreatePlan(input: {
    correlation: HospitalAdmissionCorrelationV1;
    actorUserId: string;
    expectedPatientId: string;
    expectedFacilityId: string;
    placementReceivingEncounterId?: string | null;
    openInpatientCandidates: Array<{
      id: string;
      hospitalEpisodeId?: string | null;
      admissionSummaryJson?: unknown;
    }>;
  }) {
    return planResolveOrCreateReceivingEncounter(input);
  }

  evaluateDuplicate(reuse: AdmissionCorrelationReuseDecision) {
    return evaluateDuplicateAdmission({ reuse });
  }

  evaluateLegacy(input: Parameters<typeof evaluateLegacyAdmissionLinkage>[0]) {
    return evaluateLegacyAdmissionLinkage(input);
  }

  assertPlacementConsistency(input: {
    placementReceivingEncounterId?: string | null;
    correlationReceivingEncounterId?: string | null;
  }) {
    return assertPlacementReceivingMatchesCorrelation(input);
  }

  diagnose(input: Parameters<typeof diagnoseAdmissionCorrelation>[0]) {
    return diagnoseAdmissionCorrelation(input);
  }
}
