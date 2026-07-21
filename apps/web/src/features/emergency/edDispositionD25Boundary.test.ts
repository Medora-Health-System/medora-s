import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("ED disposition D2.5 dedicated boards boundary", () => {
  it("unmounts Home discharge packet from AMA/LWBS/OTHER/TRANSFER", () => {
    const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
    expect(panel).toContain('const showProviderDischargeDocumentation = outcomeUi === "HOME"');
    expect(panel).toContain('const showProviderDischargeOnSave = effectiveOutcome === "HOME"');
    expect(panel).toContain("AmaDispositionBoard");
    expect(panel).toContain("LwbsDispositionBoard");
    expect(panel).toContain("ElopementDispositionBoard");
    expect(panel).toContain("DeceasedDispositionBoard");
    expect(panel).toContain("GovernedOtherDispositionBoard");
    expect(panel).toContain("shouldUseHomeDischargePrintLayout");
  });

  it("exposes ELOPEMENT as a distinct outcome from LWBS", () => {
    const v1 = readSrc("features/emergency/emergencyDispositionV1.ts");
    expect(v1).toContain("ELOPEMENT");
    expect(v1).toContain("ER_DISCHARGE_MODE_ELOPEMENT");
    expect(v1).toContain("ER_DISCHARGE_MODE_LWBS");
    const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
    expect(panel).toContain('id: "ELOPEMENT"');
    expect(panel).toContain('? "ELOPEMENT"');
  });

  it("localizes D2.5 board keys in EN and FR", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    for (const key of [
      "outcomeELOPEMENT",
      "amaBoardTitle",
      "lwbsBoardTitle",
      "elopementBoardTitle",
      "deceasedBoardTitle",
      "mseNoComplianceClaim",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });
});
