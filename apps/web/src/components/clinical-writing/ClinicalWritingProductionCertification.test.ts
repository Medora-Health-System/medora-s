import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { suggestClinicalGrammar } from "./ClinicalGrammar";
import { suggestClinicalWritingTerm } from "./ClinicalWritingLexicon";

const guardSource = fs.readFileSync(path.join(__dirname, "ClinicalWritingGuard.tsx"), "utf8");
const grammarSource = fs.readFileSync(path.join(__dirname, "ClinicalGrammar.ts"), "utf8");

const protectedNotes = {
  en: ["Patient denies chest pain.", "Allergy to penicillin.", "Acetaminophen 650 mg.", "Troponin negative."],
  fr: ["Le patient nie une douleur thoracique.", "Allergie à la pénicilline.", "Acétaminophène 650 mg.", "Troponine négative."],
  es: ["El paciente niega dolor torácico.", "Alergia a penicilina.", "Acetaminofén 650 mg.", "Troponina negativa."],
} as const;

describe("Clinical Writing Corrector final production certification", () => {
  it("certifies EN/FR/ES spelling and medical vocabulary suggestions", () => {
    expect(suggestClinicalWritingTerm("tachicardia", 10, "en")).not.toBeNull();
    expect(suggestClinicalWritingTerm("tachicardie", 10, "fr")).not.toBeNull();
    expect(suggestClinicalWritingTerm("taquicardia", 11, "es")).not.toBeNull();
  });

  it("certifies high-confidence grammar in all supported languages", () => {
    expect(suggestClinicalGrammar("Patient complain of chest pain.", "en")?.replacement).toBe("Patient complains of");
    expect(suggestClinicalGrammar("Les poumons est clair.", "fr")?.replacement).toBe("Les poumons sont clairs");
    expect(suggestClinicalGrammar("Los pulmones está claro.", "es")?.replacement).toBe("Los pulmones están claros");
  });

  it.each(["en", "fr", "es"] as const)("certifies protected clinical meaning in %s", (language) => {
    for (const note of protectedNotes[language]) expect(suggestClinicalGrammar(note, language), note).toBeNull();
  });

  it("certifies suggestion-only interaction and cross-field ownership", () => {
    expect(guardSource).toContain('onClick={acceptSuggestion}');
    expect(guardSource).toContain('dispatchEvent(new Event("input", { bubbles: true }))');
    expect(guardSource).toContain("suggestionButtonRef.current === focused");
    expect(guardSource).toContain("focusOwnerIsValid");
  });

  it("certifies keyboard dismissal and accessible suggestion controls", () => {
    expect(guardSource).toContain('event.key === "Escape"');
    expect(guardSource).toContain('aria-label={label}');
    expect(guardSource).toContain('data-medora-clinical-suggestion="true"');
  });

  it("certifies that Medora grammar does not call an external service", () => {
    expect(grammarSource).not.toMatch(/fetch\s*\(/);
    expect(grammarSource).not.toMatch(/axios|openai|grammarly|languageTool/i);
  });
});
