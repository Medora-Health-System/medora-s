import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import { buildEdClosedEncounterCertificationFromEncounter } from "@/features/emergency/edClosedEncounterCertificationFromEncounter";
import { canProceedToCloseCheckFromCertificationReview } from "@/features/emergency/edEncounterCertificationReviewModel";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function dispositionBlocked() {
  return {
    canClose: false,
    blockers: [
      {
        code: "ACTIVE_ORDERS_UNRESOLVED",
        severity: "error" as const,
        message: "Active orders unresolved",
      },
    ],
    warnings: [],
    activeOrderCounts: { lab: 1, imaging: 0, medication: 0, care: 0 },
  };
}

describe("edEncounterCertificationOverrideWorkflow (MEDUI.ED.LIFECYCLE.6B)", () => {
  it("preserves acknowledgeDeficiencies path in closure surface", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("acknowledgeDeficiencies");
    expect(closure).toContain("executeClose(true");
    expect(closure).toContain("closeDespiteDeficiencies");
    expect(closure).toContain("showDeficiencyModal");
  });

  it("preserves acknowledgeDispositionSafety override in certification review", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    const review = readSrc("features/emergency/EdEncounterCertificationReview.tsx");
    expect(closure).toContain("acknowledgeDispositionSafety");
    expect(closure).toContain("ackDispositionSafety");
    expect(review).toContain("dispositionReadiness.overrideCheckbox");
    expect(review).toContain("acknowledgeDispositionSafety");
  });

  it("does not introduce a new override model", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    const reviewModel = readSrc("features/emergency/edEncounterCertificationReviewModel.ts");
    expect(closure).not.toContain("acknowledgeCertification");
    expect(closure).not.toContain("overrideCertification");
    expect(reviewModel).not.toContain("acknowledgeCertification");
  });

  it("disposition override enables close-check when disposition blocks", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(
      {
        id: "enc-2",
        status: "OPEN",
        type: "EMERGENCY",
        providerDocumentationStatus: "SIGNED",
        chiefComplaint: "Pain",
        providerNote: "Note",
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
        nursingAssessment: {
          nursingEvalV1: { sections: { assessment: { text: "Done" } } },
          erDispositionExecutionV1: {
            dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
            dischargeSortieCompletedByDisplayName: "RN",
          },
        },
        patient: { dob: "1990-01-01", sexAtBirth: "F", mrn: "MRN-2" },
      },
      {
        dispositionReadiness: dispositionBlocked(),
      }
    );
    const dispositionReadiness = dispositionBlocked();
    expect(
      canProceedToCloseCheckFromCertificationReview({
        certification,
        dispositionReadiness,
        acknowledgeDispositionSafety: false,
      })
    ).toBe(false);
    expect(
      canProceedToCloseCheckFromCertificationReview({
        certification,
        dispositionReadiness,
        acknowledgeDispositionSafety: true,
      })
    ).toBe(true);
  });

  it("deficiency modal still passes acknowledgeDispositionSafety to executeClose", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("executeClose(true, ackDispositionSafety)");
  });

  it("executeClose still posts acknowledgeDispositionSafety to close API", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain('body.acknowledgeDispositionSafety = true');
    expect(closure).toContain('body.acknowledgeDeficiencies = true');
  });
});
