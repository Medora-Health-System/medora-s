import type { Prisma } from "@prisma/client";

/** Pass queue dose row — includes IVPB_SESSION linkage fields; frequency read server-side only. */
export const MEDICATION_PASS_QUEUE_DOSE_SELECT = {
  id: true,
  orderItemId: true,
  orderId: true,
  encounterId: true,
  medicationOrderScheduleId: true,
  doseKind: true,
  scheduledAt: true,
  dueWindowStartAt: true,
  dueWindowEndAt: true,
  doseStatus: true,
  responseDueAt: true,
  infusionSessionId: true,
  terminalMedicationAdministrationId: true,
  medicationCatalogSnapshotJson: true,
  orderedDoseSnapshotJson: true,
  frequencySnapshotJson: true,
  encounter: {
    select: {
      id: true,
      type: true,
      billingClassification: true,
      roomLabel: true,
      admissionSummaryJson: true,
      physicianAssignedUserId: true,
      nurseAssignedUserId: true,
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mrn: true,
        },
      },
    },
  },
} satisfies Prisma.MedicationDoseInstanceSelect;

export type MedicationPassQueueDoseRow = Prisma.MedicationDoseInstanceGetPayload<{
  select: typeof MEDICATION_PASS_QUEUE_DOSE_SELECT;
}>;
