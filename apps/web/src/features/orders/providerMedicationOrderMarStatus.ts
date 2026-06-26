import type { MedicationInfusionTimelineResult } from "@/features/emergency/erOrderLifecycleUi";
import { resolveMedicationOrderMarStatusLabel } from "@/features/emergency/medicationOrderMarExecutionPolicy";

export function resolveProviderMedicationOrderMarExecutionSummary(input: {
  itemStatus: string;
  marManagedInMar: boolean;
  infusionTimeline: Pick<MedicationInfusionTimelineResult, "active" | "lastCompleted">;
  t: (key: string) => string;
}): string | null {
  if (!input.marManagedInMar) return null;
  return resolveMedicationOrderMarStatusLabel(
    input.itemStatus,
    input.infusionTimeline,
    input.t
  );
}
