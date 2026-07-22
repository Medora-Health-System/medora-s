import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("D4A.2 smart admission + adaptive nursing boundary", () => {
  it("keeps Phase A admission/decision writer and coded diagnosis selection", () => {
    const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
    expect(panel).toContain("/admission/decision");
    expect(panel).toContain("admissionPacket");
    expect(panel).toContain("HOSPITAL_ADMITTING_SERVICES");
    expect(panel).toContain("ED_ADMISSION_LEVEL_OF_CARE_OPTIONS");
    expect(panel).toContain("primaryDiagnosisRequired");
    expect(panel).toContain("buildSmartAdmissionProposals");
    expect(panel).not.toMatch(/body\.admissionSummaryJson\s*=/);
  });

  it("mounts adaptive nursing and hides HOME nursing for non-HOME", () => {
    const workspace = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(workspace).toContain("AdaptiveDispositionNursingSection");
    expect(workspace).toContain("isHomeNursingForbiddenForPathway");
    expect(workspace).toContain("showHomeNursingDischargeExecution");
  });

  it("uses disposition-specific sign labels", () => {
    const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
    expect(panel).toContain("signAdmissionButton");
    expect(panel).toContain("signHomeDischargeButton");
    expect(panel).toContain("signTransferButton");
    expect(panel).toContain("signAmaButton");
  });

  it("mirrors EN/FR adaptive nursing and smart packet keys", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    for (const key of [
      "emergencyAdaptiveNursing",
      "signHomeDischargeButton",
      "smartPacketProvenanceHint",
      "labelAdmittingService",
      "primaryDiagnosisRequired",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
    const enMod = readSrc("i18n/messages/emergencyAdaptiveNursing.en.ts");
    const frMod = readSrc("i18n/messages/emergencyAdaptiveNursing.fr.ts");
    expect(enMod).toContain("acceptingFacility");
    expect(frMod).toContain("acceptingFacility");
  });
});
