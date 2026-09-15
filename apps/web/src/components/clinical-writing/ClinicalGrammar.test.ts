import { describe, expect, it } from "vitest";
import { replaceClinicalGrammarSuggestion, suggestClinicalGrammar } from "./ClinicalGrammar";

describe("ClinicalGrammar", () => {
  it("suggests conservative English grammar repairs", () => {
    const suggestion = suggestClinicalGrammar("Patient complain of chest pain.", "en");
    expect(suggestion?.replacement).toBe("Patient complains of");
    expect(suggestion && replaceClinicalGrammarSuggestion("Patient complain of chest pain.", suggestion)).toBe("Patient complains of chest pain.");
    expect(suggestClinicalGrammar("Symptoms has been improving.", "en")?.replacement).toBe("Symptoms have been");
    expect(suggestClinicalGrammar("Vital signs is stable.", "en")?.replacement).toBe("Vital signs are");
  });

  it("supports French and Spanish without translating the note", () => {
    expect(suggestClinicalGrammar("Le patient rapporte des douleur thoracique.", "fr")?.replacement).toBe("Le patient rapporte des douleurs");
    expect(suggestClinicalGrammar("Les poumons est clair.", "fr")?.replacement).toBe("Les poumons sont clairs");
    expect(suggestClinicalGrammar("El paciente refiere dolor desde dos dia.", "es")?.replacement).toBe("El paciente refiere dolor desde hace dos días");
    expect(suggestClinicalGrammar("Los pulmones está claro.", "es")?.replacement).toBe("Los pulmones están claros");
  });

  it("does not rewrite protected clinical meaning", () => {
    expect(suggestClinicalGrammar("Patient denies chest pain.", "en")).toBeNull();
    expect(suggestClinicalGrammar("Patient takes 20 mg daily.", "en")).toBeNull();
    expect(suggestClinicalGrammar("Allergy to penicillin.", "en")).toBeNull();
    expect(suggestClinicalGrammar("Pain in left arm.", "en")).toBeNull();
  });

  it("avoids known false positives", () => {
    expect(suggestClinicalGrammar("Patient report was reviewed.", "en")).toBeNull();
    expect(suggestClinicalGrammar("Symptoms for one day.", "en")).toBeNull();
    expect(suggestClinicalGrammar("Patient reports nausea.", "en")).toBeNull();
  });

  it("never mutates input without explicit replacement", () => {
    const source = "Patient complain of nausea.";
    const suggestion = suggestClinicalGrammar(source, "en");
    expect(source).toBe("Patient complain of nausea.");
    expect(suggestion && replaceClinicalGrammarSuggestion(source, suggestion)).toBe("Patient complains of nausea.");
  });
});
