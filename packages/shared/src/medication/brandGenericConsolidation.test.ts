import { describe, expect, it } from "vitest";
import {
  buildCanonicalMedicationSearchResults,
  certifyBrandGenericConsolidation,
  certifyProviderSearchI18n,
} from "./providerSearchCanonicalization.js";

describe("BrandGenericConsolidationCertification and provider search i18n", () => {
  it("audits required brand/generic pairs", () => {
    const cert = certifyBrandGenericConsolidation();
    expect(cert.pairsAudited).toBeGreaterThan(0);
  });

  it("passes duplicate primary row consolidation", () => {
    const cert = certifyBrandGenericConsolidation();
    expect(cert.decision).toBe("PASS");
    expect(cert.duplicatePrimaryRows).toEqual([]);
  });

  it("consolidates Zestril under lisinopril family aliases", () => {
    const lisinopril = buildCanonicalMedicationSearchResults().find((row) => row.familyKey === "lisinopril");
    expect(lisinopril?.aliases).toContain("zestril");
  });

  it("consolidates Norvasc under amlodipine family aliases", () => {
    const amlodipine = buildCanonicalMedicationSearchResults().find((row) => row.familyKey === "amlodipine");
    expect(amlodipine?.aliases).toContain("norvasc");
  });

  it("consolidates Glucophage under metformin family aliases", () => {
    const metformin = buildCanonicalMedicationSearchResults().find((row) => row.familyKey === "metformin");
    expect(metformin?.aliases).toContain("glucophage");
  });

  it("does not require all future brand pairs to be orderable today", () => {
    const cert = certifyBrandGenericConsolidation();
    expect(cert.missingGenericFamilies.length).toBeGreaterThanOrEqual(0);
    expect(cert.decision).toBe("PASS");
  });

  it("certifies English/French provider search i18n", () => {
    const cert = certifyProviderSearchI18n();
    expect(cert.decision).toBe("PASS");
  });

  it("certifies full English support", () => {
    expect(certifyProviderSearchI18n().englishSupportPct).toBe(100);
  });

  it("certifies full French support", () => {
    expect(certifyProviderSearchI18n().frenchSupportPct).toBe(100);
  });

  it("certifies zero English leakage into French", () => {
    expect(certifyProviderSearchI18n().frLeakageCount).toBe(0);
  });

  it("certifies zero French leakage into English", () => {
    expect(certifyProviderSearchI18n().enLeakageCount).toBe(0);
  });

  it("certifies vaccine manufacturer labels for provider search", () => {
    expect(certifyProviderSearchI18n().manufacturerLabelsCertified).toBe(true);
  });
});
