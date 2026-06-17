import { describe, expect, it } from "vitest";
import {
  assertDoseGatedMarEligibility,
  DoseGatedMarEligibilityError,
  evaluateDoseGatedMarEligibility,
  isDoseGatedMarEligible,
} from "./medicationDoseMarEligibility.js";

const flagsOn = {
  MEDICATION_SCHEDULING_V1: true,
  MEDICATION_DOSE_INSTANCES: true,
  MEDICATION_DOSE_GATED_MAR: true,
};

const baseEligibleInput = {
  featureFlags: flagsOn,
  scheduleClassification: "RECURRING" as const,
  scheduleStatus: "ACTIVE",
  doseKind: "FIXED_ADMINISTRATION",
  doseStatus: "DUE",
  terminalMedicationAdministrationId: null,
  frequencyCode: "BID",
  catalog: {
    catalogCode: "METFORMIN",
    genericName: "Metformin",
    administrationType: "PO",
    route: "PO",
  },
  orderRoute: "PO",
  doseOrderItemId: "oi-1",
  requestOrderItemId: "oi-1",
  doseEncounterId: "enc-1",
  requestEncounterId: "enc-1",
  doseFacilityId: "fac-1",
  requestFacilityId: "fac-1",
};

describe("medicationDoseMarEligibility (M1.8B.7I.1)", () => {
  it("eligible for RECURRING FIXED_ADMINISTRATION with flags ON", () => {
    const result = evaluateDoseGatedMarEligibility(baseEligibleInput);
    expect(result).toEqual({
      eligible: true,
      reason: "DOSE_GATED_MAR_ELIGIBLE",
      scheduleClassification: "RECURRING",
    });
    expect(isDoseGatedMarEligible(baseEligibleInput)).toBe(true);
  });

  it("flags OFF → ineligible", () => {
    const result = evaluateDoseGatedMarEligibility({
      ...baseEligibleInput,
      featureFlags: { ...flagsOn, MEDICATION_DOSE_GATED_MAR: false },
    });
    expect(result.reason).toBe("DOSE_GATED_MAR_FLAGS_OFF");
  });

  it("non-ACTIVE schedule → ineligible", () => {
    expect(
      evaluateDoseGatedMarEligibility({ ...baseEligibleInput, scheduleStatus: "CANCELLED" }).reason
    ).toBe("SCHEDULE_NOT_ACTIVE");
  });

  it.each([
    ["DIRECT_MAR", "DIRECT_MAR"],
    ["ON_DEMAND", "ON_DEMAND"],
    ["INFUSION_LIFECYCLE", "INFUSION_LIFECYCLE"],
  ] as const)("classification %s → %s", (scheduleClassification, reason) => {
    expect(
      evaluateDoseGatedMarEligibility({ ...baseEligibleInput, scheduleClassification }).reason
    ).toBe(reason);
  });

  it("IVPB route → INFUSION_LIFECYCLE", () => {
    expect(
      evaluateDoseGatedMarEligibility({
        ...baseEligibleInput,
        frequencyCode: "Q12H",
        orderRoute: "IVPB",
        catalog: {
          catalogCode: "VANCOMYCIN",
          genericName: "Vancomycin",
          administrationType: "PUSH",
        },
      }).reason
    ).toBe("INFUSION_LIFECYCLE");
  });

  it("blood product → INFUSION_LIFECYCLE", () => {
    expect(
      evaluateDoseGatedMarEligibility({
        ...baseEligibleInput,
        frequencyCode: "ONCE",
        catalog: {
          catalogCode: "PRBC_TRANSFUSION",
          therapeuticClass: "BLOOD_PRODUCT",
        },
        orderRoute: "IV",
      }).reason
    ).toBe("INFUSION_LIFECYCLE");
  });

  it("non FIXED_ADMINISTRATION dose kind → ineligible", () => {
    expect(
      evaluateDoseGatedMarEligibility({ ...baseEligibleInput, doseKind: "IVPB_SESSION" }).reason
    ).toBe("NOT_FIXED_ADMINISTRATION");
  });

  it("terminal dose status → ineligible", () => {
    expect(
      evaluateDoseGatedMarEligibility({ ...baseEligibleInput, doseStatus: "COMPLETED" }).reason
    ).toBe("DOSE_ALREADY_TERMINAL");
  });

  it("HELD dose → ineligible", () => {
    expect(
      evaluateDoseGatedMarEligibility({ ...baseEligibleInput, doseStatus: "HELD" }).reason
    ).toBe("DOSE_STATUS_NOT_ADMINISTRABLE");
  });

  it("terminal MAR already linked → ineligible", () => {
    expect(
      evaluateDoseGatedMarEligibility({
        ...baseEligibleInput,
        terminalMedicationAdministrationId: "mar-1",
      }).reason
    ).toBe("DOSE_ALREADY_HAS_TERMINAL_MAR");
  });

  it("scope mismatches → ineligible", () => {
    expect(
      evaluateDoseGatedMarEligibility({ ...baseEligibleInput, requestOrderItemId: "oi-2" }).reason
    ).toBe("ORDER_ITEM_MISMATCH");
    expect(
      evaluateDoseGatedMarEligibility({ ...baseEligibleInput, requestEncounterId: "enc-2" }).reason
    ).toBe("ENCOUNTER_MISMATCH");
    expect(
      evaluateDoseGatedMarEligibility({ ...baseEligibleInput, requestFacilityId: "fac-2" }).reason
    ).toBe("FACILITY_MISMATCH");
  });

  it("PLANNED outside window → eligible (H9 universal actionability)", () => {
    const now = new Date("2026-06-10T08:00:00.000Z");
    expect(
      evaluateDoseGatedMarEligibility({
        ...baseEligibleInput,
        doseStatus: "PLANNED",
        now,
        dueWindowStartAt: new Date("2026-06-10T09:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-10T10:00:00.000Z"),
      }).eligible
    ).toBe(true);
  });

  it("PLANNED inside window → eligible", () => {
    const now = new Date("2026-06-10T09:30:00.000Z");
    expect(
      evaluateDoseGatedMarEligibility({
        ...baseEligibleInput,
        doseStatus: "PLANNED",
        now,
        dueWindowStartAt: new Date("2026-06-10T09:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-10T10:00:00.000Z"),
      }).eligible
    ).toBe(true);
  });

  it("assertDoseGatedMarEligibility throws on ineligible", () => {
    expect(() =>
      assertDoseGatedMarEligibility({ ...baseEligibleInput, scheduleStatus: "CANCELLED" })
    ).toThrow(DoseGatedMarEligibilityError);
  });
});
