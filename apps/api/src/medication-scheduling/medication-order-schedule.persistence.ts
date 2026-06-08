import {
  assertFrequencySnapshotCatalogVersion,
  assertScheduleClassificationDualPersistence,
  buildMedicationCatalogSnapshotJson,
  buildMedicationFrequencySnapshotJson,
  evaluateMedicationOrderScheduleCreateGate,
  type MedicationCatalogSnapshotInput,
  type MedicationSchedulingFeatureFlags,
} from "@medora/shared";
import type { CatalogMedication, Prisma } from "@prisma/client";

export const MEDICATION_ORDER_SCHEDULE_STATUS_ACTIVE = "ACTIVE" as const;

export type MaybeCreateMedicationOrderScheduleInput = {
  facilityId: string;
  encounterId: string;
  orderId: string;
  orderItemId: string;
  frequencyCode: string | null | undefined;
  route?: string | null;
  manualLabel?: string | null;
  catalogMedication?: Pick<
    CatalogMedication,
    | "id"
    | "code"
    | "genericName"
    | "therapeuticClass"
    | "administrationType"
    | "displayNameEn"
    | "displayNameFr"
    | "requiresDoubleSign"
    | "route"
    | "name"
  > | null;
  createdByUserId?: string | null;
  featureFlags?: Partial<MedicationSchedulingFeatureFlags> | null;
  snapshottedAt?: Date;
};

function toCatalogSnapshotInput(
  input: MaybeCreateMedicationOrderScheduleInput
): MedicationCatalogSnapshotInput | null {
  const catalog = input.catalogMedication;
  if (!catalog && !input.manualLabel?.trim() && !input.route?.trim()) {
    return null;
  }
  return {
    catalogItemId: catalog?.id ?? null,
    catalogCode: catalog?.code ?? null,
    genericName: catalog?.genericName ?? catalog?.name ?? null,
    therapeuticClass: catalog?.therapeuticClass ?? null,
    administrationType: catalog?.administrationType ?? null,
    displayNameEn: catalog?.displayNameEn ?? catalog?.name ?? null,
    displayNameFr: catalog?.displayNameFr ?? null,
    requiresDoubleSign: catalog?.requiresDoubleSign ?? false,
    route: input.route ?? catalog?.route ?? null,
    medicationLabel: input.manualLabel ?? catalog?.displayNameEn ?? catalog?.name ?? null,
  };
}

/**
 * Dormant schedule persistence (M1.8B.7A.1).
 * No-op when gate rejects — zero behavior change when flags are OFF.
 */
export async function maybeCreateMedicationOrderScheduleForOrderItem(
  tx: Prisma.TransactionClient,
  input: MaybeCreateMedicationOrderScheduleInput
): Promise<{ created: boolean; scheduleId?: string; reason: string }> {
  const catalogSnapshotInput = toCatalogSnapshotInput(input);
  const gate = evaluateMedicationOrderScheduleCreateGate({
    frequencyCode: input.frequencyCode,
    featureFlags: input.featureFlags ?? null,
    catalog: catalogSnapshotInput,
    orderRoute: input.route ?? null,
  });

  if (!gate.shouldCreate || !gate.frequencyCode) {
    return { created: false, reason: gate.reason };
  }

  const snapshottedAt = input.snapshottedAt ?? new Date();
  const frequencySnapshotJson = buildMedicationFrequencySnapshotJson({
    frequencyCode: gate.frequencyCode,
    scheduleClassification: gate.classification,
    snapshottedAt,
  });
  assertFrequencySnapshotCatalogVersion(frequencySnapshotJson);
  assertScheduleClassificationDualPersistence(gate.classification, frequencySnapshotJson);

  const medicationCatalogSnapshotJson = buildMedicationCatalogSnapshotJson({
    ...(catalogSnapshotInput ?? {}),
    snapshottedAt,
  });

  const created = await tx.medicationOrderSchedule.create({
    data: {
      facilityId: input.facilityId,
      encounterId: input.encounterId,
      orderId: input.orderId,
      orderItemId: input.orderItemId,
      frequencyCode: gate.frequencyCode,
      catalogVersion: frequencySnapshotJson.catalogVersion,
      frequencySnapshotJson,
      medicationCatalogSnapshotJson,
      scheduleClassification: gate.classification,
      scheduleStatus: MEDICATION_ORDER_SCHEDULE_STATUS_ACTIVE,
      createdByUserId: input.createdByUserId ?? undefined,
      updatedByUserId: input.createdByUserId ?? undefined,
    },
    select: { id: true },
  });

  return { created: true, scheduleId: created.id, reason: gate.reason };
}
