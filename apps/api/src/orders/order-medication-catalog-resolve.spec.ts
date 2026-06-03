import {
  loadOrderMedicationCatalogMaps,
  resolveOrderMedicationCatalogRow,
} from "./order-medication-catalog-resolve.util";

describe("order-medication-catalog-resolve (M1.7A.5)", () => {
  const legacy = {
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

  it("resolves catalog when catalogItemId holds MedicationProduct.id (mis-keyed row)", async () => {
    const prisma = {
      catalogMedication: {
        findMany: jest.fn().mockResolvedValue([]),
      },
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
    };

    const maps = await loadOrderMedicationCatalogMaps(prisma as never, [
      { catalogItemType: "MEDICATION", catalogItemId: "prod-hydro", medicationProductId: null },
    ]);

    const row = resolveOrderMedicationCatalogRow(
      { catalogItemType: "MEDICATION", catalogItemId: "prod-hydro", medicationProductId: null },
      maps
    );
    expect(row?.genericName).toBe("Hydromorphone");
    expect(row?.strength).toBe("2 mg/mL");
  });
});
