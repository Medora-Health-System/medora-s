import { Injectable } from "@nestjs/common";
import {
  buildMedicationOrderedDoseSnapshotJson,
  evaluateMedicationDoseExpansionEligibility,
  filterUnmaterializedMedicationDoseSlots,
  medicationSchedulingFeatureFlagsEnabled,
  planMedicationDoseExpansionSlots,
  type MedicationCatalogSnapshotJson,
  type MedicationFrequencySnapshotJson,
  type MedicationSchedulingFeatureFlags,
} from "@medora/shared";
import type { MedicationOrderSchedule, OrderItem, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { getMedicationSchedulingFeatureFlagsFromEnv } from "../medication-scheduling/medication-scheduling-feature-flags.util";

export const MEDICATION_DOSE_INSTANCE_STATUS_PLANNED = "PLANNED" as const;
export const MEDICATION_DOSE_KIND_FIXED_ADMINISTRATION = "FIXED_ADMINISTRATION" as const;
export const MEDICATION_ORDER_SCHEDULE_STATUS_ACTIVE = "ACTIVE" as const;

export type MedicationDoseExpansionServiceResult = {
  expanded: boolean;
  reason: string;
  createdCount: number;
  scheduleId: string;
};

export type ExpandMedicationDosesForScheduleInput = {
  medicationOrderScheduleId: string;
  featureFlags?: Partial<MedicationSchedulingFeatureFlags> | null;
  /** Override anchor for deterministic tests; defaults to schedule.createdAt. */
  anchorAt?: Date;
  horizonEndAt?: Date;
  snapshottedAt?: Date;
};

type ScheduleWithOrderItem = MedicationOrderSchedule & {
  orderItem: Pick<
    OrderItem,
    "route" | "quantity" | "strength" | "manualLabel" | "frequencyCode" | "catalogItemId"
  >;
};

/** Standalone transactional expansion (mirrors schedule persistence pattern). */
export async function expandMedicationDosesForScheduleInTransaction(
  tx: Prisma.TransactionClient,
  input: ExpandMedicationDosesForScheduleInput
): Promise<MedicationDoseExpansionServiceResult> {
  const featureFlags = input.featureFlags ?? getMedicationSchedulingFeatureFlagsFromEnv();
  if (!medicationSchedulingFeatureFlagsEnabled(featureFlags)) {
    return {
      expanded: false,
      reason: "SCHEDULING_FLAGS_OFF",
      createdCount: 0,
      scheduleId: input.medicationOrderScheduleId,
    };
  }

  const schedule = await tx.medicationOrderSchedule.findUnique({
    where: { id: input.medicationOrderScheduleId },
    include: {
      orderItem: {
        select: {
          route: true,
          quantity: true,
          strength: true,
          manualLabel: true,
          frequencyCode: true,
          catalogItemId: true,
        },
      },
    },
  });

  if (!schedule) {
    return {
      expanded: false,
      reason: "SCHEDULE_NOT_FOUND",
      createdCount: 0,
      scheduleId: input.medicationOrderScheduleId,
    };
  }

  return expandLoadedMedicationOrderSchedule(tx, schedule, input);
}

@Injectable()
export class MedicationDoseExpansionService {
  constructor(private readonly prisma: PrismaService) {}

  async expandForSchedule(
    scheduleId: string,
    options?: Omit<ExpandMedicationDosesForScheduleInput, "medicationOrderScheduleId">
  ): Promise<MedicationDoseExpansionServiceResult> {
    return this.prisma.$transaction((tx) =>
      expandMedicationDosesForScheduleInTransaction(tx, {
        medicationOrderScheduleId: scheduleId,
        ...options,
      })
    );
  }
}

async function expandLoadedMedicationOrderSchedule(
  tx: Prisma.TransactionClient,
  schedule: ScheduleWithOrderItem,
  input: ExpandMedicationDosesForScheduleInput
): Promise<MedicationDoseExpansionServiceResult> {
    if (schedule.scheduleStatus !== MEDICATION_ORDER_SCHEDULE_STATUS_ACTIVE) {
      return {
        expanded: false,
        reason: "SCHEDULE_NOT_ACTIVE",
        createdCount: 0,
        scheduleId: schedule.id,
      };
    }

    if (schedule.scheduleClassification !== "RECURRING") {
      return {
        expanded: false,
        reason: "NOT_RECURRING",
        createdCount: 0,
        scheduleId: schedule.id,
      };
    }

    const catalogSnapshot = schedule.medicationCatalogSnapshotJson as MedicationCatalogSnapshotJson;
    const eligibility = evaluateMedicationDoseExpansionEligibility({
      frequencyCode: schedule.frequencyCode,
      catalog: {
        catalogItemId: catalogSnapshot.catalogItemId,
        catalogCode: catalogSnapshot.catalogItemCode,
        genericName: catalogSnapshot.genericName,
        therapeuticClass: catalogSnapshot.therapeuticClass,
        administrationType: catalogSnapshot.administrationType,
        route: catalogSnapshot.route,
      },
      orderRoute: schedule.orderItem.route,
    });

    if (!eligibility.shouldExpand) {
      return {
        expanded: false,
        reason: eligibility.reason,
        createdCount: 0,
        scheduleId: schedule.id,
      };
    }

    const facility = await tx.facility.findUnique({
      where: { id: schedule.facilityId },
      select: { timezone: true },
    });
    const facilityTimeZone = facility?.timezone?.trim() || "UTC";

    const frequencySnapshotJson =
      schedule.frequencySnapshotJson as MedicationFrequencySnapshotJson;
    const anchorAt = input.anchorAt ?? schedule.createdAt;

    const planResult = planMedicationDoseExpansionSlots({
      anchorAt,
      horizonEndAt: input.horizonEndAt,
      frequencySnapshotJson,
      facilityTimeZone,
    });

    if (!planResult.ok) {
      return {
        expanded: false,
        reason: planResult.reason,
        createdCount: 0,
        scheduleId: schedule.id,
      };
    }

    const existing = await tx.medicationDoseInstance.findMany({
      where: { medicationOrderScheduleId: schedule.id },
      select: { doseSequenceNumber: true },
      orderBy: { doseSequenceNumber: "asc" },
    });
    const existingSequenceNumbers = new Set(existing.map((row) => row.doseSequenceNumber));
    const slotsToCreate = filterUnmaterializedMedicationDoseSlots(
      planResult.slots,
      existingSequenceNumbers
    );

    if (slotsToCreate.length === 0) {
      return {
        expanded: true,
        reason: "ALREADY_MATERIALIZED",
        createdCount: 0,
        scheduleId: schedule.id,
      };
    }

    const snapshottedAt = input.snapshottedAt ?? new Date();
    const orderedDoseSnapshotJson = buildMedicationOrderedDoseSnapshotJson({
      doseValue: schedule.orderItem.strength,
      route: schedule.orderItem.route,
      quantity: schedule.orderItem.quantity,
      medicationLabel: schedule.orderItem.manualLabel,
      snapshottedAt,
    });

    const immutableFrequencySnapshot = structuredClone(frequencySnapshotJson);
    const immutableCatalogSnapshot = structuredClone(catalogSnapshot);

    let createdCount = 0;
    for (const slot of slotsToCreate) {
      try {
        await tx.medicationDoseInstance.create({
          data: {
            facilityId: schedule.facilityId,
            encounterId: schedule.encounterId,
            orderId: schedule.orderId,
            orderItemId: schedule.orderItemId,
            medicationOrderScheduleId: schedule.id,
            doseSequenceNumber: slot.doseSequenceNumber,
            doseKind: MEDICATION_DOSE_KIND_FIXED_ADMINISTRATION,
            scheduledAt: slot.scheduledAt,
            dueWindowStartAt: slot.dueWindowStartAt,
            dueWindowEndAt: slot.dueWindowEndAt,
            overdueAt: slot.overdueAt,
            doseStatus: MEDICATION_DOSE_INSTANCE_STATUS_PLANNED,
            scheduleClassificationSnapshot: schedule.scheduleClassification,
            frequencySnapshotJson: immutableFrequencySnapshot,
            medicationCatalogSnapshotJson: immutableCatalogSnapshot,
            orderedDoseSnapshotJson,
          },
        });
        createdCount += 1;
      } catch (err: unknown) {
        const code =
          err && typeof err === "object" && "code" in err
            ? (err as { code?: unknown }).code
            : undefined;
        if (code === "P2002") {
          continue;
        }
        throw err;
      }
    }

    return {
      expanded: true,
      reason: createdCount > 0 ? "DOSES_CREATED" : "ALREADY_MATERIALIZED",
      createdCount,
      scheduleId: schedule.id,
    };
}

/** @deprecated Use expandMedicationDosesForScheduleInTransaction */
export const maybeExpandMedicationDosesForSchedule = expandMedicationDosesForScheduleInTransaction;
