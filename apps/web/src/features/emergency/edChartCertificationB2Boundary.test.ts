import { describe, expect, it, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isEnterpriseChartCertificationStageB2Enabled } from "@/features/emergency/enterpriseChartCertificationStageB2Flag";
import {
  resolveIncompleteChartsEncounters,
  type EdTrackboardLifecycleEncounter,
} from "@/features/emergency/edIncompleteChartsFilter";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("Stage B2 UI/workflow boundary", () => {
  const original = process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B2;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B2;
    else process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B2 = original;
  });

  it("flag defaults OFF", () => {
    delete process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B2;
    expect(isEnterpriseChartCertificationStageB2Enabled()).toBe(false);
  });

  it("trackboard prefers B2/B1 server panel over Stage A when enabled", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("isEnterpriseChartCertificationStageB2Enabled");
    expect(trackboard).toContain("EdChartCertificationB1Panel");
  });

  it("panel does not recompute diagnostic certification client-side", () => {
    const panel = readSrc("features/emergency/EdChartCertificationB1Panel.tsx");
    expect(panel).toContain("/chart-certification");
    expect(panel).not.toContain("buildChartCertificationB2");
    expect(panel).not.toContain("normalizeDiagnosticOrderItem");
    expect(panel).toContain("edLifecycle.certification.b2");
    expect(panel).toContain("${i18nPrefix}.banner");
  });

  it("EN/FR B2 banners present", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain("Stage B2 advisory diagnostic review — partial clinical module coverage");
    expect(fr).toContain(
      "Revue diagnostique consultative Stage B2 — couverture clinique partielle des modules"
    );
  });

  it("My Incomplete Charts remains lifecycle-based with B2 findings absent from inclusion", () => {
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
  });
});
