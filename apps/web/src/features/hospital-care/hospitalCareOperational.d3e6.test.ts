import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("D3E.6 Hospital Care UI contracts", () => {
  it("removes shell/placeholder implementation language from operational empty states", () => {
    const banned = [/shell only/i, /documentation arrives in D3/i, /placeholder/i, /read-only from D3C/i];
    const samples = [
      en.hospitalCareD3e6.empty.dashboard,
      en.hospitalCareD3e6.empty.inpatient,
      en.hospitalCareD3e6.empty.observation,
      en.hospitalCareD3ca.placementQueue.empty,
      fr.hospitalCareD3e6.empty.dashboard,
    ];
    for (const sample of samples) {
      for (const re of banned) {
        expect(sample).not.toMatch(re);
      }
    }
  });

  it("empty states do not require Observation", () => {
    expect(en.hospitalCareD3e6.empty.inpatient.toLowerCase()).toContain("direct");
    expect(en.hospitalCareD3e6.empty.observation.toLowerCase()).toContain("optional");
    expect(fr.hospitalCareD3e6.empty.observation.toLowerCase()).toContain("optionnelle");
  });
});
