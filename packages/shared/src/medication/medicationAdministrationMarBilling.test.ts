import { describe, expect, it } from "vitest";
import {
  isMedicationAdministrationBillableMarAction,
  NON_BILLABLE_MAR_CLINICAL_ACTIONS,
} from "./medicationAdministrationMarBilling.js";

describe("medicationAdministrationMarBilling", () => {
  it("bills only administered MAR actions", () => {
    expect(isMedicationAdministrationBillableMarAction("administered")).toBe(true);
    for (const action of NON_BILLABLE_MAR_CLINICAL_ACTIONS) {
      expect(isMedicationAdministrationBillableMarAction(action)).toBe(false);
    }
  });

  it("resolves legacy notes for non-billable outcomes", () => {
    expect(isMedicationAdministrationBillableMarAction(null, "Action: Patient refused")).toBe(false);
    expect(isMedicationAdministrationBillableMarAction(null, "Action: Administré")).toBe(true);
  });
});
