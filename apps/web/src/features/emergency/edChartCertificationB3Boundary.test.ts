import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isEnterpriseChartCertificationStageB3Enabled } from "@/features/emergency/enterpriseChartCertificationStageB3Flag";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edChartCertificationB3Boundary", () => {
  it("Stage B3 flag defaults OFF", () => {
    expect(isEnterpriseChartCertificationStageB3Enabled()).toBe(false);
  });

  it("trackboard gates B3 panel behind B3/B2/B1 flags", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("isEnterpriseChartCertificationStageB3Enabled");
    expect(trackboard).toContain("EdChartCertificationB1Panel");
  });

  it("panel consumes server payload and supports B3 stage keys", () => {
    const panel = readSrc("features/emergency/EdChartCertificationB1Panel.tsx");
    expect(panel).toContain("chart-certification");
    expect(panel).toContain("edLifecycle.certification.b3");
    expect(panel).toContain("medicationOrdersReady");
    expect(panel).toContain("marReady");
    expect(panel).not.toContain("buildChartCertificationB3");
    expect(panel).toContain('route === "mar"');
  });

  it("French and English B3 banners exist", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain("Stage B3 advisory medication and procedure review");
    expect(fr).toContain("Revue consultative Stage B3 des médicaments et procédures");
  });

  it("does not compute MAR due status in the frontend panel", () => {
    const panel = readSrc("features/emergency/EdChartCertificationB1Panel.tsx");
    expect(panel).not.toContain("classifyMedicationOrder");
    expect(panel).not.toContain("administrationRequired");
  });
});
