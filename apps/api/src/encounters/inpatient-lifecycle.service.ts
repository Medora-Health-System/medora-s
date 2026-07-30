/**
 * D4A.2.5 — Governed inpatient encounter lifecycle (edit / transfer / discharge / cancel / void).
 * Never hard-deletes clinical records. Zero schema migration. No D3B/placement enablement.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, EncounterStatus, EncounterType, Prisma } from "@prisma/client";
import {
  BED_NO_LONGER_AVAILABLE_CODE,
  emptyInpatientLifecycleMeta,
  formatCanonicalBedDisplay,
  isBedSelectableForAdmissionIntake,
  isInpatientCancelReasonCode,
  mergeInpatientLifecycleMeta,
  parseCanonicalBedKey,
  readInpatientLifecycleMeta,
  validateBedInPool,
  INPATIENT_LIFECYCLE_NURSING_ADMISSION_CERTIFICATION_ID,
  type InpatientLifecycleMetaV1,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { FacilityBedBoardService } from "../facilities/facility-bed-board.service";
import { EnterpriseEncounterLifecycleService } from "./enterprise-encounter-lifecycle.service";

const ENTITY = "InpatientLifecycle" as const;

@Injectable()
export class InpatientLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bedBoardService: FacilityBedBoardService,
    private readonly enterpriseLifecycle: EnterpriseEncounterLifecycleService
  ) {}

  meta() {
    return {
      module: "INPATIENT_LIFECYCLE",
      certification: INPATIENT_LIFECYCLE_NURSING_ADMISSION_CERTIFICATION_ID,
      hardDeleteProhibited: true,
      voidRequiresReason: true,
      cancelRequiresReason: true,
    };
  }

  async getEncounterLifecycle(facilityId: string, encounterId: string) {
    const enc = await this.loadInpatient(facilityId, encounterId);
    return {
      ...this.meta(),
      encounterId: enc.id,
      status: enc.status,
      roomLabel: enc.roomLabel,
      lifecycle: this.lifecycleOf(enc.admissionSummaryJson),
    };
  }

  private async loadInpatient(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId, type: EncounterType.INPATIENT },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        roomLabel: true,
        admittedAt: true,
        physicianAssignedUserId: true,
        nurseAssignedUserId: true,
        admissionSummaryJson: true,
        version: true,
        reopenCount: true,
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    return enc;
  }

  private lifecycleOf(summary: unknown): InpatientLifecycleMetaV1 {
    return readInpatientLifecycleMeta(summary) ?? emptyInpatientLifecycleMeta();
  }

  private assertNotVoided(meta: InpatientLifecycleMetaV1) {
    if (meta.voidedAt) {
      throw new ConflictException({ code: "ENCOUNTER_VOIDED", message: "Encounter is voided" });
    }
  }

  async editAdmissionDetails(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      admittedAt?: string | null;
      admissionSource?: string | null;
      admittingService?: string | null;
      requestedLevelOfCare?: string | null;
      attendingProviderUserId?: string | null;
      admissionDiagnosis?: string | null;
      reasonForAdmission?: string | null;
      editReason: string;
    },
    options?: { ip?: string; userAgent?: string }
  ) {
    const enc = await this.loadInpatient(facilityId, encounterId);
    if (enc.status !== EncounterStatus.OPEN) {
      throw new ConflictException({ code: "ENCOUNTER_CLOSED", message: "Encounter is not open" });
    }
    const meta = this.lifecycleOf(enc.admissionSummaryJson);
    this.assertNotVoided(meta);
    const reason = String(body.editReason ?? "").trim();
    if (reason.length < 3) throw new BadRequestException("editReason is required");

    const root =
      enc.admissionSummaryJson &&
      typeof enc.admissionSummaryJson === "object" &&
      !Array.isArray(enc.admissionSummaryJson)
        ? { ...(enc.admissionSummaryJson as Record<string, unknown>) }
        : {};

    const previous: Record<string, unknown> = {
      admittedAt: enc.admittedAt?.toISOString() ?? null,
      admissionSource: root.admissionSource ?? null,
      admittingService: root.admittingService ?? null,
      requestedLevelOfCare: root.careLevel ?? null,
      attendingProviderUserId: enc.physicianAssignedUserId,
      admissionDiagnosis: root.admissionDiagnosis ?? null,
      reasonForAdmission: root.admissionReason ?? null,
    };

    const next: Record<string, unknown> = { ...previous };
    const data: Prisma.EncounterUncheckedUpdateInput = { version: { increment: 1 } };
    const changed: string[] = [];

    if (body.admittedAt != null) {
      const d = new Date(String(body.admittedAt));
      if (!Number.isFinite(d.getTime())) throw new BadRequestException("admittedAt is invalid");
      data.admittedAt = d;
      next.admittedAt = d.toISOString();
      changed.push("admittedAt");
    }
    if (body.attendingProviderUserId !== undefined) {
      data.physicianAssignedUserId = body.attendingProviderUserId?.trim() || null;
      next.attendingProviderUserId = body.attendingProviderUserId?.trim() || null;
      changed.push("attendingProviderUserId");
    }
    if (body.admissionSource != null) {
      root.admissionSource = String(body.admissionSource).trim();
      next.admissionSource = root.admissionSource;
      changed.push("admissionSource");
    }
    if (body.admittingService != null) {
      root.admittingService = String(body.admittingService).trim();
      next.admittingService = root.admittingService;
      changed.push("admittingService");
    }
    if (body.requestedLevelOfCare != null) {
      root.careLevel = String(body.requestedLevelOfCare).trim();
      next.requestedLevelOfCare = root.careLevel;
      changed.push("requestedLevelOfCare");
    }
    if (body.admissionDiagnosis != null) {
      root.admissionDiagnosis = String(body.admissionDiagnosis).trim();
      next.admissionDiagnosis = root.admissionDiagnosis;
      changed.push("admissionDiagnosis");
    }
    if (body.reasonForAdmission != null) {
      root.admissionReason = String(body.reasonForAdmission).trim();
      next.reasonForAdmission = root.admissionReason;
      changed.push("reasonForAdmission");
    }
    if (!changed.length) throw new BadRequestException("No admission fields to edit");

    meta.admissionDetailEdits = [
      ...(meta.admissionDetailEdits ?? []),
      {
        editedAt: new Date().toISOString(),
        editedByUserId: actorUserId,
        fields: changed,
        previous,
        next,
      },
    ];
    const summary = mergeInpatientLifecycleMeta(root, meta);
    data.admissionSummaryJson = summary as Prisma.InputJsonValue;

    await this.prisma.encounter.update({
      where: { id: enc.id },
      data,
      select: { id: true },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: enc.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_ADMISSION_DETAILS_EDITED",
        fields: changed,
        editReason: reason.slice(0, 200),
      },
    });

    return { encounterId: enc.id, changedFields: changed, lifecycle: meta };
  }

  async transferBed(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      toBedKey: string;
      reason: string;
      effectiveAt?: string | null;
    },
    options?: { ip?: string; userAgent?: string }
  ) {
    const enc = await this.loadInpatient(facilityId, encounterId);
    if (enc.status !== EncounterStatus.OPEN) {
      throw new ConflictException({ code: "ENCOUNTER_CLOSED", message: "Encounter is not open" });
    }
    const meta = this.lifecycleOf(enc.admissionSummaryJson);
    this.assertNotVoided(meta);

    const reason = String(body.reason ?? "").trim();
    if (reason.length < 3) throw new BadRequestException("reason is required");
    const toBedKey = String(body.toBedKey ?? "").trim();
    const parsed = parseCanonicalBedKey(toBedKey);
    if (!parsed || !validateBedInPool(parsed.unit, parsed.room)) {
      throw new BadRequestException("toBedKey is not a valid facility bed");
    }

    const bedRow = await this.bedBoardService.getEffectiveBedRow(facilityId, toBedKey);
    if (!bedRow) throw new BadRequestException("toBedKey is not a valid facility bed");
    if (
      (!isBedSelectableForAdmissionIntake(bedRow.status) || bedRow.occupantEncounterId) &&
      bedRow.occupantEncounterId !== enc.id
    ) {
      throw new ConflictException({ code: "BED_OCCUPIED", message: BED_NO_LONGER_AVAILABLE_CODE });
    }

    const root =
      enc.admissionSummaryJson &&
      typeof enc.admissionSummaryJson === "object" &&
      !Array.isArray(enc.admissionSummaryJson)
        ? { ...(enc.admissionSummaryJson as Record<string, unknown>) }
        : {};
    const fromBedKey =
      typeof root.assignedBedKey === "string" ? root.assignedBedKey : null;
    const fromParsed = fromBedKey ? parseCanonicalBedKey(fromBedKey) : null;
    const effectiveAt = body.effectiveAt?.trim()
      ? new Date(body.effectiveAt)
      : new Date();
    if (!Number.isFinite(effectiveAt.getTime())) {
      throw new BadRequestException("effectiveAt is invalid");
    }

    const roomLabel = formatCanonicalBedDisplay(parsed.unit, parsed.room);
    root.assignedBedKey = toBedKey;
    root.serviceUnit = parsed.unit;

    meta.bedTransfers = [
      ...(meta.bedTransfers ?? []),
      {
        transferredAt: new Date().toISOString(),
        transferredByUserId: actorUserId,
        fromUnit: fromParsed?.unit ?? null,
        fromBedKey,
        toUnit: parsed.unit,
        toBedKey,
        reason,
        effectiveAt: effectiveAt.toISOString(),
      },
    ];
    const summary = mergeInpatientLifecycleMeta(root, meta);

    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        roomLabel,
        admissionSummaryJson: summary as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: enc.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_BED_TRANSFERRED",
        fromBedKey,
        toBedKey,
      },
    });

    return {
      encounterId: enc.id,
      fromBedKey,
      toBedKey,
      roomLabel,
      lifecycle: meta,
    };
  }

  async dischargeEncounter(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      disposition: string;
      dischargedAt?: string | null;
      condition?: string | null;
      destination?: string | null;
      responsibleProviderUserId?: string | null;
      nursingDischargeComplete?: boolean;
      instructionsStatus?: string | null;
      medReconStatus?: string | null;
      followUpStatus?: string | null;
      note?: string | null;
    },
    options?: { ip?: string; userAgent?: string }
  ) {
    const enc = await this.loadInpatient(facilityId, encounterId);
    if (enc.status !== EncounterStatus.OPEN) {
      throw new ConflictException({ code: "ENCOUNTER_CLOSED", message: "Encounter is not open" });
    }
    const meta = this.lifecycleOf(enc.admissionSummaryJson);
    this.assertNotVoided(meta);
    if (meta.cancelledAt) {
      throw new ConflictException({
        code: "ENCOUNTER_CANCELLED",
        message: "Cancelled encounter cannot be discharged",
      });
    }

    const disposition = String(body.disposition ?? "").trim().toUpperCase();
    if (!disposition) throw new BadRequestException("disposition is required");
    const dischargedAt = body.dischargedAt?.trim()
      ? new Date(body.dischargedAt)
      : new Date();
    if (!Number.isFinite(dischargedAt.getTime())) {
      throw new BadRequestException("dischargedAt is invalid");
    }

    meta.discharge = {
      dischargedAt: dischargedAt.toISOString(),
      dischargedByUserId: actorUserId,
      disposition,
      condition: body.condition?.trim() || null,
      destination: body.destination?.trim() || null,
      responsibleProviderUserId: body.responsibleProviderUserId?.trim() || null,
      nursingDischargeComplete: body.nursingDischargeComplete === true,
      instructionsStatus: body.instructionsStatus?.trim() || null,
      medReconStatus: body.medReconStatus?.trim() || null,
      followUpStatus: body.followUpStatus?.trim() || null,
      note: body.note?.trim() || null,
    };
    const summary = mergeInpatientLifecycleMeta(enc.admissionSummaryJson, meta);

    /**
     * MEDUI.D4C.7K — inpatient discharge keeps discharge-specific metadata here, then routes the
     * authoritative encounter close (status, closedAt, workflow, timeline) through
     * EnterpriseEncounterLifecycleService. Bed release remains an inpatient adapter concern.
     */
    await this.prisma.$transaction(async (tx) => {
      await this.enterpriseLifecycle.applyCloseTransition(tx, {
        facilityId,
        encounterId: enc.id,
        patientId: enc.patientId,
        previousStatus: enc.status,
        encounterType: enc.type,
        actorUserId,
        actorRoleCodes: ["RN", "PROVIDER", "ADMIN"],
        now: dischargedAt,
        forceDischargedAt: true,
        dischargedAt,
        clearRoomLabel: true,
        careSetting: "INPATIENT",
        reason: disposition,
        reasonCode: "INPATIENT_DISCHARGE",
        expectedVersion: enc.version,
        reopenCountBeforeClose: Number((enc as { reopenCount?: number }).reopenCount ?? 0) || 0,
        extraData: {
          disposition,
          admissionSummaryJson: summary as Prisma.InputJsonValue,
        },
        metadata: {
          event: "INPATIENT_ENCOUNTER_DISCHARGED",
          bedReleased: true,
          source: "InpatientLifecycleService.dischargeEncounter",
        },
      });
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: enc.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_ENCOUNTER_DISCHARGED",
        disposition,
        bedReleased: true,
        enterpriseLifecycleClose: true,
      },
    });

    return { encounterId: enc.id, status: "CLOSED", lifecycle: meta };
  }

  async cancelAdmission(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { reasonCode: string; explanation: string },
    options?: { ip?: string; userAgent?: string }
  ) {
    const enc = await this.loadInpatient(facilityId, encounterId);
    if (enc.status !== EncounterStatus.OPEN) {
      throw new ConflictException({ code: "ENCOUNTER_CLOSED", message: "Encounter is not open" });
    }
    const meta = this.lifecycleOf(enc.admissionSummaryJson);
    this.assertNotVoided(meta);
    if (!isInpatientCancelReasonCode(body.reasonCode)) {
      throw new BadRequestException("Invalid cancel reasonCode");
    }
    const explanation = String(body.explanation ?? "").trim();
    if (explanation.length < 3) throw new BadRequestException("explanation is required");

    // Soft clinical-activity gate: orders/MAR/results presence blocks casual cancel.
    const activity = await this.countSubstantialClinicalActivity(enc.id);
    if (activity.substantial) {
      throw new ConflictException({
        code: "CANCEL_NOT_ALLOWED_AFTER_CARE",
        message: "Cancel admission is only for administrative cancellation before clinical care",
        activity,
      });
    }

    meta.cancelledAt = new Date().toISOString();
    meta.cancelledByUserId = actorUserId;
    meta.cancelReasonCode = body.reasonCode;
    meta.cancelExplanation = explanation;
    const summary = mergeInpatientLifecycleMeta(enc.admissionSummaryJson, meta);

    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        status: EncounterStatus.CANCELLED,
        roomLabel: null,
        admissionSummaryJson: summary as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: enc.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_ADMISSION_CANCELLED",
        reasonCode: body.reasonCode,
        hardDelete: false,
      },
    });

    return { encounterId: enc.id, status: "CANCELLED", lifecycle: meta };
  }

  async voidEncounter(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { reason: string; confirm: boolean; adminOverride?: boolean },
    options?: { ip?: string; userAgent?: string }
  ) {
    if (body.confirm !== true) {
      throw new BadRequestException("confirm must be true to void an encounter");
    }
    const reason = String(body.reason ?? "").trim();
    if (reason.length < 5) throw new BadRequestException("reason is required");

    const enc = await this.loadInpatient(facilityId, encounterId);
    const meta = this.lifecycleOf(enc.admissionSummaryJson);
    this.assertNotVoided(meta);

    const activity = await this.countSubstantialClinicalActivity(enc.id);
    if (activity.substantial && body.adminOverride !== true) {
      throw new ForbiddenException({
        code: "VOID_BLOCKED_CLINICAL_ACTIVITY",
        message:
          "Encounter with substantial clinical activity cannot be casually voided without admin override",
        activity,
      });
    }

    meta.voidedAt = new Date().toISOString();
    meta.voidedByUserId = actorUserId;
    meta.voidReason = reason;
    const summary = mergeInpatientLifecycleMeta(enc.admissionSummaryJson, meta);

    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        // CANCELLED hides from active census while retaining the chart row.
        status: EncounterStatus.CANCELLED,
        roomLabel: null,
        admissionSummaryJson: summary as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, ENTITY, {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: enc.id,
      critical: true,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "INPATIENT_ENCOUNTER_VOIDED",
        hardDelete: false,
        adminOverride: body.adminOverride === true,
      },
    });

    return {
      encounterId: enc.id,
      status: "CANCELLED",
      voided: true,
      hardDeleted: false,
      lifecycle: meta,
    };
  }

  private async countSubstantialClinicalActivity(encounterId: string) {
    const [orders, mar, notes] = await Promise.all([
      this.prisma.order.count({ where: { encounterId } }).catch(() => 0),
      this.prisma.medicationAdministration.count({ where: { encounterId } }).catch(() => 0),
      this.prisma.encounterNote.count({ where: { encounterId } }).catch(() => 0),
    ]);
    const substantial = orders + mar + notes >= 3 || orders >= 1 || mar >= 1;
    return { orders, mar, notes, substantial };
  }
}
