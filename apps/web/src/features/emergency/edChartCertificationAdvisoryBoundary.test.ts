import { describe, expect, it, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import { buildEdClosedEncounterCertificationFromEncounter } from "@/features/emergency/edClosedEncounterCertificationFromEncounter";
import {
  canProceedToCloseCheckFromCertificationReview,
  stageAAdvisoryFindingsBlockCloseCheck,
  shouldShowCertificationReviewOnCloseRequest,
} from "@/features/emergency/edEncounterCertificationReviewModel";
import {
  resolveMyIncompleteChartsEncounters,
  resolveIncompleteChartsEncounters,
  resolveEdIncompleteChartBadgeKeys,
  type EdMyIncompleteChartsEncounter,
  type EdTrackboardLifecycleEncounter,
} from "@/features/emergency/edIncompleteChartsFilter";
import { isEnterpriseChartCertificationStageAEnabled } from "@/features/emergency/enterpriseChartCertificationStageAFlag";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function departedEncounter(overrides: Record<string, unknown> = {}) {
  return {
    id: "enc-adv-1",
    status: "OPEN",
    type: "EMERGENCY",
    providerDocumentationStatus: "DRAFT",
    chiefComplaint: "Pain",
    providerNote: "Note",
    assignedProviderUserId: "user-1",
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      instructions: "Return",
      followUp: "PCP",
    },
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

describe("Stage A chart certification advisory UI/workflow boundary", () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A;
    } else {
      process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A = originalEnv;
    }
  });

  it("Stage A advisory deficiency does not prevent continue-to-close-check", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(departedEncounter());
    expect(certification.advisoryFindings.length).toBeGreaterThan(0);
    expect(stageAAdvisoryFindingsBlockCloseCheck(certification)).toBe(false);
    expect(
      canProceedToCloseCheckFromCertificationReview({
        certification,
        dispositionReadiness: {
          canClose: true,
          blockers: [],
          warnings: [],
          activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 },
        },
        acknowledgeDispositionSafety: false,
      })
    ).toBe(true);
  });

  it("established disposition blocker still requires acknowledgement", () => {
    const dispositionReadiness = {
      canClose: false,
      blockers: [
        {
          code: "ACTIVE_ORDERS_UNRESOLVED" as const,
          severity: "error" as const,
          message: "orders",
        },
      ],
      warnings: [],
      activeOrderCounts: { lab: 1, imaging: 0, medication: 0, care: 0 },
    };
    const certification = buildEdClosedEncounterCertificationFromEncounter(
      departedEncounter({ providerDocumentationStatus: "SIGNED" }),
      { dispositionReadiness }
    );
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

  it("My Incomplete Charts inclusion is lifecycle-based, not Stage A advisory", () => {
    const advisoryOnly = departedEncounter({
      id: "enc-active",
      status: "OPEN",
      providerDocumentationStatus: "DRAFT",
      nursingAssessment: { nursingEvalV1: { sections: { assessment: { text: "x" } } } },
      dischargeSummaryJson: null,
    }) as EdMyIncompleteChartsEncounter;
    // Active ED without departure — not in incomplete charts
    const incomplete = resolveIncompleteChartsEncounters([advisoryOnly]);
    const myCtx = { currentUserId: "user-1", roles: ["PROVIDER"] };
    const myIncomplete = resolveMyIncompleteChartsEncounters([advisoryOnly], myCtx);
    // Without physical departure, lifecycle should not be incomplete-chart workspace
    expect(incomplete.map((e) => e.id)).not.toContain("enc-active");
    expect(myIncomplete.map((e) => e.id)).not.toContain("enc-active");

    const departed = departedEncounter({ id: "enc-departed" }) as EdTrackboardLifecycleEncounter;
    expect(resolveIncompleteChartsEncounters([departed]).map((e) => e.id)).toContain("enc-departed");
    // Completing established lifecycle readiness removes the row even if Stage A would still advise
    const closed = departedEncounter({
      id: "enc-closed",
      status: "CLOSED",
      providerDocumentationStatus: "SIGNED",
    }) as EdTrackboardLifecycleEncounter;
    expect(resolveIncompleteChartsEncounters([closed]).map((e) => e.id)).not.toContain("enc-closed");
  });

  it("Stage A flag off does not attach Stage A badge overlays", () => {
    process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A = "false";
    expect(isEnterpriseChartCertificationStageAEnabled()).toBe(false);
    const badges = resolveEdIncompleteChartBadgeKeys(
      departedEncounter() as EdTrackboardLifecycleEncounter,
      { stageAEnabled: false }
    );
    expect(badges).toContain("edLifecycle.incompleteCharts.badge.incompleteChart");
    // orders overlay is Stage A gated
    const withOrders = resolveEdIncompleteChartBadgeKeys(
      {
        ...departedEncounter(),
        trackboardOps: {
          openOrderCount: 2,
          resultsPendingCount: 0,
          criticalResultUnacknowledged: false,
          lastNursingReassessmentAt: null,
          firstDispositionDocAt: null,
        },
      } as EdTrackboardLifecycleEncounter,
      { stageAEnabled: false }
    );
    expect(withOrders).not.toContain("edLifecycle.incompleteCharts.badge.ordersNotReconciled");
  });

  it("Stage A flag on shows advisory labeling in review/panel source", () => {
    const review = readSrc("features/emergency/EdEncounterCertificationReview.tsx");
    const panel = readSrc("features/emergency/EdClosedEncounterCertificationPanel.tsx");
    expect(review).toContain("edLifecycle.certification.advisory.banner");
    expect(panel).toContain("edLifecycle.certification.advisory.banner");
    expect(panel).toContain("ed-certification-unevaluated-modules");
    expect(panel).toContain("ed-certification-readiness-error");
    expect(review).toContain("data-certification-authority");
  });

  it("EN/FR advisory keys are present", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain("Advisory chart review — partial module coverage");
    expect(fr).toContain("Revue de dossier consultative — couverture partielle des modules");
    expect(en).toContain("Modules not fully evaluated");
    expect(fr).toContain("Modules non entièrement évalués");
  });

  it("shouldShowCertificationReview still works for advisory findings", () => {
    const certification = buildEdClosedEncounterCertificationFromEncounter(departedEncounter());
    expect(shouldShowCertificationReviewOnCloseRequest(certification)).toBe(true);
  });

  it("panel refreshes disposition readiness on open (wired)", () => {
    const panel = readSrc("features/emergency/EdClosedEncounterCertificationPanel.tsx");
    expect(panel).toContain("/disposition-readiness");
    expect(panel).toContain("setRefreshNonce");
    expect(panel).toContain("ed-certification-refresh");
  });
});
