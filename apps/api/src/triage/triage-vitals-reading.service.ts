import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, Prisma, RoleCode, TriageVitalsReadingStatus } from "@prisma/client";
import { isVitalsVoidReasonCode } from "@medora/shared";
import { AuditService } from "../common/services/audit.service";
import {
  assertEncounterNotSigned,
  assertEncounterOpenForClinicalMutation,
} from "../encounters/encounter-sign-lock.util";
import { PrismaService } from "../prisma/prisma.service";
import { computeDisplayNameInitials } from "../utils/clinical-event-nursing-assessment-json.util";
import {
  normalizeVitalsMeasurementContext,
  resolveMeasuredAt,
} from "../utils/vitals-measurement-context.util";
import { hasMeaningfulVitalMeasurement, resolveLatestMeaningfulVitalsReading } from "@medora/shared";
import { hasNonEmptyVitalsJson } from "../utils/patient-sex-map";

@Injectable()
export class TriageVitalsReadingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async resolveAttribution(facilityId: string, userId: string | null | undefined) {
    if (!userId) {
      return {
        recordedByUserId: null as string | null,
        recordedByDisplayName: null as string | null,
        recordedByInitials: null as string | null,
        recordedByRole: null as string | null,
      };
    }
    const actor = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userRoles: {
          where: { facilityId, isActive: true },
          include: { role: { select: { code: true } } },
        },
      },
    });
    if (!actor) {
      return {
        recordedByUserId: userId,
        recordedByDisplayName: null,
        recordedByInitials: "—",
        recordedByRole: null,
      };
    }
    const display = `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim();
    const codes = actor.userRoles.map((r) => r.role.code);
    const role =
      codes.includes(RoleCode.PROVIDER)
        ? "PROVIDER"
        : codes.includes(RoleCode.RN)
          ? "RN"
          : codes.includes(RoleCode.ADMIN)
            ? "ADMIN"
            : codes[0] ?? null;
    return {
      recordedByUserId: actor.id,
      recordedByDisplayName: display || null,
      recordedByInitials: display ? computeDisplayNameInitials(display) : "—",
      recordedByRole: role,
    };
  }

  private async refreshPatientLatestFromActiveReadings(patientId: string, facilityId: string) {
    const readings = await this.prisma.triageVitalsReading.findMany({
      where: {
        patientId,
        facilityId,
        status: TriageVitalsReadingStatus.ACTIVE,
      },
      orderBy: [{ measuredAt: "desc" }, { recordedAt: "desc" }],
      take: 40,
    });
    const newest = resolveLatestMeaningfulVitalsReading(readings);
    await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        latestVitalsJson: newest
          ? (newest.vitalsJson as Prisma.InputJsonValue)
          : Prisma.DbNull,
        latestVitalsAt: newest ? newest.measuredAt : null,
      },
    });
    return newest;
  }

  private async syncEncounterCurrentVitals(
    encounterId: string,
    facilityId: string,
    patientId: string
  ) {
    const readings = await this.prisma.triageVitalsReading.findMany({
      where: {
        encounterId,
        facilityId,
        status: TriageVitalsReadingStatus.ACTIVE,
      },
      orderBy: [{ measuredAt: "desc" }, { recordedAt: "desc" }],
      take: 40,
    });
    const newestOnEncounter = resolveLatestMeaningfulVitalsReading(readings);
    await this.prisma.triage.updateMany({
      where: { encounterId, facilityId },
      data: {
        vitalsJson: newestOnEncounter
          ? (newestOnEncounter.vitalsJson as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
    await this.refreshPatientLatestFromActiveReadings(patientId, facilityId);
  }

  async updateReading(
    encounterId: string,
    readingId: string,
    facilityId: string,
    body: { vitalsJson?: unknown; measuredAt?: unknown },
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        status: true,
        workflowState: true,
        providerDocumentationStatus: true,
      },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);
    assertEncounterNotSigned(encounter);

    const reading = await this.prisma.triageVitalsReading.findFirst({
      where: { id: readingId, encounterId, facilityId },
    });
    if (!reading) throw new NotFoundException("Vitals reading not found");
    if (reading.status === TriageVitalsReadingStatus.VOIDED) {
      throw new BadRequestException("Cannot edit a voided vitals reading");
    }

    const previousVitals =
      reading.vitalsJson && typeof reading.vitalsJson === "object" && !Array.isArray(reading.vitalsJson)
        ? { ...(reading.vitalsJson as Record<string, unknown>) }
        : {};
    const previousMeasuredAt = reading.measuredAt.toISOString();

    let nextVitals = previousVitals;
    if (body.vitalsJson !== undefined) {
      if (!body.vitalsJson || typeof body.vitalsJson !== "object" || Array.isArray(body.vitalsJson)) {
        throw new BadRequestException("vitalsJson must be an object");
      }
      nextVitals = normalizeVitalsMeasurementContext(body.vitalsJson as Record<string, unknown>);
      if (!hasNonEmptyVitalsJson(nextVitals) || !hasMeaningfulVitalMeasurement(nextVitals)) {
        throw new BadRequestException(
          "Enter at least one vital-sign measurement before saving."
        );
      }
    } else {
      nextVitals = normalizeVitalsMeasurementContext(previousVitals);
    }

    const measuredAt =
      body.measuredAt !== undefined
        ? resolveMeasuredAt(body.measuredAt)
        : reading.measuredAt;

    const updated = await this.prisma.triageVitalsReading.update({
      where: { id: reading.id },
      data: {
        vitalsJson: nextVitals as object,
        measuredAt,
        // recordedAt / recordedByUserId remain immutable
      },
      include: {
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.syncEncounterCurrentVitals(encounterId, facilityId, encounter.patientId);

    await this.audit.log(AuditAction.UPDATE, "TRIAGE_VITALS_READING", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: reading.id,
      ip,
      userAgent,
      metadata: {
        action: "VITALS_READING_UPDATE",
        previous: { vitalsJson: previousVitals, measuredAt: previousMeasuredAt },
        next: {
          vitalsJson: nextVitals,
          measuredAt: measuredAt.toISOString(),
        },
      },
    });

    const attribution = await this.resolveAttribution(facilityId, updated.recordedByUserId);
    return {
      id: updated.id,
      encounterId: updated.encounterId,
      triageId: updated.triageId,
      status: updated.status,
      measuredAt: updated.measuredAt.toISOString(),
      recordedAt: updated.recordedAt.toISOString(),
      vitalsJson: updated.vitalsJson,
      ...attribution,
    };
  }

  async voidReading(
    encounterId: string,
    readingId: string,
    facilityId: string,
    body: { voidReasonCode?: unknown; voidReasonText?: unknown },
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) throw new ForbiddenException("Authentication required");

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        status: true,
        workflowState: true,
        providerDocumentationStatus: true,
      },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);
    assertEncounterNotSigned(encounter);

    const reading = await this.prisma.triageVitalsReading.findFirst({
      where: { id: readingId, encounterId, facilityId },
    });
    if (!reading) throw new NotFoundException("Vitals reading not found");
    if (reading.status === TriageVitalsReadingStatus.VOIDED) {
      throw new BadRequestException("Vitals reading already voided");
    }

    const codeRaw = body.voidReasonCode;
    if (!isVitalsVoidReasonCode(codeRaw)) {
      throw new BadRequestException("voidReasonCode is required");
    }
    let reasonText: string | null = null;
    if (typeof body.voidReasonText === "string") {
      reasonText = body.voidReasonText.trim().slice(0, 500) || null;
    }
    if (codeRaw === "OTHER" && !reasonText) {
      throw new BadRequestException("voidReasonText is required when voidReasonCode is OTHER");
    }

    const previousVitals =
      reading.vitalsJson && typeof reading.vitalsJson === "object" && !Array.isArray(reading.vitalsJson)
        ? { ...(reading.vitalsJson as Record<string, unknown>) }
        : {};

    const voided = await this.prisma.triageVitalsReading.update({
      where: { id: reading.id },
      data: {
        status: TriageVitalsReadingStatus.VOIDED,
        voidedAt: new Date(),
        voidedByUserId: userId,
        voidReasonCode: codeRaw,
        voidReasonText: reasonText,
      },
    });

    await this.syncEncounterCurrentVitals(encounterId, facilityId, encounter.patientId);

    await this.audit.log(AuditAction.UPDATE, "TRIAGE_VITALS_READING", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: reading.id,
      ip,
      userAgent,
      metadata: {
        action: "VITALS_READING_VOID",
        voidReasonCode: codeRaw,
        voidReasonText: reasonText,
        previous: {
          vitalsJson: previousVitals,
          measuredAt: reading.measuredAt.toISOString(),
          recordedAt: reading.recordedAt.toISOString(),
          recordedByUserId: reading.recordedByUserId,
        },
      },
    });

    return {
      id: voided.id,
      status: voided.status,
      voidedAt: voided.voidedAt?.toISOString() ?? null,
      voidReasonCode: voided.voidReasonCode,
      voidReasonText: voided.voidReasonText,
    };
  }
}
