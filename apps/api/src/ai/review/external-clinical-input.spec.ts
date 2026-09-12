import { buildExternalClinicalInput } from "./external-clinical-input.js";

describe("buildExternalClinicalInput", () => {
  it("excludes direct record identifiers and exact date of birth", () => {
    const snapshot = {
      snapshotVersion: "snapshot-v1",
      generatedAt: new Date().toISOString(),
      encounterContext: {
        encounterId: "11111111-1111-4111-8111-111111111111",
        facilityId: "22222222-2222-4222-8222-222222222222",
        patientId: "33333333-3333-4333-8333-333333333333",
        country: "US",
        encounterType: "CLINIC",
        status: "OPEN",
        careSetting: "OFFICE_OUTPATIENT_CLINIC",
      },
      patientContext: {
        age: 42,
        dateOfBirth: "1984-01-01T00:00:00.000Z",
        sexAtBirth: "F",
        relevantHistory: { internalPatientKey: "secret-key" },
      },
      presentation: { chiefComplaint: "cough", vitalTrend: [] },
      clinicalDocumentation: {
        providerDocumentationStatus: "DRAFT",
        providerNote: { text: "Clinical note", truncated: false },
        structuredEntries: [
          { id: "doc-internal-id", namespace: "ROS", documentedAt: "2026-09-12T20:00:00.000Z" },
        ],
        reassessments: [],
      },
      diagnostics: {
        orders: [
          {
            id: "order-internal-id",
            items: [{ id: "order-item-internal-id", displayLabel: "Chest x-ray", status: "ORDERED" }],
          },
        ],
        results: [
          { id: "result-internal-id", orderItemId: "order-item-internal-id", criticalValue: false },
        ],
        pendingTests: [],
        criticalResults: [],
      },
      treatments: {
        medicationOrders: [{ id: "med-internal-id", displayLabel: "Acetaminophen" }],
        medicationAdministrations: [{ id: "mar-internal-id", orderItemId: "order-item-internal-id" }],
        procedures: [{ id: "procedure-internal-id", displayLabel: "Procedure" }],
      },
      diagnoses: {
        documentedDiagnoses: [{ id: "dx-internal-id", code: "R05", display: "Cough" }],
      },
      disposition: {
        followUps: [{ id: "followup-internal-id", type: "PCP" }],
        appointments: [{ id: "appt-internal-id", status: "SCHEDULED" }],
      },
    } as any;

    const input = buildExternalClinicalInput(snapshot);
    const serialized = JSON.stringify(input);

    expect(serialized).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(serialized).not.toContain("22222222-2222-4222-8222-222222222222");
    expect(serialized).not.toContain("33333333-3333-4333-8333-333333333333");
    expect(serialized).not.toContain("1984-01-01");
    expect(serialized).not.toContain("secret-key");
    expect(serialized).not.toContain("internal-id");
    expect(input.patient).toEqual({ age: 42, sexAtBirth: "F" });
    expect(input.diagnostics.orders[0]?.items[0]?.displayLabel).toBe("Chest x-ray");
  });
});
