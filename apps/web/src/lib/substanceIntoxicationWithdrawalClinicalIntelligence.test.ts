import { describe, expect, it } from "vitest";
import { resolveSubstanceIntoxicationWithdrawalContext } from "./substanceIntoxicationWithdrawalClinicalIntelligence";

describe("substanceIntoxicationWithdrawalClinicalIntelligence", () => {
  it("keeps alcohol intoxication distinct from withdrawal", () => {
    const intox = resolveSubstanceIntoxicationWithdrawalContext({
      displayName: "Acute alcohol intoxication",
    });
    expect(intox.branches).toContain("alcohol_intoxication");
    expect(intox.branches).not.toContain("alcohol_withdrawal");

    const withdrawal = resolveSubstanceIntoxicationWithdrawalContext({
      displayName: "Alcohol withdrawal with tremor",
    });
    expect(withdrawal.branches).toContain("alcohol_withdrawal");
    expect(withdrawal.branches).not.toContain("alcohol_intoxication");
  });

  it("withholds routine discharge for withdrawal delirium/seizure concern", () => {
    const context = resolveSubstanceIntoxicationWithdrawalContext({
      displayName: "Alcohol withdrawal with delirium tremens",
    });
    expect(context.branches).toContain("alcohol_withdrawal");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves stimulant intoxication", () => {
    const context = resolveSubstanceIntoxicationWithdrawalContext({
      displayName: "Methamphetamine intoxication with agitation",
    });
    expect(context.branches).toContain("stimulant_intoxication");
  });
});
