import { describe, expect, it } from "vitest";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";
import {
  getFrenchDiagnosisDisplayLabel,
  getLocalizedDiagnosisDisplayLabel,
} from "./diagnosisFrenchDisplayLabels";

describe("19Y.16B French diagnosis display labels", () => {
  it("French mapped search label displays Douleur abdominale à plusieurs sites", () => {
    expect(
      getLocalizedDiagnosisDisplayLabel(
        { code: "R10.85", shortDescription: "Abdominal pain of multiple sites" },
        "fr"
      )
    ).toBe("Douleur abdominale à plusieurs sites");
  });

  it("French mapped label does not show English primary text", () => {
    const label = getLocalizedDiagnosisDisplayLabel(
      { code: "R10.85", shortDescription: "Abdominal pain of multiple sites" },
      "fr"
    );
    expect(label).not.toContain("Abdominal pain of multiple sites");
    expect(label).not.toMatch(/abdominal pain/i);
  });

  it("English UI remains unchanged", () => {
    expect(
      getLocalizedDiagnosisDisplayLabel(
        { code: "R10.85", shortDescription: "Abdominal pain of multiple sites" },
        "en"
      )
    ).toBe("Abdominal pain of multiple sites");
  });

  it("selected diagnosis table display uses French label at render time", () => {
    const storedEnglish = "Generalized abdominal pain";
    const rendered = getLocalizedDiagnosisDisplayLabel(
      { code: "R10.84", description: storedEnglish },
      "fr"
    );
    expect(rendered).toBe("Douleur abdominale généralisée");
    expect(storedEnglish).toBe("Generalized abdominal pain");
  });

  it("stored diagnosis canonical English label is preserved as fallback input", () => {
    const canonical = "Unspecified abdominal pain";
    expect(getFrenchDiagnosisDisplayLabel("R10.9", canonical)).toBe("Douleur abdominale non précisée");
    expect(canonical).toBe("Unspecified abdominal pain");
  });

  it("discharge checkbox/card header can render French label from code + English stored label", () => {
    expect(
      getLocalizedDiagnosisDisplayLabel({ code: "R07.9", description: "Chest pain, unspecified" }, "fr")
    ).toBe("Douleur thoracique non précisée");
  });

  it("unmapped diagnosis uses canonical code, not English as French", () => {
    expect(
      getLocalizedDiagnosisDisplayLabel(
        { code: "Z99.99", description: "Rare unmapped diagnosis label" },
        "fr"
      )
    ).toBe("Z99.99");
  });

  it("template resolution still uses canonical English displayName internally", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "R10.9",
      displayName: "Unspecified abdominal pain",
    });
    expect(resolved.template.id).toBe("abdominal_pain_v1");
    expect(
      getLocalizedDiagnosisDisplayLabel(
        { code: "R10.9", description: "Unspecified abdominal pain" },
        "fr"
      )
    ).toBe("Douleur abdominale non précisée");
  });
});
