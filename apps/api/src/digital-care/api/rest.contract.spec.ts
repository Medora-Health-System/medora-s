import {
  DIGITAL_CARE_PATIENT_SELF_PREFIX,
  DIGITAL_CARE_REST_V1_OPERATIONS,
  DIGITAL_CARE_REST_V1_PREFIX,
} from "./rest.contract";

describe("Digital Care REST v1 contract", () => {
  it("keeps operation ids unique", () => {
    const ids = DIGITAL_CARE_REST_V1_OPERATIONS.map((operation) => operation.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every REST operation inside the versioned Digital Care namespace", () => {
    for (const operation of DIGITAL_CARE_REST_V1_OPERATIONS) {
      expect(operation.transport).toBe("rest");
      expect(operation.path.startsWith(DIGITAL_CARE_REST_V1_PREFIX)).toBe(true);
      expect(operation.requiredPermissions.length).toBeGreaterThan(0);
    }
  });

  it("keeps patient-facing operations server-scoped to the authenticated patient", () => {
    for (const operation of DIGITAL_CARE_REST_V1_OPERATIONS) {
      expect(operation.audience).toBe("patient-self");
      expect(operation.path.startsWith(`${DIGITAL_CARE_PATIENT_SELF_PREFIX}/`)).toBe(true);
      expect(operation.path).not.toContain(":patientId");
      for (const permission of operation.requiredPermissions) {
        expect(permission).toContain(".self.");
      }
    }
  });
});
