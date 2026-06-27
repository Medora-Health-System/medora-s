import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isMarMedicationResponseInternalSecondaryText,
  resolveMarMedicationResponseTimelineLabelKey,
} from "@medora/shared";
import { localizeMarShiftTimelineSecondaryText } from "./marShiftTimelineDisplay";

const timelineSrc = readFileSync(
  join(process.cwd(), "src/components/encounters/FacilityMarShiftTimeline.tsx"),
  "utf8"
);

const t = (key: string) => {
  const labels: Record<string, string> = {
    "marMedicationResponse.timeline.completed": "Response Completed",
    "marMedicationResponse.timeline.recommended": "Response Recommended",
    "marMedicationResponse.timeline.overdue": "Response Overdue",
    "marMedicationResponse.timeline.required": "Response Required",
  };
  return labels[key] ?? key;
};

describe("MAR response timeline duplicate label prevention", () => {
  it("Albuterol completed respiratory response localizes to Response Completed once", () => {
    const label = localizeMarShiftTimelineSecondaryText(
      {
        secondaryText: "RESPONSE_COMPLETED",
        medicationResponses: [],
        respiratoryMedicationResponses: [{ responseCode: "IMPROVED_BREATHING" } as never],
        medicationResponseFollowUp: null,
      },
      t
    );
    expect(label).toBe("Response Completed");
  });

  it("does not expose raw RESPONSE_COMPLETED in localized secondary text", () => {
    const label = localizeMarShiftTimelineSecondaryText(
      {
        secondaryText: "RESPONSE_COMPLETED",
        medicationResponses: [],
        respiratoryMedicationResponses: [{ responseCode: "IMPROVED_BREATHING" } as never],
      },
      t
    );
    expect(label).not.toBe("RESPONSE_COMPLETED");
    expect(isMarMedicationResponseInternalSecondaryText("RESPONSE_COMPLETED")).toBe(true);
  });

  it("pain response completed localizes to Response Completed once", () => {
    const label = localizeMarShiftTimelineSecondaryText(
      {
        secondaryText: "REASSESSMENT_COMPLETED",
        medicationResponses: [{ responseCode: "EFFECTIVE", painBefore: 8, painAfter: 3 } as never],
      },
      t
    );
    expect(label).toBe("Response Completed");
    expect(
      resolveMarMedicationResponseTimelineLabelKey({
        secondaryText: "REASSESSMENT_COMPLETED",
        responseCount: 1,
      })
    ).toBe("marMedicationResponse.timeline.completed");
  });

  it("timeline source suppresses duplicate badge when localized response secondary is shown", () => {
    expect(timelineSrc).toContain("!responseTimelineLabelKey");
    expect(timelineSrc).toContain("!isMarMedicationResponseInternalSecondaryText(item.secondaryText)");
  });

  it("ondansetron-style DONE secondary with response count suppresses badge via label key", () => {
    const labelKey = resolveMarMedicationResponseTimelineLabelKey({
      secondaryText: "DONE",
      responseCount: 1,
    });
    expect(labelKey).toBe("marMedicationResponse.timeline.completed");
  });
});
