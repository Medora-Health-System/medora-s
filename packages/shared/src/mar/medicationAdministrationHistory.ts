/** MEDUI.ED.MAR.H2B — append-only medication administration history read model. */

export const MEDICATION_ADMINISTRATION_HISTORY_EVENT_TYPES = [
  "ADMINISTERED",
  "PRN_ADMINISTERED",
  "REFUSED",
  "HELD",
  "MISSED",
  "NOT_AVAILABLE",
  "MD_CHANGED",
  "INFUSION_START",
  "INFUSION_STOP",
  "ORDER_CANCELED",
] as const;

export type MedicationAdministrationHistoryEventType =
  (typeof MEDICATION_ADMINISTRATION_HISTORY_EVENT_TYPES)[number];

export const MEDICATION_ADMINISTRATION_HISTORY_SOURCES = ["MAR", "ORDER_CANCEL"] as const;

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
  readOnly: true;
};

export type MedicationAdministrationHistoryMarSourceRow = {
  id: string;
  encounterId: string;
  orderItemId: string | null;
  administeredAt: Date | string;
  effectiveAdministeredAt?: Date | string | null;
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
