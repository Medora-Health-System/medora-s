import type { MedicationPassQueueBucket } from "@medora/shared";
import type { MedicationPassQueueDoseSnapshot, MedicationPassQueueItem } from "@/lib/medicationPassQueueApi";

/** Operational bucket display order for pass queue panel (M1.8B.7I.5). */
export const MEDICATION_PASS_QUEUE_BUCKET_DISPLAY_ORDER = [
  "OVERDUE",
  "DUE",
  "IN_PROGRESS",
  "HELD",
  "UPCOMING",
] as const satisfies readonly MedicationPassQueueBucket[];

export function appendMedicationDoseInstanceIdToMarCreateBody(
  body: Record<string, unknown>,
  medicationDoseInstanceId?: string | null
): Record<string, unknown> {
  const id = medicationDoseInstanceId?.trim();
  if (!id) return body;
  return { ...body, medicationDoseInstanceId: id };
}

export function groupMedicationPassQueueItemsByBucket(
  items: MedicationPassQueueItem[]
): Map<MedicationPassQueueBucket, MedicationPassQueueItem[]> {
  const grouped = new Map<MedicationPassQueueBucket, MedicationPassQueueItem[]>();
  for (const bucket of MEDICATION_PASS_QUEUE_BUCKET_DISPLAY_ORDER) {
    grouped.set(bucket, []);
  }
  for (const item of items) {
    const list = grouped.get(item.queueBucket);
    if (list) list.push(item);
  }
  return grouped;
}

export function formatMedicationPassQueueDoseLabel(
  snapshot: MedicationPassQueueDoseSnapshot | null | undefined
): string | null {
  if (!snapshot) return null;
  if (snapshot.doseValue?.trim() && snapshot.doseUnit?.trim()) {
    return `${snapshot.doseValue.trim()} ${snapshot.doseUnit.trim()}`;
  }
  if (snapshot.quantity?.trim() && snapshot.quantityUnit?.trim()) {
    return `${snapshot.quantity.trim()} ${snapshot.quantityUnit.trim()}`;
  }
  return null;
}

export function medicationPassQueueBucketAccentColor(bucket: MedicationPassQueueBucket): string {
  switch (bucket) {
    case "OVERDUE":
      return "#dc2626";
    case "DUE":
      return "#d97706";
    case "IN_PROGRESS":
      return "#2563eb";
    case "HELD":
      return "#64748b";
    case "UPCOMING":
      return "#94a3b8";
    default:
      return "#64748b";
  }
}

export function medicationPassQueueTooltipLines(item: MedicationPassQueueItem): string[] {
  const lines: string[] = [];
  if (item.medicationLabel) lines.push(item.medicationLabel);
  if (item.route) lines.push(`Route: ${item.route}`);
  lines.push(`Statut: ${item.doseStatus}`);
  lines.push(`Prévu: ${item.scheduledAt}`);
  lines.push(`Fenêtre: ${item.dueWindowStartAt} → ${item.dueWindowEndAt}`);
  if (item.responseDueAt) lines.push(`Réponse due: ${item.responseDueAt}`);
  if (item.highAlertSummary?.highAlertClass) {
    lines.push(`High-alert: ${item.highAlertSummary.highAlertClass}`);
  }
  return lines;
}
