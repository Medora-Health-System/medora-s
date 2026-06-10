import type { MedicationDoseKind } from "./medicationDoseKind.js";
import type { MedicationDoseStatus } from "./medicationDoseStatus.js";
import type { MedicationScheduleClassification } from "./medicationScheduleClassification.js";
import type {
  MedicationCatalogSnapshotJson,
  MedicationFrequencySnapshotJson,
} from "./medicationOrderScheduleSnapshot.js";

/**
 * M1.8B.7F.1 — future MedicationDoseInstance row contract (documentation + shared types).
 * No Prisma model or persistence in this phase.
 */

/**
 * Ordered dose fields snapshotted at dose creation from the order line.
 * Immutable after the dose row is inserted.
 */
export type MedicationOrderedDoseSnapshotJson = {
  doseValue: string | null;
  doseUnit: string | null;
  route: string | null;
  quantity: string | null;
  quantityUnit: string | null;
  medicationLabel: string | null;
  snapshottedAt: string;
};

/**
 * Immutable snapshot fields copied from MedicationOrderSchedule at dose creation.
 *
 * INVARIANT (M1.8B.7F audit §15): DoseInstances must copy these at creation time and must
 * never be reclassified or re-resolved from live catalog/manifest after insert.
 *
 * - scheduleClassificationSnapshot: frozen copy of parent scheduleClassification
 * - frequencySnapshotJson: full copy of schedule frequencySnapshotJson
 * - medicationCatalogSnapshotJson: full copy of schedule medicationCatalogSnapshotJson
 * - orderedDoseSnapshotJson: order-line dose/route at generation time
 *
 * Prohibited after creation:
 * - Re-running resolveScheduleClassification() on existing doses
 * - Updating snapshots when catalog is reseeded or governance manifest changes
 * - Changing doseKind after insert
 */
export type MedicationDoseInstanceImmutableSnapshots = {
  scheduleClassificationSnapshot: MedicationScheduleClassification;
  frequencySnapshotJson: MedicationFrequencySnapshotJson;
  medicationCatalogSnapshotJson: MedicationCatalogSnapshotJson;
  orderedDoseSnapshotJson: MedicationOrderedDoseSnapshotJson;
};

/**
 * Future MedicationDoseInstance shape — contract reference for M1.8B.7G+ persistence.
 * Not wired to Prisma or API in M1.8B.7F.1.
 */
export type MedicationDoseInstanceContract = {
  id: string;
  facilityId: string;
  encounterId: string;
  orderId: string;
  orderItemId: string;
  medicationOrderScheduleId: string;

  doseSequenceNumber: number;
  doseKind: MedicationDoseKind;
  doseStatus: MedicationDoseStatus;

  scheduledAt: string;
  dueWindowStartAt: string;
  dueWindowEndAt: string;
  overdueAt: string | null;

  snapshots: MedicationDoseInstanceImmutableSnapshots;

  /** Set when IVPB_SESSION START begins (future M1.8B.7J). */
  infusionSessionId: string | null;
  /** Optional hint for future MedicationResponse engine. */
  responseDueAt: string | null;
  /** Denormalized terminal MAR id when dose completes (future). */
  terminalMedicationAdministrationId: string | null;

  missedReason: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  supersededAt: string | null;

  createdAt: string;
  updatedAt: string;
};
