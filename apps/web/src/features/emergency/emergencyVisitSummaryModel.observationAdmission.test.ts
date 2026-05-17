import { describe, expect, it } from "vitest";
import { buildEmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";
import { DISCHARGE_MODE_FR_ADMISSION } from "@medora/shared";

describe("buildEmergencyVisitSummaryModel observation admission timeline", () => {
  const baseEncounter = {
    createdAt: "2026-05-16T08:00:00Z",
    updatedAt: "2026-05-16T09:00:00Z",
    status: "OPEN",
    type: "INPATIENT",
    nursingAssessment: null,
    dischargeSummaryJson: null,
    admissionSummaryJson: { careLevel: "Observation", admissionReason: "Chest pain" },
  };

  it("excludes mislabeled discharge events from discharge history", () => {
    const model = buildEmergencyVisitSummaryModel(
      baseEncounter,
      null,
      null,
      "fr",
      null,
      [
        {
          id: "ev-d",
          eventType: "DISCHARGE_SUMMARY_SAVED",
          createdAt: "2026-05-16T09:30:00Z",
          payloadJson: { snapshot: { dischargeMode: DISCHARGE_MODE_FR_ADMISSION } },
        },
        {
          id: "ev-a",
          eventType: "ADMISSION_SUMMARY_SAVED",
          createdAt: "2026-05-16T09:30:00Z",
          payloadJson: { snapshot: { careLevel: "Observation", admissionReason: "Chest pain" } },
        },
      ]
    );
    expect(model.dischargeSummaryHistory).toHaveLength(0);
    expect(model.admissionSummaryHistory.length).toBeGreaterThanOrEqual(1);
    expect(model.admissionSummaryHistory.some((e) => e.id === "ev-a")).toBe(true);
    expect(
      model.admissionSummaryHistory.some(
        (e) => e.id === "ev-d" && e.eventType === "OBSERVATION_ADMISSION_PACKET_SAVED"
      )
    ).toBe(true);
  });
});
