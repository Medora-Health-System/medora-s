import { describe, expect, it } from "vitest";
import { evaluatePathwayDocumentationBlockers } from "./edDispositionPathwayDocumentationV1.js";

describe("edDispositionPathwayDocumentationV1", () => {
  it("HOME returns no pathway blockers (Home engine owns instructions)", () => {
    expect(
      evaluatePathwayDocumentationBlockers("HOME", {}, { patientInstructionsGiven: true })
    ).toEqual([]);
  });

  it("Home discharge fields never satisfy AMA blockers", () => {
    const blockers = evaluatePathwayDocumentationBlockers(
      "AMA",
      { erAmaDispositionV1: { capacityAssessed: "" } },
      {
        providerDischargeDiagnosisDocs: [{ code: "R51" }],
        patientInstructionsGiven: true,
        followUp: "Clinic",
      }
    );
    expect(blockers.some((b) => b.code === "AMA_CAPACITY_NOT_DOCUMENTED")).toBe(true);
  });

  it("LWBS conflicts when MSE completed", () => {
    const blockers = evaluatePathwayDocumentationBlockers("LWBS", {
      medicalScreeningExaminationV1: {
        status: "COMPLETED",
        documentationStatus: "SIGNED",
        source: "CURRENT",
        emtalaComplianceClaim: false,
        revision: 1,
      },
      erLwbsDispositionV1: {
        careStage: "LEFT_BEFORE_MSE",
        lastSeenAt: "2026-07-20T09:00",
        searchAttemptsDocumented: true,
        departureAt: "2026-07-20T09:30",
      },
    });
    expect(blockers.some((b) => b.code === "LWBS_MSE_STATUS_CONFLICT")).toBe(true);
  });

  it("keeps autopsy separate from postmortem care on deceased", () => {
    const blockers = evaluatePathwayDocumentationBlockers("DECEASED", {
      erDeceasedDispositionV1: {
        pronouncementComplete: true,
        dateOfDeath: "2026-07-20",
        timeOfDeath: "10:00",
        pronouncedBy: "Dr",
        nextOfKinNotificationStatus: "Done",
        medicalExaminerStatus: "N/A",
        donationReferralStatus: "N/A",
        postmortemCareComplete: true,
        belongingsDocumented: true,
        bodyCustodyDocumented: true,
        autopsyRequested: "",
      },
    });
    expect(blockers).toEqual([]);
  });
});
