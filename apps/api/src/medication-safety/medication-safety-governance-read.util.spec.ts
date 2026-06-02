import {
  attachMedicationSafetyGovernanceToOrderItem,
  mergeMedicationSafetyGovernanceRead,
} from "./medication-safety-governance-read.util";

describe("medication-safety-governance-read (M1.3F.3)", () => {
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

  it("attaches read-only medicationSafetyGovernance on medication order items only", () => {
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
            isControlled: true,
            requiresWitness: true,
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
    expect(med.status).toBe("PENDING");
    expect(lab.medicationSafetyGovernance).toBeNull();
  });

  it("does not block when only pharmacy verification exists", () => {
    const row = attachMedicationSafetyGovernanceToOrderItem(
      {
        id: "oi-1",
        catalogItemType: "MEDICATION",
        catalogItemId: "cat-2",
        lifecycleState: "ORDERED",
      },
      new Map(),
      new Map([["oi-1", "PENDING"]])
    );
    expect(row.lifecycleState).toBe("ORDERED");
    expect(row.medicationSafetyGovernance?.pharmacyVerificationStatus).toBe("PENDING");
  });
});
