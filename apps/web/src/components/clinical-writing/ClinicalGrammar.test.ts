import { describe, expect, it } from "vitest";
import { replaceClinicalGrammarSuggestion, suggestClinicalGrammar } from "./ClinicalGrammar";

describe("ClinicalGrammar", () => {
  it("suggests conservative English grammar repairs", () => {
    const suggestion = suggestClinicalGrammar("Patient complain of chest pain.", "en");
    expect(suggestion?.replacement).toBe("Patient complains of");
    expect(suggestion && replaceClinicalGrammarSuggestion("Patient complain of chest pain.", suggestion)).toBe("Patient complains of chest pain.");
  });

  it("supports French and Spanish without translating the note", () => {
    expect(suggestClinicalGrammar("Le patient rapporte des douleur thoracique.", "fr")?.replacement).toBe("Le patient rapporte des douleurs");
    expect(suggestClinicalGrammar("El paciente refiere dolor desde dos dia.", "es")?.replacement).toBe("El paciente refiere dolor desde hace dos días");
  });

  it("does not rewrite protected clinical meaning", () => {
    expect(suggestClinicalGrammar("Patient denies chest pain.", "en")).toBeNull();
    expect(suggestClinicalGrammar("Patient takes 20 mg daily.", "en")).toBeNull();
    expect(suggestClinicalGrammar("Allergy to penicillin.", "en")).toBeNull();
    expect(suggestClinicalGrammar("Pain in left arm.", "en")).toBeNull();
  });

  it("never mutates input without explicit replacement", () => {
    const source = "Patient report nausea.";
    const suggestion = suggestClinicalGrammar(source, "en");
    expect(source).toBe("Patient report nausea.");
    expect(suggestion && replaceClinicalGrammarSuggestion(source, suggestion)).toBe("Patient reports nausea.");
  });
});
