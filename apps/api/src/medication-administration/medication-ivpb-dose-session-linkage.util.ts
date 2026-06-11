import { BadRequestException } from "@nestjs/common";
import type { MedicationDoseInstance, MedicationOrderSchedule, Prisma } from "@prisma/client";
import {
  medicationIvpbDoseSchedulingEnabled,
  type MedicationSchedulingFeatureFlags,
} from "@medora/shared";

type DoseWithSchedule = MedicationDoseInstance & {
  medicationOrderSchedule: MedicationOrderSchedule;
};

export type RecurringIvpbDoseStartLinkage = {
  dose: DoseWithSchedule;
  schedule: MedicationOrderSchedule;
};

export type RecurringIvpbDoseStopLinkage = {
  dose: DoseWithSchedule;
  infusionSessionId: string;
};

/** Inline PLANNED→DUE and DUE→OVERDUE promotion for one order line (mirrors promotion scheduler). */
export async function promoteRecurringIvpbDoseStatusesForOrderItem(
  tx: Prisma.TransactionClient,
  input: { orderItemId: string; facilityId: string; now: Date }
): Promise<void> {
  await tx.medicationDoseInstance.updateMany({
    where: {
      facilityId: input.facilityId,
      orderItemId: input.orderItemId,
      doseKind: "IVPB_SESSION",
      doseStatus: "PLANNED",
      dueWindowStartAt: { lte: input.now },
    },
    data: { doseStatus: "DUE" },
  });

  await tx.medicationDoseInstance.updateMany({
    where: {
      facilityId: input.facilityId,
      orderItemId: input.orderItemId,
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      dueWindowEndAt: { lt: input.now },
    },
    data: { doseStatus: "OVERDUE" },
  });
}

async function loadDoseWithSchedule(
  client: Prisma.TransactionClient | { medicationDoseInstance: Prisma.TransactionClient["medicationDoseInstance"] },
  doseId: string,
  facilityId: string,
  orderItemId: string
): Promise<DoseWithSchedule | null> {
  return client.medicationDoseInstance.findFirst({
    where: { id: doseId, facilityId, orderItemId, doseKind: "IVPB_SESSION" },
    include: { medicationOrderSchedule: true },
  });
}

async function findEarliestStartableDose(
  client: Prisma.TransactionClient | { medicationDoseInstance: Prisma.TransactionClient["medicationDoseInstance"] },
  input: { orderItemId: string; facilityId: string }
): Promise<DoseWithSchedule | null> {
  return client.medicationDoseInstance.findFirst({
    where: {
      facilityId: input.facilityId,
      orderItemId: input.orderItemId,
      doseKind: "IVPB_SESSION",
      scheduleClassificationSnapshot: "RECURRING_IVPB",
      infusionSessionId: null,
      doseStatus: { in: ["DUE", "OVERDUE"] },
    },
    orderBy: { doseSequenceNumber: "asc" },
    include: { medicationOrderSchedule: true },
  });
}

/**
 * Resolves recurring IVPB dose linkage for infusion START (M1.8B.7J.3).
 * Returns null when flags off or no RECURRING_IVPB schedule — caller uses legacy IVPB path.
 */
export async function resolveRecurringIvpbDoseStartLinkage(
  tx: Prisma.TransactionClient,
  input: {
    orderItemId: string;
    facilityId: string;
    featureFlags: MedicationSchedulingFeatureFlags;
    now: Date;
    explicitMedicationDoseInstanceId?: string | null;
  }
): Promise<RecurringIvpbDoseStartLinkage | null> {
  if (!medicationIvpbDoseSchedulingEnabled(input.featureFlags)) {
    return null;
  }

  const schedule = await tx.medicationOrderSchedule.findFirst({
    where: {
      orderItemId: input.orderItemId,
      facilityId: input.facilityId,
      scheduleClassification: "RECURRING_IVPB",
      scheduleStatus: "ACTIVE",
    },
  });
  if (!schedule) {
    return null;
  }

  await promoteRecurringIvpbDoseStatusesForOrderItem(tx, {
    orderItemId: input.orderItemId,
    facilityId: input.facilityId,
    now: input.now,
  });

  const explicitId = input.explicitMedicationDoseInstanceId?.trim() || null;
  let dose: DoseWithSchedule | null = null;

  if (explicitId) {
    dose = await loadDoseWithSchedule(tx, explicitId, input.facilityId, input.orderItemId);
    if (!dose) {
      throw new BadRequestException("Dose IVPB planifiée introuvable pour cette ligne.");
    }
  } else {
    dose = await findEarliestStartableDose(tx, {
      orderItemId: input.orderItemId,
      facilityId: input.facilityId,
    });
  }

  if (!dose) {
    throw new BadRequestException(
      "Aucune dose IVPB planifiée n'est prête à démarrer pour cette ligne."
    );
  }

  if (dose.scheduleClassificationSnapshot !== "RECURRING_IVPB") {
    throw new BadRequestException("La dose indiquée n'appartient pas à un calendrier IVPB récurrent.");
  }

  return { dose, schedule };
}

/**
 * Finds IN_PROGRESS IVPB_SESSION dose linked to legacy infusion session key (M1.8B.7J.3).
 */
export async function findRecurringIvpbDoseStopLinkage(
  prisma: {
    infusionSession: Prisma.TransactionClient["infusionSession"];
    medicationDoseInstance: Prisma.TransactionClient["medicationDoseInstance"];
  },
  input: {
    orderItemId: string;
    facilityId: string;
    legacyInfusionSessionKey: string;
    featureFlags: MedicationSchedulingFeatureFlags;
    explicitMedicationDoseInstanceId?: string | null;
  }
): Promise<RecurringIvpbDoseStopLinkage | null> {
  if (!medicationIvpbDoseSchedulingEnabled(input.featureFlags)) {
    return null;
  }

  const session = await prisma.infusionSession.findFirst({
    where: {
      orderItemId: input.orderItemId,
      facilityId: input.facilityId,
      legacyInfusionSessionKey: input.legacyInfusionSessionKey,
      status: "IN_PROGRESS",
    },
    select: { id: true },
  });
  if (!session) {
    return null;
  }

  const explicitId = input.explicitMedicationDoseInstanceId?.trim() || null;
  const dose = explicitId
    ? await prisma.medicationDoseInstance.findFirst({
        where: {
          id: explicitId,
          orderItemId: input.orderItemId,
          facilityId: input.facilityId,
          infusionSessionId: session.id,
          doseKind: "IVPB_SESSION",
          doseStatus: "IN_PROGRESS",
          scheduleClassificationSnapshot: "RECURRING_IVPB",
        },
        include: { medicationOrderSchedule: true },
      })
    : await prisma.medicationDoseInstance.findFirst({
        where: {
          orderItemId: input.orderItemId,
          facilityId: input.facilityId,
          infusionSessionId: session.id,
          doseKind: "IVPB_SESSION",
          doseStatus: "IN_PROGRESS",
        },
        include: { medicationOrderSchedule: true },
      });

  if (!dose) {
    if (explicitId) {
      throw new BadRequestException(
        "La dose indiquée ne correspond pas à la perfusion IVPB en cours."
      );
    }
    return null;
  }

  if (dose.scheduleClassificationSnapshot !== "RECURRING_IVPB") {
    if (explicitId) {
      throw new BadRequestException(
        "La dose indiquée n'appartient pas à un calendrier IVPB récurrent."
      );
    }
    return null;
  }

  return { dose, infusionSessionId: session.id };
}
