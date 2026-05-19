import { deriveMedicationMasterBadges } from "./medication-master-badge.util";

describe("deriveMedicationMasterBadges", () => {
  it("maps ED formulary, RSI tier, crash cart tier, infusion, controlled, billing review, NDC", () => {
    const badges = deriveMedicationMasterBadges({
      isEDFormulary: true,
      favoriteTier: "RSI",
      administrationType: "INFUSION",
      hasInfusionProfile: true,
      isControlled: true,
      isHighAlert: true,
      requiresManualReview: true,
      ndc11: "12345678901",
    });
    expect(badges.edFormulary).toBe(true);
    expect(badges.rsi).toBe(true);
    expect(badges.crashCart).toBe(false);
    expect(badges.infusion).toBe(true);
    expect(badges.controlled).toBe(true);
    expect(badges.highAlert).toBe(true);
    expect(badges.billingReview).toBe(true);
    expect(badges.ndcPresent).toBe(true);
  });

  it("detects crash cart from favorite tier", () => {
    const badges = deriveMedicationMasterBadges({ favoriteTier: "CRASH_CART" });
    expect(badges.crashCart).toBe(true);
    expect(badges.rsi).toBe(false);
  });
});
