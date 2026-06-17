import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RoleCode, Prisma } from "@prisma/client";
import {
  appendMarDoseScheduleAdjustmentHistory,
  buildMarDoseScheduleAdjustmentAuditEntry,
  computeMedicationDoseDueWindowsForScheduledAt,
  resolveOriginalScheduledAtFromDose,
  validateMarDoseScheduleAdjustment,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

export type AdjustMedicationDoseScheduleInput = {
  facilityId: string;
  encounterId: string;
  doseInstanceId: string;
  userId: string;
  userDisplay: string | null;
  facilityTimeZone?: string | null;
  newScheduledAtIso: string;
  reasonCode: string;
  reasonDetail?: string | null;
};

@Injectable()
export class MedicationDoseScheduleAdjustmentService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveFacilityTimeZone(facilityId: string): Promise<string | null> {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { timezone: true },
    });
    return facility?.timezone?.trim() || null;
  }

  async adjustScheduledAt(input: AdjustMedicationDoseScheduleInput) {
    const dose = await this.prisma.medicationDoseInstance.findFirst({
      where: {
        id: input.doseInstanceId,
        facilityId: input.facilityId,
        encounterId: input.encounterId,
      },
      include: {
        orderItem: {
          select: {
            id: true,
            manualLabel: true,
            manualSecondaryText: true,
            strength: true,
            route: true,
          },
        },
      },
    });
    if (!dose) {
      throw new NotFoundException("Medication dose not found");
    }

    const validation = validateMarDoseScheduleAdjustment({
      doseStatus: dose.doseStatus,
      terminalMedicationAdministrationId: dose.terminalMedicationAdministrationId,
      originalScheduledAt: dose.scheduledAt,
      newScheduledAt: input.newScheduledAtIso,
      reasonCode: input.reasonCode,
      reasonDetail: input.reasonDetail,
    });
    if (!validation.ok) {
      throw new BadRequestException(validation.code);
    }

    const originalScheduledAt = resolveOriginalScheduledAtFromDose({
      scheduledAt: dose.scheduledAt,
      orderedDoseSnapshotJson: dose.orderedDoseSnapshotJson,
    });
    const facilityTimeZone =
      input.facilityTimeZone?.trim() ||
      (await this.resolveFacilityTimeZone(input.facilityId));
    const auditEntry = buildMarDoseScheduleAdjustmentAuditEntry({
      doseStatus: dose.doseStatus,
      terminalMedicationAdministrationId: dose.terminalMedicationAdministrationId,
      originalScheduledAt,
      previousScheduledAt: dose.scheduledAt,
      newScheduledAt: validation.newScheduledAt,
      reasonCode: input.reasonCode,
      reasonDetail: input.reasonDetail,
      changedByUserId: input.userId,
      changedByDisplay: input.userDisplay,
      facilityTimeZone,
    });
    const windows = computeMedicationDoseDueWindowsForScheduledAt(validation.newScheduledAt);
    const orderedDoseSnapshotJson = appendMarDoseScheduleAdjustmentHistory(
      dose.orderedDoseSnapshotJson,
      auditEntry
    ) as Prisma.InputJsonValue;

    const updated = await this.prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        scheduledAt: validation.newScheduledAt,
        dueWindowStartAt: windows.dueWindowStartAt,
        dueWindowEndAt: windows.dueWindowEndAt,
        overdueAt: windows.overdueAt,
        orderedDoseSnapshotJson,
      },
      select: {
        id: true,
        scheduledAt: true,
        dueWindowStartAt: true,
        dueWindowEndAt: true,
        doseStatus: true,
      },
    });

    return {
      doseInstanceId: updated.id,
      scheduledAt: updated.scheduledAt.toISOString(),
      dueWindowStartAt: updated.dueWindowStartAt.toISOString(),
      dueWindowEndAt: updated.dueWindowEndAt.toISOString(),
      doseStatus: updated.doseStatus,
      auditEntry,
    };
  }
}

export function assertMarDoseScheduleAdjustmentRoles(roleCodes: RoleCode[]): void {
  const allowed = new Set<RoleCode>([RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN]);
  if (!roleCodes.some((role) => allowed.has(role))) {
    throw new ForbiddenException("Insufficient role for medication dose schedule adjustment");
  }
}
