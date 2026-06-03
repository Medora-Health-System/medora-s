import {
  attachMedicationSafetyGovernanceToOrderItem,
  loadMedicationGovernanceResolveInputByCatalogId,
  mergeMedicationSafetyGovernanceRead,
  resolveGovernanceCatalogKeyForOrderItem,
} from "./medication-safety-governance-read.util";

const hydroCatalog = {
  id: "cat-hydro",
  code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
  genericName: "Hydromorphone",
  therapeuticClass: null,
  isControlled: true,
  controlledSchedule: "II",
  requiresWitness: false,
  requiresDoubleSign: true,
};

const hydroProductProfile = {
  id: "prod-hydro",
  legacyCatalogMedicationId: "cat-hydro",
  legacyCatalogMedication: hydroCatalog,
  concept: {
    safetyProfile: {
      isHighAlert: true,
      highAlertCategories: {
        highAlertClass: "HIGH_ALERT_OPIOID",
        safetyRequirements: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
        lasa: {
          lasaGroupCode: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
          lasaGroupLabel: "Morphine / hydromorphone",
          lasaSeverity: "LASA_HIGH",
        },
      },
      lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
      isControlled: true,
      controlledSchedule: "II",
      requiresWitness: false,
      requiresDoubleSign: true,
    },
  },
  administrationProfile: { allowsWasteDocumentation: true },
};

describe("medication-safety-governance-read (M1.7B.1 / M1.7B.2)", () => {
  it("merges catalog and profile governance without mutating order fields", () => {
    const merged = mergeMedicationSafetyGovernanceRead(
      {
        id: "cat-1",
        isControlled: true,
        controlledSchedule: "II",
        requiresWitness: true,
        requiresDoubleSign: false,
      },
      {
        legacyCatalogMedicationId: "cat-1",
        concept: {
          safetyProfile: {
            isHighAlert: true,
            highAlertCategories: { highAlertClass: "HIGH_ALERT_OPIOID" },
            lasaGroupId: "GROUP_LASA_OPIOID",
            isControlled: true,
            controlledSchedule: "II",
            requiresWitness: false,
            requiresDoubleSign: true,
          },
        },
        administrationProfile: { allowsWasteDocumentation: true },
      },
      "PENDING"
    );

    expect(merged).toMatchObject({
      isControlled: true,
      isHighAlert: true,
      requiresWitness: true,
      requiresDoubleSign: true,
      wasteDocumentationRecommended: true,
      pharmacyVerificationStatus: "PENDING",
    });
  });

  it("attaches resolver output on medication order items only", () => {
    const med = attachMedicationSafetyGovernanceToOrderItem(
      {
        id: "oi-med",
        catalogItemType: "MEDICATION",
        catalogItemId: "cat-1",
        status: "PENDING",
      },
      new Map([
        [
          "cat-1",
          {
            catalog: {
              id: "cat-1",
              isControlled: true,
              controlledSchedule: "II",
              requiresWitness: true,
              requiresDoubleSign: false,
            },
            product: null,
          },
        ],
      ]),
      new Map()
    );

    const lab = attachMedicationSafetyGovernanceToOrderItem(
      {
        id: "oi-lab",
        catalogItemType: "LAB_TEST",
        catalogItemId: "lab-1",
        status: "PENDING",
      },
      new Map(),
      new Map()
    );

    expect(med.medicationSafetyGovernance?.isControlled).toBe(true);
    expect(med.medicationGovernanceResolveInput?.catalog?.id).toBe("cat-1");
    expect(med.status).toBe("PENDING");
    expect(lab.medicationSafetyGovernance).toBeNull();
  });

  it("does not attach pharmacy-only partial governance (M1.7B.1)", () => {
    const row = attachMedicationSafetyGovernanceToOrderItem(
      {
        id: "oi-1",
        catalogItemType: "MEDICATION",
        catalogItemId: "cat-missing",
        lifecycleState: "ORDERED",
      },
      new Map(),
      new Map([["oi-1", "PENDING"]])
    );
    expect(row.lifecycleState).toBe("ORDERED");
    expect(row.medicationSafetyGovernance).toBeNull();
  });

  it("resolves governance by catalogMedication.id when catalogItemId is a product id (M1.7B.2)", () => {
    const resolveMap = new Map([
      [
        "cat-hydro",
        {
          catalog: hydroCatalog,
          product: {
            isHighAlert: true,
            highAlertCategories: hydroProductProfile.concept.safetyProfile.highAlertCategories,
            lasaGroupId: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
            isControlled: true,
            controlledSchedule: "II",
            requiresWitness: false,
            requiresDoubleSign: true,
            allowsWasteDocumentation: true,
          },
        },
      ],
    ]);

    const key = resolveGovernanceCatalogKeyForOrderItem(
      {
        catalogItemId: "prod-hydro",
        catalogMedication: { id: "cat-hydro" },
      },
      resolveMap
    );
    expect(key).toBe("cat-hydro");

    const enriched = attachMedicationSafetyGovernanceToOrderItem(
      {
        id: "oi-hydro",
        catalogItemType: "MEDICATION",
        catalogItemId: "prod-hydro",
        catalogMedication: { id: "cat-hydro" },
        route: "IV",
      },
      resolveMap,
      new Map()
    );

    expect(enriched.medicationGovernanceResolveInput?.product).not.toBeNull();
    expect(enriched.medicationGovernanceResolveInput?.product?.lasaGroupId).toBe(
      "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE"
    );
    expect(enriched.medicationSafetyGovernance?.lasaSeverity).toBe("LASA_HIGH");
  });

  it("loadMedicationGovernanceResolveInputByCatalogId includes product when linked (M1.7B.2)", async () => {
    const prisma = {
      catalogMedication: {
        findMany: jest.fn().mockResolvedValue([hydroCatalog]),
      },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([hydroProductProfile]),
      },
    };

    const map = await loadMedicationGovernanceResolveInputByCatalogId(
      prisma as never,
      ["cat-hydro"]
    );

    const resolveInput = map.get("cat-hydro");
    expect(resolveInput?.product).not.toBeNull();
    expect(resolveInput?.product?.lasaGroupId).toBe("GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE");
  });

  it("loadMedicationGovernanceResolveInputByCatalogId resolves product id keys (M1.7B.2)", async () => {
    const prisma = {
      catalogMedication: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      medicationProduct: {
        findMany: jest.fn().mockResolvedValue([hydroProductProfile]),
      },
    };

    const map = await loadMedicationGovernanceResolveInputByCatalogId(
      prisma as never,
      ["prod-hydro"]
    );

    const resolveInput = map.get("prod-hydro");
    expect(resolveInput?.product).not.toBeNull();
    expect(resolveInput?.product?.lasaGroupId).toBe("GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE");
    expect(resolveInput?.catalog?.id).toBe("cat-hydro");
  });
});
