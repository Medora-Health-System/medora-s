import {
  isMarShiftTimelineHoldNotes,
  resolveMedicationMarActionFromStorage,
} from "@medora/shared";
import type { MedicationInfusionTimelineResult } from "@/features/emergency/erOrderLifecycleUi";

/** Medication START/STOP/Administer execution lives in unified MAR only (M1.8B.7K.5). */
export const MEDICATION_ADMINISTRATION_EXECUTION_IN_MAR_ONLY = true;

export function isMedicationAdministrationManagedInMar(
  orderType: string,
  item: Record<string, unknown>
): boolean {
  return (
    MEDICATION_ADMINISTRATION_EXECUTION_IN_MAR_ONLY &&
    orderType === "MEDICATION" &&
    String(item.catalogItemType ?? "") === "MEDICATION" &&
    String(item.medicationFulfillmentIntent ?? "") === "ADMINISTER_CHART"
  );
}

export type MedicationOrderMarTerminalMarSlice = {
  marAction?: string | null;
  notes?: string | null;
};

export function resolveMedicationOrderMarStatusLabel(
  itemStatus: string,
  infusionTimeline: Pick<MedicationInfusionTimelineResult, "active" | "lastCompleted">,
  t: (key: string) => string,
  terminalMar?: MedicationOrderMarTerminalMarSlice | null
): string {
  const st = String(itemStatus ?? "").trim().toUpperCase();
  if (st === "CANCELLED" || st === "DISCONTINUED") {
    return t("erEmergencyOrders.marStatusDiscontinued");
  }
  if (terminalMar) {
    const action = resolveMedicationMarActionFromStorage({
      marAction: terminalMar.marAction ?? null,
      notes: terminalMar.notes,
    });
    if (action === "refused" || action === "not_available") {
      return t("erEmergencyOrders.marStatusRefusedOnMar");
    }
    if (action === "md_changed" && isMarShiftTimelineHoldNotes(terminalMar.notes)) {
      return t("erEmergencyOrders.marStatusHeldOnMar");
    }
  }
  if (infusionTimeline.active) {
    return t("erEmergencyOrders.marStatusInfusionInProgress");
  }
  if (infusionTimeline.lastCompleted || st === "COMPLETED") {
    return t("erEmergencyOrders.marStatusCompletedOnMar");
  }
  if (st === "ACKNOWLEDGED") {
    return t("erEmergencyOrders.marStatusMarManaged");
  }
  if (st === "IN_PROGRESS") {
    return t("erEmergencyOrders.marStatusActiveMarManaged");
  }
  return t("erEmergencyOrders.marStatusOrdered");
}

export const MEDICATION_ORDER_MAR_HELPER_I18N_KEY =
  "erEmergencyOrders.medicationAdministrationInMar";
