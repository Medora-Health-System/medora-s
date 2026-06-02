import { buildInfusionBillingGovernanceSnapshot, classifyInfusionBillingEvent } from "@medora/shared";

describe("infusion billing governance (API integration)", () => {
  it("high-alert heparin infusion STOP is classifiable and billing-ready with duration", () => {
    const category = classifyInfusionBillingEvent({
      marAction: "administered",
      infusionPhase: "INFUSION_STOP",
      medicationLabel: "Heparin",
      route: "IV infusion",
      catalogMedicationBillingClass: "THERAPEUTIC",
    });
    expect(category).toBe("IV_INFUSION_STOP");

    const snapshot = buildInfusionBillingGovernanceSnapshot({
      classification: {
        marAction: "administered",
        infusionPhase: "INFUSION_STOP",
        medicationLabel: "Heparin",
        route: "IV infusion",
        catalogMedicationBillingClass: "THERAPEUTIC",
      },
      duration: {
        startTimeIso: "2026-06-02T10:00:00.000Z",
        stopTimeIso: "2026-06-02T11:00:00.000Z",
        durationMinutes: 60,
        durationHoursInitial: 1,
        durationHoursAdditional: 0,
        manualReviewReasons: [],
        pairStartRowId: "s1",
        pairStopRowId: "s2",
      },
    });

    expect(snapshot.infusionBillingReady).toBe(true);
    expect(snapshot.suggestedAdministrationCodes.some((c) => c.suggestedAdministrationCode === "96365")).toBe(true);
  });
});
