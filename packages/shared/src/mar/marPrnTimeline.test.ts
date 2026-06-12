import { describe, expect, it } from "vitest";
import {
  buildMarPrnTimelineCellDisplay,
  formatMarPrnFrequencyLabel,
  isPrnAdministrationBeforeNextEligible,
  isPrnMedicationOrderClassification,
  MAR_SHIFT_TIMELINE_STATUS_COLORS,
  resolveMarShiftTimelineStatusColorKey,
  resolvePrnNextEligibleAt,
} from "./marPrnTimeline.js";
import { isPrnMedicationOrder } from "./medicationAdministrationPrnGovernance.js";

describe("marPrnTimeline (K.10B.8A PRN row)", () => {
  it("isPrnMedicationOrderClassification detects interval+PRN and clinical markers", () => {
    expect(
      isPrnMedicationOrderClassification({
        frequencyCode: "Q6H",
        directionsSig: "4 mg IVP q6h PRN nausea",
      })
    ).toBe(true);
    expect(
      isPrnMedicationOrderClassification({
        frequencyCode: null,
        directionsSig: "Morphine 4 mg IVP pain PRN",
      })
    ).toBe(true);
    expect(isPrnMedicationOrder({ frequencyCode: "BID", directionsSig: "500 mg PO BID" })).toBe(false);
  });

  it("formatMarPrnFrequencyLabel renders Q6H PRN", () => {
    expect(formatMarPrnFrequencyLabel({ frequencyCode: "Q6H", directionsSig: null })).toBe("Q6H PRN");
    expect(formatMarPrnFrequencyLabel({ frequencyCode: "PRN", directionsSig: "PRN nausea" })).toMatch(/PRN/);
  });

  it("resolvePrnNextEligibleAt adds interval after last administration", () => {
    const last = "2026-06-12T09:15:00.000Z";
    const next = resolvePrnNextEligibleAt({ lastAdministeredAt: last, frequencyCode: "Q6H" });
    expect(next?.toISOString()).toBe("2026-06-12T15:15:00.000Z");
  });

  it("isPrnAdministrationBeforeNextEligible is true when proposed time is early", () => {
    expect(
      isPrnAdministrationBeforeNextEligible({
        proposedAdministeredAt: "2026-06-12T11:00:00.000Z",
        lastAdministeredAt: "2026-06-12T09:15:00.000Z",
        frequencyCode: "Q6H",
      })
    ).toBe(true);
    expect(
      isPrnAdministrationBeforeNextEligible({
        proposedAdministeredAt: "2026-06-12T16:00:00.000Z",
        lastAdministeredAt: "2026-06-12T09:15:00.000Z",
        frequencyCode: "Q6H",
      })
    ).toBe(false);
  });

  it("buildMarPrnTimelineCellDisplay shows availability and given states", () => {
    const available = buildMarPrnTimelineCellDisplay({
      medicationLabel: "Zofran",
      doseAmount: "4 mg",
      route: "IVP",
      frequencyCode: "Q6H",
      directionsSig: "4 mg IVP q6h PRN nausea",
      doseStatus: "DUE",
      facilityTimeZone: "UTC",
    });
    expect(available.primaryText).toBe("Zofran IVP");
    expect(available.secondaryText).toBe("4 mg IVP");
    expect(available.tertiaryText).toBe("PRN Q6H");

    const given = buildMarPrnTimelineCellDisplay({
      medicationLabel: "Zofran",
      doseAmount: "4 mg",
      route: "IVP",
      frequencyCode: "Q6H",
      doseStatus: "COMPLETED",
      administeredAt: "2026-06-12T09:12:00.000Z",
      administeredByInitials: "EP",
      facilityTimeZone: "UTC",
    });
    expect(given.tertiaryText).toBe("GIVEN 09:12 EP");
  });
});

describe("marShiftTimelineStatusColors (K.10B.8B)", () => {
  it("DONE/COMPLETED uses administered gray palette", () => {
    expect(resolveMarShiftTimelineStatusColorKey({ doseStatus: "COMPLETED", readOnly: true })).toBe(
      "administered"
    );
    const style = MAR_SHIFT_TIMELINE_STATUS_COLORS.administered;
    expect(style.backgroundColor).toBe("#E5E7EB");
    expect(style.borderColor).toBe("#9CA3AF");
    expect(style.color).toBe("#374151");
  });

  it("REFUSED uses refused gray palette", () => {
    expect(
      resolveMarShiftTimelineStatusColorKey({
        doseStatus: "COMPLETED",
        secondaryText: "REFUSED",
      })
    ).toBe("refused");
    const style = MAR_SHIFT_TIMELINE_STATUS_COLORS.refused;
    expect(style.backgroundColor).toBe("#F3F4F6");
    expect(style.borderColor).toBe("#6B7280");
    expect(style.color).toBe("#4B5563");
  });

  it("HELD uses amber palette", () => {
    expect(resolveMarShiftTimelineStatusColorKey({ doseStatus: "HELD" })).toBe("held");
    const style = MAR_SHIFT_TIMELINE_STATUS_COLORS.held;
    expect(style.backgroundColor).toBe("#FEF3C7");
    expect(style.borderColor).toBe("#D97706");
    expect(style.color).toBe("#92400E");
  });

  it("ACTIVE/DUE/IN_PROGRESS uses green palette", () => {
    expect(resolveMarShiftTimelineStatusColorKey({ doseStatus: "DUE" })).toBe("active");
    expect(resolveMarShiftTimelineStatusColorKey({ doseStatus: "IN_PROGRESS" })).toBe("active");
    const style = MAR_SHIFT_TIMELINE_STATUS_COLORS.active;
    expect(style.backgroundColor).toBe("#DCFCE7");
    expect(style.borderColor).toBe("#16A34A");
    expect(style.color).toBe("#166534");
  });

  it("PRN band keeps yellow row palette unchanged", () => {
    expect(resolveMarShiftTimelineStatusColorKey({ doseStatus: "DUE", isPrnBand: true })).toBe(
      "prnRow"
    );
    expect(MAR_SHIFT_TIMELINE_STATUS_COLORS.prnRow.backgroundColor).toBe("#FFFBE6");
  });
});
