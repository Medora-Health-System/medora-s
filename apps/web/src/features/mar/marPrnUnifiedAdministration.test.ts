import { describe, expect, it } from "vitest";
import {
  buildMarPrnTimelineCellDisplay,
  buildMedicationFollowUpProjection,
  isMarShiftTimelineItemActionable,
  resolvePrnTimelineTerminalDisplay,
} from "@medora/shared";

describe("marPrnUnifiedAdministration", () => {
  it("completed PRN administration uses gray terminal display at actual admin time", () => {
    const display = buildMarPrnTimelineCellDisplay({
      medicationLabel: "Acetaminophen 650 mg",
      doseAmount: "650 mg",
      route: "PO",
      frequencyCode: "Q6H",
      directionsSig: "q6h PRN pain",
      doseStatus: "COMPLETED",
      administeredAt: "2026-06-11T14:00:00.000Z",
      administeredByInitials: "RN",
      facilityTimeZone: "UTC",
    });
    const terminal = resolvePrnTimelineTerminalDisplay({
      doseStatus: "COMPLETED",
      readOnly: true,
      secondaryText: display.secondaryText,
    });
    expect(terminal?.colorKey).toBe("administered");
    expect(display.tertiaryText).toMatch(/GIVEN/i);
    expect(display.tertiaryText).not.toMatch(/Last given/i);
  });

  it("available PRN cell shows next eligible, not duplicate administer at completed hour", () => {
    const display = buildMarPrnTimelineCellDisplay({
      medicationLabel: "Acetaminophen 650 mg",
      doseAmount: "650 mg",
      route: "PO",
      frequencyCode: "Q6H",
      directionsSig: "q6h PRN pain",
      doseStatus: "DUE",
      prnLastGivenAt: "2026-06-26T14:00:00.000Z",
      prnNextEligibleAt: "2027-06-24T02:00:00.000Z",
      projectedEligibleAt: "2027-06-24T02:00:00.000Z",
      facilityTimeZone: "UTC",
    });
    expect(display.tertiaryText).toMatch(/Next eligible/i);
    expect(display.tertiaryText).not.toMatch(/RATE_CHANGE|INFUSING/);
  });

  it("completed PRN is not actionable for re-administration", () => {
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "COMPLETED",
        readOnly: true,
        clinicalAction: "VIEW_ADMINISTRATION",
      })
    ).toBe(false);
  });

  it("pain PRN administration triggers follow-up projection", () => {
    const followUp = buildMedicationFollowUpProjection({
      catalogCode: "ACETAMINOPHEN_ORAL",
      medicationLabel: "Acetaminophen 650 mg",
      genericName: "Acetaminophen",
      marAction: "administered",
      administrationNotes: null,
      administeredAt: "2026-06-11T14:00:00.000Z",
      doseStatus: "COMPLETED",
      frequencyCode: "Q6H",
      directionsSig: "q6h PRN pain",
      prnIndication: "pain",
      defaultSecondaryText: "GIVEN 2:00 PM RN",
      route: "PO",
      doseKind: "FIXED_ADMINISTRATION",
      clinicalAction: "VIEW_ADMINISTRATION",
      referenceAt: new Date("2026-06-11T14:05:00.000Z"),
    });
    expect(followUp.followUpType).toBe("PAIN");
    expect(followUp.medicationResponseFollowUp?.status).toMatch(/RECOMMENDED|REQUIRED|DUE/);
  });

  it("respiratory PRN administration triggers respiratory follow-up projection", () => {
    const followUp = buildMedicationFollowUpProjection({
      catalogCode: "ALBUTEROL_INHALATION",
      medicationLabel: "Albuterol nebulizer",
      genericName: "Albuterol",
      marAction: "administered",
      administrationNotes: null,
      administeredAt: "2026-06-11T14:00:00.000Z",
      doseStatus: "COMPLETED",
      frequencyCode: "Q6H",
      directionsSig: "q6h PRN wheezing",
      prnIndication: "respiratory distress",
      defaultSecondaryText: "GIVEN 2:00 PM RN",
      route: "INH",
      doseKind: "FIXED_ADMINISTRATION",
      clinicalAction: "VIEW_ADMINISTRATION",
      referenceAt: new Date("2026-06-11T14:05:00.000Z"),
    });
    expect(followUp.followUpType).toBe("RESPIRATORY");
    expect(followUp.medicationResponseFollowUp?.status).toMatch(/RECOMMENDED|REQUIRED|DUE/);
  });
});
