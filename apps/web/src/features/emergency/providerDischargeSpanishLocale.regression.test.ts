import { describe, expect, it } from "vitest";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";

describe("shared provider discharge Spanish locale regression", () => {
  it("resolves N39.0 / UTI to Spanish patient-facing text without English leakage", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "N39.0",
      displayName: "Infección urinaria, sitio no especificado",
    });
    const body = getProviderDischargeSuggestedTextBody(resolved.template, "es");
    const blob = [
      body.description,
      body.diagnosisInstructions,
      body.medicationTreatment,
      body.returnPrecautions,
    ].join("\n");

    expect(body.description).toMatch(/Fue evaluado\/a|servicio de urgencias/i);
    expect(body.diagnosisInstructions).toMatch(/líquidos|antibióticos/i);
    expect(body.medicationTreatment).toMatch(/antibióticos|medicamentos/i);
    expect(body.returnPrecautions).toMatch(/fiebre|urgencias/i);

    expect(blob).not.toMatch(/You were evaluated/i);
    expect(blob).not.toMatch(/Drink fluids/i);
    expect(blob).not.toMatch(/Take antibiotics/i);
    expect(blob).not.toMatch(/Return for care/i);
    expect(blob).not.toContain("UNLOCALIZED_SOURCE");
    expect(blob).not.toContain("UNLOCALIZED_ES");
  });

  it("keeps English resolution English", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "N39.0",
      displayName: "Urinary tract infection, site not specified",
    });
    const body = getProviderDischargeSuggestedTextBody(resolved.template, "en");
    expect(body.description).toMatch(/emergency department|urinary/i);
    expect(body.description).not.toMatch(/Fue evaluado\/a/i);
  });

  it("keeps French resolution French", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "N39.0",
      displayName: "Infection urinaire, site non précisé",
    });
    const body = getProviderDischargeSuggestedTextBody(resolved.template, "fr");
    const blob = [body.description, body.diagnosisInstructions, body.returnPrecautions].join("\n");
    expect(blob).not.toMatch(/You were evaluated|Drink fluids|Return for care/i);
  });
});
