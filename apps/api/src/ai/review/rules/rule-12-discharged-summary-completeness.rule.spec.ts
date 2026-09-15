import type { EncounterAiSnapshot } from "@medora/shared";
import { rule12DischargedSummaryCompleteness } from "./rule-12-discharged-summary-completeness.rule.js";

const ctx = {
  generatedAt: "2026-09-13T12:45:00.000Z",
  snapshotVersion: "phase-2f",
};

function snapshot(
  dischargeStatus: string | null,
  dischargeSummary: EncounterAiSnapshot["disposition"]["dischargeSummary"] = null
): EncounterAiSnapshot {
  return {
    snapshotVersion: "phase-2f",
    generatedAt: "2026-09-13T12:45:00.000Z",
    encounterContext: {
      encounterId: "11111111-1111-4111-8111-111111111111",
      facilityId: "22222222-2222-4222-8222-222222222222",
      patientId: "33333333-3333-4333-8333-333333333333",
      country: "US",
      encounterType: "EMERGENCY",
      status: "CLOSED",
      careSetting: "EMERGENCY_DEPARTMENT",
    },
    patientContext: {},
    presentation: {},
    clinicalDocumentation: {},
    diagnostics: {},
    treatments: {},
    diagnoses: {},
    disposition: {
      dischargeStatus,
      dischargeSummary,
    },
  };
}

describe("rule12DischargedSummaryCompleteness", () => {
  it("flags explicit discharge when the summary is absent", () => {
    const findings = rule12DischargedSummaryCompleteness(snapshot("DISCHARGED"), ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("DOCUMENTATION_GAP");
    expect(findings[0].priority).toBe("MEDIUM");
    expect(findings[0].recommendedActions).toEqual([
      { actionType: "NAVIGATE", targetSection: "summary", label: "Review discharge documentation" },
    ]);
  });

  it("does not flag when discharge summary text is present", () => {
    expect(
      rule12DischargedSummaryCompleteness(
        snapshot("DISCHARGED", { text: "Stable for discharge with instructions.", truncated: false }),
        ctx
      )
    ).toEqual([]);
  });

  it("does not apply the rule to transfer or AMA statuses", () => {
    expect(rule12DischargedSummaryCompleteness(snapshot("TRANSFERRED"), ctx)).toEqual([]);
    expect(rule12DischargedSummaryCompleteness(snapshot("AMA"), ctx)).toEqual([]);
  });

  it("treats whitespace-only summary text as missing", () => {
    const findings = rule12DischargedSummaryCompleteness(
      snapshot("DISCHARGED", { text: "   ", truncated: false }),
      ctx
    );

    expect(findings).toHaveLength(1);
  });
});
