import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EdClosedEncounterCertificationStatus,
  ED_DISCHARGE_MODE_HOME,
  isEdAllEncountersEligible,
} from "@medora/shared";
import { buildEdClosedEncounterCertificationFromEncounter } from "@/features/emergency/edClosedEncounterCertificationFromEncounter";
import {
  projectCertificationAfterSuccessfulClose,
  resolveEdEncounterBillingReadinessTone,
} from "@/features/emergency/edEncounterCertificationReviewModel";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function readyEncounter() {
  return {
    id: "enc-bill-1",
    status: "OPEN",
    type: "EMERGENCY",
    providerDocumentationStatus: "SIGNED",
    chiefComplaint: "Pain",
    providerNote: "Note",
    treatmentPlan: "Plan",
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      nursingDischargeSummary: "Discharge done",
    },
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Done" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN",
      },
    },
    patient: { dob: "1990-01-01", sexAtBirth: "F", mrn: "MRN-B1", phone: "555-0100" },
    billingFinalizationStatus: "READY",
    billingReadinessSnapshotJson: { isReady: true },
  };
}

describe("edEncounterBillingReadinessClose (MEDUI.ED.LIFECYCLE.6B)", () => {
  it("shows billing deficiencies when closure ready but billing not ready", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(
      {
        ...readyEncounter(),
        billingFinalizationStatus: "NOT_READY",
        billingReadinessSnapshotJson: { isReady: false },
      },
      {
        dispositionReadiness: {
          canClose: true,
          blockers: [],
          warnings: [],
          activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
        },
        diagnosisCount: 1,
      }
    );
    expect(certification.closureReady).toBe(true);
    expect(certification.billingReady).toBe(false);
    expect(resolveEdEncounterBillingReadinessTone(certification)).toBe("billing_deficiencies");
  });

  it("Stage A advisory diagnosis finding alone yields billing_deficiencies tone without established billing block", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(readyEncounter(), {
      dispositionReadiness: {
        canClose: true,
        blockers: [],
        warnings: [],
        activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
      },
      diagnosisCount: 0,
    });
    expect(certification.authoritativeReadiness.billingReady).toBe(true);
    expect(certification.advisoryReadiness.billingReviewSuggested).toBe(true);
    expect(resolveEdEncounterBillingReadinessTone(certification)).toBe("billing_deficiencies");
  });

  it("shows READY_FOR_BILLING tone when closure and billing ready", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(readyEncounter(), {
      dispositionReadiness: { canClose: true, blockers: [], warnings: [], activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 } },
      diagnosisCount: 1,
    });
    expect(certification.status).toBe(EdClosedEncounterCertificationStatus.READY_FOR_CLOSURE);
    expect(certification.closureReady).toBe(true);
    expect(certification.billingReady).toBe(true);
    expect(resolveEdEncounterBillingReadinessTone(certification)).toBe("ready_for_billing");
  });

  it("shows closure blocked tone when established closure blockers exist", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(
      {
        ...readyEncounter(),
        providerDocumentationStatus: "DRAFT",
      },
      {
        dispositionReadiness: {
          canClose: false,
          blockers: [
            {
              code: "PROVIDER_DOCUMENTATION_UNSIGNED",
              severity: "error",
              message: "unsigned",
            },
          ],
          warnings: [],
          activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
        },
      }
    );
    expect(resolveEdEncounterBillingReadinessTone(certification)).toBe("closure_blocked");
  });

  it("billing readiness badge is rendered on closure surface", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    const badge = readSrc("features/emergency/EdEncounterBillingReadinessBadge.tsx");
    expect(closure).toContain("EdEncounterBillingReadinessBadge");
    expect(badge).toContain('data-testid="ed-encounter-billing-readiness-badge"');
    expect(badge).toContain("closeReview.billingTone");
    expect(badge).toContain("data-tone={tone}");
  });

  it("projects CERTIFIED_CLOSED after successful close when ready", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(readyEncounter(), {
      dispositionReadiness: { canClose: true, blockers: [], warnings: [], activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 } },
      diagnosisCount: 1,
    });
    const projected = projectCertificationAfterSuccessfulClose(certification);
    expect(projected.status).toBe(EdClosedEncounterCertificationStatus.CERTIFIED_CLOSED);
    expect(projected.certifiedClosed).toBe(true);
    expect(projected.allEncountersEligible).toBe(true);
  });

  it("allEncountersEligible true when closed encounter meets eligibility rules", () => {
    const closedCert = buildEdClosedEncounterCertificationFromEncounter(
      { ...readyEncounter(), status: "CLOSED" },
      { diagnosisCount: 1 }
    );
    expect(closedCert.status).toBe(EdClosedEncounterCertificationStatus.CERTIFIED_CLOSED);
    expect(closedCert.allEncountersEligible).toBe(true);
    expect(isEdAllEncountersEligible(closedCert)).toBe(true);
  });
});
