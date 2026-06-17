import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveMarMedicationResponseAdverseEscalationHint } from "@medora/shared";

describe("marMedicationResponseAdverseEscalation", () => {
  it("ADVERSE_REACTION_REPORTED shows Consider allergy review in panel source", () => {
    const panelSrc = readFileSync(
      join(process.cwd(), "src/components/mar/MedicationResponseDocumentationPanel.tsx"),
      "utf8"
    );
    expect(panelSrc).toContain("mar-medication-response-adverse-escalation");
    expect(panelSrc).toContain("marMedicationResponse.followUp.adverseEscalation");
  });

  it("adverse reaction does not modify allergy list", () => {
    const panelSrc = readFileSync(
      join(process.cwd(), "src/components/mar/MedicationResponseDocumentationPanel.tsx"),
      "utf8"
    );
    const historySrc = readFileSync(
      join(process.cwd(), "src/lib/medicationAdministrationHistoryRail.ts"),
      "utf8"
    );
    expect(panelSrc).not.toContain("allergy");
    expect(historySrc).not.toMatch(/updateAllergy|createAllergy|allergyList/i);
  });

  it("resolveMarMedicationResponseAdverseEscalationHint detects adverse reaction", () => {
    expect(
      resolveMarMedicationResponseAdverseEscalationHint([
        {
          responseCode: "ADVERSE_REACTION_REPORTED",
          responseDetail: "rash",
          responseTime: null,
          documentedAt: "2026-06-03T10:00:00.000Z",
          painBefore: null,
          painAfter: null,
        },
      ])
    ).toBe(true);
  });
});
