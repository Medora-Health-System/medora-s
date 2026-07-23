/**
 * D4A.2.1 — Boundary: Phase A writer preserved; smart packet + adaptive nursing hardened.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname);

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.SMART_ADMISSION_CLINICAL_HARDENING.D4A2_1 boundary", () => {
  it("disposition panel posts dedicated admission decision writer", () => {
    const src = read("EmergencyDispositionPanel.tsx");
    expect(src).toContain("/admission/decision");
    expect(src).toContain("expectedVersion");
    expect(src).toContain("clientRequestId");
    expect(src).toContain("ProposalSourcesDisclosure");
    expect(src).toContain("structuredInitialPlan");
    expect(src).not.toMatch(/body\.admissionSummaryJson\s*=/);
  });

  it("adaptive nursing exposes completion summary and focusable fields", () => {
    const src = read("AdaptiveDispositionNursingSection.tsx");
    expect(src).toContain("adaptive-nursing-completion-summary");
    expect(src).toContain("evaluateAdaptiveNursingCompletion");
    expect(src).toContain("htmlFor={`adaptive-nursing-field-");
    expect(src).toContain("lanes.placementOffNote");
  });

  it("EN/FR adaptive nursing and disposition provenance keys stay mirrored", () => {
    const en = read("../../i18n/messages/emergencyAdaptiveNursing.en.ts");
    const fr = read("../../i18n/messages/emergencyAdaptiveNursing.fr.ts");
    for (const key of [
      "completionSummaryTitle",
      "NURSING_COMPLETION_INCOMPLETE",
      "placementOffNote",
      "mseStatus",
      "pathwayClassification",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
    const enDisp = readFileSync(
      join(root, "../../i18n/messages/en.ts"),
      "utf8"
    );
    const frDisp = readFileSync(
      join(root, "../../i18n/messages/fr.ts"),
      "utf8"
    );
    for (const key of [
      "sourcesUsed",
      "newerProposalAvailable",
      "keepPhysicianText",
      "replaceWithUpdatedProposal",
      "INVALID_SERVICE_LEVEL_OF_CARE_COMBINATION",
      "ADMISSION_DECISION_STALE",
    ]) {
      expect(enDisp).toContain(key);
      expect(frDisp).toContain(key);
    }
  });
});
