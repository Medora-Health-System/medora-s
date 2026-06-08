import {
  getMedicationFrequencyDefinition,
  MEDICATION_FREQUENCY_CATALOG_VERSION,
  type MedicationFrequencyCode,
} from "./medicationFrequencyCatalog.js";
import type { MedicationScheduleClassification } from "./medicationScheduleClassification.js";
import type { MedicationCatalogSnapshotInput } from "./medicationScheduleClassification.js";

export type MedicationFrequencySnapshotJson = {
  frequencyCode: MedicationFrequencyCode;
  scheduleClassification: MedicationScheduleClassification;
  expansionStrategy: string;
  intervalMinutes: number | null;
  dosesPerDay: number | null;
  category: string;
  mealAnchor: string;
  prnModifierAllowed: boolean;
  statCompatible: boolean;
  catalogVersion: number;
  displayNameEn: string;
  displayNameFr: string;
  snapshottedAt: string;
};

export type MedicationCatalogSnapshotJson = {
  catalogItemId: string | null;
  catalogItemCode: string | null;
  genericName: string | null;
  therapeuticClass: string | null;
  administrationType: string | null;
  displayNameEn: string | null;
  displayNameFr: string | null;
  requiresDoubleSign: boolean;
  route: string | null;
  snapshottedAt: string;
};

export class ScheduleClassificationDualPersistenceError extends Error {
  constructor(
    public readonly columnValue: MedicationScheduleClassification,
    public readonly snapshotValue: MedicationScheduleClassification
  ) {
    super(
      `scheduleClassification dual-persistence violation: column=${columnValue} snapshot=${snapshotValue}`
    );
    this.name = "ScheduleClassificationDualPersistenceError";
  }
}

/** Hard invariant (M1.8B.7A.0B EQ-1): column must equal snapshot field. */
export function assertScheduleClassificationDualPersistence(
  columnValue: MedicationScheduleClassification,
  snapshot: Pick<MedicationFrequencySnapshotJson, "scheduleClassification">
): void {
  if (columnValue !== snapshot.scheduleClassification) {
    throw new ScheduleClassificationDualPersistenceError(
      columnValue,
      snapshot.scheduleClassification
    );
  }
}

export function buildMedicationFrequencySnapshotJson(input: {
  frequencyCode: MedicationFrequencyCode;
  scheduleClassification: MedicationScheduleClassification;
  snapshottedAt?: Date;
}): MedicationFrequencySnapshotJson {
  const def = getMedicationFrequencyDefinition(input.frequencyCode);
  if (!def) {
    throw new Error(`Unknown frequency code for snapshot: ${input.frequencyCode}`);
  }
  const snapshottedAt = (input.snapshottedAt ?? new Date()).toISOString();
  const snapshot: MedicationFrequencySnapshotJson = {
    frequencyCode: def.code,
    scheduleClassification: input.scheduleClassification,
    expansionStrategy: def.expansionStrategy,
    intervalMinutes: def.intervalMinutes,
    dosesPerDay: def.dosesPerDay,
    category: def.category,
    mealAnchor: def.mealAnchor,
    prnModifierAllowed: def.prnModifierAllowed,
    statCompatible: def.statCompatible,
    catalogVersion: def.catalogVersion,
    displayNameEn: def.displayNameEn,
    displayNameFr: def.displayNameFr,
    snapshottedAt,
  };
  assertScheduleClassificationDualPersistence(input.scheduleClassification, snapshot);
  return snapshot;
}

export function buildMedicationCatalogSnapshotJson(
  input: MedicationCatalogSnapshotInput & { snapshottedAt?: Date }
): MedicationCatalogSnapshotJson {
  const snapshottedAt = (input.snapshottedAt ?? new Date()).toISOString();
  return {
    catalogItemId: input.catalogItemId?.trim() || null,
    catalogItemCode: input.catalogCode?.trim() || null,
    genericName: input.genericName?.trim() || null,
    therapeuticClass: input.therapeuticClass?.trim() || null,
    administrationType: input.administrationType?.trim() || null,
    displayNameEn: input.displayNameEn?.trim() || null,
    displayNameFr: input.displayNameFr?.trim() || null,
    requiresDoubleSign: input.requiresDoubleSign === true,
    route: input.route?.trim() || null,
    snapshottedAt,
  };
}

/** Validates catalogVersion on snapshot matches the canonical catalog version constant. */
export function assertFrequencySnapshotCatalogVersion(
  snapshot: Pick<MedicationFrequencySnapshotJson, "catalogVersion">
): void {
  if (snapshot.catalogVersion !== MEDICATION_FREQUENCY_CATALOG_VERSION) {
    throw new Error(
      `frequencySnapshotJson.catalogVersion must be ${MEDICATION_FREQUENCY_CATALOG_VERSION}, got ${snapshot.catalogVersion}`
    );
  }
}
