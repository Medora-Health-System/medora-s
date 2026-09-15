import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clinicalWritingSuggestionLabel,
  replaceClinicalWritingSuggestion,
  suggestClinicalWritingTerm,
} from "./ClinicalWritingLexicon";

describe("ClinicalWritingLexicon", () => {
  it("suggests common English clinical spelling corrections", () => {
    const suggestion = suggestClinicalWritingTerm("patient with tachicardia", 24, "en");
    expect(suggestion?.replacement).toBe("tachycardia");
    expect(suggestion?.original).toBe("tachicardia");
  });

  it("restores Spanish and French clinical accents without changing language", () => {
    expect(suggestClinicalWritingTerm("hipertension", 12, "es")?.replacement).toBe("hipertensión");
    expect(suggestClinicalWritingTerm("dyspnee", 7, "fr")?.replacement).toBe("dyspnée");
  });

  it("does not suggest for acronyms, numbers, correct terms, or valid inflections", () => {
    expect(suggestClinicalWritingTerm("BP", 2, "en")).toBeNull();
    expect(suggestClinicalWritingTerm("O2", 2, "en")).toBeNull();
    expect(suggestClinicalWritingTerm("tachycardia", 11, "en")).toBeNull();
    for (const word of ["medications", "diagnoses", "discharged", "palpitation"]) {
      expect(suggestClinicalWritingTerm(word, word.length, "en")).toBeNull();
    }
  });

  it("covers the complete word when the caret is moved inside a misspelling", () => {
    const suggestion = suggestClinicalWritingTerm("tachicardia", 10, "en");
    expect(suggestion).not.toBeNull();
    if (!suggestion) return;
    expect(suggestion.end).toBe("tachicardia".length);
    expect(replaceClinicalWritingSuggestion("tachicardia", suggestion)).toBe("tachycardia");
  });

  it("preserves sentence-opening capitalization", () => {
    expect(suggestClinicalWritingTerm("Tachicardia", 11, "en")?.replacement).toBe("Tachycardia");
  });

  it("only mutates text through the explicit replacement helper", () => {
    const suggestion = suggestClinicalWritingTerm("tachicardia noted", 11, "en");
    expect(suggestion).not.toBeNull();
    if (!suggestion) return;
    expect(replaceClinicalWritingSuggestion("tachicardia noted", suggestion)).toBe("tachycardia noted");
  });

  it("requires the suggestion owner to remain the focused textarea", () => {
    const guardSource = readFileSync(join(__dirname, "ClinicalWritingGuard.tsx"), "utf8");
    expect(guardSource).toContain("current?.element === focused");
    expect(guardSource).toContain("document.activeElement !== element");
  });

  it("localizes the visible clinician approval prompt", () => {
    expect(clinicalWritingSuggestionLabel("en", "tachycardia")).toContain("Did you mean");
    expect(clinicalWritingSuggestionLabel("fr", "dyspnée")).toContain("Vouliez-vous dire");
    expect(clinicalWritingSuggestionLabel("es", "hipertensión")).toContain("Quiso decir");
  });
});
