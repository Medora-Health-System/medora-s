import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import { buildEdClosedEncounterCertificationFromEncounter } from "@/features/emergency/edClosedEncounterCertificationFromEncounter";
import {
  canProceedToCloseCheckFromCertificationReview,
  shouldShowCertificationReviewOnCloseRequest,
} from "@/features/emergency/edEncounterCertificationReviewModel";

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

function departedEncounter(overrides: Record<string, unknown> = {}) {
  return {
    id: "enc-1",
    status: "OPEN",
    type: "EMERGENCY",
    providerDocumentationStatus: "DRAFT",
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
    patient: { dob: "1990-01-01", sexAtBirth: "F", mrn: "MRN-1" },
    ...overrides,
  };
}

describe("edEncounterCertificationCloseWorkflow (MEDUI.ED.LIFECYCLE.6B)", () => {
  it("Stage A advisory findings show review without authoritative closure block", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(departedEncounter());
    expect(certification.advisoryFindings.length).toBeGreaterThan(0);
    expect(certification.authoritativeReadiness.clinicalClosureReady).toBe(true);
    expect(shouldShowCertificationReviewOnCloseRequest(certification)).toBe(true);
  });

  it("closure surface wires certification review before close-check", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("EdEncounterCertificationReview");
    expect(closure).toContain("showCertificationReview");
    expect(closure).toContain("setShowCertificationReview(true)");
    expect(closure).toContain("runCloseCheck");
    expect(closure).not.toMatch(/setShowCloseModal\(false\)[\s\S]{0,120}void runCloseCheck\(\)/);
  });

  it("certification review panel component exists for close workflow", () => {
    const review = readSrc("features/emergency/EdEncounterCertificationReview.tsx");
    expect(review).toContain('data-testid="ed-encounter-certification-review"');
    expect(review).not.toContain("edLifecycle.certification.advisory.banner");
    expect(review).toContain("establishedBlockers");
    expect(review).toContain("ed-certification-continue-close");
    expect(review).toContain("ed-certification-close");
  });

  it("close-check still runs only after certification review continue", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("onContinueClose={() => {");
    expect(closure).toContain("void runCloseCheck()");
  });

  it("no encounter mutation in certification review modules", () => {
    const reviewModel = readSrc("features/emergency/edEncounterCertificationReviewModel.ts");
    const fromEncounter = readSrc("features/emergency/edClosedEncounterCertificationFromEncounter.ts");
    expect(reviewModel).not.toContain("apiFetch");
    expect(fromEncounter).not.toMatch(/status:\s*["']CLOSED["']/);
  });

  it("no billing mutation in close certification workflow", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    const review = readSrc("features/emergency/EdEncounterCertificationReview.tsx");
    expect(closure).not.toContain("/billing");
    expect(review).not.toContain("/billing");
  });

  it("trackboard view unchanged for close workflow integration", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).not.toContain("EdEncounterCertificationReview");
    expect(trackboard).not.toContain("showCertificationReview");
  });

  it("disposition safety must be acknowledged before close-check when disposition blocks", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(
      departedEncounter({ providerDocumentationStatus: "SIGNED" }),
      {
        dispositionReadiness: dispositionBlocked(),
      }
    );
    expect(
      canProceedToCloseCheckFromCertificationReview({
        certification,
        dispositionReadiness: dispositionBlocked(),
        acknowledgeDispositionSafety: false,
      })
    ).toBe(false);
  });
});
