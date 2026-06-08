import {
  MedicationMarAction,
  OrderStatus,
  PharmacyVerificationStatus,
} from "@prisma/client";
import {
  MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
  orderLineCompletesOnTerminalMarForFrequency,
  resolveMedicationScheduleExpansionGate,
  type MedicationSchedulingFeatureFlags,
} from "@medora/shared";
import { MedicationAdministrationService } from "./medication-administration.service";

export function makeMarTestEncounter() {
  return {
    id: "enc-1",
    facilityId: "fac-1",
    patientId: "pat-1",
    status: "OPEN",
    providerDocumentationStatus: "DRAFT",
    version: 1,
    billingCaptureJson: null,
    createdAt: new Date("2026-05-16T08:00:00Z"),
    admittedAt: null,
    vitals: null,
    nursingAssessment: null,
    triage: { vitalsJson: null },
  };
}

export type SchedulingFlagScenarioId = "A" | "B" | "C";

export type SchedulingFlagScenario = {
  id: SchedulingFlagScenarioId;
  label: string;
  featureFlags: MedicationSchedulingFeatureFlags;
};

/** M1.8B.6D — feature-flag matrix for completion-contract regression (flags are not read by MAR service today). */
export const MEDICATION_SCHEDULING_REGRESSION_FLAG_SCENARIOS: readonly SchedulingFlagScenario[] =
  [
    {
      id: "A",
      label: "all scheduling flags OFF",
      featureFlags: { ...MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF },
    },
    {
      id: "B",
      label: "MEDICATION_SCHEDULING_V1 ON",
      featureFlags: {
        ...MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
        MEDICATION_SCHEDULING_V1: true,
      },
    },
    {
      id: "C",
      label: "MEDICATION_SCHEDULING_V1 + MEDICATION_DOSE_INSTANCES ON",
      featureFlags: {
        ...MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
        MEDICATION_SCHEDULING_V1: true,
        MEDICATION_DOSE_INSTANCES: true,
      },
    },
  ] as const;

export function makeMarTestOrderItem(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: "oi-1",
    orderId: "ord-1",
    catalogItemType: "MEDICATION",
    catalogItemId: "cat-generic",
    medicationFulfillmentIntent: "ADMINISTER_CHART",
    status: "PENDING",
    lifecycleState: "ORDERED",
    quantity: 1,
    route: "IV",
    strength: "1 g",
    notes: null,
    manualLabel: null,
    manualSecondaryText: null,
    medicationProductId: null,
    createdAt: new Date("2026-05-16T10:00:00Z"),
    order: {
      id: "ord-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "MEDICATION",
      status: "PENDING",
      createdAt: new Date("2026-05-16T10:00:00Z"),
      cancelledAt: null,
    },
    ...overrides,
  };
}

export function makeMarTestCatalog(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: "cat-generic",
    displayNameEn: "Generic Medication",
    displayNameFr: "Médicament générique",
    name: "Generic Medication",
    code: "GENERIC_MED",
    genericName: "Generic Medication",
    strength: "1 g",
    dosageForm: "injectable",
    therapeuticClass: null,
    administrationType: "PUSH",
    route: "IVP",
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: "mL",
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: false,
    ...overrides,
  };
}

