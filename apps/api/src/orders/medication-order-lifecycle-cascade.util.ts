import { isMedicationDoseOpenForCancellation } from "@medora/shared";
import type { Prisma } from "@prisma/client";
import type { MedicationOrderLifecycleStatus } from "@medora/shared";

type CascadeMedicationOrderLifecycleInput = {
  facilityId: string;
  orderItemIds?: string[];
  effectiveAt: Date;
  reason: string;
  performedByUserId: string;
  lifecycleStatus: Extract<
    MedicationOrderLifecycleStatus,
    "DISCONTINUED" | "SUPERSEDED" | "ON_HOLD"
  >;
};

async function resolveMedicationOrderItemIds(
  tx: Prisma.TransactionClient,
  input: CascadeMedicationOrderLifecycleInput
): Promise<string[]> {
  if (!input.orderItemIds?.length) return [];
  return [...new Set(input.orderItemIds.map((id) => id.trim()).filter(Boolean))];
}

/** Cascade future open doses and schedules when a medication order is discontinued/superseded/held. */
export async function cascadeMedicationOrderLifecycleInTransaction(
  tx: Prisma.TransactionClient,
  input: CascadeMedicationOrderLifecycleInput
): Promise<void> {
  const orderItemIds = await resolveMedicationOrderItemIds(tx, input);
  if (orderItemIds.length === 0) return;

  const scheduleStatus =
    input.lifecycleStatus === "ON_HOLD" ? "ACTIVE" : input.lifecycleStatus;

  if (input.lifecycleStatus !== "ON_HOLD") {
    await tx.medicationOrderSchedule.updateMany({
      where: {
        facilityId: input.facilityId,
        orderItemId: { in: orderItemIds },
        scheduleStatus: { notIn: ["CANCELLED", "SUPERSEDED"] },
      },
      data: {
        scheduleStatus,
        cancelledAt: input.effectiveAt,
        cancelledByUserId: input.performedByUserId,
        cancelReason: input.reason,
        ...(input.lifecycleStatus === "SUPERSEDED"
          ? { supersededAt: input.effectiveAt }
          : {}),
      },
    });
  }

  const openDoses = await tx.medicationDoseInstance.findMany({
    where: {
      facilityId: input.facilityId,
      orderItemId: { in: orderItemIds },
      doseStatus: { notIn: ["COMPLETED", "MISSED", "CANCELLED", "SUPERSEDED"] },
      terminalMedicationAdministrationId: null,
    },
    select: {
      id: true,
      doseStatus: true,
      scheduledAt: true,
      terminalMedicationAdministrationId: true,
      infusionSessionId: true,
    },
  });

  for (const dose of openDoses) {
    const keepRunningInfusion =
      dose.doseStatus === "IN_PROGRESS" && dose.infusionSessionId != null;
    if (keepRunningInfusion) continue;

    if (
      !isMedicationDoseOpenForCancellation({
        doseStatus: dose.doseStatus,
        scheduledAt: dose.scheduledAt,
        cancelledAt: input.effectiveAt,
        hasTerminalAdministration: dose.terminalMedicationAdministrationId != null,
      })
    ) {
      continue;
    }

    const nextStatus =
      input.lifecycleStatus === "SUPERSEDED" ? "SUPERSEDED" : "CANCELLED";

    await tx.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: nextStatus,
        cancelledAt: input.effectiveAt,
        cancelReason: input.reason,
        ...(input.lifecycleStatus === "SUPERSEDED"
          ? { supersededAt: input.effectiveAt }
          : {}),
      },
    });
  }
}
