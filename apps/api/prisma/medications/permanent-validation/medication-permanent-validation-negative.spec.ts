/**
 * Controlled negative regression test — proves the suite fails when a required
 * brand is masked in an isolated fixture (no production mutation).
 */
import {
  formatPermanentValidationFailure,
  maskBrandFromSearchItems,
  validateFamilySearchResult,
  type PermanentBenchmarkFamily,
  type PermanentValidationSearchItem,
} from "@medora/shared";

describe("Permanent medication validation — negative regression", () => {
  const biktarvyFamily: PermanentBenchmarkFamily = {
    benchmarkFamilyId: "biktarvy",
    canonicalGenericName: "Bictegravir Emtricitabine Tenofovir Alafenamide",
    commonBrandNames: ["Biktarvy", "bikt"],
    commonGenericNames: ["Bictegravir Emtricitabine Tenofovir Alafenamide"],
    commonSearchTerms: ["Biktarvy", "Biktar", "bikt"],
    expectedStrengths: ["50 mg"],
    expectedOrderability: true,
    requiredForED: true,
    clinicalDomains: ["HIV"],
    hardAcceptance: true,
    source: "FIXTURE",
    sourceVersion: "negative-test-1.0.0",
  };

  const intactItems: PermanentValidationSearchItem[] = [
    {
      label: "Biktarvy",
      code: "BICTEGRAVIR_EMTRICITABINE_TENOFOVIR_ALAFENAMIDE_50_MG_PER_200_MG_PER_25_MG_COMPRIME_ORAL",
      displayNameEn: "Biktarvy",
      searchText: "biktarvy bictegravir",
      metadata: {
        strength: "50 mg/200 mg/25 mg",
        dosageForm: "comprimé",
        route: "orale",
        genericName: "Bictegravir Emtricitabine Tenofovir Alafenamide",
      },
    },
  ];

  it("passes when Biktarvy family is present and orderable", () => {
    const failure = validateFamilySearchResult({
      family: biktarvyFamily,
      query: "Biktar",
      items: intactItems,
    });
    expect(failure).toBeNull();
  });

  it("fails with MISSING_FAMILY when brand is masked in isolated fixture", () => {
    const masked = maskBrandFromSearchItems(intactItems, "biktarvy");
    const failure = validateFamilySearchResult({
      family: biktarvyFamily,
      query: "Biktar",
      items: masked,
    });
    expect(failure).not.toBeNull();
    expect(failure!.classification).toBe("MISSING_FAMILY");
    const formatted = formatPermanentValidationFailure(failure!);
    expect(formatted.toLowerCase()).toContain("biktarvy");
    expect(formatted).toContain("MISSING_FAMILY");
  });

  it("fails with MISSING_STRENGTH when required strength is absent on generic query", () => {
    const noStrength: PermanentValidationSearchItem[] = [
      {
        ...intactItems[0]!,
        metadata: {
          ...intactItems[0]!.metadata!,
          strength: "10 mg",
        },
      },
    ];
    const failure = validateFamilySearchResult({
      family: biktarvyFamily,
      query: biktarvyFamily.canonicalGenericName,
      items: noStrength,
    });
    expect(failure?.classification).toBe("MISSING_STRENGTH");
  });

  it("fails with HIDDEN_BY_RANKING when tirzepatide outranks jard", () => {
    const jardiance: PermanentBenchmarkFamily = {
      benchmarkFamilyId: "jardiance",
      canonicalGenericName: "Empagliflozin",
      commonBrandNames: ["Jardiance", "jard"],
      commonGenericNames: ["Empagliflozin"],
      commonSearchTerms: ["jard", "Jardiance"],
      expectedStrengths: ["10 mg", "25 mg"],
      expectedOrderability: true,
      requiredForED: false,
      clinicalDomains: ["ENDOCRINE"],
      hardAcceptance: true,
      source: "FIXTURE",
      sourceVersion: "negative-test-1.0.0",
    };
    const failure = validateFamilySearchResult({
      family: jardiance,
      query: "jard",
      items: [
        {
          label: "Mounjaro",
          metadata: {
            strength: "2.5 mg",
            dosageForm: "injection",
            route: "subcutaneous",
            genericName: "Tirzepatide",
          },
        },
      ],
    });
    expect(failure?.classification).toBe("HIDDEN_BY_RANKING");
  });
});
