/** MEDUI.ED.MAR.H2B — append-only medication administration history read model. */

export const MEDICATION_ADMINISTRATION_HISTORY_EVENT_TYPES = [
  "ADMINISTERED",
  "EARLY_ADMINISTRATION",
  "LATE_ADMINISTRATION",
  "PRN_ADMINISTERED",
  "REFUSED",
  "HELD",
  "MISSED",
  "NOT_AVAILABLE",
  "MD_CHANGED",
  "INFUSION_START",
  "INFUSION_STOP",
  "ORDER_CANCELED",
  "ADMINISTRATION_CORRECTION",
  "SCHEDULE_TIME_CHANGED",
] as const;

export type MedicationAdministrationHistoryEventType =
  (typeof MEDICATION_ADMINISTRATION_HISTORY_EVENT_TYPES)[number];

export const MEDICATION_ADMINISTRATION_HISTORY_SOURCES = [
  "MAR",
  "ORDER_CANCEL",
  "MAR_CORRECTION",
  "DOSE_SCHEDULE_ADJUSTMENT",
] as const;

export type MedicationAdministrationHistorySource =
  (typeof MEDICATION_ADMINISTRATION_HISTORY_SOURCES)[number];

/** Synthetic id prefix for order-cancel history rows (not MedicationAdministration ids). */
export const MEDICATION_ADMINISTRATION_HISTORY_ORDER_CANCEL_ID_PREFIX = "order-cancel:";

export function buildMedicationAdministrationHistoryOrderCancelId(
  orderItemId: string,
  orderEventId?: string | null
): string {
  const itemId = orderItemId.trim();
  const eventId = orderEventId?.trim();
  return eventId
    ? `${MEDICATION_ADMINISTRATION_HISTORY_ORDER_CANCEL_ID_PREFIX}${itemId}:${eventId}`
    : `${MEDICATION_ADMINISTRATION_HISTORY_ORDER_CANCEL_ID_PREFIX}${itemId}`;
}

export type MedicationAdministrationHistoryEntry = {
  id: string;
  source: MedicationAdministrationHistorySource;
  encounterId: string;
  orderItemId: string | null;
  medicationLabel: string;
  doseDisplay: string | null;
  route: string | null;
  eventType: MedicationAdministrationHistoryEventType;
  /** Clinical / effective instant (ISO-8601 UTC). */
  eventAt: string;
  /** Documented administration instant when it differs from eventAt; otherwise null. */
  documentedAt: string | null;
  performedByDisplay: string | null;
  performedByRole: string | null;
  reasonCode: string | null;
  reasonDetail: string | null;
  isPrn: boolean;
  prnIndication: string | null;
  infusionPhase: "INFUSION_START" | "INFUSION_STOP" | null;
  medicationDoseInstanceId: string | null;
  /** Present for ADMINISTRATION_CORRECTION rows (MEDUI.ED.MAR.H7). */
  originalAdministrationId?: string | null;
  effectiveChangeSummary?: string | null;
  /** Present for SCHEDULE_TIME_CHANGED rows (MEDUI.ED.MAR.H9A). */
  originalScheduledAt?: string | null;
  previousScheduledAt?: string | null;
  newScheduledAt?: string | null;
  changedByUserId?: string | null;
  riskSeverity?: string | null;
  reviewRecommended?: boolean;
  /** Present for administration variance rows (MEDUI.ED.MAR.H9B). */
  effectiveScheduledAt?: string | null;
  varianceMinutes?: number | null;
  varianceSeverity?: string | null;
  varianceReviewRecommended?: boolean;
  readOnly: true;
};

export type MedicationAdministrationHistoryMarSourceRow = {
  id: string;
  encounterId: string;
  orderItemId: string | null;
  administeredAt: Date | string;
  effectiveAdministeredAt?: Date | string | null;
  /** System save instant when it differs from clinical administeredAt (H9E infusion timing). */
  createdAt?: Date | string | null;
  medicationLabelSnapshot?: string | null;
  route?: string | null;
  doseValue?: string | number | null;
  doseUnit?: string | null;
  marAction?: string | null;
  notes?: string | null;
  infusionPhase?: string | null;
  medicationDoseInstanceId?: string | null;
  performedByFirstName?: string | null;
  performedByLastName?: string | null;
  performedByRole?: string | null;
  orderItemFrequencyCode?: string | null;
  orderItemDirectionsSig?: string | null;
  /** Current dose scheduledAt for variance (H9B) — effective after H9A reschedule. */
  doseScheduledAt?: Date | string | null;
  doseOrderedDoseSnapshotJson?: unknown;
};

export type MedicationAdministrationHistoryOrderCancelSourceRow = {
  orderItemId: string;
  encounterId: string;
  orderEventId?: string | null;
  medicationLabel: string;
  doseDisplay: string | null;
  route: string | null;
  cancelledAt: Date | string;
  performedByDisplay: string | null;
  performedByRole: string | null;
  cancellationReason: string | null;
  cancellationDetails: string | null;
  frequencyCode?: string | null;
  directionsSig?: string | null;
};

export function compareMedicationAdministrationHistoryEntries(
  a: MedicationAdministrationHistoryEntry,
  b: MedicationAdministrationHistoryEntry
): number {
  const eventDiff = new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime();
  if (eventDiff !== 0) return eventDiff;

  const docA = a.documentedAt ? new Date(a.documentedAt).getTime() : 0;
  const docB = b.documentedAt ? new Date(b.documentedAt).getTime() : 0;
  const docDiff = docB - docA;
  if (docDiff !== 0) return docDiff;

  return b.id.localeCompare(a.id);
}

export function sortMedicationAdministrationHistoryEntries(
  entries: MedicationAdministrationHistoryEntry[]
): MedicationAdministrationHistoryEntry[] {
  return [...entries].sort(compareMedicationAdministrationHistoryEntries);
}
