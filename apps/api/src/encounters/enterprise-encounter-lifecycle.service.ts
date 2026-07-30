/**
 * MEDUI.D4C.7K — One enterprise encounter lifecycle authority.
 *
 * Owns CLOSE / REOPEN status transitions, closedAt semantics (≠ dischargedAt),
 * append-only EncounterLifecycleTransition timeline rows, and reopen projection metadata.
 *
 * Care-setting adapters may supply discharge-specific validations and hooks; they must not
 * independently own Encounter.status, closedAt, close authorization, or lifecycle audit.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  EncounterBillingFinalizationStatus,
  EncounterStatus,
  EncounterWorkflowState,
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import {
  buildD4c7kPlatformActionContext,
  canCloseEncounter,
  canReopenEncounter,
  D4C7K_REOPEN_CODES,
  ENCOUNTER_LIFECYCLE_PERMISSIONS,
  isD4c7kPlatformSupportOverrideOnly,
  projectD4c7kReopenResult,
  resolveCloseLifecycleTransitionType,
  resolveReopenWorkspaceTarget,
  shouldSetDischargedAtOnEnterpriseClose,
  validateReopenReason,
  type EncounterLifecycleTransitionType,
} from "@medora/shared";
import { assertCanTransitionEncounter } from "../common/workflow/encounter.transitions";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { ENCOUNTER_DETAIL_SELECT, ENCOUNTER_ID_ONLY_SELECT } from "./encounter-query-contracts";

type TxClient = Prisma.TransactionClient;

export type EnterpriseCloseMutationInput = {
  facilityId: string;
  encounterId: string;
  patientId: string;
  previousStatus: string;
  encounterType: string;
  actorUserId?: string | null;
  actorRoleCodes?: readonly string[] | null;
  now?: Date;
  /** When true (inpatient discharge / explicit discharge payload / ED), also set dischargedAt. */
  setDischargedAt?: boolean;
  dischargedAt?: Date | null;
  clearRoomLabel?: boolean;
  forceDischargedAt?: boolean;
  hasExplicitDischargePayload?: boolean;
  careSetting?: string | null;
  reason?: string | null;
  reasonCode?: string | null;
  clientRequestId?: string | null;
  requestId?: string | null;
  /** Extra scalar/json fields merged into the encounter update (e.g. billing, discharge summary). */
  extraData?: Prisma.EncounterUpdateInput;
  /** Current version for optimistic concurrency (updateMany where). */
  expectedVersion: number;
  reopenCountBeforeClose?: number;
  metadata?: Record<string, unknown>;
  /** RolesGuard-resolved platform support context (audit only; never widens authorization). */
  platformPrincipal?: boolean;
  hasFacilityMembership?: boolean;
};

export type EncounterReopenDto = {
  reason: string;
  reasonCode?: string;
  expectedVersion?: number;
  clientRequestId?: string;
  facilityId?: string;
};

