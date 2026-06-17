import { isMedicationDoseOpenForCancellation } from "@medora/shared";
import type { Prisma } from "@prisma/client";

type CascadeMedicationOrderCancelInput = {
  facilityId: string;
  orderId?: string;
  orderItemIds?: string[];
  cancelledAt: Date;
  cancelReason: string;
  cancelledByUserId: string;
};

async function resolveMedicationOrderItemIds(
  tx: Prisma.TransactionClient,
  input: CascadeMedicationOrderCancelInput
): Promise<string[]> {
  if (input.orderItemIds?.length) {
    return [...new Set(input.orderItemIds.map((id) => id.trim()).filter(Boolean))];
  }
  if (!input.orderId?.trim()) return [];

  const items = await tx.orderItem.findMany({
    where: {
      orderId: input.orderId.trim(),
      catalogItemType: "MEDICATION",
      medicationFulfillmentIntent: "ADMINISTER_CHART",
    },
    select: { id: true },
  });
  return items.map((row) => row.id);
}

/** Cascade future open dose instances and active schedules when a medication order is canceled. */
export async function cascadeMedicationOrderCancelInTransaction(
  tx: Prisma.TransactionClient,
  input: CascadeMedicationOrderCancelInput
): Promise<void> {
  const orderItemIds = await resolveMedicationOrderItemIds(tx, input);
  if (orderItemIds.length === 0) return;

  await tx.medicationOrderSchedule.updateMany({
    where: {
      facilityId: input.facilityId,
      orderItemId: { in: orderItemIds },
      scheduleStatus: { notIn: ["CANCELLED", "SUPERSEDED"] },
    },
    data: {
      scheduleStatus: "CANCELLED",
      cancelledAt: input.cancelledAt,
      cancelledByUserId: input.cancelledByUserId,
      cancelReason: input.cancelReason,
    },
  });

  const openDoses = await tx.medicationDoseInstance.findMany({
    where: {
      facilityId: input.facilityId,
      orderItemId: { in: orderItemIds },
      doseStatus: { notIn: ["COMPLETED", "MISSED", "CANCELLED", "SUPERSEDED", "HELD"] },
      terminalMedicationAdministrationId: null,
      scheduledAt: { gte: input.cancelledAt },
    },
    select: {
      id: true,
      doseStatus: true,
      scheduledAt: true,
      terminalMedicationAdministrationId: true,
    },
  });

  for (const dose of openDoses) {
    if (
      !isMedicationDoseOpenForCancellation({
        doseStatus: dose.doseStatus,
        scheduledAt: dose.scheduledAt,
        cancelledAt: input.cancelledAt,
        hasTerminalAdministration: dose.terminalMedicationAdministrationId != null,
      })
    ) {
      continue;
    }
    await tx.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "CANCELLED",
        cancelledAt: input.cancelledAt,
        cancelReason: input.cancelReason,
      },
    });
  }
}
