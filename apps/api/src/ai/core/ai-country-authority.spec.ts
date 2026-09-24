import { resolveMedoraAiCountryAuthority, resolveMedoraAiFacilityLanguage } from "./ai-country-authority.js";

describe("AI-1 facility country authority", () => {
  it.each([
    ["US", "US"], ["United States", "US"], ["República Dominicana", "DO"],
    ["Dominican Republic", "DO"], ["Haïti", "HT"], ["HT", "HT"],
  ] as const)("resolves persisted country %s to %s", (country, jurisdiction) => {
    expect(resolveMedoraAiCountryAuthority(country)?.jurisdiction).toBe(jurisdiction);
  });

  it.each([undefined, null, "", "unknown", "Canada", "US/DO"])("fails closed on unsupported country %s", (country) => {
    expect(resolveMedoraAiCountryAuthority(country)).toBeNull();
  });

  it("does not infer jurisdiction from facility language", () => {
    expect(resolveMedoraAiCountryAuthority("US")?.jurisdiction).toBe("US");
    expect(resolveMedoraAiFacilityLanguage("es")).toBe("es");
    expect(resolveMedoraAiCountryAuthority("DO")?.jurisdiction).toBe("DO");
    expect(resolveMedoraAiFacilityLanguage("en")).toBe("en");
  });

  it("keeps billing and documentation policy inactive until jurisdiction sources are certified", () => {
    for (const country of ["US", "DO", "HT"]) {
      expect(resolveMedoraAiCountryAuthority(country)?.documentationAndBillingRulesEnabled).toBe(false);
    }
  });

  it.each([undefined, null, "", "auto", "browser", "de"])("rejects unknown facility language %s", (language) => {
    expect(resolveMedoraAiFacilityLanguage(language)).toBeNull();
  });
});
