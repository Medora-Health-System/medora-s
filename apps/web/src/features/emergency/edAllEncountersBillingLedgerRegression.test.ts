import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import {
  isEncounterEligibleForAllEncounters,
  mapEmergencyEncountersArchiveApiRow,
  type EdAllEncountersArchiveRow,
  type EmergencyEncountersArchiveApiRow,
} from "@/features/emergency/edAllEncountersArchive";
import {
  isArchiveRowBillingReviewNeeded,
  isArchiveRowCodingReviewNeeded,
} from "@/features/emergency/edAllEncountersBillingCodingFilters";
import {
  billingLedgerArtifactNotReadyMessage,
  isBillingLedgerArtifactNotReady,
} from "@/lib/billingLedgerArtifactLoad";

const webRoot = join(import.meta.dirname, "../../..");

function readWebFile(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function closedSignedBillingIncompleteEncounter(overrides: Record<string, unknown> = {}) {
  return {
    id: "enc-archive-billing-blocked",
    status: "CLOSED",
    type: "EMERGENCY",
    providerDocumentationStatus: "SIGNED",
    chiefComplaint: "Abdominal pain",
    providerNote: "Signed note",
    treatmentPlan: "Discharge",
    createdAt: "2026-06-02T08:00:00.000Z",
    dischargedAt: "2026-06-02T12:00:00.000Z",
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      nursingDischargeSummary: "Discharge done",
    },
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Done" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-02T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN",
      },
    },
    patient: {
      id: "pat-archive-1",
      firstName: "Jean",
      lastName: "Pierre",
      dob: "1985-03-15",
      sexAtBirth: "M",
      mrn: "MRN-ARCH-42",
      phone: "555-0142",
    },
    facility: { name: "Clinique Medora" },
    billingFinalizationStatus: "NOT_READY",
    billingReadinessSnapshotJson: { isReady: false, reason: "payer missing" },
    diagnosisCount: 0,
    ...overrides,
  };
}

describe("edAllEncountersBillingLedgerRegression (MEDUI.BILLING.HOTFIX.1A)", () => {
  it("includes CLOSED + SIGNED encounter in All Encounters when billing and coding are incomplete", () => {
    const encounter = closedSignedBillingIncompleteEncounter();
    expect(isEncounterEligibleForAllEncounters(encounter)).toBe(true);

    const row = mapEmergencyEncountersArchiveApiRow(
      closedSignedBillingIncompleteEncounter() as EmergencyEncountersArchiveApiRow
    );
    expect(row).not.toBeNull();
    expect(row?.id).toBe("enc-archive-billing-blocked");
    expect(row?.billingReady).toBe(false);
    expect(row?.codingReady).toBe(false);
    expect(row?.allEncountersEligible).toBe(false);
  });

  it("displays Billing Not Ready or Coding Review Needed for incomplete archive row", () => {
    const encounter = closedSignedBillingIncompleteEncounter();
    const row = mapEmergencyEncountersArchiveApiRow(
      encounter as EmergencyEncountersArchiveApiRow
    ) as EdAllEncountersArchiveRow;

    expect(["billing_not_ready", "coding_review_needed"]).toContain(row.billingStatusLabel);
    expect(
      isArchiveRowBillingReviewNeeded(row) || isArchiveRowCodingReviewNeeded(row)
    ).toBe(true);
  });

  it("keeps chart action available for billing-incomplete archive row", () => {
    const row = mapEmergencyEncountersArchiveApiRow(
      closedSignedBillingIncompleteEncounter() as EmergencyEncountersArchiveApiRow
    ) as EdAllEncountersArchiveRow;

    expect(row.chartHref).toBe("/app/emergency/chart/enc-archive-billing-blocked");
    const table = readWebFile("src/features/emergency/EdAllEncountersArchiveTable.tsx");
    expect(table).toContain("row.chartHref");
    expect(table).toContain("ed-all-encounters-chart-");
  });

  it("accepts billing ledger NOT_READY payload without treating it as ready claim assembly", () => {
    const ledgerPayload = {
      status: "NOT_READY" as const,
      blockers: ["MISSING_PAYER_CONTEXT", "MANUAL_BILLING_REVIEW_UNRESOLVED"],
      warnings: [],
      summary: null,
    };
    expect(isBillingLedgerArtifactNotReady(ledgerPayload)).toBe(true);
    expect(billingLedgerArtifactNotReadyMessage(ledgerPayload, "Non prêt")).toContain("MISSING_PAYER_CONTEXT");
  });

  it("ledger page renders blocker notice and only fails on summary load error", () => {
    const page = readWebFile("app/app/billing/encounters/[encounterId]/page.tsx");
    expect(page).toContain("billing-ledger-claim-artifact-not-ready");
    expect(page).toContain("isBillingLedgerArtifactNotReady");
    expect(page).toContain("Promise.allSettled");
    expect(page).toContain("billingPage.billingSummaryLoadError");
    expect(page).not.toContain("Unable to load billing summary");
  });

  it("does not call billing mutation APIs from archive or ledger artifact helpers", () => {
    const archive = readWebFile("src/features/emergency/edAllEncountersArchive.ts");
    const ledgerHelper = readWebFile("src/lib/billingLedgerArtifactLoad.ts");

    for (const source of [archive, ledgerHelper]) {
      expect(source).not.toContain("finalizeBilling");
      expect(source).not.toContain("submitClaim");
      expect(source).not.toContain('method: "POST"');
    }

    expect(archive).toContain("/emergency/encounters/archive");
  });
});