export const MAR_REGRESSION_CATALOG_PRESETS = {
  blood: makeMarTestCatalog({
    id: "cat-prbc",
    displayNameEn: "Packed Red Blood Cells",
    name: "PRBC",
    code: "PRBC_TRANSFUSION",
    genericName: "Packed Red Blood Cells",
    therapeuticClass: "BLOOD_PRODUCT",
    route: "IV",
    administrationType: "INFUSION",
    requiresDoubleSign: true,
  }),
  insulin: makeMarTestCatalog({
    id: "cat-insulin",
    displayNameEn: "Insulin (regular)",
    name: "Regular Insulin",
    code: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
    genericName: "Regular Insulin",
    strength: "100 UI/mL",
    route: "SQ",
    administrationType: "SQ",
  }),
  heparin: makeMarTestCatalog({
    id: "cat-heparin",
    displayNameEn: "Heparin",
    name: "Heparin",
    code: "HEPARIN",
    genericName: "Heparin",
    strength: "5000 units/mL",
    route: "IV",
    administrationType: "PUSH",
    requiresDoubleSign: true,
  }),
  heparinProductProfile: {
    legacyCatalogMedicationId: "cat-heparin",
    concept: {
      safetyProfile: {
        isHighAlert: true,
        highAlertCategories: {
          highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
          safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
        },
        lasaGroupId: null,
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: true,
      },
    },
    administrationProfile: { allowsWasteDocumentation: false },
  },
  controlled: makeMarTestCatalog({
    id: "cat-morphine",
    displayNameEn: "Morphine",
    name: "Morphine",
    code: "MORPHINE",
    genericName: "Morphine",
    strength: "10 mg/mL",
    route: "IV",
    isControlled: true,
    controlledSchedule: "II",
    requiresWitness: true,
    requiresDoubleSign: false,
  }),
  ceftriaxone: makeMarTestCatalog({
    id: "cat-rocephin",
    displayNameEn: "Ceftriaxone (Rocephin)",
    name: "Ceftriaxone",
    code: "CEFTRIAXONE",
    genericName: "Ceftriaxone",
    strength: "1 g",
    route: "IVP",
    administrationType: "PUSH",
  }),
  vancomycin: makeMarTestCatalog({
    id: "cat-vanc",
    displayNameEn: "Vancomycin",
    name: "Vancomycin",
    code: "VANCOMYCIN",
    genericName: "Vancomycin",
    strength: "1 g",
    route: "IVP",
    administrationType: "PUSH",
  }),
  cefepime: makeMarTestCatalog({
    id: "cat-cefepime",
    displayNameEn: "Cefepime",
    name: "Cefepime",
    code: "CEFEPIME",
    genericName: "Cefepime",
    strength: "2 g",
    route: "IVP",
    administrationType: "PUSH",
  }),
  infusionVancomycin: makeMarTestCatalog({
    id: "cat-vanc-infusion",
    displayNameEn: "Vancomycin IV infusion",
    name: "Vancomycin",
    code: "VANCOMYCIN",
    genericName: "Vancomycin",
    strength: "1 g",
    route: "IV",
    administrationType: "INFUSION",
  }),
} as const;

/** Documents that scheduling flags do not enable expansion for direct-MAR frequencies (no engine exists). */
export function assertDirectMarSchedulingGateForScenario(
  scenario: SchedulingFlagScenario,
  frequencyCode: string | null
): void {
  const gate = resolveMedicationScheduleExpansionGate({
    frequencyCode,
    featureFlags: scenario.featureFlags,
  });
  expect(gate.scheduleExpansionAllowed).toBe(false);
  expect(orderLineCompletesOnTerminalMarForFrequency(frequencyCode)).toBe(true);
}

/** CONTINUOUS uses infusion lifecycle — never dose instances. */
export function assertContinuousInfusionSchedulingGateForScenario(
  scenario: SchedulingFlagScenario
): void {
  const gate = resolveMedicationScheduleExpansionGate({
    frequencyCode: "CONTINUOUS",
    featureFlags: scenario.featureFlags,
  });
  expect(gate.scheduleExpansionAllowed).toBe(false);
  expect(gate.architecturePath).toBe("INFUSION_LIFECYCLE");
  expect(orderLineCompletesOnTerminalMarForFrequency("CONTINUOUS")).toBe(false);
}

type MarHarnessOptions = {
  catalog: Record<string, unknown>;
  orderItem: Record<string, unknown>;
  productProfile?: Record<string, unknown> | null;
  packageNdc?: { ndc11: string; ndcDisplay: string } | null;
  pharmacyStatus?: PharmacyVerificationStatus | null;
  marCreateResult?: Record<string, unknown>;
  medicationAdministrationFindFirst?: jest.Mock;
};

