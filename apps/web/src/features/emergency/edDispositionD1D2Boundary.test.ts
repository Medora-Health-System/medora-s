import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("ED disposition D1/D2 boundary", () => {
  it("panel routes one pathway board and separates draft/sign from closure", () => {
    const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
    expect(panel).toContain("projectEdDispositionState");
    expect(panel).toContain('data-testid="ed-disposition-active-board"');
    expect(panel).toContain('handleSave("DRAFT")');
    expect(panel).toContain('handleSave("SIGN")');
    expect(panel).toContain("decisionDoesNotClose");
    expect(panel).toContain("ed-disposition-pathway-change-modal");
    expect(panel).toContain("documentationStatus");
  });

  it("HOME validation distinguishes content vs communication and aligns follow-up", () => {
    const model = readSrc("features/emergency/providerDischargeDocumentationModel.ts");
    expect(model).toContain("isClosureFollowUpRowComplete");
    expect(model).toContain("requireInstructionsCommunicated");
    expect(model).toContain("requireFinalDiagnosis");
    expect(model).toContain("patientInstructionsGiven");
  });

  it("localizes board titles and decision actions in EN and FR", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    for (const key of [
      "saveDraftButton",
      "signDecisionButton",
      "boardTitle",
      "homeValidation",
      "DISPOSITION_DECISION_UNSIGNED",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });
});
