import { OrdersService } from "./orders.service";
import type { OrderWithItems } from "./orders.types";

function hydromorphoneOrder(): OrderWithItems {
  return {
    id: "order-med-1",
    encounterId: "enc-1",
    facilityId: "fac-1",
    type: "MEDICATION",
    status: "PLACED",
    priority: "ROUTINE",
    notes: null,
    orderedBy: null,
    source: null,
    pathwaySessionId: null,
    prescriberName: null,
    prescriberLicense: null,
    prescriberContact: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    cancelledAt: null,
    cancelledByUserId: null,
    cancellationReason: null,
    patientId: "pat-1",
    items: [
      {
        id: "item-hydro",
        orderId: "order-med-1",
        catalogItemId: "cat-hydro",
        catalogItemType: "MEDICATION",
        medicationProductId: null,
        manualLabel: null,
        manualSecondaryText: null,
        quantity: 1,
        notes: null,
        strength: "2 mg/mL",
        refillCount: null,
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        intendedAdministrationAt: null,
        completedAt: null,
        completedByUserId: null,
        status: "PLACED",
        lifecycleState: "ORDERED",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OrderWithItems["items"][number],
    ],
  } as OrderWithItems;
}

describe("OrdersService medication label integrity (M1.7A.4)", () => {
  it("enriches Hydromorphone catalog order with English and French display labels", async () => {
    const catalogRow = {
      id: "cat-hydro",
      code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
      name: "Hydromorphone",
      displayNameEn: null,
      displayNameFr: "Hydromorphone",
      genericName: "Hydromorphone",
      therapeuticClass: "Antalgique opioïde",
      administrationType: "PUSH",
      billingClass: "UNKNOWN",
      strength: "2 mg/mL",
      dosageForm: "injectable",
      route: "injectable",
      ndc11: null,
      ndcDisplay: null,
      billingUnitType: null,
      isControlled: true,
      controlledSchedule: "II",
      requiresWitness: false,
      requiresDoubleSign: true,
    };

    const prisma = {
      catalogMedication: { findMany: jest.fn().mockResolvedValue([catalogRow]) },
      medicationProduct: { findMany: jest.fn().mockResolvedValue([]) },
      catalogLabTest: { findMany: jest.fn().mockResolvedValue([]) },
      catalogImagingStudy: { findMany: jest.fn().mockResolvedValue([]) },
      pharmacyVerification: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new OrdersService(prisma as never, { log: jest.fn() } as never, { create: jest.fn() } as never);

    const [enriched] = await service.enrichOrderItemsForDisplay([hydromorphoneOrder()]);
    const item = enriched.items[0];

    expect(item.displayLabelEn).toContain("Hydromorphone");
    expect(item.displayLabelEn).not.toContain("label unavailable");
    expect(item.displayLabelFr).toContain("Hydromorphone");
    expect(item.catalogMedication?.genericName).toBe("Hydromorphone");
  });

  it("resolves medication label via MedicationProduct legacy catalog link", async () => {
    const legacy = {
      id: "cat-legacy",
      code: "AMLODIPINE_5_MG_COMPRIME_ORAL",
      name: "Amlodipine",
      displayNameEn: "Amlodipine",
      displayNameFr: "Amlodipine",
      genericName: "Amlodipine",
      therapeuticClass: null,
      administrationType: null,
      billingClass: null,
      strength: "5 mg",
      dosageForm: "comprimé",
      route: "orale",
      ndc11: null,
      ndcDisplay: null,
      billingUnitType: null,
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: false,
    };
    const order = {
      ...hydromorphoneOrder(),
      items: [
        {
          ...hydromorphoneOrder().items[0],
          id: "item-prod",
          catalogItemId: null,
          medicationProductId: "prod-1",
        },
      ],
    } as OrderWithItems;

    const prisma = {
      catalogMedication: { findMany: jest.fn().mockResolvedValue([]) },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "prod-1",
            code: "HYDRO_PROD",
            strengthDisplay: "2 mg/mL",
            legacyCatalogMedication: legacy,
            concept: { genericName: "Amlodipine", displayName: "Amlodipine" },
          },
        ]),
      },
      catalogLabTest: { findMany: jest.fn().mockResolvedValue([]) },
      catalogImagingStudy: { findMany: jest.fn().mockResolvedValue([]) },
      pharmacyVerification: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new OrdersService(prisma as never, { log: jest.fn() } as never, { create: jest.fn() } as never);

    const [enriched] = await service.enrichOrderItemsForDisplay([order]);
    expect(enriched.items[0].displayLabelEn).toContain("Amlodipine");
  });

  it("enriches when catalogItemId is MedicationProduct id (catalog miss, product hit)", async () => {
    const legacy = {
      id: "cat-hydro",
      code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
      name: "Hydromorphone",
      displayNameEn: null,
      displayNameFr: "Hydromorphone",
      genericName: "Hydromorphone",
      therapeuticClass: "Antalgique opioïde",
      administrationType: "PUSH",
      billingClass: "UNKNOWN",
      strength: "2 mg/mL",
      dosageForm: "injectable",
      route: "injectable",
      ndc11: null,
      ndcDisplay: null,
      billingUnitType: null,
      isControlled: true,
      controlledSchedule: "II",
      requiresWitness: false,
      requiresDoubleSign: true,
    };
    const order = {
      ...hydromorphoneOrder(),
      items: [
        {
          ...hydromorphoneOrder().items[0],
          catalogItemId: "prod-hydro",
          medicationProductId: null,
        },
      ],
    } as OrderWithItems;

    const prisma = {
      catalogMedication: { findMany: jest.fn().mockResolvedValue([]) },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "prod-hydro",
            code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
            strengthDisplay: "2 mg/mL",
            legacyCatalogMedication: legacy,
            concept: { genericName: "Hydromorphone", displayName: "Hydromorphone" },
          },
        ]),
      },
      catalogLabTest: { findMany: jest.fn().mockResolvedValue([]) },
      catalogImagingStudy: { findMany: jest.fn().mockResolvedValue([]) },
      pharmacyVerification: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new OrdersService(prisma as never, { log: jest.fn() } as never, { create: jest.fn() } as never);

    const [enriched] = await service.enrichOrderItemsForDisplay([order]);
    expect(enriched.items[0].displayLabelEn).toContain("Hydromorphone");
    expect(enriched.items[0].displayLabelEn).not.toContain("label unavailable");
  });
});
