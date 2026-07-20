import { describe, expect, it } from "vitest";

import { ED_DISCHARGE_MODE_HOME } from "./edEncounterLifecycle.js";
import {
  buildEdClosedEncounterCertification,
  EdChartCertificationAuthority,
  EdChartCertificationCoverageStatus,
  EdChartCertificationSourceAuthority,
  ED_CHART_CERTIFICATION_STAGE,
  stageAAdvisoryDeficiencyCanBlockActions,
} from "./edClosedEncounterCertification.js";
import { enterpriseChartCertificationStageAEnabled } from "./enterpriseChartCertificationStageAFeatureFlag.js";
import { chartCertificationDedupeKey } from "./chartCertificationDedupe.js";

function departedOpenSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    status: "OPEN",
    providerDocumentationStatus: "DRAFT",
    chiefComplaint: "Abdominal pain",
    providerNote: "Stable",
    encounterType: "EMERGENCY",
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      instructions: "Return if worse",
      followUp: "PCP in 2 days",
      patientInstructionsGiven: true,
    },
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Nursing documented" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN One",
      },
    },
    ...overrides,
  };
}

describe("Stage A advisory deployment boundary", () => {
  it("exposes Stage A advisory authority and partial coverage metadata", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
    });
    expect(result.certificationStage).toBe(ED_CHART_CERTIFICATION_STAGE);
    expect(result.certificationAuthority).toBe(EdChartCertificationAuthority.ADVISORY);
    expect(result.coverageStatus).toBe(EdChartCertificationCoverageStatus.PARTIAL);
    expect(result.evaluatedModules.length).toBeGreaterThan(0);
    expect(result.unevaluatedModules).toEqual(
      expect.arrayContaining(["orders_results_lifecycle", "mar_intelligence", "mutation_wide_freshness"])
    );
    expect(result.benchmarkStatus).toContain("INSUFFICIENT");
    expect(result.evaluatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("Stage A advisory unsigned note does not set authoritative closure false", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "DRAFT" }),
    });
    expect(result.advisoryFindings.some((d) => d.id === "provider:unsigned")).toBe(true);
    expect(result.authoritativeReadiness.clinicalClosureReady).toBe(true);
    expect(result.closureReady).toBe(true);
    expect(
      result.advisoryFindings.every((d) => !stageAAdvisoryDeficiencyCanBlockActions(d))
    ).toBe(true);
  });

  it("established disposition blocker still blocks authoritative closure readiness", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
      dispositionReadiness: {
        canClose: false,
        blockers: [
          {
            code: "ACTIVE_ORDERS_UNRESOLVED",
            severity: "error",
            message: "Active orders remain",
          },
        ],
        warnings: [],
        activeOrderCounts: { lab: 1, imaging: 0, medication: 0, care: 0 },
      },
    });
    expect(result.authoritativeReadiness.clinicalClosureReady).toBe(false);
    expect(result.authoritativeReadiness.dispositionReady).toBe(false);
    expect(
      result.closureBlockers.some(
        (d) =>
          d.sourceAuthority === EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW &&
          d.id === "disposition:ACTIVE_ORDERS_UNRESOLVED"
      )
    ).toBe(true);
  });

  it("established signature blocker from disposition readiness remains established", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "DRAFT" }),
      dispositionReadiness: {
        canClose: false,
        blockers: [
          {
            code: "PROVIDER_DOCUMENTATION_UNSIGNED",
            severity: "error",
            message: "Provider documentation unsigned",
          },
        ],
        warnings: [],
        activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
      },
    });
    const unsigned = result.deficiencies.filter(
      (d) => d.deduplicationKey === "PROVIDER_NOTE_UNSIGNED"
    );
    expect(unsigned).toHaveLength(1);
    expect(unsigned[0]?.sourceAuthority).toBe(
      EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW
    );
    expect(unsigned[0]?.blockingClosure).toBe(true);
    expect(result.authoritativeReadiness.clinicalClosureReady).toBe(false);
  });

  it("Stage A advisory billing diagnosis finding does not set authoritative billing false", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "SIGNED",
        billingFinalizationStatus: "READY_FOR_REVIEW",
      }),
      billingReadinessSnapshot: { isReady: true },
      diagnosisCount: 0,
    });
    expect(result.advisoryFindings.some((d) => d.id === "billing:diagnosis-missing")).toBe(true);
    expect(result.authoritativeReadiness.billingReady).toBe(true);
    expect(result.billingReady).toBe(true);
  });

  it("feature flag defaults OFF", () => {
    expect(enterpriseChartCertificationStageAEnabled(null)).toBe(false);
    expect(enterpriseChartCertificationStageAEnabled({})).toBe(false);
    expect(
      enterpriseChartCertificationStageAEnabled({
        NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A: "true",
      })
    ).toBe(true);
  });

  it("dedupe: one unsigned note → one deficiency", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "DRAFT" }),
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
    });
    expect(
      result.deficiencies.filter((d) => d.deduplicationKey === "PROVIDER_NOTE_UNSIGNED")
    ).toHaveLength(1);
  });

  it("dedupe: open order and unreviewed critical result remain distinct", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({ providerDocumentationStatus: "SIGNED" }),
      trackboardOps: { openOrderCount: 1, criticalResultUnacknowledged: true },
    });
    expect(result.deficiencies.some((d) => d.id === "orders:open")).toBe(true);
    expect(result.deficiencies.some((d) => d.id === "results:critical-unacked")).toBe(true);
    expect(chartCertificationDedupeKey({ id: "orders:open" })).not.toBe(
      chartCertificationDedupeKey({ id: "results:critical-unacked" })
    );
  });

  it("dedupe: billing readiness and clinical documentation stay distinct", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: departedOpenSnapshot({
        providerDocumentationStatus: "DRAFT",
        billingFinalizationStatus: "NOT_READY",
      }),
      billingReadinessSnapshot: { isReady: false },
    });
    expect(result.deficiencies.some((d) => d.deduplicationKey === "PROVIDER_NOTE_UNSIGNED")).toBe(
      true
    );
    expect(result.deficiencies.some((d) => d.deduplicationKey === "BILLING_NOT_READY")).toBe(true);
  });
});
