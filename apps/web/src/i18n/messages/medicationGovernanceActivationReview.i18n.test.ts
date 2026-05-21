import { describe, expect, it } from "vitest";
import en from "./en";
import fr from "./fr";

describe("medicationGovernance activationReview i18n (19G.2C)", () => {
  it("mirrors activationReview keys between en and fr", () => {
    const enKeys = Object.keys(en.medicationGovernance.activationReview).sort();
    const frKeys = Object.keys(fr.medicationGovernance.activationReview).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("French approve action label is French", () => {
    expect(fr.medicationGovernance.activationReview.actionApprove).toMatch(/Approuver/);
    expect(en.medicationGovernance.activationReview.actionApprove).toMatch(/Approve/);
  });
});
