import { EncounterType, BillingClassification } from "@prisma/client";
import { resolveEncounterCareSetting, resolveFacilityJurisdiction } from "./resolve-encounter-care-setting";

describe("resolveEncounterCareSetting", () => {
  it("returns EMERGENCY_DEPARTMENT for emergency encounter type", () => {
    const result = resolveEncounterCareSetting({
      encounter: {
        type: EncounterType.EMERGENCY,
        serviceLine: null,
        billingClassification: BillingClassification.EMERGENCY_DEPARTMENT,
        workflowState: null,
      },
      facility: { facilityType: "FREESTANDING_ER" },
    });
    expect(result).toBe("EMERGENCY_DEPARTMENT");
  });

  it("returns OFFICE_OUTPATIENT_CLINIC for outpatient clinic visit", () => {
    const result = resolveEncounterCareSetting({
      encounter: {
        type: EncounterType.OUTPATIENT,
        serviceLine: null,
        billingClassification: BillingClassification.CLINIC_VISIT,
        workflowState: null,
      },
      facility: { facilityType: "CLINIC" },
    });
    expect(result).toBe("OFFICE_OUTPATIENT_CLINIC");
  });

  it("returns HOSPITAL_INPATIENT_OBSERVATION for hospital inpatient", () => {
    const result = resolveEncounterCareSetting({
      encounter: {
        type: EncounterType.INPATIENT,
        serviceLine: null,
        billingClassification: BillingClassification.INPATIENT,
        workflowState: null,
      },
      facility: { facilityType: "HOSPITAL" },
    });
    expect(result).toBe("HOSPITAL_INPATIENT_OBSERVATION");
  });

  it("returns HOSPITAL_INPATIENT_OBSERVATION for hospital observation", () => {
    const result = resolveEncounterCareSetting({
      encounter: {
        type: EncounterType.INPATIENT,
        serviceLine: null,
        billingClassification: BillingClassification.OBSERVATION,
        workflowState: null,
      },
      facility: { facilityType: "HOSPITAL" },
    });
    expect(result).toBe("HOSPITAL_INPATIENT_OBSERVATION");
  });

  it("returns CRITICAL_CARE when active critical care line is present", () => {
    const result = resolveEncounterCareSetting({
      encounter: {
        type: EncounterType.EMERGENCY,
        serviceLine: null,
        billingClassification: BillingClassification.EMERGENCY_DEPARTMENT,
        workflowState: null,
      },
      facility: { facilityType: "HOSPITAL" },
      hasActiveCriticalCareLine: true,
    });
    expect(result).toBe("CRITICAL_CARE");
  });

  it("returns OTHER for telehealth", () => {
    const result = resolveEncounterCareSetting({
      encounter: {
        type: EncounterType.OUTPATIENT,
        serviceLine: null,
        billingClassification: BillingClassification.TELEHEALTH,
        workflowState: null,
      },
      facility: { facilityType: "CLINIC" },
    });
    expect(result).toBe("OTHER");
  });

  it("returns REVIEW_REQUIRED for ambiguous settings", () => {
    const result = resolveEncounterCareSetting({
      encounter: {
        type: EncounterType.OUTPATIENT,
        serviceLine: null,
        billingClassification: BillingClassification.URGENT_CARE,
        workflowState: null,
      },
      facility: { facilityType: "CLINIC" },
    });
    expect(result).toBe("REVIEW_REQUIRED");
  });
});

describe("resolveFacilityJurisdiction", () => {
  it("maps United States to US", () => {
    expect(resolveFacilityJurisdiction("United States")).toBe("US");
  });

  it("maps Dominican Republic to DO", () => {
    expect(resolveFacilityJurisdiction("Dominican Republic")).toBe("DO");
  });

  it("maps Haiti to HT", () => {
    expect(resolveFacilityJurisdiction("Haiti")).toBe("HT");
  });

  it("maps unknown countries to OTHER", () => {
    expect(resolveFacilityJurisdiction("Unknown")).toBe("OTHER");
  });
});
