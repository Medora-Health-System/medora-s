import { MedicationAdministrationService } from "./medication-administration.service";

describe("MedicationAdministrationService order label snapshot (M1.7A.4)", () => {
  it("builds Hydromorphone snapshot from catalog genericName when displayNameEn is empty", async () => {
    const catalogRow = {
      id: "cat-hydro",
      code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
      name: "Hydromorphone",
      displayNameEn: null,
      displayNameFr: "Hydromorphone",
      genericName: "Hydromorphone",
      therapeuticClass: null,
      administrationType: null,
      billingClass: null,
      strength: "2 mg/mL",
      dosageForm: null,
      route: null,
      ndc11: null,
      ndcDisplay: null,
      billingUnitType: null,
      isControlled: true,
      controlledSchedule: "II",
      requiresWitness: false,
      requiresDoubleSign: true,
    };

    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "enc-1",
          facilityId: "fac-1",
          status: "OPEN",
          triage: { vitalsJson: null },
        }),
      },
      orderItem: {
        findFirst: jest.fn().mockResolvedValue({
          id: "item-1",
          catalogItemType: "MEDICATION",
          catalogItemId: "cat-hydro",
          medicationProductId: null,
          manualLabel: null,
          manualSecondaryText: null,
          strength: "2 mg/mL",
          notes: null,
          order: {
            id: "ord-1",
            encounterId: "enc-1",
            facilityId: "fac-1",
            type: "MEDICATION",
            status: "PLACED",
            createdAt: new Date(),
            cancelledAt: null,
          },
        }),
      },
      catalogMedication: { findMany: jest.fn().mockResolvedValue([catalogRow]) },
      medicationProduct: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const audit = { log: jest.fn() };
    const service = new MedicationAdministrationService(prisma as never, audit as never);
    const label = (service as unknown as { medicationLabelSnapshotFromMedicationOrderItem: Function })
      .medicationLabelSnapshotFromMedicationOrderItem(
        {
          manualLabel: null,
          manualSecondaryText: null,
          strength: "2 mg/mL",
          notes: null,
        },
        catalogRow
      );

    expect(label).toBe("Hydromorphone 2 mg/mL");
    expect(label).not.toContain("label unavailable");
  });

  it("MAR snapshot never returns strength-only when catalog code can derive INN (M1.7A.6)", async () => {
    const catalogRow = {
      id: "cat-hydro",
      code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
      name: "Hydromorphone",
      displayNameEn: "2 mg/mL",
      displayNameFr: "2 mg/mL",
      genericName: null,
      strength: "2 mg/mL",
    };

    const prisma = {
      encounter: { findFirst: jest.fn() },
      orderItem: { findFirst: jest.fn() },
      catalogMedication: { findMany: jest.fn() },
      medicationProduct: { findMany: jest.fn() },
    };
    const audit = { log: jest.fn() };
    const service = new MedicationAdministrationService(prisma as never, audit as never);
    const label = (service as unknown as { medicationLabelSnapshotFromMedicationOrderItem: Function })
      .medicationLabelSnapshotFromMedicationOrderItem(
        {
          manualLabel: null,
          manualSecondaryText: null,
          strength: "2 mg/mL",
          notes: null,
        },
        catalogRow
      );

    expect(label).toBe("Hydromorphone 2 mg/mL");
    expect(label).not.toMatch(/^2 mg\/mL$/);
  });
});
