import { describe, expect, it } from "vitest";
import {
  classifyQuarantine,
  getQuarantineReason,
  isQuarantinedCanonicalConcept,
  isQuarantinedCanonicalProduct,
} from "./haitiCanonicalMedicationQuarantine.js";

describe("haitiCanonicalMedicationQuarantine", () => {
  it("quarantines acetaminophen clone concepts", () => {
    expect(isQuarantinedCanonicalConcept({ conceptGenericName: "Acetaminophen d3d79703" })).toBe("QUARANTINE");
    const classId = classifyQuarantine({ conceptGenericName: "Acetaminophen" });
    expect(classId).toBe("Q_ACETAMINOPHEN_CLONE");
    expect(getQuarantineReason(classId!)).toContain("acetaminophen");
  });

  it("quarantines insulin and blocked med clones", () => {
    expect(isQuarantinedCanonicalConcept({ conceptGenericName: "Regular Insulin 03833d88" })).toBe("QUARANTINE");
    expect(isQuarantinedCanonicalConcept({ conceptGenericName: "Blocked Med" })).toBe("QUARANTINE");
  });

  it("quarantines import artifact product codes", () => {
    expect(
      isQuarantinedCanonicalProduct({
        productCode: "PRI_ER_ACETAMINOPHEN_D3D797_500MG_TABLET",
        conceptGenericName: "Acetaminophen",
      })
    ).toBe("QUARANTINE");
    expect(
      isQuarantinedCanonicalProduct({
        productCode: "19G2-PRODUCT-abc",
        conceptGenericName: "Acetaminophen",
      })
    ).toBe("QUARANTINE");
  });

  it("allows Haiti-derived product codes (including pre-activation inactive state)", () => {
    expect(
      isQuarantinedCanonicalProduct({
        productCode: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION",
        conceptGenericName: "Ceftriaxone",
        productIsActive: false,
        conceptIsActive: false,
      })
    ).toBe("ALLOW");
  });

  it("quarantines inactive baseline import chain", () => {
    expect(
      isQuarantinedCanonicalProduct({
        productCode: "PRI_ER_ACETAMINOPHEN_TEST",
        conceptGenericName: "Acetaminophen",
        baselineAvailable: true,
        productIsActive: false,
        conceptIsActive: false,
      })
    ).toBe("QUARANTINE");
  });
});
