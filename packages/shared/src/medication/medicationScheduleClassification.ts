import {
  getMedicationFrequencyDefinition,
  parseMedicationFrequencyCode,
  type MedicationFrequencyCode,
} from "./medicationFrequencyCatalog.js";
import { isMedicationInfusionCandidate } from "./infusionRoute.util.js";
import { isBloodProductMedicationCatalog } from "./marAdministrationGovernancePolicy.js";
import {
  isDirectMarFrequency,
  isInfusionIsolatedFrequency,
  medicationSchedulingFeatureFlagsEnabled,
  type MedicationSchedulingFeatureFlags,
} from "./medicationFrequencyEdHardening.js";

/** Immutable schedule routing classes (M1.8B.7A.1). Stored as strings in DB for enum-evolution safety. */
export const MEDICATION_SCHEDULE_CLASSIFICATIONS = [
  "DIRECT_MAR",
  "RECURRING",
  "ON_DEMAND",
  "INFUSION_LIFECYCLE",
] as const;

export type MedicationScheduleClassification =
  (typeof MEDICATION_SCHEDULE_CLASSIFICATIONS)[number];

export type MedicationCatalogSnapshotInput = {
  catalogItemId?: string | null;
  catalogCode?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  administrationType?: string | null;
  displayNameEn?: string | null;
  displayNameFr?: string | null;
  requiresDoubleSign?: boolean | null;
  route?: string | null;
  medicationLabel?: string | null;
};

const RECURRING_FREQUENCY_CODES = new Set<MedicationFrequencyCode>([
  "DAILY",
  "BID",
  "TID",
  "QID",
  "Q2H",
  "Q3H",
  "Q4H",
  "Q6H",
  "Q8H",
  "Q12H",
  "Q24H",
  "AC",
  "PC",
  "HS",
  "ACHS",
  "WEEKLY",
  "MONTHLY",
]);

function isBloodProductCatalog(input: MedicationCatalogSnapshotInput): boolean {
  return isBloodProductMedicationCatalog({
    catalogCode: input.catalogCode,
    therapeuticClass: input.therapeuticClass,
    genericName: input.genericName,
  });
}

function isInfusionCandidateCatalog(input: MedicationCatalogSnapshotInput): boolean {
  return isMedicationInfusionCandidate({
    route: input.route,
    medicationLabel: input.medicationLabel,
    code: input.catalogCode,
    genericName: input.genericName,
    catalogAdministrationType: input.administrationType,
  });
}

/**
 * Single source of scheduleClassification (M1.8B.7A.0B).
 * Catalog guards override frequency before frequency-based routing.
 */
export function resolveScheduleClassification(input: {
  frequencyCode: MedicationFrequencyCode | string | null | undefined;
  catalog?: MedicationCatalogSnapshotInput | null;
}): MedicationScheduleClassification {
  const catalog = input.catalog ?? null;

  if (catalog && isBloodProductCatalog(catalog)) {
    return "INFUSION_LIFECYCLE";
  }
  if (catalog && isInfusionCandidateCatalog(catalog)) {
    return "INFUSION_LIFECYCLE";
  }

  const parsed = parseMedicationFrequencyCode(
    input.frequencyCode == null ? null : String(input.frequencyCode)
  );
  if (!parsed) {
    return "DIRECT_MAR";
  }
  if (isDirectMarFrequency(parsed)) {
    return "DIRECT_MAR";
  }
  if (isInfusionIsolatedFrequency(parsed)) {
    return "INFUSION_LIFECYCLE";
  }
  if (parsed === "PRN") {
    return "ON_DEMAND";
  }
  if (RECURRING_FREQUENCY_CODES.has(parsed)) {
    return "RECURRING";
  }
  return "DIRECT_MAR";
}

export type MedicationOrderScheduleCreateGateResult = {
  shouldCreate: boolean;
  reason: string;
  classification: MedicationScheduleClassification;
  frequencyCode: MedicationFrequencyCode | null;
};

/**
 * Order-create persistence gate (M1.8B.7A.1 part 5).
 * Follows explicit step order — do not reorder without audit review.
 */
export function evaluateMedicationOrderScheduleCreateGate(input: {
  frequencyCode: string | null | undefined;
  featureFlags: Partial<MedicationSchedulingFeatureFlags> | null | undefined;
  catalog?: MedicationCatalogSnapshotInput | null;
}): MedicationOrderScheduleCreateGateResult {
  const catalog = input.catalog ?? null;
  const classification = resolveScheduleClassification({
    frequencyCode: input.frequencyCode,
    catalog,
  });

  if (input.frequencyCode == null || String(input.frequencyCode).trim() === "") {
    return {
      shouldCreate: false,
      reason: "LEGACY_NULL_FREQUENCY",
      classification,
      frequencyCode: null,
    };
  }

  const parsed = parseMedicationFrequencyCode(String(input.frequencyCode));
  if (!parsed) {
    return {
      shouldCreate: false,
      reason: "INVALID_FREQUENCY_CODE",
      classification,
      frequencyCode: null,
    };
  }

  if (isDirectMarFrequency(parsed)) {
    return {
      shouldCreate: false,
      reason: "DIRECT_MAR_FREQUENCY_NEVER_SCHEDULES",
      classification,
      frequencyCode: parsed,
    };
  }

  if (catalog && isBloodProductCatalog(catalog)) {
    return {
      shouldCreate: false,
      reason: "BLOOD_PRODUCT_NEVER_SCHEDULES",
      classification,
      frequencyCode: parsed,
    };
  }

  if (catalog && isInfusionCandidateCatalog(catalog)) {
    return {
      shouldCreate: false,
      reason: "INFUSION_CANDIDATE_NEVER_SCHEDULES",
      classification,
      frequencyCode: parsed,
    };
  }

  if (isInfusionIsolatedFrequency(parsed)) {
    return {
      shouldCreate: false,
      reason: "CONTINUOUS_NEVER_SCHEDULES",
      classification,
      frequencyCode: parsed,
    };
  }

  if (parsed === "TAPER") {
    return {
      shouldCreate: false,
      reason: "TAPER_EXCLUDED_UNTIL_TAPER_PLAN",
      classification,
      frequencyCode: parsed,
    };
  }

  if (!medicationSchedulingFeatureFlagsEnabled(input.featureFlags)) {
    return {
      shouldCreate: false,
      reason: "SCHEDULING_FEATURE_FLAGS_OFF",
      classification,
      frequencyCode: parsed,
    };
  }

  if (classification === "RECURRING" || classification === "ON_DEMAND") {
    const def = getMedicationFrequencyDefinition(parsed);
    if (!def) {
      return {
        shouldCreate: false,
        reason: "FREQUENCY_DEFINITION_MISSING",
        classification,
        frequencyCode: parsed,
      };
    }
    return {
      shouldCreate: true,
      reason: "SCHEDULE_PERSISTENCE_ALLOWED",
      classification,
      frequencyCode: parsed,
    };
  }

  return {
    shouldCreate: false,
    reason: "CLASSIFICATION_NOT_PERSISTABLE",
    classification,
    frequencyCode: parsed,
  };
}
