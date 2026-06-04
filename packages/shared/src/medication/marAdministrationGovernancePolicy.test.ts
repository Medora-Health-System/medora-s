import { describe, expect, it } from "vitest";
import {
  isBloodProductMedicationCatalog,
  isPcaOrPcpOpioidPumpRoute,
  marAdministrationRequiresDoubleCheck,
  marPharmacyBlockingWorkflowVisible,
  marPharmacyVerificationBlocksAdministration,
} from "./marAdministrationGovernancePolicy.js";

describe("marAdministrationGovernancePolicy (M1.7A.9)", () => {
  it("never blocks MAR administration for pharmacy verification", () => {
    expect(marPharmacyVerificationBlocksAdministration()).toBe(false);
    expect(marPharmacyBlockingWorkflowVisible({}, "administered")).toBe(false);
  });

  it("Hydromorphone IV push does not require double-check", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_OPIOID",
        isHighAlert: true,
        requiresDoubleSign: true,
        catalogCode: "HYDROMORPHONE_2MG_ML_INJECTABLE",
        genericName: "Hydromorphone",
        route: "IV",
        isContinuousInfusion: false,
      })
    ).toBe(false);
  });

  it("requires double-check for insulin and heparin class", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_INSULIN",
        isHighAlert: true,
      })
    ).toBe(true);
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
        isHighAlert: true,
        genericName: "Heparin",
      })
    ).toBe(true);
  });

  it("requires double-check for blood products and PCA opioid pump", () => {
    expect(isBloodProductMedicationCatalog({ catalogCode: "RBC_PACKED_CELLS" })).toBe(true);
    expect(
      marAdministrationRequiresDoubleCheck({
        catalogCode: "FFP_TRANSFUSION",
      })
    ).toBe(true);
    expect(isPcaOrPcpOpioidPumpRoute("PCA")).toBe(true);
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_OPIOID",
        route: "PCA",
        genericName: "Morphine",
      })
    ).toBe(true);
  });

  it("requires double-check for continuous opioid infusion pump", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_OPIOID",
        genericName: "Morphine",
        route: "IV infusion",
        isContinuousInfusion: true,
      })
    ).toBe(true);
  });

  it("Fentanyl IV push does not require double-check (M1.7B.7B)", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_OPIOID",
        genericName: "Fentanyl",
        route: "IV",
        isContinuousInfusion: false,
        requiresDoubleSign: true,
      })
    ).toBe(false);
  });

  it("insulin infusion requires double-check (M1.7B.7B policy lock)", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_INSULIN",
        genericName: "Regular insulin",
        route: "IV",
        isContinuousInfusion: true,
      })
    ).toBe(true);
  });

  it("heparin infusion requires double-check (M1.7B.7B policy lock)", () => {
    expect(
      marAdministrationRequiresDoubleCheck({
        highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
        genericName: "Heparin",
        route: "IV",
        isContinuousInfusion: true,
      })
    ).toBe(true);
  });
});
