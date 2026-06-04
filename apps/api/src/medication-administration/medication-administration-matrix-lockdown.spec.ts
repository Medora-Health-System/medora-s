import {
  MedicationAdministrationInfusionPhase,
  MedicationMarAction,
  MedicationVerificationType,
  OrderStatus,
  PharmacyVerificationStatus,
} from "@prisma/client";
import { INFUSION_START_MAR_NOTE_PREFIX } from "@medora/shared";
import {
  buildMarAdministrationTestHarness,
  expectOrderLineCompleted,
  expectOrderLineNotCompleted,
  makeMarTestEncounter,
} from "./mar-administration-test-harness";
import { MedicationAdministrationService } from "./medication-administration.service";

jest.mock("../billing/billing-capture.append.util", () => ({
  appendBillingCaptureCandidate: jest.fn().mockResolvedValue(undefined),
}));

function makeOrderItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "oi-matrix",
    orderId: "ord-1",
    catalogItemType: "MEDICATION",
    catalogItemId: "cat-matrix",
    medicationProductId: null,
    medicationPackageId: null,
    status: OrderStatus.PENDING,
    lifecycleState: "ORDERED",
    quantity: 1,
    route: "IV",
    strength: "1 g",
    notes: null,
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

describe("MedicationAdministrationService MAR matrix lockdown (M1.7B.7B)", () => {
  describe("Ceftriaxone", () => {
    it("creates MAR with hidden NDC enrichment, billing metadata, label, and order completion", async () => {
      const catalog = {
        id: "cat-ceftriaxone",
        code: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION",
        name: "Ceftriaxone",
        displayNameEn: "Ceftriaxone",
        displayNameFr: "Ceftriaxone",
        genericName: "Ceftriaxone",
        strength: "1 g",
        ndc11: "00409653501",
        ndcDisplay: "00409-6535-01",
        billingUnitType: "mg",
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: false,
      };
      const { service, marCreate, orderItemUpdate } = buildMarAdministrationTestHarness({
        catalog,
        orderItem: makeOrderItem({
          id: "oi-ceftriaxone",
          catalogItemId: "cat-ceftriaxone",
          strength: "1 g",
          route: "IVP",
        }),
        productProfile: null,
      });

      const result = await service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-ceftriaxone",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IVP",
        doseUnit: "mg",
      });

      expect(result).toBeDefined();
      expect(marCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ndc11Snapshot: "00409653501",
            ndcDisplaySnapshot: "00409-6535-01",
            medicationLabelSnapshot: expect.stringContaining("Ceftriaxone"),
            doseValue: null,
            billingQuantity: 1,
          }),
        })
      );
      expectOrderLineCompleted(orderItemUpdate);
    });
  });

  describe("Normal Saline infusion lifecycle", () => {
    function nsCatalog() {
      return {
        id: "cat-ns",
        displayNameEn: "Normal Saline",
        displayNameFr: "NaCl 0,9 %",
        name: "Normal Saline",
        genericName: "Normal Saline",
        code: "SODIUM_CHLORIDE_0_9_1000_ML",
        strength: "0.9% 1000 mL",
        ndc11: null,
        ndcDisplay: null,
        billingUnitType: "mL",
        therapeuticClass: null,
        billingClass: null,
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: false,
      };
    }

    function makeNsInfusionService() {
      const encounter = makeMarTestEncounter();
      const orderItem = makeOrderItem({
        id: "oi-ns",
        catalogItemId: "cat-ns",
        status: OrderStatus.IN_PROGRESS,
        lifecycleState: "IN_PROGRESS",
        route: "IV",
        strength: "0.9% 1000 mL",
        quantity: null,
      });
      const marCreate = jest
        .fn()
        .mockResolvedValueOnce({
          id: "mar-ns-start",
          infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_START,
          infusionSessionKey: "ns-sess-1",
          medicationLabelSnapshot: "Normal Saline 0.9% 1000 mL",
          marAction: MedicationMarAction.administered,
          administeredBy: { id: "nurse-1", firstName: "N", lastName: "R" },
        })
        .mockResolvedValueOnce({
          id: "mar-ns-stop",
          infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_STOP,
          infusionSessionKey: "ns-sess-1",
          medicationLabelSnapshot: "Normal Saline 0.9% 1000 mL",
          marAction: MedicationMarAction.administered,
          ndc11Snapshot: null,
          ndcDisplaySnapshot: null,
          administeredBy: { id: "nurse-1", firstName: "N", lastName: "R" },
        });
      const orderItemUpdate = jest.fn().mockResolvedValue(orderItem);
      const prisma = {
        encounter: { findFirst: jest.fn().mockResolvedValue(encounter), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        orderItem: { findFirst: jest.fn().mockResolvedValue(orderItem), update: orderItemUpdate },
        catalogMedication: { findUnique: jest.fn().mockResolvedValue(nsCatalog()), findMany: jest.fn().mockResolvedValue([nsCatalog()]) },
        medicationProduct: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
        medicationPackage: { findFirst: jest.fn().mockResolvedValue(null) },
        pharmacyVerification: { findFirst: jest.fn().mockResolvedValue(null) },
        medicationAdministration: {
          findFirst: jest.fn().mockResolvedValue(null),
          aggregate: jest.fn().mockResolvedValue({ _sum: { administeredQuantity: 0 }, _count: { _all: 0 } }),
          create: marCreate,
          findFirstOrThrow: jest.fn(),
        },
        orderEvent: { create: jest.fn().mockResolvedValue({ id: "ev-1" }) },
        userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
        $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            medicationAdministration: { create: marCreate },
            orderItem: { update: orderItemUpdate },
            orderEvent: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
            userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
          })
        ),
      };
      const service = new MedicationAdministrationService(prisma as never, { log: jest.fn() } as never);
      return { service, marCreate, orderItemUpdate };
    }

    it("START keeps order active; STOP completes order without NDC", async () => {
      const { service, marCreate, orderItemUpdate } = makeNsInfusionService();
      const startedAt = new Date("2026-05-16T14:00:00Z");

      await service.createInfusionStartMar("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-ns",
        infusionSessionKey: "ns-sess-1",
        startedAt,
        route: "IV",
      });

      expect(marCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_START,
            notes: INFUSION_START_MAR_NOTE_PREFIX,
          }),
        })
      );
      expectOrderLineNotCompleted(orderItemUpdate);

      const stoppedAt = new Date("2026-05-16T15:00:00Z");
      await service.create(
        "enc-1",
        "fac-1",
        "nurse-1",
        {
          orderItemId: "oi-ns",
          marAction: "administered",
          administeredAt: stoppedAt,
          route: "IV",
          notes: "Perfusion IV terminée",
        },
        {
          allowAdministeredForInfusionTerminal: true,
          skipDuplicateAdministeredWindowCheck: true,
          infusionMar: { infusionSessionKey: "ns-sess-1", infusionPhase: "INFUSION_STOP" },
          infusionBillingEvidence: {
            infusionSessionKey: "ns-sess-1",
            infusionStartedAtIso: startedAt.toISOString(),
            infusionStoppedAtIso: stoppedAt.toISOString(),
            infusionDurationMinutes: 60,
            orderItemId: "oi-ns",
          },
        }
      );

      expect(marCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_STOP,
            ndc11Snapshot: null,
            ndcDisplaySnapshot: null,
            medicationLabelSnapshot: expect.stringContaining("Normal Saline"),
          }),
        })
      );
      expectOrderLineCompleted(orderItemUpdate);
    });
  });

  describe("Magnesium Sulfate high-alert", () => {
    it("administers informational high-alert without pharmacy block or double RN", async () => {
      const catalog = {
        id: "cat-mgso4",
        code: "MAGNESIUM_SULFATE_500_MG_PER_ML_INJECTABLE_INJECTION",
        name: "Magnesium sulfate",
        displayNameEn: "Magnesium sulfate",
        displayNameFr: "Sulfate de magnésium",
        genericName: "Magnesium sulfate",
        strength: "500 mg/mL",
        ndc11: null,
        ndcDisplay: null,
        billingUnitType: "mg",
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: false,
      };
      const productProfile = {
        legacyCatalogMedicationId: "cat-mgso4",
        concept: {
          safetyProfile: {
            isHighAlert: true,
            highAlertCategories: { highAlertClass: "HIGH_ALERT_ELECTROLYTE" },
            lasaGroupId: null,
            requiresDoubleSign: false,
          },
        },
      };
      const { service, marCreate, verificationCreate, overrideCreate } = buildMarAdministrationTestHarness({
        catalog,
        orderItem: makeOrderItem({ id: "oi-mgso4", catalogItemId: "cat-mgso4", strength: "2 g/50 mL", route: "IVP" }),
        productProfile,
        pharmacyStatus: null,
      });

      await service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-mgso4",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IVP",
      });

      expect(marCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ndc11Snapshot: null,
            ndcDisplaySnapshot: null,
            medicationLabelSnapshot: expect.stringContaining("Magnesium"),
          }),
        })
      );
      expect(verificationCreate).not.toHaveBeenCalled();
      expect(overrideCreate).not.toHaveBeenCalled();
    });
  });

  describe("Fentanyl IV push", () => {
    it("administers with witness workflow and no double RN or pharmacy block", async () => {
      const catalog = {
        id: "cat-fentanyl",
        code: "FENTANYL_50_MCG_ML_INJECTABLE",
        name: "Fentanyl",
        displayNameEn: "Fentanyl",
        displayNameFr: "Fentanyl",
        genericName: "Fentanyl",
        strength: "50 mcg/mL",
        ndc11: null,
        ndcDisplay: null,
        billingUnitType: "mcg",
        isControlled: true,
        controlledSchedule: "II",
        requiresWitness: true,
        requiresDoubleSign: false,
      };
      const productProfile = {
        legacyCatalogMedicationId: "cat-fentanyl",
        concept: {
          safetyProfile: {
            isHighAlert: true,
            highAlertCategories: { highAlertClass: "HIGH_ALERT_OPIOID" },
            isControlled: true,
            controlledSchedule: "II",
            requiresWitness: true,
            requiresDoubleSign: true,
          },
        },
      };
      const { service, marCreate, verificationCreate } = buildMarAdministrationTestHarness({
        catalog,
        orderItem: makeOrderItem({
          id: "oi-fentanyl",
          catalogItemId: "cat-fentanyl",
          route: "IV",
          strength: "50 mcg/mL",
        }),
        productProfile,
        pharmacyStatus: PharmacyVerificationStatus.PENDING,
      });

      await service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-fentanyl",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IV",
        witnessUserId: "rn-2",
      });

      expect(marCreate).toHaveBeenCalled();
      expect(verificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationType: MedicationVerificationType.WITNESS,
          }),
        })
      );
      expect(verificationCreate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationType: MedicationVerificationType.INDEPENDENT_DOUBLE_CHECK,
          }),
        })
      );
    });
  });

  describe("Null NDC path", () => {
    it("creates MAR with null NDC snapshots and completes order", async () => {
      const catalog = {
        id: "cat-null-ndc",
        code: "NULL_NDC_TEST",
        name: "Test Med",
        displayNameEn: "Test Med",
        displayNameFr: "Test Med",
        genericName: "Test Med",
        strength: "10 mg",
        ndc11: null,
        ndcDisplay: null,
        billingUnitType: "mg",
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: false,
      };
      const { service, marCreate, orderItemUpdate } = buildMarAdministrationTestHarness({
        catalog,
        orderItem: makeOrderItem({ id: "oi-null-ndc", catalogItemId: "cat-null-ndc" }),
        productProfile: null,
        packageNdc: null,
        marCreateResult: {
          ndc11Snapshot: null,
          ndcDisplaySnapshot: null,
          medicationLabelSnapshot: "Test Med 10 mg",
        },
      });

      await expect(
        service.create("enc-1", "fac-1", "nurse-1", {
          orderItemId: "oi-null-ndc",
          marAction: "administered",
          administeredQuantity: 1,
          route: "IV",
        })
      ).resolves.toBeDefined();

      expect(marCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ndc11Snapshot: null,
            ndcDisplaySnapshot: null,
            medicationLabelSnapshot: expect.stringContaining("Test Med"),
          }),
        })
      );
      expectOrderLineCompleted(orderItemUpdate);
    });
  });

  describe("Pharmacy non-blocking", () => {
    it("administers when pharmacy verification is absent", async () => {
      const catalog = {
        id: "cat-pharm-free",
        code: "PHARM_FREE",
        name: "Ketorolac",
        displayNameEn: "Ketorolac",
        displayNameFr: "Kétorolac",
        genericName: "Ketorolac",
        strength: "30 mg/mL",
        ndc11: null,
        ndcDisplay: null,
        billingUnitType: "mg",
        isControlled: false,
        controlledSchedule: null,
        requiresWitness: false,
        requiresDoubleSign: false,
      };
      const { service, marCreate, overrideCreate } = buildMarAdministrationTestHarness({
        catalog,
        orderItem: makeOrderItem({ id: "oi-pharm-free", catalogItemId: "cat-pharm-free" }),
        pharmacyStatus: null,
      });

      await service.create("enc-1", "fac-1", "nurse-1", {
        orderItemId: "oi-pharm-free",
        marAction: "administered",
        administeredQuantity: 1,
        route: "IV",
      });

      expect(marCreate).toHaveBeenCalled();
      expect(overrideCreate).not.toHaveBeenCalled();
    });
  });
});
