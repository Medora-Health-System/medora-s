import { describe, expect, it, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isEnterpriseChartCertificationStageB1Enabled } from "@/features/emergency/enterpriseChartCertificationStageB1Flag";
import {
  resolveIncompleteChartsEncounters,
  resolveMyIncompleteChartsEncounters,
  type EdMyIncompleteChartsEncounter,
  type EdTrackboardLifecycleEncounter,
} from "@/features/emergency/edIncompleteChartsFilter";
import { ED_DISCHARGE_MODE_HOME } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("Stage B1 UI/workflow boundary", () => {
  const original = process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1;
    else process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1 = original;
  });

  it("flag defaults OFF", () => {
    delete process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1;
    expect(isEnterpriseChartCertificationStageB1Enabled()).toBe(false);
  });

  it("trackboard wires B1 panel when flag enabled path exists", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("EdChartCertificationB1Panel");
    expect(trackboard).toContain("isEnterpriseChartCertificationStageB1Enabled");
    expect(trackboard).toContain("EdClosedEncounterCertificationPanel");
  });

  it("B1 panel consumes server endpoint without client merge builders", () => {
    const panel = readSrc("features/emergency/EdChartCertificationB1Panel.tsx");
    expect(panel).toContain("/chart-certification");
    expect(panel).not.toContain("buildEdClosedEncounterCertification");
    expect(panel).not.toContain("buildChartCertificationB1");
    expect(panel).toContain("edLifecycle.certification.b1.banner");
  });

  it("EN/FR B1 banners present", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain("Stage B1 advisory chart review — partial clinical module coverage");
    expect(fr).toContain(
      "Revue de dossier consultative Stage B1 — couverture clinique partielle des modules"
    );
  });

  it("My Incomplete Charts inclusion remains lifecycle-based", () => {
    const active = {
      id: "a1",
      status: "OPEN",
      type: "EMERGENCY",
      providerDocumentationStatus: "DRAFT",
      nursingAssessment: { nursingEvalV1: { sections: { assessment: { text: "x" } } } },
      dischargeSummaryJson: null,
      physicianAssignedUserId: "user-1",
    } as EdTrackboardLifecycleEncounter;
    expect(resolveIncompleteChartsEncounters([active]).map((e) => e.id)).not.toContain("a1");

    const departed = {
      id: "d1",
      status: "OPEN",
      type: "EMERGENCY",
      providerDocumentationStatus: "DRAFT",
      chiefComplaint: "Pain",
      providerNote: "Note",
      physicianAssignedUserId: "user-1",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
      nursingAssessment: {
        nursingEvalV1: { sections: { assessment: { text: "Done" } } },
        erDispositionExecutionV1: {
          dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
          dischargeSortieCompletedByDisplayName: "RN",
        },
      },
    } as EdMyIncompleteChartsEncounter;
    expect(resolveIncompleteChartsEncounters([departed]).map((e) => e.id)).toContain("d1");
    expect(
      resolveMyIncompleteChartsEncounters([departed], {
        currentUserId: "user-1",
        roles: ["PROVIDER"],
      }).map((e) => e.id)
    ).toContain("d1");
  });
});
