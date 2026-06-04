import { resolveWave4CatalogAdministrationType } from "@medora/shared";

describe("Wave 4 seed administration-type guard (M1.7C.6)", () => {
  it("prevents PUSH downgrade to INJECTION on ENRICH", () => {
    const result = resolveWave4CatalogAdministrationType({
      existingAdministrationType: "PUSH",
      incomingAdministrationType: "INJECTION",
      mode: "ENRICH",
      route: "intraveineuse",
      dosageForm: "injectable",
      catalogCode: "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION",
    });
    expect(result.value).toBe("PUSH");
    expect(result.keptExisting).toBe(true);
    expect(result.conflict).toMatch(/kept existing PUSH/);
  });

  it("prevents IM downgrade to INJECTION on ENRICH", () => {
    const result = resolveWave4CatalogAdministrationType({
      existingAdministrationType: "IM",
      incomingAdministrationType: "INJECTION",
      mode: "ENRICH",
      route: "intramusculaire",
      dosageForm: "injectable",
      catalogCode: "EPINEPHRINE_1_MG_1_ML_IM_INJECTABLE_INTRAMUSCULAIRE",
    });
    expect(result.value).toBe("IM");
    expect(result.keptExisting).toBe(true);
  });

  it("prevents INFUSION downgrade to INJECTION on ENRICH", () => {
    const result = resolveWave4CatalogAdministrationType({
      existingAdministrationType: "INFUSION",
      incomingAdministrationType: "INJECTION",
      mode: "ENRICH",
      route: "intraveineuse",
      dosageForm: "injectable",
      catalogCode: "AMIODARONE_150MG_3ML_IV",
    });
    expect(result.value).toBe("INFUSION");
    expect(result.keptExisting).toBe(true);
  });

  it("normalizes SUBCUTANEOUS incoming to SQ when no existing row", () => {
    const result = resolveWave4CatalogAdministrationType({
      existingAdministrationType: null,
      incomingAdministrationType: "SUBCUTANEOUS",
      mode: "CREATE",
      route: "sous-cutanée",
      dosageForm: "injectable",
      catalogCode: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
    });
    expect(result.value).toBe("SQ");
  });
});
