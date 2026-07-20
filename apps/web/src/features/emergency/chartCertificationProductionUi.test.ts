import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadWithSingleRetry } from "./chartCertificationProductionUi";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("chart certification production UI cleanup", () => {
  const panels = [
    "features/emergency/EdClosedEncounterCertificationPanel.tsx",
    "features/emergency/EdChartCertificationB1Panel.tsx",
    "features/emergency/EdEncounterCertificationReview.tsx",
  ] as const;

  it("removes engineering subtitle, coverage, Refresh, and Cancel from clinician modals", () => {
    for (const path of panels) {
      const src = readSrc(path);
      expect(src, path).not.toContain("edLifecycle.certification.advisory.banner");
      expect(src, path).not.toContain("coveragePartial");
      expect(src, path).not.toContain("stageLabel");
      expect(src, path).not.toContain("ed-certification-refresh");
      expect(src, path).not.toContain("ed-certification-b1-refresh");
      expect(src, path).not.toContain('t("common.cancel")');
      expect(src, path).not.toContain("unevaluatedTitle");
      expect(src, path).toContain("ed-certification-close");
      expect(src, path).toContain('e.key === "Escape"');
    }
  });

  it("auto-refreshes trackboard certification panels without a Refresh button", () => {
    const closed = readSrc("features/emergency/EdClosedEncounterCertificationPanel.tsx");
    const b1 = readSrc("features/emergency/EdChartCertificationB1Panel.tsx");
    expect(closed).toContain("loadWithSingleRetry");
    expect(b1).toContain("loadWithSingleRetry");
    expect(closed).toContain("CHART_CERTIFICATION_REFRESH_EVENT");
    expect(b1).toContain("CHART_CERTIFICATION_REFRESH_EVENT");
    expect(closed).toContain("visibilitychange");
    expect(b1).toContain("visibilitychange");
  });

  it("keeps clinical actions and readiness", () => {
    const closed = readSrc("features/emergency/EdClosedEncounterCertificationPanel.tsx");
    const b1 = readSrc("features/emergency/EdChartCertificationB1Panel.tsx");
    expect(closed).toContain("edLifecycle.certification.actions.openChart");
    expect(closed).toContain("edLifecycle.certification.actions.openDocumentation");
    expect(closed).toContain("edLifecycle.certification.actions.openBilling");
    expect(closed).toContain("edLifecycle.certification.actions.openMar");
    expect(b1).toContain("authoritativeReadiness");
    expect(b1).toContain("deficiencies");
  });

  it("retries failed certification load once", async () => {
    let calls = 0;
    const ok = await loadWithSingleRetry(async () => {
      calls += 1;
      return calls >= 2;
    });
    expect(ok).toBe(true);
    expect(calls).toBe(2);
  });

  it("EN/FR production titles avoid stage/coverage language in displayed panel titles", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain('panelTitle: "Chart Certification Review"');
    expect(fr).toContain('panelTitle: "Revue de certification du dossier"');
    expect(en).toContain('refreshError: "Unable to refresh certification."');
    expect(fr).toContain("Impossible d’actualiser la certification.");
  });
});