@Injectable()
export class EnterpriseEncounterLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  assertCloseAuthorized(actorRoleCodes: readonly string[] | null | undefined): void {
    if (!canCloseEncounter(actorRoleCodes)) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Vous n’êtes pas autorisé à clôturer cette rencontre.",
        code: "ENCOUNTER_CLOSE_UNAUTHORIZED",
        permission: ENCOUNTER_LIFECYCLE_PERMISSIONS.CLOSE_ENCOUNTER,
      });
    }
  }

  assertReopenAuthorized(actorRoleCodes: readonly string[] | null | undefined): void {
    if (!canReopenEncounter(actorRoleCodes)) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Vous n’êtes pas autorisé à rouvrir cette rencontre.",
        code: D4C7K_REOPEN_CODES.UNAUTHORIZED,
        permission: ENCOUNTER_LIFECYCLE_PERMISSIONS.REOPEN_ENCOUNTER,
      });
    }
  }

  /**
   * Authoritative close mutation used by EncountersService.close and inpatient discharge.
   * Caller must already have completed advisory / care-setting validations and hold a transaction.
   */
  async applyCloseTransition(
    tx: TxClient,
    input: EnterpriseCloseMutationInput
  ): Promise<{ closedAt: Date; transitionType: EncounterLifecycleTransitionType; sequence: number }> {
    const now = input.now ?? new Date();
    /**
     * dischargedAt stays owned by the discharge workflows: it is written only when the caller
     * declares an explicit discharge (payload or inpatient/ED discharge workflow).
     */
    const writeDischargedAt =
      input.setDischargedAt === true ||
      shouldSetDischargedAtOnEnterpriseClose({
        encounterType: input.encounterType,
        hasExplicitDischargePayload: input.hasExplicitDischargePayload === true,
        forceDischargedAt: input.forceDischargedAt === true,
      });
    const platformContext = buildD4c7kPlatformActionContext({
      facilityId: input.facilityId,
      platformPrincipal: input.platformPrincipal,
      hasFacilityMembership: input.hasFacilityMembership,
      actorRoleCodes: input.actorRoleCodes,
    });

    assertCanTransitionEncounter(input.previousStatus, EncounterStatus.CLOSED);

    const reopenCount = Math.max(0, Number(input.reopenCountBeforeClose ?? 0) || 0);
    const transitionType = resolveCloseLifecycleTransitionType(reopenCount);

    const data: Prisma.EncounterUncheckedUpdateManyInput = {
      status: EncounterStatus.CLOSED,
      workflowState: EncounterWorkflowState.CLOSED,
      closedAt: now,
      closedByUserId: input.actorUserId ?? null,
      ...(input.clearRoomLabel !== false ? { roomLabel: null } : {}),
      ...(writeDischargedAt
        ? { dischargedAt: input.dischargedAt ?? now }
        : {}),
      version: { increment: 1 },
    };

    // Merge scalar extra fields carefully (avoid relation connect syntax on updateMany).
    if (input.extraData) {
      const extra = input.extraData as Record<string, unknown>;
      for (const [key, value] of Object.entries(extra)) {
        if (value !== undefined) (data as Record<string, unknown>)[key] = value;
      }
    }

    const um = await tx.encounter.updateMany({
      where: {
        id: input.encounterId,
        facilityId: input.facilityId,
        version: input.expectedVersion,
        status: EncounterStatus.OPEN,
      },
      data,
    });
    if (um.count === 0) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        message: "L’état de la rencontre a changé. Les données ont été actualisées.",
        code: D4C7K_REOPEN_CODES.VERSION_CONFLICT,
      });
    }

    const sequence = await this.nextSequence(tx, input.encounterId);
    const care =
      resolveReopenWorkspaceTarget({
        encounterType: input.encounterType,
        careSetting: input.careSetting,
      }).careSetting;

    await tx.encounterLifecycleTransition.create({
      data: {
        encounterId: input.encounterId,
        facilityId: input.facilityId,
        patientId: input.patientId,
        careSetting: care,
        transitionType,
        previousState: input.previousStatus,
        newState: EncounterStatus.CLOSED,
        actorUserId: input.actorUserId ?? null,
        actorRoleCodesJson: [...(input.actorRoleCodes ?? [])] as Prisma.InputJsonValue,
        reason: input.reason ?? null,
        reasonCode: input.reasonCode ?? null,
        clientRequestId: input.clientRequestId ?? null,
        requestId: input.requestId ?? null,
        supportOverride: platformContext.supportOverride,
        metadataJson: {
          ...(input.metadata ?? {}),
          dischargedAtWritten: writeDischargedAt,
          platformPrincipal: platformContext.platformPrincipal,
          crossFacilitySupportAction: platformContext.crossFacilitySupportAction,
          facilityContextId: platformContext.facilityContextId,
        } as Prisma.InputJsonValue,
        sequence,
        createdAt: now,
      },
    });

    return { closedAt: now, transitionType, sequence };
  }

  async reopenEncounter(
    facilityId: string,
    encounterId: string,
    body: EncounterReopenDto,
    actorUserId: string | undefined,
    actorRoleCodes: readonly string[] | null | undefined,
    options?: {
      ip?: string;
      userAgent?: string;
      requestId?: string | null;
      /** Stamped by RolesGuard for the authoritative platform principal (audit context only). */
      platformPrincipal?: boolean;
      hasFacilityMembership?: boolean;
    }
  ) {
    this.assertReopenAuthorized(actorRoleCodes);

    /** Platform administration always requires an explicit facility context. */
    if (!String(facilityId ?? "").trim()) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Contexte établissement requis.",
        code: D4C7K_REOPEN_CODES.FACILITY_SCOPE,
      });
    }

    const reasonCheck = validateReopenReason(body.reason);
    if (!reasonCheck.ok) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Un motif de réouverture est obligatoire.",
        code: D4C7K_REOPEN_CODES.REASON_REQUIRED,
      });
    }

    const effectiveFacilityId = body.facilityId?.trim() || facilityId;
    if (effectiveFacilityId !== facilityId) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: "Contexte établissement invalide pour la réouverture.",
        code: D4C7K_REOPEN_CODES.FACILITY_SCOPE,
      });
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId: effectiveFacilityId },
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        type: true,
        status: true,
        version: true,
        workflowState: true,
        closedAt: true,
        closedByUserId: true,
        reopenedAt: true,
        reopenedByUserId: true,
        reopenReason: true,
        reopenCount: true,
        billingFinalizationStatus: true,
        roomLabel: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    // Idempotent: already OPEN after a matching reopen request
    if (encounter.status === EncounterStatus.OPEN) {
      if (
        body.clientRequestId &&
        encounter.reopenedAt &&
        (await this.hasMatchingReopenTransition(effectiveFacilityId, encounterId, body.clientRequestId))
      ) {
        return projectD4c7kReopenResult({
          encounterId,
          previousStatus: EncounterStatus.CLOSED,
          reopenedAt: encounter.reopenedAt,
          reopenedByUserId: encounter.reopenedByUserId,
          version: encounter.version,
          facilityId: effectiveFacilityId,
          encounterType: encounter.type,
          workflowState: encounter.workflowState,
          idempotent: true,
          warnings: this.billingWarnings(encounter.billingFinalizationStatus),
        });
      }
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        message: "La rencontre est déjà ouverte.",
        code: D4C7K_REOPEN_CODES.ALREADY_OPEN,
      });
    }

    if (encounter.status === EncounterStatus.CANCELLED) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        message: "Une rencontre annulée ne peut pas être rouverte.",
        code: D4C7K_REOPEN_CODES.INVALID_TRANSITION,
      });
    }

    if (encounter.status !== EncounterStatus.CLOSED) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        message: "Seule une rencontre clôturée peut être rouverte.",
        code: D4C7K_REOPEN_CODES.NOT_CLOSED,
      });
    }

    if (
      typeof body.expectedVersion === "number" &&
      body.expectedVersion !== encounter.version
    ) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        message: "L’état de la rencontre a changé. Les données ont été actualisées.",
        code: D4C7K_REOPEN_CODES.VERSION_CONFLICT,
        expectedVersion: body.expectedVersion,
        currentVersion: encounter.version,
      });
    }

    assertCanTransitionEncounter(encounter.status, EncounterStatus.OPEN);

    const now = new Date();
    const warnings = this.billingWarnings(encounter.billingFinalizationStatus);
    const platformContext = buildD4c7kPlatformActionContext({
      facilityId: effectiveFacilityId,
      platformPrincipal: options?.platformPrincipal,
      hasFacilityMembership: options?.hasFacilityMembership,
      actorRoleCodes,
    });
    const supportOverride = platformContext.supportOverride;
    const workspace = resolveReopenWorkspaceTarget({
      encounterType: encounter.type,
      workflowState: encounter.workflowState,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const um = await tx.encounter.updateMany({
        where: {
          id: encounterId,
          facilityId: effectiveFacilityId,
          version: encounter.version,
          status: EncounterStatus.CLOSED,
        },
        data: {
          status: EncounterStatus.OPEN,
          // Restore a safe active workflow — do not invent care-setting-specific engines.
          workflowState: EncounterWorkflowState.IN_TREATMENT,
          /**
           * Operational close fields describe the *current* state only. Historical closure lives
           * permanently in EncounterLifecycleTransition + the ENCOUNTER_CLOSE audit event, so an
           * active encounter never carries a non-null closedAt.
           */
          closedAt: null,
          closedByUserId: null,
          reopenedAt: now,
          reopenedByUserId: actorUserId ?? null,
          reopenReason: reasonCheck.normalized,
          reopenReasonCode: body.reasonCode?.trim() || null,
          reopenCount: { increment: 1 },
          // Explicit: do not restore room/bed; do not touch billing* or documentation.
          roomLabel: null,
          version: { increment: 1 },
        },
      });
      if (um.count === 0) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: "L’état de la rencontre a changé. Les données ont été actualisées.",
          code: D4C7K_REOPEN_CODES.VERSION_CONFLICT,
        });
      }

      const sequence = await this.nextSequence(tx, encounterId);
      await tx.encounterLifecycleTransition.create({
        data: {
          encounterId,
          facilityId: effectiveFacilityId,
          patientId: encounter.patientId,
          careSetting: workspace.careSetting,
          transitionType: "ENCOUNTER_REOPENED",
          previousState: EncounterStatus.CLOSED,
          newState: EncounterStatus.OPEN,
          actorUserId: actorUserId ?? null,
          actorRoleCodesJson: [...(actorRoleCodes ?? [])] as Prisma.InputJsonValue,
          reason: reasonCheck.normalized,
          reasonCode: body.reasonCode?.trim() || null,
          clientRequestId: body.clientRequestId?.trim() || null,
          requestId: options?.requestId ?? null,
          supportOverride,
          metadataJson: {
            permission: ENCOUNTER_LIFECYCLE_PERMISSIONS.REOPEN_ENCOUNTER,
            roomAssignmentRestored: false,
            bedAssignmentRestored: false,
            billingReopened: false,
            prescriptionsUnlocked: false,
            signedDocumentationUnlocked: false,
            previousClosedAt: encounter.closedAt?.toISOString() ?? null,
            previousClosedByUserId: encounter.closedByUserId,
            closedAtCleared: true,
            billingFinalizationStatus: encounter.billingFinalizationStatus,
            platformPrincipal: platformContext.platformPrincipal,
            crossFacilitySupportAction: platformContext.crossFacilitySupportAction,
            facilityContextId: platformContext.facilityContextId,
            warnings,
          } as Prisma.InputJsonValue,
          sequence,
          createdAt: now,
        },
      });

      await this.audit.log(AuditAction.ENCOUNTER_REOPEN, "ENCOUNTER", {
        userId: actorUserId,
        facilityId: effectiveFacilityId,
        patientId: encounter.patientId,
        encounterId,
        entityId: encounterId,
        ip: options?.ip,
        userAgent: options?.userAgent,
        critical: true,
        tx,
        metadata: {
          previousStatus: EncounterStatus.CLOSED,
          newStatus: EncounterStatus.OPEN,
          transitionType: "ENCOUNTER_REOPENED",
          permission: ENCOUNTER_LIFECYCLE_PERMISSIONS.REOPEN_ENCOUNTER,
          actorRole: [...(actorRoleCodes ?? [])],
          reason: reasonCheck.normalized,
          reasonCode: body.reasonCode?.trim() || null,
          clientRequestId: body.clientRequestId?.trim() || null,
          requestId: options?.requestId ?? null,
          supportPolicyOverride: supportOverride,
          roomAssignmentRestored: false,
          bedAssignmentRestored: false,
          billingReopened: false,
          prescriptionsUnlocked: false,
          signedDocumentationUnlocked: false,
          previousClosedAt: encounter.closedAt?.toISOString() ?? null,
          previousClosedByUserId: encounter.closedByUserId,
          closedAtCleared: true,
          lifecycleVersionAfter: encounter.version + 1,
          platformPrincipal: platformContext.platformPrincipal,
          crossFacilitySupportAction: platformContext.crossFacilitySupportAction,
          facilityContextId: platformContext.facilityContextId,
          warnings,
        },
      });

      const row = await tx.encounter.findFirst({
        where: { id: encounterId, facilityId: effectiveFacilityId },
        select: { ...ENCOUNTER_ID_ONLY_SELECT, version: true, type: true, workflowState: true },
      });
      if (!row) throw new NotFoundException("Encounter not found");
      return row;
    });

    return projectD4c7kReopenResult({
      encounterId,
      previousStatus: EncounterStatus.CLOSED,
      reopenedAt: now,
      reopenedByUserId: actorUserId ?? null,
      version: updated.version,
      facilityId: effectiveFacilityId,
      encounterType: updated.type,
      workflowState: updated.workflowState,
      idempotent: false,
      warnings,
    });
  }

  /**
   * Append-only lifecycle timeline row (caller owns the encounter status mutation).
   */
  async recordLifecycleTransition(
    tx: TxClient,
    input: {
      facilityId: string;
      encounterId: string;
      patientId: string;
      careSetting?: string | null;
      encounterType?: string | null;
      transitionType: EncounterLifecycleTransitionType | string;
      previousState: string;
      newState: string;
      actorUserId?: string | null;
      actorRoleCodes?: readonly string[] | null;
      reason?: string | null;
      reasonCode?: string | null;
      clientRequestId?: string | null;
      requestId?: string | null;
      supportOverride?: boolean;
      metadata?: Record<string, unknown>;
      createdAt?: Date;
    }
  ): Promise<number> {
    const sequence = await this.nextSequence(tx, input.encounterId);
    const care =
      input.careSetting ??
      resolveReopenWorkspaceTarget({
        encounterType: input.encounterType,
        careSetting: input.careSetting,
      }).careSetting;
    await tx.encounterLifecycleTransition.create({
      data: {
        encounterId: input.encounterId,
        facilityId: input.facilityId,
        patientId: input.patientId,
        careSetting: care,
        transitionType: String(input.transitionType),
        previousState: input.previousState,
        newState: input.newState,
        actorUserId: input.actorUserId ?? null,
        actorRoleCodesJson: [...(input.actorRoleCodes ?? [])] as Prisma.InputJsonValue,
        reason: input.reason ?? null,
        reasonCode: input.reasonCode ?? null,
        clientRequestId: input.clientRequestId ?? null,
        requestId: input.requestId ?? null,
        supportOverride: input.supportOverride === true,
        metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
        sequence,
        createdAt: input.createdAt ?? new Date(),
      },
    });
    return sequence;
  }

  async listLifecycleTimeline(facilityId: string, encounterId: string, limitRaw?: number) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, status: true, closedAt: true, reopenedAt: true, reopenCount: true },
    });
    if (!enc) throw new NotFoundException("Encounter not found");

    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw!), 1), 200)
      : 100;

    const rows = await this.prisma.encounterLifecycleTransition.findMany({
      where: { encounterId, facilityId },
      orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
      take: limit,
    });

    return {
      encounterId,
      facilityId,
      currentStatus: enc.status,
      closedAt: enc.closedAt?.toISOString() ?? null,
      reopenedAt: enc.reopenedAt?.toISOString() ?? null,
      reopenCount: enc.reopenCount,
      events: rows.map((r) => ({
        id: r.id,
        encounterId: r.encounterId,
        facilityId: r.facilityId,
        patientId: r.patientId,
        careSetting: r.careSetting,
        transitionType: r.transitionType,
        previousState: r.previousState,
        newState: r.newState,
        actorUserId: r.actorUserId,
        actorRoleCodes: r.actorRoleCodesJson,
        reason: r.reason,
        reasonCode: r.reasonCode,
        clientRequestId: r.clientRequestId,
        requestId: r.requestId,
        supportOverride: r.supportOverride,
        metadata: r.metadataJson,
        sequence: r.sequence,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  private billingWarnings(
    billingFinalizationStatus: EncounterBillingFinalizationStatus | string | null | undefined
  ): string[] {
    const status = String(billingFinalizationStatus ?? "");
    if (
      status === EncounterBillingFinalizationStatus.FINALIZED ||
      status === "SUBMITTED" ||
      status === "EXPORTED"
    ) {
      return [D4C7K_REOPEN_CODES.BILLING_PRESERVED];
    }
    return [];
  }

  private async nextSequence(tx: TxClient, encounterId: string): Promise<number> {
    const last = await tx.encounterLifecycleTransition.findFirst({
      where: { encounterId },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    return (last?.sequence ?? 0) + 1;
  }

  private async hasMatchingReopenTransition(
    facilityId: string,
    encounterId: string,
    clientRequestId: string
  ): Promise<boolean> {
    const row = await this.prisma.encounterLifecycleTransition.findFirst({
      where: {
        facilityId,
        encounterId,
        transitionType: "ENCOUNTER_REOPENED",
        clientRequestId,
      },
      select: { id: true },
    });
    return !!row;
  }
}

/** Narrow helper for callers that only need the Prisma client type. */
export type EnterpriseLifecyclePrisma = PrismaClient;
