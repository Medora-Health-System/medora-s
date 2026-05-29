import { describe, expect, it } from "vitest";
import {
  NIHSS_FIELD_OPTIONS,
  NIHSS_SCORED_FIELD_KEYS,
  deriveNihssSeverityBand,
  formatNihssItemSummary,
  formatClinicalDocumentationOptionLabel,
} from "./clinicalDocumentationFieldOptions.js";
import { calculateNihssTotal } from "./strokeDocumentationPayloads.js";

describe("clinicalDocumentationFieldOptions (EDOC.UI.1)", () => {
  it("NIHSS options include score and clinical explanation for all scored fields", () => {
    expect(NIHSS_SCORED_FIELD_KEYS).toHaveLength(15);
    for (const key of NIHSS_SCORED_FIELD_KEYS) {
      const options = NIHSS_FIELD_OPTIONS[key];
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) {
        expect(option.scoreValue).toBe(option.value);
        expect(option.labelEn.length).toBeGreaterThan(0);
        expect(option.labelFr.length).toBeGreaterThan(0);
        expect(formatClinicalDocumentationOptionLabel(option, "en")).toContain(String(option.value));
      }
    }
  });

  it("NIHSS total still calculates correctly with option values", () => {
    const payload = {
      levelOfConsciousness: 1,
      locQuestions: 1,
      locCommands: 0,
      bestGaze: 0,
      visualFields: 0,
      facialPalsy: 1,
      motorArmLeft: 2,
      motorArmRight: 0,
      motorLegLeft: 1,
      motorLegRight: 0,
      limbAtaxia: 0,
      sensory: 0,
      bestLanguage: 0,
      dysarthria: 0,
      extinctionInattention: 0,
    };
    expect(calculateNihssTotal(payload)).toBe(6);
  });

  it("NIHSS severity band derives without diagnosis language in key", () => {
    expect(deriveNihssSeverityBand(0)).toBe("NO_STROKE_SYMPTOMS");
    expect(deriveNihssSeverityBand(3)).toBe("MINOR");
    expect(deriveNihssSeverityBand(10)).toBe("MODERATE");
    expect(deriveNihssSeverityBand(18)).toBe("MODERATE_TO_SEVERE");
    expect(deriveNihssSeverityBand(25)).toBe("SEVERE");
  });

  it("legal summary helper includes value plus meaning", () => {
    const summary = formatNihssItemSummary("levelOfConsciousness", 1, "fr");
    expect(summary).toBe("1 — Non alerte; éveillable par stimulation mineure");
  });
});