export function buildMarAdministrationTestHarness(options: MarHarnessOptions) {
  const marCreate = jest.fn().mockResolvedValue({
    id: "mar-row-1",
    administeredAt: new Date("2026-05-16T14:00:00Z"),
    medicationLabelSnapshot: `${options.catalog.displayNameEn ?? options.catalog.name} ${options.catalog.strength ?? ""}`.trim(),
    orderItemId: options.orderItem.id,
    marAction: MedicationMarAction.administered,
    ndc11Snapshot: null,
    ndcDisplaySnapshot: null,
    doseValue: null,
    doseUnit: null,
    administeredQuantity: 1,
    billingQuantity: 1,
    quantityUnit: "mL",
    route: "IV",
    administeredBy: { id: "nurse-1", firstName: "N", lastName: "R" },
    ...options.marCreateResult,
  });

  const orderItemUpdate = jest.fn().mockImplementation(async ({ data }) => ({
    ...options.orderItem,
    ...data,
  }));
  const orderEventCreate = jest.fn().mockResolvedValue({ id: "ev-1" });
  const verificationCreate = jest.fn().mockResolvedValue({ id: "ver-1" });
  const overrideCreate = jest.fn().mockResolvedValue({ id: "ovr-1" });
  const wasteCreate = jest.fn().mockResolvedValue({ id: "waste-1" });
  const auditLog = jest.fn().mockResolvedValue(undefined);

  const medicationAdministrationFindFirst =
    options.medicationAdministrationFindFirst ??
    jest.fn().mockResolvedValue(null);

  const encounter = makeMarTestEncounter();
  const prisma = {
    encounter: {
      findFirst: jest.fn().mockResolvedValue(encounter),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    orderItem: {
      findFirst: jest.fn().mockResolvedValue(options.orderItem),
      update: orderItemUpdate,
    },
    catalogMedication: {
      findMany: jest.fn().mockResolvedValue([options.catalog]),
      findUnique: jest.fn().mockResolvedValue(options.catalog),
    },
    medicationProduct: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(options.productProfile ?? null),
    },
    medicationPackage: {
      findFirst: jest.fn().mockResolvedValue(options.packageNdc ?? null),
    },
    pharmacyVerification: {
      findFirst: jest.fn().mockResolvedValue(
        options.pharmacyStatus != null
          ? { verificationStatus: options.pharmacyStatus }
          : { verificationStatus: PharmacyVerificationStatus.VERIFIED }
      ),
    },
    medicationAdministration: {
      findFirst: medicationAdministrationFindFirst,
      findFirstOrThrow: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        administeredBy: { id: "nurse-1", firstName: "N", lastName: "R" },
      })),
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { administeredQuantity: 0 }, _count: { _all: 0 } }),
      create: marCreate,
    },
    medicationAdministrationVerification: { create: verificationCreate },
    medicationAdministrationOverride: { create: overrideCreate },
    medicationWasteDocumentation: { create: wasteCreate },
    billingEvent: { upsert: jest.fn().mockResolvedValue({}) },
    orderEvent: { create: orderEventCreate, findFirst: jest.fn().mockResolvedValue(null) },
    user: { findFirst: jest.fn().mockResolvedValue({ id: "rn-2" }) },
    userRole: {
      findMany: jest.fn().mockResolvedValue([{ id: "ur-1", role: { code: "RN" } }]),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        medicationAdministration: {
          create: marCreate,
          findFirst: medicationAdministrationFindFirst,
        },
        medicationAdministrationVerification: { create: verificationCreate },
        medicationAdministrationOverride: { create: overrideCreate },
        medicationWasteDocumentation: { create: wasteCreate },
        orderItem: { update: orderItemUpdate },
        orderEvent: { create: orderEventCreate, findFirst: jest.fn().mockResolvedValue(null) },
        userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
      };
      return fn(tx);
    }),
  };

  const service = new MedicationAdministrationService(prisma as never, { log: auditLog } as never);

  return {
    service,
    marCreate,
    orderItemUpdate,
    orderEventCreate,
    verificationCreate,
    overrideCreate,
    wasteCreate,
    auditLog,
    prisma,
    medicationAdministrationFindFirst,
  };
}

export function expectOrderLineCompleted(orderItemUpdate: jest.Mock) {
  expect(orderItemUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ status: OrderStatus.COMPLETED }),
    })
  );
}

export function expectOrderLineNotCompleted(orderItemUpdate: jest.Mock) {
  expect(orderItemUpdate).not.toHaveBeenCalled();
}

export async function submitTerminalMarAdministered(
  service: MedicationAdministrationService,
  orderItemId: string,
  extra: Record<string, unknown> = {}
) {
  return service.create("enc-1", "fac-1", "nurse-1", {
    orderItemId,
    marAction: "administered",
    administeredQuantity: 1,
    ...extra,
  });
}
