import { describe, expect, it } from "vitest";
import en from "./en";
import fr from "./fr";

describe("medicationGovernance globalBaselineAutoApprove i18n (19I)", () => {
  it("mirrors keys between en and fr", () => {
    const enKeys = Object.keys(en.medicationGovernance.globalBaselineAutoApprove).sort();
    const frKeys = Object.keys(fr.medicationGovernance.globalBaselineAutoApprove).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("warning states runtime is not enabled", () => {
    expect(fr.medicationGovernance.globalBaselineAutoApprove.warning).toMatch(
      /n’active pas|prescription|MAR|facturation/i
    );
    expect(en.medicationGovernance.globalBaselineAutoApprove.warning).toMatch(
      /does not enable/i
    );
  });

  it("commit requires dry-run first in copy", () => {
    expect(fr.medicationGovernance.globalBaselineAutoApprove.dryRunRequired).toMatch(/simulation/i);
    expect(en.medicationGovernance.globalBaselineAutoApprove.dryRunRequired).toMatch(/dry-run/i);
  });
});
