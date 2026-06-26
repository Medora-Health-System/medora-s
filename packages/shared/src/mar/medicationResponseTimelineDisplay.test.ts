import { describe, expect, it } from "vitest";
import {
  isMarMedicationResponseInternalSecondaryText,
  resolveMarMedicationResponseBadgeLabelKey,
  resolveMarMedicationResponseTimelineLabelKey,
  resolveMarShiftTimelineLatestResponsePainScores,
} from "./medicationResponseTimelineDisplay.js";

describe("medicationResponseTimelineDisplay", () => {
  it("detects internal secondary text tokens", () => {
    expect(isMarMedicationResponseInternalSecondaryText("AWAITING_REASSESSMENT")).toBe(true);
    expect(isMarMedicationResponseInternalSecondaryText("REASSESSMENT_COMPLETED")).toBe(true);
    expect(isMarMedicationResponseInternalSecondaryText("RESPONSE_COMPLETED")).toBe(true);
    expect(isMarMedicationResponseInternalSecondaryText("RESPONSE_RECOMMENDED")).toBe(true);
    expect(isMarMedicationResponseInternalSecondaryText("RESPONSE_REQUIRED")).toBe(true);
    expect(isMarMedicationResponseInternalSecondaryText("RESPONSE_OVERDUE")).toBe(true);
    expect(isMarMedicationResponseInternalSecondaryText("650 mg PO")).toBe(false);
  });

  it("maps respiratory RESPONSE_COMPLETED to completed label key without pain response count", () => {
    expect(
      resolveMarMedicationResponseTimelineLabelKey({
        secondaryText: "RESPONSE_COMPLETED",
        responseCount: 0,
      })
    ).toBe("marMedicationResponse.timeline.completed");
  });

  it("maps RESPONSE_RECOMMENDED and RESPONSE_OVERDUE to nurse-friendly keys", () => {
    expect(
      resolveMarMedicationResponseTimelineLabelKey({
        secondaryText: "RESPONSE_RECOMMENDED",
      })
    ).toBe("marMedicationResponse.timeline.recommended");
    expect(
      resolveMarMedicationResponseTimelineLabelKey({
        secondaryText: "RESPONSE_OVERDUE",
      })
    ).toBe("marMedicationResponse.timeline.overdue");
    expect(
      resolveMarMedicationResponseTimelineLabelKey({
        secondaryText: "RESPONSE_REQUIRED",
      })
    ).toBe("marMedicationResponse.timeline.required");
  });

  it("maps awaiting reassessment to recommended label key", () => {
    expect(
      resolveMarMedicationResponseTimelineLabelKey({
        secondaryText: "AWAITING_REASSESSMENT",
      })
    ).toBe("marMedicationResponse.timeline.recommended");
  });

  it("maps overdue follow-up to overdue label key", () => {
    expect(
      resolveMarMedicationResponseTimelineLabelKey({
        secondaryText: "AWAITING_REASSESSMENT",
        medicationResponseFollowUp: { status: "OVERDUE" },
      })
    ).toBe("marMedicationResponse.timeline.overdue");
  });

  it("maps completed reassessment to completed label key", () => {
    expect(
      resolveMarMedicationResponseTimelineLabelKey({
        secondaryText: "REASSESSMENT_COMPLETED",
        responseCount: 1,
      })
    ).toBe("marMedicationResponse.timeline.completed");
  });

  it("maps multiple responses to completed count label key", () => {
    expect(
      resolveMarMedicationResponseTimelineLabelKey({
        secondaryText: "REASSESSMENT_COMPLETED",
        responseCount: 2,
      })
    ).toBe("marMedicationResponse.timeline.completedCount");
    expect(resolveMarMedicationResponseBadgeLabelKey(2)).toBe(
      "marMedicationResponse.timeline.badgeCompletedCount"
    );
  });

  it("never returns raw enum keys as label keys", () => {
    const key = resolveMarMedicationResponseTimelineLabelKey({
      secondaryText: "AWAITING_REASSESSMENT",
    });
    expect(key).not.toBe("AWAITING_REASSESSMENT");
    expect(key?.startsWith("marMedicationResponse.timeline.")).toBe(true);
  });

  it("extracts latest response pain scores", () => {
    expect(
      resolveMarShiftTimelineLatestResponsePainScores([
        { painBefore: 8, painAfter: 3 },
        { painBefore: 10, painAfter: 9 },
      ])
    ).toEqual({ before: 8, after: 3 });
  });
});
