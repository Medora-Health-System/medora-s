import { describe, expect, it } from "vitest";
import { medoraAssistFindingCopy } from "./medora-assist-finding-copy.js";
import { pickAiLocalizedCopy } from "./ai-localized-copy.js";

describe("Medora Assist finding copy", () => {
  it("keeps EN/ES/FR clinician sentences distinct for representative findings", () => {
    const keys = [
      "tachycardiaWithoutReassessment",
      "duplicateMedication",
      "pendingDiagnosticAtDischarge",
      "missingFollowUp",
      "clinicTransferIncomplete",
    ] as const;
    for (const key of keys) {
      const copy = medoraAssistFindingCopy(key, {
        hr: "142",
        medication: "ketorolac",
        study: "Urine culture",
      });
      expect(copy.summary.en.length).toBeGreaterThan(20);
      expect(copy.summary.es.length).toBeGreaterThan(20);
      expect(copy.summary.fr.length).toBeGreaterThan(20);
      expect(copy.summary.es).not.toBe(copy.summary.en);
      expect(copy.summary.fr).not.toBe(copy.summary.en);
      expect(pickAiLocalizedCopy(copy.summary, "es", copy.summary.en)).toBe(copy.summary.es);
      expect(pickAiLocalizedCopy(copy.summary, "fr", copy.summary.en)).toBe(copy.summary.fr);
    }
  });
});
