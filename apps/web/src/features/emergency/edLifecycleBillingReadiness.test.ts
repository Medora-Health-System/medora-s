import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildEdClosedEncounterCertification } from "@medora/shared";
import { ED_DISCHARGE_MODE_HOME } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("edLifecycleBillingReadiness (MEDUI.ED.LIFECYCLE.6)", () => {
  it("uses billingFinalizationStatus without mutating billing state", () => {
    const filter = readSrc("features/emergency/edIncompleteChartsFilter.ts");
    expect(filter).toContain("billingFinalizationStatus");
    expect(filter).not.toContain("FINALIZED");
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: {
        status: "OPEN",
        providerDocumentationStatus: "SIGNED",
        billingFinalizationStatus: "NOT_READY",
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
        nursingAssessment: {
          erDispositionExecutionV1: {
            dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
            dischargeSortieCompletedByDisplayName: "RN",
          },
        },
      },
    });
    expect(result.billingDeficiencies.length).toBeGreaterThan(0);
  });

  it("reads billingReadinessSnapshotJson when present on trackboard row", () => {
    const rowType = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(rowType).toContain("billingReadinessSnapshotJson");
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: { status: "CLOSED", providerDocumentationStatus: "SIGNED" },
      billingReadinessSnapshot: { isReady: false, requiresManualReview: true },
    });
    expect(result.billingReady).toBe(false);
  });
});
