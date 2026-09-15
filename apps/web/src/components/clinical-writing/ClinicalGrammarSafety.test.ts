import { describe, expect, it } from "vitest";
import { suggestClinicalGrammar } from "./ClinicalGrammar";

const protectedClinicalStatements = {
  en: [
    "Patient denies chest pain.", "No shortness of breath.", "Allergy to penicillin.",
    "Give acetaminophen 650 mg.", "Pain is in the right lower quadrant.", "BP 90/60 mmHg.",
    "Troponin is negative.", "Pregnancy test is positive.",
  ],
  fr: [
    "Le patient nie une douleur thoracique.", "Sans dyspnée.", "Allergie à la pénicilline.",
    "Acétaminophène 650 mg.", "Douleur du côté gauche.", "TA 90/60 mmHg.",
  ],
  es: [
    "El paciente niega dolor torácico.", "Sin disnea.", "Alergia a penicilina.",
    "Acetaminofén 650 mg.", "Dolor del lado derecho.", "PA 90/60 mmHg.",
  ],
} as const;

describe("ClinicalGrammar clinical-safety matrix", () => {
  it.each(["en", "fr", "es"] as const)("never proposes a change to protected %s statements", (language) => {
    for (const statement of protectedClinicalStatements[language]) {
      expect(suggestClinicalGrammar(statement, language), statement).toBeNull();
    }
  });

  it("does not cross languages", () => {
    expect(suggestClinicalGrammar("Patient complain of chest pain.", "fr")).toBeNull();
    expect(suggestClinicalGrammar("Le patient rapporte des douleur.", "es")).toBeNull();
    expect(suggestClinicalGrammar("El paciente refiere dolor desde dos dia.", "en")).toBeNull();
  });

  it("leaves already-correct clinical prose unchanged", () => {
    expect(suggestClinicalGrammar("Patient complains of chest pain.", "en")).toBeNull();
    expect(suggestClinicalGrammar("Les poumons sont clairs.", "fr")).toBeNull();
    expect(suggestClinicalGrammar("Los pulmones están claros.", "es")).toBeNull();
  });
});
